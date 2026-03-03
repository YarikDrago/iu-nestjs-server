import { Controller, Get } from '@nestjs/common';

@Controller('system')
export class SystemController {
  constructor() {
    //
  }

  @Get('test')
  test() {
    return {
      message: 'System is working',
    };
  }
}
