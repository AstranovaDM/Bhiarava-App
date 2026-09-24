import { Module } from '@nestjs/common';
import { OpsService } from './ops.service';
import { OpsController } from './ops.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule],
  providers: [OpsService],
  controllers: [OpsController],
  exports: [OpsService],
})
export class OpsModule {}
