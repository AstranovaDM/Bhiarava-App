import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateReservationDto {
  @IsString()
  plotId!: string;

  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  holdHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

@Controller('reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @RequirePermissions('sales.reservations.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateReservationDto) {
    return this.reservations.reserve(user, dto);
  }
}

