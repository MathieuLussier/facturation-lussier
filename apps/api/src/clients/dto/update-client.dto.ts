import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';

/** Tous les champs optionnels ; les règles de validation s'appliquent si présents. */
export class UpdateClientDto extends PartialType(CreateClientDto) {}
