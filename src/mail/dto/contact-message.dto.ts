import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trimValue = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ContactMessageDto {
  @Transform(trimValue)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trimValue)
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(5000)
  message!: string;

  @Transform(trimValue)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  topic?: string;
}
