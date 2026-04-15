import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';

type OpenApiDocument = {
  paths?: Record<string, Record<string, any>>;
  components?: {
    responses?: Record<string, any>;
    schemas?: Record<string, unknown>;
  };
};

type OpenApiParameterSchema = {
  type?: string;
  format?: string;
  enum?: unknown[];
  items?: OpenApiParameterSchema;
  example?: unknown;
  default?: unknown;
  minimum?: number;
};

type OpenApiParameter = {
  in?: string;
  name?: string;
  required?: boolean;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
  schema?: OpenApiParameterSchema;
};

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: unknown[];
  example?: unknown;
  examples?: unknown[];
  default?: unknown;
  minimum?: number;
  nullable?: boolean;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  additionalProperties?: boolean | OpenApiSchema;
};

type OpenApiMediaType = {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
};

type OpenApiRequestBody = {
  content?: Record<string, OpenApiMediaType>;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses?: Record<string, unknown>;
};

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
] as const;

function inferParameterExample(parameter: OpenApiParameter): unknown {
  const schema = parameter.schema ?? {};

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.type === 'array') {
    const itemSchema = schema.items ?? {};

    if (Array.isArray(itemSchema.enum) && itemSchema.enum.length > 0) {
      return [itemSchema.enum[0]];
    }

    if (itemSchema.example !== undefined) {
      return [itemSchema.example];
    }

    if (itemSchema.type === 'integer' || itemSchema.type === 'number') {
      return [1];
    }

    if (itemSchema.type === 'boolean') {
      return [true];
    }

    if (itemSchema.type === 'string') {
      return ['sample'];
    }
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    if (typeof schema.minimum === 'number') {
      return schema.minimum > 0 ? schema.minimum : 1;
    }
    return 1;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  if (schema.type === 'string') {
    if (schema.format === 'date-time') {
      return '2026-04-13T00:00:00.000Z';
    }

    if (schema.format === 'uuid') {
      return '00000000-0000-0000-0000-000000000001';
    }

    if (parameter.in === 'path' && parameter.name?.toLowerCase().includes('id')) {
      return '1';
    }

    return 'sample';
  }

  return undefined;
}

function applySwaggerParameterExamples(document: OpenApiDocument): void {
  if (!document.paths) {
    return;
  }

  Object.values(document.paths).forEach((pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    HTTP_METHODS.forEach((method) => {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') {
        return;
      }

      const parameters = Array.isArray(operation.parameters)
        ? (operation.parameters as OpenApiParameter[])
        : [];

      parameters.forEach((parameter) => {
        if (!parameter || typeof parameter !== 'object') {
          return;
        }

        if (parameter.in === 'path') {
          parameter.required = true;
        }

        const inferredExample =
          parameter.example !== undefined
            ? parameter.example
            : inferParameterExample(parameter);

        if (inferredExample === undefined) {
          return;
        }

        parameter.example = inferredExample;
        parameter.schema = parameter.schema ?? {};
        parameter.schema.example = parameter.schema.example ?? inferredExample;
        parameter.schema.default = parameter.schema.default ?? inferredExample;

        if (!parameter.examples || Object.keys(parameter.examples).length === 0) {
          parameter.examples = {
            default: { value: inferredExample },
          };
        }
      });
    });
  });
}

function resolveOpenApiSchemaRef(
  document: OpenApiDocument,
  ref: string,
): OpenApiSchema | undefined {
  const schemaPrefix = '#/components/schemas/';
  if (!ref.startsWith(schemaPrefix)) {
    return undefined;
  }

  const schemaName = ref.slice(schemaPrefix.length);
  const schema = document.components?.schemas?.[schemaName];

  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  return schema as OpenApiSchema;
}

function inferSchemaExample(
  document: OpenApiDocument,
  schema?: OpenApiSchema,
  depth = 0,
  seenRefs: Set<string> = new Set(),
): unknown {
  if (!schema || depth > 10) {
    return undefined;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.default !== undefined) {
    return schema.default;
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) {
      return undefined;
    }

    const resolvedSchema = resolveOpenApiSchemaRef(document, schema.$ref);
    if (!resolvedSchema) {
      return undefined;
    }

    const nextSeenRefs = new Set(seenRefs);
    nextSeenRefs.add(schema.$ref);
    return inferSchemaExample(document, resolvedSchema, depth + 1, nextSeenRefs);
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const mergedObjectExample: Record<string, unknown> = {};
    let mergedObjectHasValue = false;

    for (const candidate of schema.allOf) {
      const candidateExample = inferSchemaExample(
        document,
        candidate,
        depth + 1,
        seenRefs,
      );

      if (
        candidateExample &&
        typeof candidateExample === 'object' &&
        !Array.isArray(candidateExample)
      ) {
        Object.assign(mergedObjectExample, candidateExample);
        mergedObjectHasValue = true;
      } else if (candidateExample !== undefined && !mergedObjectHasValue) {
        return candidateExample;
      }
    }

    if (mergedObjectHasValue) {
      return mergedObjectExample;
    }
  }

  const firstVariantSchema =
    Array.isArray(schema.oneOf) && schema.oneOf.length > 0
      ? schema.oneOf[0]
      : Array.isArray(schema.anyOf) && schema.anyOf.length > 0
        ? schema.anyOf[0]
        : undefined;

  if (firstVariantSchema) {
    const variantExample = inferSchemaExample(
      document,
      firstVariantSchema,
      depth + 1,
      seenRefs,
    );
    if (variantExample !== undefined) {
      return variantExample;
    }
  }

  if (schema.type === 'array') {
    const itemExample = inferSchemaExample(
      document,
      schema.items,
      depth + 1,
      seenRefs,
    );
    return itemExample === undefined ? [] : [itemExample];
  }

  if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
    const objectExample: Record<string, unknown> = {};
    const properties = schema.properties ?? {};

    Object.entries(properties).forEach(([propertyName, propertySchema]) => {
      const propertyExample = inferSchemaExample(
        document,
        propertySchema,
        depth + 1,
        seenRefs,
      );

      if (propertyExample !== undefined) {
        objectExample[propertyName] = propertyExample;
      }
    });

    if (Object.keys(objectExample).length > 0) {
      return objectExample;
    }

    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      const additionalPropertyExample = inferSchemaExample(
        document,
        schema.additionalProperties,
        depth + 1,
        seenRefs,
      );

      if (additionalPropertyExample !== undefined) {
        return { key: additionalPropertyExample };
      }
    }

    return {};
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    if (typeof schema.minimum === 'number') {
      return schema.minimum > 0 ? schema.minimum : 1;
    }
    return 1;
  }

  if (schema.type === 'boolean') {
    return true;
  }

  if (schema.type === 'string') {
    if (schema.format === 'date-time') {
      return '2026-04-13T00:00:00.000Z';
    }

    if (schema.format === 'date') {
      return '2026-04-13';
    }

    if (schema.format === 'uuid') {
      return '00000000-0000-0000-0000-000000000001';
    }

    if (schema.format === 'email') {
      return 'sample@example.com';
    }

    return 'sample';
  }

  return undefined;
}

