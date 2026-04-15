import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const resolvedMessage = this.resolveMessage(exception, isHttpException);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${resolvedMessage}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(statusCode).json({
      statusCode,
      error:
        statusCode === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'Internal Server Error'
          : 'Request Failed',
      message:
        statusCode === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'An unexpected error occurred. Please try again later.'
          : resolvedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  private resolveMessage(exception: unknown, isHttpException: boolean): string {
    if (!isHttpException) {
      return exception instanceof Error ? exception.message : 'Unhandled exception';
    }

    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object') {
      const message = (response as { message?: unknown }).message;

      if (Array.isArray(message)) {
        return message.join(', ');
      }

      if (typeof message === 'string') {
        return message;
      }
    }

    return httpException.message;
  }
}