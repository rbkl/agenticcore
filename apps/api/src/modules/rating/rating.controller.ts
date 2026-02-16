import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RatingService } from './rating.service';
import { IsString, IsArray, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class MoneyDto {
  @ApiProperty() @IsNumber() amount!: number;
  @ApiProperty({ default: 'USD' }) @IsString() @IsOptional() currency?: string;
}

class RiskDto {
  @ApiProperty() @IsString() riskType!: string;
  @ApiProperty() riskData!: Record<string, unknown>;
}

class CoverageDto {
  @ApiProperty() @IsString() coverageCode!: string;
  @ApiProperty() limit!: MoneyDto;
  @ApiProperty() deductible!: MoneyDto;
}

class ModifierDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() type!: string;
  @ApiProperty() @IsNumber() factor!: number;
}

class CalculateQuoteDto {
  @ApiProperty() @IsString() submissionId!: string;
  @ApiProperty() @IsString() productCode!: string;
  @ApiProperty() @IsString() lobCode!: string;
  @ApiProperty() @IsString() stateCode!: string;
  @ApiProperty() @IsString() effectiveDate!: string;
  @ApiProperty({ type: [RiskDto] }) @IsArray() risks!: RiskDto[];
  @ApiProperty({ type: [CoverageDto] }) @IsArray() coverages!: CoverageDto[];
  @ApiProperty({ type: [ModifierDto], required: false }) @IsArray() @IsOptional() modifiers?: ModifierDto[];
}

@ApiTags('rating')
@Controller('rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate a quote' })
  @ApiResponse({ status: 200, description: 'Quote calculated with detailed worksheet' })
  async calculateQuote(@Body() dto: CalculateQuoteDto) {
    return this.ratingService.calculateQuote({
      submissionId: dto.submissionId,
      productCode: dto.productCode,
      lobCode: dto.lobCode,
      stateCode: dto.stateCode,
      effectiveDate: dto.effectiveDate,
      risks: dto.risks.map(r => ({ riskType: r.riskType, data: r.riskData })),
      coverages: dto.coverages.map(c => ({
        coverageCode: c.coverageCode,
        limit: { amount: c.limit.amount, currency: c.limit.currency || 'USD' },
        deductible: { amount: c.deductible.amount, currency: c.deductible.currency || 'USD' },
      })),
      modifiers: (dto.modifiers || []).map(m => ({ code: m.code, type: m.type, factor: m.factor })),
    });
  }

  @Get('worksheet/:quoteId')
  @ApiOperation({ summary: 'Get rating worksheet for a quote' })
  async getWorksheet(@Param('quoteId') quoteId: string) {
    const worksheet = await this.ratingService.getWorksheet(quoteId);
    if (!worksheet) {
      return { message: 'Worksheet not found', quoteId };
    }
    return worksheet;
  }

  @Get('tables/:lobCode')
  @ApiOperation({ summary: 'Get rate tables for a line of business' })
  async getRateTables(@Param('lobCode') lobCode: string) {
    return this.ratingService.getRateTables(lobCode);
  }
}
