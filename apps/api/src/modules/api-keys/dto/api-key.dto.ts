import { IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(50)
  provider!: string;

  @IsString()
  @MaxLength(255)
  label!: string;

  @IsString()
  key!: string;
}
