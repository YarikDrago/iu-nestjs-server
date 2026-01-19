import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';
import { ActivateUserDto } from './dto/activate-user.dto';

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

  @Post('activate')
  async activate(@Body() dto: ActivateUserDto) {
    try {
      console.log('try to activate user');
      if (!dto || !dto.token) {
        console.log('token is null');
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }
      console.log('token:', dto.token);
      /* Find user by activation link */
      await this.usersService.activate(dto.token);
      console.log('user successfully activated');
      return { message: 'User successfully activated' };
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }
}
