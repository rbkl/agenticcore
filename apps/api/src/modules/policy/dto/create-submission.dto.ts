import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubmissionDto {
  @ApiProperty({ description: 'Account ID' })
  @IsString()
  accountId!: string;

  @ApiProperty({ description: 'Product code', example: 'personal-auto' })
  @IsString()
  productCode!: string;

  @ApiProperty({ description: 'Line of business code', example: 'personal-auto' })
  @IsString()
  lobCode!: string;

  @ApiProperty({ description: 'Policy effective date', example: '2026-03-01' })
  @IsDateString()
  effectiveDate!: string;
}

export class AddRiskDto {
  @ApiProperty({ description: 'Risk type', enum: ['vehicle', 'property', 'driver'] })
  @IsEnum(['vehicle', 'property', 'driver'])
  riskType!: string;

  @ApiProperty({ description: 'Risk data' })
  riskData!: Record<string, unknown>;
}

export class SelectCoverageDto {
  @ApiProperty({ description: 'Coverage code', example: 'liability' })
  @IsString()
  coverageCode!: string;

  @ApiProperty({ description: 'Coverage limit amount' })
  @IsNumber()
  limitAmount!: number;

  @ApiProperty({ description: 'Coverage limit currency', default: 'USD' })
  @IsString()
  @IsOptional()
  limitCurrency?: string;

  @ApiProperty({ description: 'Deductible amount' })
  @IsNumber()
  deductibleAmount!: number;

  @ApiProperty({ description: 'Deductible currency', default: 'USD' })
  @IsString()
  @IsOptional()
  deductibleCurrency?: string;
}
