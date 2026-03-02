import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  @Get('user-test')
  async getUserName() {
    return await this.usersService.getUserName(3);
  }

  @Get('test-mail')
  async testMail() {
    try {
      console.log('try to send email');
      await this.mailService.sendTestMail();
      return { success: true, message: 'Email sent successfully' };
    } catch (e) {
      console.log('ERROR:', (e as Error).message);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new HttpException(
        (e as Error)?.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
