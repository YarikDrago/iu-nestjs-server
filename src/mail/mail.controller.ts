import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { ContactMessageDto } from './dto/contact-message.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test')
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

  @Post('contact')
  async sendContactMessage(@Body() body: ContactMessageDto) {
    try {
      await this.mailService.sendContactMessage(body);
      return { success: true, message: 'Message sent successfully' };
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
