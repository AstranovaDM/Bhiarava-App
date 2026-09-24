import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  list(actor: AuthPrincipal, q: { bookingId?: string; projectId?: string } = {}) {
    const where: Prisma.PaymentWhereInput = { organizationId: actor.organizationId };
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    }
    return this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      select: {
        id: true, bookingId: true, customerId: true, projectId: true, plotId: true,
        amountPaise: true, paidAt: true, method: true, txnRef: true, receiptNumber: true,
        reconciliationStatus: true, notes: true, voidedAt: true, voidReason: true,
        createdAt: true,
      },
    });
  }

  async create(actor: AuthPrincipal, body: {
    bookingId: string; amountPaise: string; paidAt: string; method: string;
    txnRef?: string; scheduleItemId?: string; notes?: string;
  }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: body.bookingId, organizationId: actor.organizationId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const amount = BigInt(body.amountPaise);
    if (amount <= 0n) throw new BadRequestException('amountPaise must be > 0');
    return this.prisma.payment.create({
      data: {
        organizationId: actor.organizationId,
        bookingId: booking.id,
        customerId: booking.customerId,
        projectId: booking.projectId,
        plotId: booking.plotId,
        scheduleItemId: body.scheduleItemId,
        amountPaise: amount,
        paidAt: new Date(body.paidAt),
        method: body.method as PaymentMethod,
        txnRef: body.txnRef,
        notes: body.notes,
        recordedByUserId: actor.userId,
      },
    });
  }

  voidPayment(actor: AuthPrincipal, id: string, reason: string) {
    return this.finance.voidPayment(actor, id, reason);
  }
}
