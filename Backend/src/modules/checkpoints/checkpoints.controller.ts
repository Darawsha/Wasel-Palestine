import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CheckpointsService } from './checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CheckpointQueryDto } from './dto/checkpoint-query.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CheckpointHistoryEnvelopeResponseDto,
  CheckpointPaginatedResponseDto,
  CheckpointResponseDto,
} from './dto/checkpoint-response.dto';
import { CountResponseDto } from '../../common/dto/common-response.dto';
import {
  ErrorResponseDto,
  ValidationErrorResponseDto,
} from '../../common/dto/error-response.dto';

@ApiTags('Checkpoints')
@ApiBearerAuth('token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'checkpoints', version: '1' })
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({
    summary: 'Create a checkpoint (collection-style endpoint)',
    description:
      'Creates a new checkpoint record from the provided payload. This endpoint is restricted to admin users.',
  })
  @ApiCreatedResponse({
    description: 'Checkpoint created successfully',
    type: CheckpointResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkpoint payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  createFromCollection(
    @Body() createCheckpointDto: CreateCheckpointDto,
    @Request() req,
  ) {
    return this.create(createCheckpointDto, req);
  }

  @Roles(UserRole.ADMIN)
  @Post('create')
  @ApiOperation({
    summary: 'Create a checkpoint',
    description:
      'Creates a checkpoint with location, status, and optional metadata. Restricted to admins.',
  })
  @ApiCreatedResponse({
    description: 'Checkpoint created successfully',
    type: CheckpointResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkpoint payload',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  create(@Body() createCheckpointDto: CreateCheckpointDto, @Request() req) {
    return this.checkpointsService.create(
      createCheckpointDto,
      req.user.userId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List checkpoints with optional filtering',
    description:
      'Returns a paginated checkpoint list and supports filtering by status and sorting options.',
  })
  @ApiQuery({
    name: 'currentStatus',
    required: false,
    enum: ['OPEN', 'DELAYED', 'CLOSED', 'RESTRICTED'],
    example: 'OPEN',
    description: 'Filter checkpoints by current status',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'createdAt', 'updatedAt'],
    example: 'createdAt',
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Items per page',
  })
  @ApiOkResponse({
    description: 'Checkpoint list returned',
    type: CheckpointPaginatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  findAll(@Query() checkpointQueryDto: CheckpointQueryDto, @Request() req) {
    return this.checkpointsService.findAll(checkpointQueryDto, {
      includeUnpublished: req.user.role === UserRole.ADMIN,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('counts')
  @ApiOperation({
    summary: 'Get total checkpoint count',
    description: 'Returns the total number of checkpoints in the system.',
  })
  @ApiOkResponse({
    description: 'Checkpoint count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async countCheckpoints() {
    const count = await this.checkpointsService.countCheckpoints();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-count')
  @ApiOperation({
    summary: 'Get active checkpoint count',
    description: 'Returns the number of checkpoints currently marked as OPEN.',
  })
  @ApiOkResponse({
    description: 'Active checkpoint count returned',
    type: CountResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  async getActiveCheckpointsCount() {
    const count = await this.checkpointsService.getActiveCheckpointsCount();
    return { count };
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Get checkpoint status history',
    description:
      'Returns chronological status transition records for a specific checkpoint.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Checkpoint identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Checkpoint history returned',
    type: CheckpointHistoryEnvelopeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkpoint id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Checkpoint not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.getHistory(id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a checkpoint by id',
    description: 'Returns detailed checkpoint data for the provided identifier.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Checkpoint identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Checkpoint returned',
    type: CheckpointResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkpoint id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Checkpoint not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  findOne(@Param('id') id: string, @Request() req) {
    return this.checkpointsService.findOne(+id, {
      includeUnpublished: req.user.role === UserRole.ADMIN,
    });
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a checkpoint',
    description:
      'Updates checkpoint details and optionally synchronizes related active incidents. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Checkpoint identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Checkpoint updated successfully',
    type: CheckpointResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid update payload or checkpoint id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required or update blocked by business rule',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Checkpoint not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCheckpointDto: UpdateCheckpointDto,
    @Request() req,
  ) {
    return this.checkpointsService.update(
      id,
      updateCheckpointDto,
      req.user.userId,
    );
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update checkpoint operational status',
    description:
      'Changes only the runtime status of a checkpoint and records status history. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Checkpoint identifier',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Checkpoint status updated successfully',
    type: CheckpointResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid status payload or checkpoint id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required or status locked by business rule',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Checkpoint not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req,
  ) {
    return this.checkpointsService.updateStatus(
      id,
      updateStatusDto,
      req.user.userId,
    );
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a checkpoint',
    description:
      'Deletes the checkpoint with the provided id. Restricted to admins.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Checkpoint identifier',
    example: 6,
  })
  @ApiNoContentResponse({
    description: 'Checkpoint deleted successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid checkpoint id',
    type: ValidationErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Checkpoint not found',
    type: ErrorResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.checkpointsService.remove(id, req.user.userId);
  }
}
