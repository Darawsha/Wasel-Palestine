import { Controller, Get, Post, Body, Patch, Param, Delete,ParseIntPipe,Query} from '@nestjs/common';
import { CheckpointsService } from './checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CheckpointQueryDto } from './dto/checkpoint-query.dto';

@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Post()
  create(@Body() createCheckpointDto: CreateCheckpointDto) {
    return this.checkpointsService.create(createCheckpointDto);
  }

@Get()
findAll(@Query() checkpointQueryDto: CheckpointQueryDto) {
  return this.checkpointsService.findAll(checkpointQueryDto);
}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.checkpointsService.findOne(+id);
  }

   @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCheckpointDto: UpdateCheckpointDto,
  ) {
    return this.checkpointsService.update(id, updateCheckpointDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.checkpointsService.updateStatus(id, updateStatusDto);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.getHistory(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.remove(id);
  }
}


