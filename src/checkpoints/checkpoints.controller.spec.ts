import { Body,Controller,Get,Param,ParseIntPipe,Patch,Post,} from '@nestjs/common';
import { CheckpointsService } from './checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';
import { UpdateCheckpointDto } from './dto/update-checkpoint.dto';

@Controller('checkpoints')
export class CheckpointsController {
  constructor(private readonly checkpointsService: CheckpointsService) {}

  @Post()
  create(@Body() createCheckpointDto: CreateCheckpointDto) {
    return this.checkpointsService.create(createCheckpointDto);
  }



  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.checkpointsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCheckpointDto: UpdateCheckpointDto,
  ) {
    return this.checkpointsService.update(id, updateCheckpointDto);
  }
}