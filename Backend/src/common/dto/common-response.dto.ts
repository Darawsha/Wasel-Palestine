import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Human-readable confirmation message returned by successful operations.',
    example: 'Operation completed successfully.'
  })
  message: string;
}

export class DeletedResponseDto {
  @ApiProperty({
    description: 'Boolean flag indicating whether the delete operation succeeded.',
    example: true
  })
  deleted: boolean;
}

export class CountResponseDto {
  @ApiProperty({
    description: 'Aggregated numeric count returned by the endpoint.',
    example: 42
  })
  count: number;
}

export class PaginationMetaResponseDto {
  @ApiProperty({
    description: 'Total number of records that match the current query.',
    example: 125
  })
  total: number;

  @ApiProperty({
    description: 'Current page number in the paginated response.',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Maximum number of records returned per page.',
    example: 10
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages available for the current query.',
    example: 13
  })
  totalPages: number;
}

export class TimelinePointResponseDto {
  @ApiProperty({
    description: 'Display label for a single timeline bucket.',
    example: 'Apr 10'
  })
  label: string;

  @ApiProperty({
    description: 'Numeric value associated with the timeline bucket.',
    example: 7
  })
  value: number;
}

export class IncidentsTimelineResponseDto {
  @ApiProperty({
    description: 'Number of days included in the returned timeline window.',
    example: 30
  })
  periodDays: number;

  @ApiProperty({
    description: 'Ordered timeline points used by frontend charts.',
    type: [TimelinePointResponseDto],
    example: [
      { label: 'Apr 10', value: 7 },
      { label: 'Apr 11', value: 4 },
      { label: 'Apr 12', value: 9 },
    ],
  })
  points: TimelinePointResponseDto[];
}

export class RegistrationTrendResponseDto {
  @ApiProperty({
    description: 'Percentage change between the current and previous periods.',
    example: 14.29
  })
  percentageChange: number;

  @ApiProperty({
    description: 'Number of registrations in the current period.',
    example: 24
  })
  currentPeriodCount: number;

  @ApiProperty({
    description: 'Number of registrations in the previous period.',
    example: 21
  })
  previousPeriodCount: number;

  @ApiProperty({
    description: 'Length of each comparison period in days.',
    example: 7
  })
  periodDays: number;
}

export class RegistrationBucketResponseDto {
  @ApiProperty({
    description: 'Display label for the month bucket.',
    example: 'Jan'
  })
  label: string;

  @ApiProperty({
    description: 'Number of registrations recorded in the month bucket.',
    example: 35
  })
  value: number;
}

export class RegistrationBucketsResponseDto {
  @ApiProperty({
    description: 'Number of months included in the bucketed trend response.',
    example: 6
  })
  periodMonths: number;

  @ApiProperty({
    description: 'Bucketed monthly registration values for chart rendering.',
    type: [RegistrationBucketResponseDto],
    example: [
      { label: 'Jan', value: 35 },
      { label: 'Feb', value: 41 },
      { label: 'Mar', value: 38 },
    ],
  })
  buckets: RegistrationBucketResponseDto[];
}
