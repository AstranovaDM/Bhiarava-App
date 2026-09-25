import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstallmentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(actor: AuthPrincipal, q: { bookingId?: string; projectId?: string } = {}) {
    const where: Prisma.PaymentWhereInput = { organizationId: actor.organizationId };
    if (q.bookingId) where.bookingId = q.bookingId;
    if (q.projectId) where.projectId = q.projectId;
    if (actor.roleCode === 'CUSTOMER') {
      where.customer = { userId: actor.userId };
    }
    const rows = await this.prisma.payment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      select: {
        id: true, bookingId: true, customerId: true, projectId: true, plotId: true,
        amountPaise: true, paidAt: true, method: true, txnRef: true, receiptNumber: true,
        reconciliationStatus: true, notes: true, voidedAt: true, voidReason: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({ ...r, amountPaise: r.amountPaise.toString() }));
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
    if (!(Object.values(PaymentMethod) as string[]).includes(body.method)) {
      throw new BadRequestException('Invalid payment method');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const count = await tx.receipt.count({ where: { organizationId: actor.organizationId } });
      const receiptNumber = `RCP-${String(count + 1).padStart(6, '0')}`;

      const payment = await tx.payment.create({
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
          receiptNumber,
        },
      });

      const receipt = await tx.receipt.create({
        data: {
          organizationId: actor.organizationId,
          paymentId: payment.id,
          bookingId: booking.id,
          receiptNumber,
          metaJson: { method: body.method, txnRef: body.txnRef ?? null },
        },
      });

      if (body.scheduleItemId) {
        const item = await tx.paymentScheduleItem.findFirst({
          where: { id: body.scheduleItemId, bookingId: booking.id, organizationId: actor.organizationId },
        });
        if (item) {
          const linked = await tx.payment.aggregate({
            where: { scheduleItemId: item.id, voidedAt: null },
            _sum: { amountPaise: true },
          });
          const paid = linked._sum.amountPaise ?? 0n;
          await tx.paymentScheduleItem.update({
            where: { id: item.id },
            data: {
              status:
                paid >= item.amountDuePaise
                  ? InstallmentStatus.PAID
                  : paid > 0n
                    ? InstallmentStatus.PARTIALLY_PAID
                    : item.status,
            },
          });
        }
      }

      return { payment, receipt };
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id: booking.customerId },
      select: { userId: true, name: true },
    });
    const amountStr = result.payment.amountPaise.toString();
    const rcp = result.receipt.receiptNumber;
    if (customer?.userId) {
      await this.notifications.notify({
        organizationId: actor.organizationId,
        userId: customer.userId,
        title: 'Payment received',
        body: 'Payment of ' + amountStr + ' paise recorded. Receipt ' + rcp + '.',
        payloadJson: {
          kind: 'payment_received',
          paymentId: result.payment.id,
          receiptId: result.receipt.id,
          bookingId: booking.id,
          href: '/receipts/' + result.receipt.id,
        },
        actorId: actor.userId,
      });
    }
    await this.notifications.notify({
      organizationId: actor.organizationId,
      userId: actor.userId,
      title: 'Payment recorded',
      body: 'Receipt ' + rcp + ' issued for booking ' + booking.id + '.',
      payloadJson: {
        kind: 'payment_received',
        paymentId: result.payment.id,
        receiptId: result.receipt.id,
        bookingId: booking.id,
        href: '/receipts/' + result.receipt.id,
      },
      actorId: actor.userId,
    });

    return {
      ...result.payment,
      amountPaise: result.payment.amountPaise.toString(),
      receipt: {
        id: result.receipt.id,
        receiptNumber: result.receipt.receiptNumber,
        issuedAt: result.receipt.issuedAt,
      },
    };
  }

  voidPayment(actor: AuthPrincipal, id: string, reason: string) {
    return this.finance.voidPayment(actor, id, reason);
  }
}
