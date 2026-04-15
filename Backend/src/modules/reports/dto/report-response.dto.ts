import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaResponseDto } from '../../../common/dto/common-response.dto';
import { UserRole } from '../../../common/enums/user-role.enum';
import { ReportCategory } from '../enums/report-category.enum';
import { ReportStatus } from '../enums/report-status.enum';
import { VoteType } from '../enums/VoteType.enum';

export class ReportSubmittedByUserResponseDto {
  @ApiProperty({
    description: 'Describes the id field.',
    example: 15
  })
  id: number;

  @ApiProperty({
    description: 'Describes the firstname field.',
    example: 'Ahmad'
  })
  firstname: string;

  @ApiProperty({
    description: 'Describes the lastname field.',
    example: 'Khaled'
  })
  lastname: string;

  @ApiProperty({
    description: 'Describes the email field.',
    example: 'ahmad@wasel.ps'
  })
  email: string;

  @ApiProperty({
    description: 'Describes the role field.',
    enum: UserRole, example: UserRole.CITIZEN
  })
  role: UserRole;
}

export class ReportInteractionSummaryResponseDto {
  @ApiProperty({
    description: 'Describes the up votes field.',
    example: 12
  })
  upVotes: number;

  @ApiProperty({
    description: 'Describes the down votes field.',
    example: 2
  })
  downVotes: number;

  @ApiProperty({
    description: 'Describes the confirmations field.',
    example: 7
  })
  confirmations: number;

  @ApiProperty({
    description: 'Describes the user vote type field.',
    enum: VoteType, example: VoteType.UP, nullable: true
  })
  userVoteType: VoteType | null;

  @ApiProperty({
    description: 'Describes the is confirmed by current user field.',
    example: true
  })
  isConfirmedByCurrentUser: boolean;
}

export class ReportResponseDto {
  @ApiProperty({
    description: 'Describes the report id field.',
    example: 42
  })
  reportId: number;

  @ApiProperty({
    description: 'Describes the latitude field.',
    example: 32.2211
  })
  latitude: number;

  @ApiProperty({
    description: 'Describes the longitude field.',
    example: 35.2544
  })
  longitude: number;

  @ApiProperty({
    description: 'Describes the location field.',
    example: 'Route 60, south entrance'
  })
  location: string;

  @ApiProperty({
    description: 'Describes the category field.',
    enum: ReportCategory, example: ReportCategory.ROAD_CLOSURE
  })
  category: ReportCategory;

  @ApiProperty({
    description: 'Describes the description field.',
    example: 'Checkpoint lane blocked and traffic is not moving.',
  })
  description: string;

  @ApiProperty({
    description: 'Describes the status field.',
    enum: ReportStatus, example: ReportStatus.PENDING
  })
  status: ReportStatus;

  @ApiProperty({
    description: 'Describes the submitted by user id field.',
    example: 15
  })
  submittedByUserId: number;

  @ApiProperty({
    description: 'Describes the submitted by user field.',
    oneOf: [
      { $ref: getSchemaPath(ReportSubmittedByUserResponseDto) },
      { enum: [null] },
    ],
    example: {
      id: 15,
      firstname: 'Ahmad',
      lastname: 'Khaled',
      email: 'ahmad@wasel.ps',
      role: 'citizen',
    },
  })
  submittedByUser: object | null;

  @ApiProperty({
    description: 'Describes the created at field.',
    example: '2026-04-13T08:00:00.000Z'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Describes the updated at field.',
    example: '2026-04-13T09:05:00.000Z'
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Describes the duplicate of field.',
    example: null, nullable: true
  })
  duplicateOf: number | null;

  @ApiProperty({
    description: 'Describes the confidence score field.',
    example: 76
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Describes the interaction summary field.',
    type: ReportInteractionSummaryResponseDto,
    example: {
      upVotes: 12,
      downVotes: 2,
      confirmations: 7,
      userVoteType: 'UP',
      isConfirmedByCurrentUser: true,
    },
  })
  interactionSummary: ReportInteractionSummaryResponseDto;
}

export class ReportCountsResponseDto {
  @ApiProperty({
    description: 'Describes the all field.',
    example: 120
  })
  all: number;

  @ApiProperty({
    description: 'Describes the pending field.',
    example: 64
  })
  pending: number;

  @ApiProperty({
    description: 'Describes the verified field.',
    example: 40
  })
  verified: number;

  @ApiProperty({
    description: 'Describes the rejected field.',
    example: 16
  })
  rejected: number;
}

export class ReportPaginatedResponseDto {
  @ApiProperty({
    description: 'Describes the data field.',
    type: [ReportResponseDto],
    example: [
      {
        reportId: 42,
        latitude: 32.2211,
        longitude: 35.2544,
        location: 'Route 60, south entrance',
        category: 'road_closure',
        description: 'Checkpoint lane blocked and traffic is not moving.',
        status: 'pending',
        submittedByUserId: 15,
        createdAt: '2026-04-13T08:00:00.000Z',
        updatedAt: '2026-04-13T09:05:00.000Z',
        duplicateOf: null,
        confidenceScore: 76,
        interactionSummary: {
          upVotes: 12,
          downVotes: 2,
          confirmations: 7,
          userVoteType: 'UP',
          isConfirmedByCurrentUser: true,
        },
      },
    ],
  })
  data: ReportResponseDto[];

  @ApiProperty({
    description: 'Describes the meta field.',
    type: PaginationMetaResponseDto,
    example: {
      total: 120,
      page: 1,
      limit: 10,
      totalPages: 12,
    },
  })
  meta: PaginationMetaResponseDto;

  @ApiProperty({
    description: 'Describes the counts field.',
    type: ReportCountsResponseDto,
    example: {
      all: 120,
      pending: 64,
      verified: 40,
      rejected: 16,
    },
  })
  counts: ReportCountsResponseDto;
}

export class ReportInteractionResultResponseDto {
  @ApiProperty({
    description: 'Describes the report id field.',
    example: 42
  })
  reportId: number;

  @ApiProperty({
    description: 'Describes the confidence score field.',
    example: 78.4
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Describes the interaction summary field.',
    type: ReportInteractionSummaryResponseDto,
    example: {
      upVotes: 12,
      downVotes: 2,
      confirmations: 7,
      userVoteType: 'UP',
      isConfirmedByCurrentUser: true,
    },
  })
  interactionSummary: ReportInteractionSummaryResponseDto;
}

export class ReportModerationResultResponseDto {
  @ApiProperty({
    description: 'Describes the report id field.',
    example: 42
  })
  reportId: number;

  @ApiProperty({
    description: 'Describes the status field.',
    enum: ReportStatus, example: ReportStatus.UNDER_REVIEW
  })
  status: ReportStatus;

  @ApiProperty({
    description: 'Describes the confidence score field.',
    example: 76
  })
  confidenceScore: number;

  @ApiProperty({
    description: 'Describes the updated at field.',
    example: '2026-04-13T10:30:00.000Z'
  })
  updatedAt: string;
}
