import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  nickname!: string;

  @MinLength(4)
  password!: string;
}
