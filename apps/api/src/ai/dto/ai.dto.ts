/**
 * FusionOS AI DTOs
 *
 * Input validation for all AI API endpoints.
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class ConfirmActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class RejectActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
