import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  RatingPipeline,
  RatingInput,
  RatingWorksheet,
  PersonalAutoRatingPlugin,
  HomeownersRatingPlugin,
  RateTable,
} from '@agenticcore/domain-rating';
import { generateQuoteNumber } from '@agenticcore/shared';

@Injectable()
export class RatingService implements OnModuleInit {
  private pipeline = new RatingPipeline();
  private rateTables: RateTable[] = [];

  onModuleInit() {
    this.pipeline.registerPlugin(new PersonalAutoRatingPlugin());
    this.pipeline.registerPlugin(new HomeownersRatingPlugin());
    this.loadDefaultRateTables();
  }

  async calculateQuote(input: RatingInput): Promise<RatingWorksheet> {
    const worksheet = await this.pipeline.execute(input, this.rateTables);
    worksheet.quoteNumber = generateQuoteNumber();
    return worksheet;
  }

  async getWorksheet(quoteNumber: string): Promise<RatingWorksheet | null> {
    // In production, this would load from persistence
    return null;
  }

  getRateTables(lobCode: string): RateTable[] {
    return this.rateTables.filter(t => t.lobCode === lobCode);
  }

  private loadDefaultRateTables(): void {
    this.rateTables = [
      {
        id: 'auto-base-1',
        name: 'auto-base-rates',
        lobCode: 'personal-auto',
        stateCode: 'CA',
        effectiveDate: '2026-01-01',
        expirationDate: '2026-12-31',
        dimensions: [{ name: 'coverageCode', type: 'exact', values: ['liability', 'collision', 'comprehensive', 'uninsured-motorist', 'medical-payments'] }],
        entries: [
          { keys: { coverageCode: 'liability' }, value: 475 },
          { keys: { coverageCode: 'collision' }, value: 340 },
          { keys: { coverageCode: 'comprehensive' }, value: 185 },
          { keys: { coverageCode: 'uninsured-motorist' }, value: 130 },
          { keys: { coverageCode: 'medical-payments' }, value: 90 },
        ],
      },
      {
        id: 'ho-base-1',
        name: 'ho-base-rates',
        lobCode: 'homeowners',
        stateCode: 'CA',
        effectiveDate: '2026-01-01',
        expirationDate: '2026-12-31',
        dimensions: [{ name: 'coverageCode', type: 'exact', values: ['dwelling', 'other-structures', 'personal-property', 'loss-of-use', 'personal-liability', 'medical-payments'] }],
        entries: [
          { keys: { coverageCode: 'dwelling' }, value: 850 },
          { keys: { coverageCode: 'other-structures' }, value: 130 },
          { keys: { coverageCode: 'personal-property' }, value: 375 },
          { keys: { coverageCode: 'loss-of-use' }, value: 160 },
          { keys: { coverageCode: 'personal-liability' }, value: 210 },
          { keys: { coverageCode: 'medical-payments' }, value: 80 },
        ],
      },
    ];
  }
}
