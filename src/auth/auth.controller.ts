import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import * as cookie from 'cookie';
import { RefreshTokenService } from '../refreshToken/refresh-token.service';
import { LoginUserDto } from '../users/dto/login-user.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { MailService } from '../mail/mail.service';
import { ActivateUserDto } from '../users/dto/activate-user.dto';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { UserTelegramAccountDto } from '../users/dto/user-telegram-account.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly mailService: MailService,
  ) {}

  @Post('login')
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log('try to login user');
      if (!dto || !dto.email || !dto.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('dto:', dto);
      const user = await this.usersService.findUserByEmail(dto.email, true);
      if (!user) {
        console.log('user not found');
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('user:', user);
      let roles: string[] = [];
      if (user.userRoles === undefined) {
        console.log("ERROR: userRoles is undefined. User's roles are not set.");
      } else {
        roles = user.userRoles.map((ur) => ur.role.name);
      }

      console.log('user roles:', roles);
      if (user.status.name === 'inactive') {
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      }
      console.log('user is active');
      // Compare hashes of passwords
      const isMatch = await bcrypt.compare(dto.password, user.password);
      console.log('passwords is match:', isMatch);
      if (!isMatch)
        throw new HttpException(
          'Incorrect credentials',
          HttpStatus.BAD_REQUEST,
        );
      /* Generate a new pair of tokens */
      const tokens = this.refreshTokenService.generateTokens({
        email: user.email,
        nickname: user.nickname,
      });
      console.log('tokens generated:', tokens);
      /* Save a refresh token to the DB */
      await this.refreshTokenService.save(user.id, tokens.refreshToken);
      console.log('refresh token saved');

      this.authService.writeTokensToCookies(
        tokens.accessToken,
        tokens.refreshToken,
        res,
      );

      return {
        nickname: user.nickname,
        roles: roles,
        userId: user.id,
      };
    } catch (e) {
      console.log('ERROR:', (e as Error).message);
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
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
      console.log('Email already exists');
      throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
    }
    console.log('User does not exist in the DB');
    /* Generate unique activation link */
    // TODO [iu]: check uniqueness of the link
    const activationLink = randomUUID();
    console.log('activation Link:', activationLink);
    // Hashing of the password. 1- password, 2- salt
    const hashPassword = await this.usersService.createPasswordHash(password);
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

  @Get('check-access-token')
  checkAccessToken(@Req() req: Request) {
    console.log('try to check access token');
    this.authService.checkAccessTokenFromRequest(req);
    return true;
  }

  @Get('me')
  async me(@Req() req: Request) {
    console.log('try to get user data (controller)');
    const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
    const email = tokenPayload.email;
    const user = await this.usersService.findUserByEmail(email, true);
    if (!user) {
      console.log('User not found');
      throw new UnauthorizedException('User not found');
    }
    console.log('user:', user);
    return {
      nickname: user.nickname,
      userId: user.id,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  @Post('telegram-account')
  async addTelegramAccount(
    @Req() req: Request,
    @Body() dto: UserTelegramAccountDto,
  ) {
    console.log('try to add telegram account');
    const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
    const user = await this.usersService.findUserByEmail(tokenPayload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const telegramUserId = Number(dto?.telegramUserId);
    if (!Number.isInteger(telegramUserId)) {
      throw new HttpException(
        'Telegram user ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const chatId = dto?.chatId == null ? null : Number(dto.chatId);
    if (chatId !== null && !Number.isInteger(chatId)) {
      throw new HttpException('Chat ID is invalid', HttpStatus.BAD_REQUEST);
    }

    return await this.usersService.addUserTelegramAccount(user.id, {
      ...dto,
      telegramUserId,
      chatId,
    });
  }

  @Delete('telegram-account/:telegramUserId')
  async deleteTelegramAccount(
    @Req() req: Request,
    @Param('telegramUserId') telegramUserIdParam: string,
  ) {
    console.log('try to delete telegram account');
    const tokenPayload = this.authService.checkAccessTokenFromRequest(req);
    const user = await this.usersService.findUserByEmail(tokenPayload.email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const telegramUserId = Number(telegramUserIdParam);
    if (!Number.isInteger(telegramUserId)) {
      throw new HttpException(
        'Telegram user ID is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.usersService.deleteUserTelegramAccount(
      user.id,
      telegramUserId,
    );
  }

  @Get('check-refresh-token')
  async checkRefreshToken(@Req() req: Request) {
    console.log('try to check refresh token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const refreshToken = cookies['refreshToken'];
    // TODO if token is not found???
    if (!refreshToken) {
      console.log('refresh Token is not found');
      throw new UnauthorizedException('Refresh token is not found');
    }
    const result = await this.refreshTokenService.check(refreshToken);

    if (!result) {
      console.log('Refresh token is invalid');
      throw new UnauthorizedException('Refresh token is invalid');
    }

    return {
      user_id: result.user_id,
    };
  }

  @Get('refresh-tokens')
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      console.log('try to refresh tokens');
      const rawCookieHeader = req.headers.cookie ?? '';
      const cookies = cookie.parse(rawCookieHeader);
      const refreshToken = cookies['refreshToken'];
      if (!refreshToken) {
        console.log('refresh Token is not found');
        // TODO logout???
        return false;
      }
      console.log('refresh Token:', refreshToken);
      const result = await this.authService.refreshSession(refreshToken);

      this.authService.writeTokensToCookies(
        result.accessToken,
        result.refreshToken,
        res,
      );

      return true;
    } catch (e) {
      console.log('error:', e);
      if (e instanceof HttpException) throw e;
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('revoke-refresh-token')
  async revokeRefreshToken(@Req() req: Request) {
    console.log('try to revoke refresh token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const refreshToken = cookies['refreshToken'];

    if (!refreshToken) return false;
    console.log('refresh Token:', refreshToken);
    await this.refreshTokenService.revoke(refreshToken);
    console.log('refresh token revoked');
    return true;
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

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      console.log('try to logout user');
      const rawCookieHeader = req.headers.cookie ?? '';
      const cookies = cookie.parse(rawCookieHeader);
      const refreshToken = cookies['refreshToken'];
      console.log('refreshToken:', refreshToken);
      if (!refreshToken) {
        throw new HttpException(
          'Refresh token is not found',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.refreshTokenService.delete(refreshToken);
      console.log('refresh token deleted');

      this.authService.writeTokensToCookies('', '', res, true);
      return { message: 'User successfully logged out' };
    } catch (e) {
      throw new HttpException((e as Error).message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: { email: string }) {
    try {
      console.log('try to send forgot password email');
      if (!dto || !dto.email) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }
      console.log('dto:', dto);
      const user = await this.usersService.findUserByEmail(dto.email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
      }
      console.log('user:', user);

      const resetToken = await this.authService.createNewResetPassword(user.id);

      await this.mailService.sendUserResetPasswordLink(user.email, resetToken);

      return true;
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

  @Post('reset-password/verify')
  async resetPasswordVerify(@Body() dto: { token: string }) {
    try {
      if (!dto || !dto.token) {
        throw new HttpException(
          'Reset token is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.authService.checkResetPasswordToken(dto.token);

      return true;
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

  @Post('reset-password')
  async resetPassword(@Body() dto: { password: string; token: string }) {
    try {
      console.log('try to reset password');
      if (!dto || !dto.password || !dto.token) {
        throw new HttpException(
          'Password and reset token are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tokenData = await this.authService.checkResetPasswordToken(
        dto.token,
      );

      if (!tokenData) {
        throw new HttpException(
          'Reset token is invalid',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!tokenData.user || !tokenData.user.id) {
        throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
      }

      /* Deactivate refresh token */
      this.refreshTokenService.deleteAllTokensForUserId(tokenData.user.id);

      /* Use reset token*/
      this.authService.useResetPasswordToken(dto.token);

      /* Change password */
      this.usersService.changePassword(tokenData.user.id, dto.password);

      return true;
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

  @Delete('access-token')
  deleteAccessToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('try to delete access token');
    const rawCookieHeader = req.headers.cookie ?? '';
    const cookies = cookie.parse(rawCookieHeader);
    const accessToken = cookies['accessToken'];
    if (!accessToken) {
      throw new UnauthorizedException('Access token is not found');
    }
    this.authService.deleteAccessTokenFromCookies(res);
    return 'Access token deleted';
  }
}
