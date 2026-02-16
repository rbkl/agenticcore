import { Money, createMoney } from '@agenticcore/shared';
import {
  RatingPlugin,
  RatingInput,
  RateTable,
  ValidationResult,
  CoverageRating,
} from '../engine/rating-pipeline';

export class HomeownersRatingPlugin implements RatingPlugin {
  lobCode = 'homeowners';

  validateInputs(input: RatingInput): ValidationResult {
    const errors: string[] = [];

    if (input.risks.length === 0) {
      errors.push('At least one property risk is required');
    }

    const hasProperty = input.risks.some(r => r.riskType === 'property');
    if (!hasProperty) errors.push('At least one property is required');

    if (input.coverages.length === 0) {
      errors.push('At least one coverage selection is required');
    }

    return { valid: errors.length === 0, errors };
  }

  calculateBaseRate(
    risks: RatingInput['risks'],
    coverages: RatingInput['coverages'],
    tables: RateTable[],
  ): CoverageRating[] {
    const properties = risks.filter(r => r.riskType === 'property');

    return coverages.map(coverage => {
      let baseAmount = this.getBaseRateForCoverage(coverage.coverageCode, tables);

      for (const property of properties) {
        // Construction type factor
        const constructionType = property.data.constructionType as string;
        const constructionFactors: Record<string, number> = {
          'frame': 1.2,
          'masonry': 1.0,
          'fire_resistive': 0.85,
          'superior': 0.75,
        };
        baseAmount *= constructionFactors[constructionType] ?? 1.0;

        // Year built / age factor
        const yearBuilt = property.data.yearBuilt as number;
        const age = new Date().getFullYear() - yearBuilt;
        if (age > 50) baseAmount *= 1.3;
        else if (age > 25) baseAmount *= 1.15;
        else if (age <= 5) baseAmount *= 0.9;

        // Square footage factor
        const sqft = property.data.squareFeet as number;
        baseAmount *= sqft / 2000; // normalize around 2000 sqft
      }

      // Limit factor (dwelling coverage)
      const limitFactor = coverage.limit.amount / 250000;
      baseAmount *= Math.max(0.4, Math.min(limitFactor, 4.0));

      // Deductible credit
      const deductibleCredit = coverage.deductible.amount / 5000;
      baseAmount *= Math.max(0.6, 1 - deductibleCredit * 0.1);

      const baseRate = createMoney(baseAmount);
      return {
        coverageCode: coverage.coverageCode,
        baseRate,
        adjustedRate: baseRate,
        factors: [
          { name: 'propertyCount', value: properties.length, applied: true },
        ],
      };
    });
  }

  applyModifiers(baseRates: CoverageRating[], modifiers: RatingInput['modifiers']): CoverageRating[] {
    return baseRates.map(rate => {
      let adjusted = rate.adjustedRate.amount;
      const appliedFactors = [...rate.factors];

      for (const modifier of modifiers) {
        adjusted *= modifier.factor;
        appliedFactors.push({ name: modifier.code, value: modifier.factor, applied: true });
      }

      return {
        ...rate,
        adjustedRate: createMoney(adjusted),
        factors: appliedFactors,
      };
    });
  }

  getRequiredTables(): string[] {
    return ['ho-base-rates', 'ho-territory-factors', 'ho-construction-factors'];
  }

  private getBaseRateForCoverage(coverageCode: string, tables: RateTable[]): number {
    const baseRateTable = tables.find(t => t.name === 'ho-base-rates');
    if (baseRateTable) {
      const entry = baseRateTable.entries.find(e => e.keys.coverageCode === coverageCode);
      if (entry) return entry.value;
    }

    const defaults: Record<string, number> = {
      'dwelling': 800,
      'other-structures': 120,
      'personal-property': 350,
      'loss-of-use': 150,
      'personal-liability': 200,
      'medical-payments': 75,
    };
    return defaults[coverageCode] ?? 250;
  }
}
