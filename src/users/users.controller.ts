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
    console.log('try to send email');
    await this.mailService.sendTestMail();
    throw new HttpException('Temporary error (msg)', HttpStatus.BAD_REQUEST);
  }
}
