import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { PlotsModule } from './plots/plots.module';
import { ReservationsModule } from './reservations/reservations.module';
import { BookingsModule } from './bookings/bookings.module';
import { StorageModule } from './storage/storage.module';
import { PiiModule } from './pii/pii.module';
import { AuditModule } from './audit/audit.module';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL_MS || 60_000),
      limit: Number(process.env.THROTTLE_LIMIT || 60),
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    RbacModule,
    PlotsModule,
    ReservationsModule,
    BookingsModule,
    StorageModule,
    PiiModule,
    AuditModule,
    FinanceModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
