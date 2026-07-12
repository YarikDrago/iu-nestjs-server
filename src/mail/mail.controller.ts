import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { ContactMessageDto } from './dto/contact-message.dto';
import { TestMessageDto } from './dto/test-message.st';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  async testMail(@Body() body: TestMessageDto) {
    try {
      console.log('try to send email');
      await this.mailService.sendTestMail(body);
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
