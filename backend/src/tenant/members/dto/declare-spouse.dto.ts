import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';

/**
 * Tout membre actif peut déclarer son conjoint actuel. Deux cas :
 *  - Le conjoint est déjà dans la famille (existant) : on passe juste spouseId.
 *  - Le conjoint n'existe pas encore : on l'ajoute (firstName / lastName /
 *    gender obligatoires, comme pour un descendant). Il est créé inactif —
 *    l'admin l'activera plus tard.
 *
 * La relation est bidirectionnelle : on positionne spouse_id sur les deux
 * membres. Un membre n'a qu'un seul conjoint à la fois (remariage = écrasement).
 */
export class DeclareSpouseDto {
  /**
   * Optionnel : id du membre POUR LEQUEL on déclare un conjoint. Réservé à
   * l'admin ou au chef de famille (qui peuvent renseigner le conjoint d'un
   * autre membre, y compris décédé, pour l'arbre généalogique). Sans cette
   * valeur, on agit sur le membre authentifié (= déclaration de son propre
   * conjoint).
   */
  @IsOptional()
  @IsString()
  targetMemberId?: string;

  /** Si fourni, on lie un membre existant — les autres champs sont ignorés. */
  @IsOptional()
  @IsString()
  spouseId?: string;

  // --- Sinon, infos du nouveau membre conjoint à créer ---

  @IsOptional()
  @IsString()
  @Length(2, 80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  lastName?: string;

  @IsOptional()
  @IsEnum(['M', 'F', 'O'])
  gender?: 'M' | 'F' | 'O';

  @IsOptional()
  @IsString()
  birthDate?: string; // 'YYYY-MM-DD' ou ''

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 80)
  nickname?: string;
}
