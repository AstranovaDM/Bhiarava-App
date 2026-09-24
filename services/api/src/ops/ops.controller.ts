import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { IsObject } from 'class-validator';
import { OpsService } from './ops.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class UpdateSettingsDto {
  @IsObject()
  settingsJson!: Record<string, unknown>;
}

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('agents')
  @RequirePermissions('projects.view')
  agents(@CurrentUser() user: AuthPrincipal) {
    return this.ops.agents(user);
  }

  @Get('receipts')
  @RequirePermissions('finance.view')
  receipts(@CurrentUser() user: AuthPrincipal) {
    return this.ops.receipts(user);
  }

  @Get('commissions')
  @RequirePermissions('finance.view')
  commissions(@CurrentUser() user: AuthPrincipal) {
    return this.ops.commissions(user);
  }

  @Get('payment-schedules')
  @RequirePermissions('finance.view')
  schedules(@CurrentUser() user: AuthPrincipal, @Query('bookingId') bookingId?: string) {
    return this.ops.schedules(user, bookingId);
  }

  @Get('registrations')
  @RequirePermissions('projects.view')
  registrations(@CurrentUser() user: AuthPrincipal) {
    return this.ops.registrations(user);
  }

  @Get('resales')
  @RequirePermissions('projects.view')
  resales(@CurrentUser() user: AuthPrincipal) {
    return this.ops.resales(user);
  }

  @Get('users')
  @RequirePermissions('users.manage')
  users(@CurrentUser() user: AuthPrincipal) {
    return this.ops.users(user);
  }

  @Get('company-settings')
  @RequirePermissions('projects.view')
  companySettings(@CurrentUser() user: AuthPrincipal) {
    return this.ops.companySettings(user);
  }

  @Put('company-settings')
  @RequirePermissions('settings.manage')
  updateCompanySettings(@CurrentUser() user: AuthPrincipal, @Body() dto: UpdateSettingsDto) {
    return this.ops.updateCompanySettings(user, dto.settingsJson);
  }

  @Get('reports/summary')
  @RequirePermissions('reports.view')
  reports(@CurrentUser() user: AuthPrincipal) {
    return this.ops.reportsSummary(user);
  }
}
