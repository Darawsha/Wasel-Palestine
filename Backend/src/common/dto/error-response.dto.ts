import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code returned for the failed request.',
    example: 500
  })
  statusCode: number;

  @ApiProperty({
    description: 'Short error label describing the failure category.',
    example: 'Internal Server Error'
  })
  error: string;

  @ApiProperty({
    description: 'Detailed error message intended for API clients.',
    example: 'An unexpected error occurred. Please try again later.',
  })
  message: string;

  @ApiProperty({
    description: 'ISO-8601 timestamp when the error response was generated.',
    example: '2026-04-13T10:32:15.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that triggered the error.',
    example: '/api/v1/incidents/1'
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used for the failed request.',
    example: 'GET'
  })
  method: string;
}

export class ValidationErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code returned for validation failures.',
    example: 400
  })
  statusCode: number;

  @ApiProperty({
    description: 'Short error label for validation exceptions.',
    example: 'Bad Request'
  })
  error: string;

  @ApiProperty({
    description: 'List of validation messages describing rejected fields.',
    type: [String],
    example: ['email must be an email', 'password should not be empty'],
  })
  message: string[];

  @ApiProperty({
    description: 'ISO-8601 timestamp when the validation error was generated.',
    example: '2026-04-13T10:32:15.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that failed validation checks.',
    example: '/api/v1/auth/signup'
  })
  path: string;

  @ApiProperty({
    description: 'HTTP method used for the invalid request.',
    example: 'POST'
  })
  method: string;
}
