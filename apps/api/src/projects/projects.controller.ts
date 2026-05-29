import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Project } from '@facturation/core';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

// Routes protégées par le JwtAuthGuard global : tout utilisateur authentifié.
@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Query('companyId') companyId?: string): Promise<Project[]> {
    return this.projects.list(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Project> {
    return this.projects.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto): Promise<Project> {
    return this.projects.create({
      companyId: dto.companyId,
      name: dto.name,
      status: dto.status,
      notes: dto.notes,
      billingContactIds: dto.billingContactIds ?? [],
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto): Promise<Project> {
    return this.projects.update(id, {
      name: dto.name,
      status: dto.status,
      notes: dto.notes,
      billingContactIds: dto.billingContactIds,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.projects.remove(id);
  }
}
