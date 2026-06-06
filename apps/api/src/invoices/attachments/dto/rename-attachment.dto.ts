import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameAttachmentDto {
  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  @MaxLength(255)
  fileName!: string;
}
