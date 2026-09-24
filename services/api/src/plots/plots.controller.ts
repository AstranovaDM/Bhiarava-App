import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

@Controller('plots')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PlotsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('project/:projectId')
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal, @Param('projectId') projectId: string) {
    return this.prisma.plot.findMany({
      where: { organizationId: user.organizationId, projectId },
      orderBy: { number: 'asc' },
    });
  }
}
