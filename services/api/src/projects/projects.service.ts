import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectLifecycle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: AuthPrincipal, q: { lifecycleStatus?: string } = {}) {
    const where: Prisma.ProjectWhereInput = { organizationId: actor.organizationId };
    if (q.lifecycleStatus) where.lifecycleStatus = q.lifecycleStatus as ProjectLifecycle;
    if (actor.roleCode === 'AGENT') where.agentVisible = true;
    if (actor.roleCode === 'CUSTOMER') where.customerListed = true;
    return this.prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, code: true, city: true, state: true, location: true,
        lifecycleStatus: true, agentVisible: true, customerListed: true, resaleAvailable: true,
        coverImageKey: true, createdAt: true, updatedAt: true,
        _count: { select: { plots: true } },
      },
    });
  }

  async get(actor: AuthPrincipal, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        layouts: { select: { id: true, name: true, imageKey: true, widthPx: true, heightPx: true, metaJson: true } },
        _count: { select: { plots: true, leads: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    if (actor.roleCode === 'AGENT' && !project.agentVisible) throw new NotFoundException('Project not found');
    if (actor.roleCode === 'CUSTOMER' && !project.customerListed) throw new NotFoundException('Project not found');
    return project;
  }

  async create(actor: AuthPrincipal, body: { name: string; code: string; city?: string; state?: string; location?: string; description?: string }) {
    try {
      return await this.prisma.project.create({
        data: {
          organizationId: actor.organizationId,
          name: body.name,
          code: body.code,
          city: body.city,
          state: body.state,
          location: body.location,
          description: body.description,
          lifecycleStatus: ProjectLifecycle.DRAFT,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Project code already exists');
      }
      throw e;
    }
  }

  async update(actor: AuthPrincipal, id: string, body: Record<string, unknown>) {
    await this.get(actor, id);
    const data: Prisma.ProjectUpdateInput = {};
    for (const k of ['name', 'city', 'state', 'location', 'description', 'address', 'reraNumber', 'projectType'] as const) {
      if (body[k] !== undefined) (data as any)[k] = body[k];
    }
    if (body.agentVisible !== undefined) data.agentVisible = Boolean(body.agentVisible);
    if (body.customerListed !== undefined) data.customerListed = Boolean(body.customerListed);
    if (body.resaleAvailable !== undefined) data.resaleAvailable = Boolean(body.resaleAvailable);
    if (body.lifecycleStatus !== undefined) data.lifecycleStatus = body.lifecycleStatus as ProjectLifecycle;
    return this.prisma.project.update({ where: { id }, data });
  }
}
