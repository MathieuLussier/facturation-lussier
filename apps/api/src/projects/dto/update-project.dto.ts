import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

/** Tous les champs optionnels sauf companyId ; les règles de validation s'appliquent si présents. */
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['companyId'] as const)) {}
