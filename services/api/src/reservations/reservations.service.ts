import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlotStatus, ReservationState, Prisma, StatusChangeSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { DEFAULT_RESERVATION_HOURS, isTransitionAllowed } from '@bhairava/domain';

export type CreateReservationInput = {
  plotId: string;
  customerId: string;
  agentId?: string;
  leadId?: string;
  holdHours?: number;
  notes?: string;
};

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Concurrent-safe reserve: SELECT â€¦ FOR UPDATE on plot row inside a transaction.
   * Exactly one concurrent winner; others get 409.
   */
  async reserve(actor: AuthPrincipal, input: CreateReservationInput) {
    const holdHours = input.holdHours ?? DEFAULT_RESERVATION_HOURS;
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
        if (plot.organizationId !== actor.organizationId) {
          throw new NotFoundException('Plot not found');
        }
        if (plot.status !== PlotStatus.AVAILABLE && plot.status !== PlotStatus.RESALE_AVAILABLE) {
          throw new ConflictException(`Plot is ${plot.status}, cannot reserve`);
        }
        if (!isTransitionAllowed(plot.status, PlotStatus.RESERVED)) {
          throw new BadRequestException(`Transition ${plot.status} â†’ RESERVED not allowed`);
        }

        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, organizationId: actor.organizationId },
        });
        if (!customer) throw new NotFoundException('Customer not found');

        const now = new Date();
        const expiresAt = new Date(now.getTime() + holdHours * 3600 * 1000);

        const reservation = await tx.reservation.create({
          data: {
            organizationId: actor.organizationId,
            projectId: plot.projectId,
            plotId: plot.id,
            customerId: customer.id,
            agentId: input.agentId,
            leadId: input.leadId,
            state: ReservationState.ACTIVE,
            reservedAt: now,
            expiresAt,
            notes: input.notes,
          },
        });

        await tx.plot.update({
          where: { id: plot.id },
          data: { status: PlotStatus.RESERVED },
        });

        await tx.plotStatusHistory.create({
          data: {
            plotId: plot.id,
            fromStatus: plot.status,
            toStatus: PlotStatus.RESERVED,
            reason: 'Reservation created',
            source: StatusChangeSource.SALES_FLOW,
            actorId: actor.userId,
          },
        });

        return reservation;
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
      action: 'reservation.create',
      entityType: 'Reservation',
      entityId: result.id,
      metaJson: { plotId: input.plotId, customerId: input.customerId },
    });
    return result;
  }

  async releaseExpired(limit = 50) {
    const now = new Date();
    const due = await this.prisma.reservation.findMany({
      where: { state: ReservationState.ACTIVE, expiresAt: { lte: now } },
      take: limit,
      orderBy: { expiresAt: 'asc' },
    });
    const released: string[] = [];
    for (const r of due) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<Array<{ id: string; status: PlotStatus }>>`
            SELECT id, status FROM plots WHERE id = ${r.plotId} FOR UPDATE
          `;
          const plot = rows[0];
          const fresh = await tx.reservation.findUnique({ where: { id: r.id } });
          if (!fresh || fresh.state !== ReservationState.ACTIVE) return;
          if (fresh.expiresAt.getTime() > Date.now()) return;

          await tx.reservation.update({
            where: { id: r.id },
            data: { state: ReservationState.EXPIRED },
          });
          if (plot && plot.status === PlotStatus.RESERVED) {
            await tx.plot.update({
              where: { id: plot.id },
              data: { status: PlotStatus.AVAILABLE },
            });
            await tx.plotStatusHistory.create({
              data: {
                plotId: plot.id,
                fromStatus: PlotStatus.RESERVED,
                toStatus: PlotStatus.AVAILABLE,
                reason: 'Reservation expired (48h)',
                source: StatusChangeSource.SYSTEM,
                actorId: null,
              },
            });
          }
          released.push(r.id);
        });
      } catch {
        // race with booking â€” skip
      }
    }
    return { releasedCount: released.length, released };
  }
}


