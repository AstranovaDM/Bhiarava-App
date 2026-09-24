import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class OpsService {
  constructor(private readonly prisma: PrismaService) {}

  agents(actor: AuthPrincipal) {
    return this.prisma.agentProfile.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        email: true,
        region: true,
        status: true,
        userId: true,
        allAgentsAccess: true,
        createdAt: true,
      },
    });
  }

  async receipts(actor: AuthPrincipal) {
    const rows = await this.prisma.receipt.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { issuedAt: 'desc' },
      take: 200,
      include: {
        payment: { select: { id: true, amountPaise: true, method: true, paidAt: true } },
        booking: { select: { id: true, plotId: true, customerId: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      payment: r.payment
        ? { ...r.payment, amountPaise: r.payment.amountPaise.toString() }
        : null,
    }));
  }

  async commissions(actor: AuthPrincipal) {
    const where: any = { organizationId: actor.organizationId };
    if (actor.roleCode === 'AGENT') where.agent = { userId: actor.userId };
    const rows = await this.prisma.commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        agent: { select: { id: true, name: true, code: true } },
        booking: { select: { id: true, plotId: true, customerId: true } },
      },
    });
    return rows.map((r) => ({ ...r, amountPaise: r.amountPaise.toString() }));
  }

  async schedules(actor: AuthPrincipal, bookingId?: string) {
    const rows = await this.prisma.paymentScheduleItem.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(bookingId ? { bookingId } : {}),
        ...(actor.roleCode === 'CUSTOMER' ? { customer: { userId: actor.userId } } : {}),
      },
      orderBy: [{ dueDate: 'asc' }],
      take: 300,
    });
    return rows.map((r) => ({ ...r, amountDuePaise: r.amountDuePaise.toString() }));
  }

  registrations(actor: AuthPrincipal) {
    return this.prisma.registration.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        booking: { select: { id: true, plotId: true } },
      },
    });
  }

  async resales(actor: AuthPrincipal) {
    const rows = await this.prisma.resaleListing.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true } },
        plot: { select: { id: true, number: true, status: true } },
      },
    });
    return rows.map((r) => ({
      ...r,
      askingPricePaise: r.askingPricePaise?.toString() ?? null,
    }));
  }

  users(actor: AuthPrincipal) {
    if (!['FOUNDER', 'ADMINISTRATOR'].includes(actor.roleCode)) {
      throw new ForbiddenException('Members directory requires admin');
    }
    return this.prisma.user.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        email: true,
        mobile: true,
        displayName: true,
        roleCode: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        agentProfile: { select: { id: true, code: true } },
        customerProfile: { select: { id: true, name: true } },
      },
    });
  }

  async companySettings(actor: AuthPrincipal) {
    const row = await this.prisma.companySettings.findUnique({
      where: { organizationId: actor.organizationId },
    });
    return row ?? { organizationId: actor.organizationId, settingsJson: {} };
  }

  async updateCompanySettings(actor: AuthPrincipal, settingsJson: Record<string, unknown>) {
    if (!['FOUNDER', 'ADMINISTRATOR'].includes(actor.roleCode)) {
      throw new ForbiddenException('settings.manage required');
    }
    return this.prisma.companySettings.upsert({
      where: { organizationId: actor.organizationId },
      create: { organizationId: actor.organizationId, settingsJson: settingsJson as Prisma.InputJsonValue },
      update: { settingsJson: settingsJson as Prisma.InputJsonValue },
    });
  }

  async reportsSummary(actor: AuthPrincipal) {
    const orgId = actor.organizationId;
    const [projects, plots, customers, leads, reservations, bookings, payments, agents] =
      await Promise.all([
        this.prisma.project.count({ where: { organizationId: orgId } }),
        this.prisma.plot.groupBy({ by: ['status'], where: { organizationId: orgId }, _count: true }),
        this.prisma.customer.count({ where: { organizationId: orgId } }),
        this.prisma.lead.count({ where: { organizationId: orgId } }),
        this.prisma.reservation.count({ where: { organizationId: orgId, state: 'ACTIVE' } }),
        this.prisma.booking.count({ where: { organizationId: orgId } }),
        this.prisma.payment.aggregate({
          where: { organizationId: orgId, voidedAt: null },
          _sum: { amountPaise: true },
          _count: true,
        }),
        this.prisma.agentProfile.count({ where: { organizationId: orgId } }),
      ]);
    return {
      projects,
      customers,
      leads,
      activeReservations: reservations,
      bookings,
      agents,
      inventoryByStatus: plots.map((p) => ({ status: p.status, count: p._count })),
      collections: {
        paymentCount: payments._count,
        amountPaise: (payments._sum.amountPaise ?? 0n).toString(),
      },
    };
  }

  async assertCustomerOwnsBooking(actor: AuthPrincipal, bookingId: string) {
    const b = await this.prisma.booking.findFirst({
      where: { id: bookingId, organizationId: actor.organizationId },
      include: { customer: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    if (actor.roleCode === 'CUSTOMER' && b.customer.userId !== actor.userId) {
      throw new ForbiddenException('Not your booking');
    }
    return b;
  }
}
