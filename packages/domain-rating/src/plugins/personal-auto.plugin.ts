import { Money, createMoney } from '@agenticcore/shared';
import {
  RatingPlugin,
  RatingInput,
  RateTable,
  ValidationResult,
  CoverageRating,
} from '../engine/rating-pipeline';

export class PersonalAutoRatingPlugin implements RatingPlugin {
  lobCode = 'personal-auto';

  validateInputs(input: RatingInput): ValidationResult {
    const errors: string[] = [];

    if (input.risks.length === 0) {
      errors.push('At least one risk (vehicle or driver) is required');
    }

    const hasVehicle = input.risks.some(r => r.riskType === 'vehicle');
    const hasDriver = input.risks.some(r => r.riskType === 'driver');

    if (!hasVehicle) errors.push('At least one vehicle is required');
    if (!hasDriver) errors.push('At least one driver is required');

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
    const vehicles = risks.filter(r => r.riskType === 'vehicle');
    const drivers = risks.filter(r => r.riskType === 'driver');

    return coverages.map(coverage => {
      let baseAmount = this.getBaseRateForCoverage(coverage.coverageCode, tables);

      // Vehicle age factor
      for (const vehicle of vehicles) {
        const year = vehicle.data.year as number;
        const age = new Date().getFullYear() - year;
        if (age > 10) baseAmount *= 0.85;
        else if (age > 5) baseAmount *= 0.95;
        else if (age <= 2) baseAmount *= 1.15;
      }

      // Driver risk factor
      for (const driver of drivers) {
        const dob = driver.data.dateOfBirth as string;
        const age = this.calculateAge(dob);
        if (age < 25) baseAmount *= 1.35;
        else if (age > 65) baseAmount *= 1.15;

        const accidents = (driver.data.accidents as Array<unknown>) || [];
        const violations = (driver.data.violations as Array<unknown>) || [];
        baseAmount *= 1 + accidents.length * 0.15;
        baseAmount *= 1 + violations.length * 0.10;
      }

      // Limit factor
      const limitFactor = coverage.limit.amount / 100000;
      baseAmount *= Math.max(0.5, Math.min(limitFactor, 3.0));

      // Deductible credit
      const deductibleCredit = coverage.deductible.amount / 10000;
      baseAmount *= Math.max(0.7, 1 - deductibleCredit);

      const baseRate = createMoney(baseAmount);
      return {
        coverageCode: coverage.coverageCode,
        baseRate,
        adjustedRate: baseRate,
        factors: [
          { name: 'vehicleCount', value: vehicles.length, applied: true },
          { name: 'driverCount', value: drivers.length, applied: true },
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
    return ['auto-base-rates', 'auto-territory-factors', 'auto-vehicle-factors'];
  }

  private getBaseRateForCoverage(coverageCode: string, tables: RateTable[]): number {
    const baseRateTable = tables.find(t => t.name === 'auto-base-rates');
    if (baseRateTable) {
      const entry = baseRateTable.entries.find(e => e.keys.coverageCode === coverageCode);
      if (entry) return entry.value;
    }

    // Default base rates
    const defaults: Record<string, number> = {
      'liability': 450,
      'collision': 325,
      'comprehensive': 175,
      'uninsured-motorist': 125,
      'medical-payments': 85,
      'pip': 150,
    };
    return defaults[coverageCode] ?? 200;
  }

  private calculateAge(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
}
