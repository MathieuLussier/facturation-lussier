import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Health } from '@facturation/core';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Public : les sondes d'infrastructure (liveness/readiness) appellent /health sans JWT.
  @Public()
  @Get()
  @ApiOkResponse({ description: "État de santé de l'API et de la base de données." })
  check(): Promise<Health> {
    return this.healthService.check();
  }
}
