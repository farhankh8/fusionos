/**
 * FusionOS Intelligence DTOs
 */

import { IsString, IsUUID, MaxLength } from 'class-validator';

export class ExecuteScenarioDto {
  @IsString()
  @MaxLength(100)
  entityType!: string;

  @IsUUID()
  entityId!: string;
}
