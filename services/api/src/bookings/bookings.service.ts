import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingState, PlotStatus, Prisma, ReservationState, StatusChangeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { isTransitionAllowed } from '@bhairava/domain';

export type CreateBookingInput = {
  plotId: string;
  customerId: string;
  reservationId?: string;
  agentId?: string;
  agreementValuePaise: string | number | bigint;
  advancePaise?: string | number | bigint;
  notes?: string;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async book(actor: AuthPrincipal, input: CreateBookingInput) {
    const agreementValuePaise = BigInt(input.agreementValuePaise);
    const advancePaise = BigInt(input.advancePaise ?? 0);
    if (agreementValuePaise <= 0n) throw new BadRequestException('agreementValuePaise must be > 0');

    let result;
    try {
    result = await this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ id: string; status: PlotStatus; organizationId: string; projectId: string }>
        >`
          SELECT id, status, "organizationId", "projectId"
          FROM plots
          WHERE id = ${input.plotId}
          FOR UPDATE
        `;
        const plot = rows[0];
        if (!plot) throw new NotFoundException('Plot not found');
        if (plot.organizationId !== actor.organizationId) throw new NotFoundException('Plot not found');

        let reservationId: string | undefined = input.reservationId;
        if (reservationId) {
          const reservation = await tx.reservation.findFirst({
            where: {
              id: reservationId,
              organizationId: actor.organizationId,
              plotId: plot.id,
            },
          });
          if (!reservation) throw new NotFoundException('Reservation not found');
          if (reservation.state !== ReservationState.ACTIVE && reservation.state !== ReservationState.EXPIRING_TODAY) {
            throw new ConflictException(`Reservation is ${reservation.state}`);
          }
          await tx.reservation.update({
            where: { id: reservation.id },
            data: { state: ReservationState.CONVERTED },
          });
        } else if (plot.status !== PlotStatus.AVAILABLE && plot.status !== PlotStatus.RESERVED && plot.status !== PlotStatus.RESALE_AVAILABLE) {
          throw new ConflictException(`Plot is ${plot.status}, cannot book`);
        }

        const canBook =
          plot.status === PlotStatus.RESERVED ||
          plot.status === PlotStatus.AVAILABLE ||
          plot.status === PlotStatus.RESALE_AVAILABLE ||
          isTransitionAllowed(plot.status as any, PlotStatus.BOOKED as any);
        if (!canBook) {
          throw new BadRequestException(`Transition ${plot.status} → BOOKED not allowed`);
        }

        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, organizationId: actor.organizationId },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        const booking = await tx.booking.create({
          data: {
            organizationId: actor.organizationId,
            projectId: plot.projectId,
            plotId: plot.id,
            customerId: customer.id,
            agentId: input.agentId,
            reservationId: reservationId,
            state: BookingState.ACTIVE,
            agreementValuePaise,
            advancePaise,
            notes: input.notes,
          },
        });

        const fromStatus = plot.status;
        await tx.plot.update({
          where: { id: plot.id },
          data: { status: PlotStatus.BOOKED, customerId: customer.id, agentId: input.agentId },
        });
        await tx.plotStatusHistory.create({
          data: {
            plotId: plot.id,
            fromStatus,
            toStatus: PlotStatus.BOOKED,
            reason: 'Booking created',
            source: StatusChangeSource.SALES_FLOW,
            actorId: actor.userId,
          },
        });

        return booking;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    } catch (err: any) {
      if (err instanceof ConflictException || err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      const code = err?.code;
      const msg = String(err?.message ?? err);
      if (code === 'P2034' || code === 'P2002' || /could not serialize|deadlock|unique constraint/i.test(msg)) {
        throw new ConflictException('Plot is no longer available (concurrent conflict)');
      }
      throw err;
    }

    await this.audit.log({
      organizationId: actor.organizationId,
      actorId: actor.userId,
      action: 'booking.create',
      entityType: 'Booking',
      entityId: result.id,
      metaJson: { plotId: input.plotId, customerId: input.customerId },
    });
    return {
      ...result,
      agreementValuePaise: result.agreementValuePaise.toString(),
      advancePaise: result.advancePaise.toString(),
    };
  }
}
