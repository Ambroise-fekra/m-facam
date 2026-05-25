import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateAllocationDto {
  @IsUUID()
  eventId: string;

  @IsNumber()
  @Min(1)
  amount: number;
}
