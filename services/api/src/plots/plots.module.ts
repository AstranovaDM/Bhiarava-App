import { Module } from '@nestjs/common';
import { PlotsController } from './plots.controller';
import { RbacModule } from '../rbac/rbac.module';

@Module({ imports: [RbacModule], controllers: [PlotsController] })
export class PlotsModule {}
