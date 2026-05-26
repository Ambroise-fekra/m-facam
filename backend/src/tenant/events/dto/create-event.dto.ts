import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsEnum(['wedding', 'death', 'project', 'birthday', 'other', 'loan', 'external'])
  type: 'wedding' | 'death' | 'project' | 'birthday' | 'other' | 'loan' | 'external';

  @IsString()
  @Length(3, 160)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Optional for every type except 'loan' (validated in the service). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetAmount?: number;

  /** Indicative amount each member is suggested to contribute (non-loan). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedPerMember?: number;

  /** Date réelle de l'évènement (cérémonie). */
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  /** Date de clôture des cotisations (versement au responsable). */
  @IsDateString()
  deadline: string;

  /** Date limite du vote de décision (proposition). Défaut: +7 jours. */
  @IsOptional()
  @IsDateString()
  decisionDeadline?: string;

  @IsUUID()
  responsibleId: string;

  /** Required for type='loan' : the member receiving the loan (= the creator). */
  @IsOptional()
  @IsUUID()
  borrowerId?: string;
}