function applySwaggerRequestBodyExamples(document: OpenApiDocument): void {
  if (!document.paths) {
    return;
  }

  Object.values(document.paths).forEach((pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    HTTP_METHODS.forEach((method) => {
      const operation = pathItem[method] as OpenApiOperation | undefined;
      if (!operation || typeof operation !== 'object') {
        return;
      }

      const requestBody = operation.requestBody;
      if (!requestBody || typeof requestBody !== 'object') {
        return;
      }

      const content = requestBody.content;
      if (!content || typeof content !== 'object') {
        return;
      }

      Object.values(content).forEach((mediaType) => {
        if (!mediaType || typeof mediaType !== 'object') {
          return;
        }

        const hasExplicitExample =
          mediaType.example !== undefined ||
          (mediaType.examples && Object.keys(mediaType.examples).length > 0);

        if (hasExplicitExample) {
          return;
        }

        const inferredExample = inferSchemaExample(document, mediaType.schema);
        if (inferredExample === undefined) {
          return;
        }

        mediaType.example = inferredExample;
        mediaType.schema = mediaType.schema ?? {};
        mediaType.schema.example =
          mediaType.schema.example ?? inferredExample;
      });
    });
  });
}

function applyGlobalSwaggerErrorResponses(document: OpenApiDocument): void {
  if (!document.paths) {
    return;
  }

  document.components = document.components ?? {};
  document.components.schemas = document.components.schemas ?? {};
  document.components.responses = document.components.responses ?? {};

  document.components.schemas.GlobalErrorResponse = {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: 500 },
      error: { type: 'string', example: 'Internal Server Error' },
      message: {
        type: 'string',
        example: 'An unexpected error occurred. Please try again later.',
      },
      timestamp: { type: 'string', format: 'date-time' },
      path: { type: 'string', example: '/api/v1/resource' },
      method: { type: 'string', example: 'GET' },
    },
    required: ['statusCode', 'error', 'message', 'timestamp', 'path', 'method'],
  };

  document.components.responses.GlobalUnauthorizedResponse = {
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/GlobalErrorResponse' },
        example: {
          statusCode: 401,
          error: 'Request Failed',
          message: 'Unauthorized',
          timestamp: new Date().toISOString(),
          path: '/api/v1/resource',
          method: 'GET',
        },
      },
    },
  };

  document.components.responses.GlobalInternalServerErrorResponse = {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/GlobalErrorResponse' },
        example: {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred. Please try again later.',
          timestamp: new Date().toISOString(),
          path: '/api/v1/resource',
          method: 'GET',
        },
      },
    },
  };

  Object.values(document.paths).forEach((pathItem) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return;
    }

    HTTP_METHODS.forEach((method) => {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') {
        return;
      }

      operation.responses = operation.responses ?? {};
      operation.responses['401'] =
        operation.responses['401'] ?? {
          $ref: '#/components/responses/GlobalUnauthorizedResponse',
        };
      operation.responses['500'] =
        operation.responses['500'] ?? {
          $ref: '#/components/responses/GlobalInternalServerErrorResponse',
        };
    });
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3000);
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.enableCors({
    origin: '*',
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Wasel Palestine API')
    .setDescription('API documentation for route estimation and other modules')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      'token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  applySwaggerParameterExamples(document);
  applySwaggerRequestBodyExamples(document);
  applyGlobalSwaggerErrorResponses(document);
  SwaggerModule.setup('api/docs', app, document);

  try {
    await app.listen(port);
    logger.log(`Server is listening on http://localhost:${port}`);
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      logger.error(
        `Port ${port} is already in use. Stop the existing process or set PORT to a different value before starting the server.`,
      );
      await app.close();
      process.exit(1);
    }

    throw error;
  }
}
bootstrap();
