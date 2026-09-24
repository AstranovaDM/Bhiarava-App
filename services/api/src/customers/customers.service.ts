import { Injectable, NotFoundException } from '@nestjs/common';
import { projectCustomerPii } from '@bhairava/domain';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private roleLabel(actor: AuthPrincipal) {
    const map: Record<string, string> = {
      FOUNDER: 'Founder', ADMINISTRATOR: 'Administrator', FINANCE: 'Finance',
      VIEWER: 'Viewer', AGENT: 'Agent', CUSTOMER: 'Customer',
    };
    return map[actor.roleCode] ?? 'Viewer';
  }

  async list(actor: AuthPrincipal) {
    const where: { organizationId: string; agentId?: string; userId?: string } = {
      organizationId: actor.organizationId,
    };
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      if (!agent) return [];
      where.agentId = agent.id;
    }
    if (actor.roleCode === 'CUSTOMER') where.userId = actor.userId;

    const rows = await this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, phone: true, email: true, city: true,
        agentId: true, userId: true, kycStatus: true, createdAt: true,
      },
    });

    return rows.map((c) => {
      const pii = projectCustomerPii(
        { id: c.id, name: c.name, phone: c.phone, email: c.email ?? null },
        {
          role: this.roleLabel(actor),
          ownsRelationship: actor.roleCode === 'AGENT' || actor.roleCode !== 'CUSTOMER',
          isSelf: c.userId === actor.userId,
        },
      );
      return {
        ...c,
        phone: pii.phone,
        email: pii.email,
        redacted: Boolean((pii as any).redacted),
      };
    });
  }

  async get(actor: AuthPrincipal, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, organizationId: actor.organizationId },
      select: {
        id: true, name: true, phone: true, email: true, city: true, address: true,
        state: true, pincode: true, agentId: true, userId: true, kycStatus: true,
        nomineeName: true, source: true, notes: true, createdAt: true, updatedAt: true,
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    if (actor.roleCode === 'CUSTOMER' && c.userId !== actor.userId) {
      throw new NotFoundException('Customer not found');
    }
    const pii = projectCustomerPii(
      { id: c.id, name: c.name, phone: c.phone, email: c.email ?? null },
      { role: this.roleLabel(actor), ownsRelationship: true, isSelf: c.userId === actor.userId },
    );
    return { ...c, phone: pii.phone, email: pii.email, redacted: Boolean((pii as any).redacted) };
  }

  async create(actor: AuthPrincipal, body: {
    name: string; phone: string; email?: string; city?: string; agentId?: string; notes?: string;
  }) {
    let agentId = body.agentId;
    if (actor.roleCode === 'AGENT') {
      const agent = await this.prisma.agentProfile.findFirst({ where: { userId: actor.userId } });
      agentId = agent?.id;
    }
    return this.prisma.customer.create({
      data: {
        organizationId: actor.organizationId,
        name: body.name,
        phone: body.phone,
        email: body.email,
        city: body.city,
        agentId,
        notes: body.notes,
      },
      select: { id: true, name: true, phone: true, email: true, city: true, agentId: true, createdAt: true },
    });
  }
}
