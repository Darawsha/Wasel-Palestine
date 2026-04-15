import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { MessageResponseDto } from './common/dto/common-response.dto';
import { ErrorResponseDto } from './common/dto/error-response.dto';

@ApiTags('App')
@Controller({ version: '1' })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Get API welcome message',
    description:
      'Returns a simple health-style welcome message to confirm the API is reachable.',
  })
  @ApiOkResponse({
    description: 'Welcome message returned successfully',
    type: MessageResponseDto,
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server error',
    type: ErrorResponseDto,
  })
  getHello(): MessageResponseDto {
    return this.appService.getHello();
  }
}
