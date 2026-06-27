import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VideoPlatform, VideoStyle } from '@acs/database';

export class CreateProjectDto {
  @IsUUID()
  campaignId!: string;

  @IsString()
  @MaxLength(500)
  topic!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsEnum(VideoStyle)
  videoStyle?: VideoStyle;

  @IsOptional()
  @IsEnum(VideoPlatform)
  platform?: VideoPlatform;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(180)
  durationTarget?: number;

  @IsOptional()
  autoApprove?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  customScript?: string;
}
