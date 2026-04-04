import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: true,
  // Keep schema sync opt-in to avoid crashes when legacy rows violate new FKs.
  synchronize: parseBoolean(process.env.DB_SYNCHRONIZE, true),
};
