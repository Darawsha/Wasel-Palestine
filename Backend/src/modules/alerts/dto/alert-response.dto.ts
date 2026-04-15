import { ApiProperty } from '@nestjs/swagger';

export class AlertMessageResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 'b2f6cf0a-0619-4dd8-8d72-3f53e75b7bc0'
  })
  id: string;

  @ApiProperty({
    description: 'Describes the incident id field.',
    example: 'inc_20260413_001'
  })
  incidentId: string;

  @ApiProperty({
    description: 'Describes the message body field.',
    example: 'Road closure reported near City Center checkpoint.',
  })
  messageBody: string;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T08:20:00.000Z'
  })
  createdAt: string;
}

export class AlertRecordResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 'a7c3d2f4-2c1a-4d91-8f4e-04f1b1ddab1a'
  })
  id: string;

  @ApiProperty({
    description: 'Describes the user id field.',
    example: 15
  })
  userId: number;

  @ApiProperty({
    description: 'Describes the status field.',
    example: 'PENDING'
  })
  status: string;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T08:21:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Describes the message field.',
    type: AlertMessageResponseDto,
    example: {
      id: 'b2f6cf0a-0619-4dd8-8d72-3f53e75b7bc0',
      incidentId: 'inc_20260413_001',
      messageBody: 'Road closure reported near City Center checkpoint.',
      createdAt: '2026-04-13T08:20:00.000Z',
    },
  })
  message: AlertMessageResponseDto;
}

export class AlertPreferenceResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 'cf8f95c4-4c75-4d45-b150-3b1be65aa812'
  })
  id: string;

  @ApiProperty({
    description: 'Describes the user id field.',
    example: 15
  })
  userId: number;

  @ApiProperty({
    description: 'Describes the geographic area field.',
    example: 'Nablus Downtown'
  })
  geographicArea: string;

  @ApiProperty({
    description: 'Describes the incident category field.',
    example: 'accident'
  })
  incidentCategory: string;

  @ApiProperty({
    description: 'Describes the is active field.',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T08:00:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Describes the updated at field.',
    example: '2026-04-13T08:10:00.000Z'
  })
  updatedAt: string;
}
