import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../rbac/permissions.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';

class CreateProjectDto {
  @IsString() @MinLength(1) name!: string;
  @IsString() @MinLength(1) code!: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
}

class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() reraNumber?: string;
  @IsOptional() @IsString() projectType?: string;
  @IsOptional() @IsString() lifecycleStatus?: string;
  @IsOptional() @IsBoolean() agentVisible?: boolean;
  @IsOptional() @IsBoolean() customerListed?: boolean;
  @IsOptional() @IsBoolean() resaleAvailable?: boolean;
}

@Controller('projects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  list(@CurrentUser() user: AuthPrincipal, @Query('lifecycleStatus') lifecycleStatus?: string) {
    return this.projects.list(user, { lifecycleStatus });
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  get(@CurrentUser() user: AuthPrincipal, @Param('id') id: string) {
    return this.projects.get(user, id);
  }

  @Post()
  @RequirePermissions('projects.edit')
  create(@CurrentUser() user: AuthPrincipal, @Body() dto: CreateProjectDto) {
    return this.projects.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('projects.edit')
  update(@CurrentUser() user: AuthPrincipal, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user, id, dto as any);
  }
}
