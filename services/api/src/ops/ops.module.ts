import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';
import { RbacModule } from '../rbac/rbac.module';
import { PlotsModule } from '../plots/plots.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RbacModule, PlotsModule, AuditModule],
  controllers: [OpsController],
  providers: [OpsService],
  exports: [OpsService],
})
export class OpsModule {}
