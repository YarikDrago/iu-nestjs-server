import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface HealthResponse {
  status: 'ok';
  database: 'up';
}

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<HealthResponse> {
    if (this.isDatabaseDownSimulated()) {
      this.throwDatabaseUnavailable();
    }

    try {
      await this.dataSource.query('SELECT 1');

      return {
        status: 'ok',
        database: 'up',
      };
    } catch {
      this.throwDatabaseUnavailable();
    }
  }

  private isDatabaseDownSimulated(): boolean {
    return (
      process.env.NODE_ENV !== 'production' &&
      process.env.SIM_DATABASE_DOWN === 'true'
    );
  }

  private throwDatabaseUnavailable(): never {
    throw new ServiceUnavailableException({
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      status: 'error',
      database: 'down',
      message: 'Database connection is unavailable',
    });
  }
}
