import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'checkpoints', version: '1' })
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  createFromCollection(@Body() createCheckpointDto: CreateCheckpointDto) {
    return this.create(createCheckpointDto);
  }

  @Roles(UserRole.ADMIN)
  @Post('create')
  create(@Body() createCheckpointDto: CreateCheckpointDto) {
    return this.checkpointsService.create(createCheckpointDto);
  }

  @Get()
  findAll(@Query() checkpointQueryDto: CheckpointQueryDto) {
    return this.checkpointsService.findAll(checkpointQueryDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('counts')
  async countCheckpoints() {
    const count = await this.checkpointsService.countCheckpoints();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get('active-count')
  async getActiveCheckpointsCount() {
    const count = await this.checkpointsService.getActiveCheckpointsCount();
    return { count };
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.getHistory(id).then((data) => ({ data }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkpointsService.findOne(+id);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.remove(id);
  }

  

}
