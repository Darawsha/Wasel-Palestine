import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlertDto {
  @ApiProperty({
    description: 'Recipient user identifier',
    example: 42,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({
    required: false,
    description: 'Incident identifier linked to this alert',
    example: 'inc_20260413_001',
  })
  @IsOptional()
  @IsString()
  incidentId?: string;

  @ApiProperty({
    description: 'Alert message content',
    example: 'Road closure reported near City Center checkpoint.',
  })
  @IsString()
  @IsNotEmpty()
  messageBody: string;

  @ApiProperty({
    required: false,
    description: 'Delivery or read status of the alert',
    example: 'unread',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
