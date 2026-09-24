import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateBookingDto {
  @IsString() plotId!: string;
  @IsString() customerId!: string;
  @IsOptional() @IsString() reservationId?: string;
  @IsOptional() @IsString() agentId?: string;
  @IsString() agreementValuePaise!: string;
  @IsOptional() @IsString() advancePaise?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @RequirePermissions('sales.bookings.manage')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateBookingDto) {
    return this.bookings.book(user, dto);
  }
}
