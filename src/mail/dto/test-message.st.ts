import { IsEmail, IsOptional, MaxLength } from 'class-validator';

export class TestMessageDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;
}
