import { IsOptional, IsString, IsArray, MaxLength } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  @MaxLength(50)
  workerKey!: string;

  @IsString()
  @MaxLength(255)
  purpose!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreatePromptVersionDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsArray()
  variables?: Array<Record<string, unknown>>;
}

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
