import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Soft-void only — never hard-delete financial rows. */
  async voidPayment(actor: AuthPrincipal, paymentId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('void reason required');
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, organizationId: actor.organizationId },
    });
    if (!payment) throw new BadRequestException('payment not found');
    if (payment.voidedAt) throw new BadRequestException('already voided');
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        voidedAt: new Date(),
        voidReason: reason.trim(),
        reconciliationStatus: 'REVERSED',
      },
    });
  }
}
