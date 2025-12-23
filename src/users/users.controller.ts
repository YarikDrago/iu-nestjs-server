import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
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

  @Post('register')
  async register(@Body() body: RegisterUserDto) {
    console.log('try to register user');
    if (!body || !body.email || !body.nickname || !body.password)
      throw new HttpException(
        'Email, nickname and password are required',
        HttpStatus.BAD_REQUEST,
      );
    console.log('body:', body);
    const email = body.email.toLowerCase();
    const nickname = body.nickname;
    const password = body.password;
    /* Try to find the current email in the DB. The new email must be out of the DB. **/
    const findUser = await this.usersService.findUserByEmail(email);
    if (findUser) {
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
    console.log('User does not exist in the DB');
    /* Generate unique activation link */
    // TODO [iu]: check uniqueness of the link
    const activationLink = uuidv4();
    console.log('activation Link:', activationLink);
    // Hashing of the password. 1- password, 2- salt
    const hashPassword = await bcrypt.hash(password, 3);
    console.log('hashed password:', hashPassword);
    /* Add new user to the DB */
    const addingUser = await this.usersService.addNewUser({
      email: email,
      nickname: nickname,
      password: hashPassword,
    });
    console.log('added user:', addingUser);
    const userId = addingUser.id;
    /* Save activation link to the DB */
    await this.usersService.addNewUserActivationLink(userId, activationLink);
    /* Send the activation link to the user's email */
    await this.mailService.sendActivationLink(email, activationLink);
    console.log("Activation link was successfully sent to the user's email!");
    return true;
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
