import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateContactDto } from './create-contact.dto';

/** Tous les champs optionnels (companyId exclu) ; les règles s'appliquent si présents. */
export class UpdateContactDto extends PartialType(
  OmitType(CreateContactDto, ['companyId'] as const),
) {}
