import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: Pick<DataSource, 'query'>;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };

    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns ok when database query succeeds', async () => {
    jest.mocked(dataSource.query).mockResolvedValueOnce([{ ok: 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('throws 503 when database query fails', async () => {
    jest.mocked(dataSource.query).mockRejectedValueOnce(new Error('DB down'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws 503 without querying database when simulation is enabled outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SIM_DATABASE_DOWN = 'true';

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('ignores database simulation in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SIM_DATABASE_DOWN = 'true';
    jest.mocked(dataSource.query).mockResolvedValueOnce([{ ok: 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });
});
