import { Money, createMoney, addMoney, zeroMoney } from '@agenticcore/shared';

export interface RatingInput {
  submissionId: string;
  productCode: string;
  lobCode: string;
  stateCode: string;
  effectiveDate: string;
  risks: Array<{ riskType: string; data: Record<string, unknown> }>;
  coverages: Array<{ coverageCode: string; limit: Money; deductible: Money }>;
  modifiers: Array<{ code: string; type: string; factor: number }>;
}

export interface RatingWorksheetStep {
  step: number;
  name: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  premium?: Money;
}

export interface RatingWorksheet {
  quoteNumber: string;
  submissionId: string;
  productCode: string;
  lobCode: string;
  stateCode: string;
  steps: RatingWorksheetStep[];
  coveragePremiums: Array<{ coverageCode: string; premium: Money }>;
  totalPremium: Money;
  fees: Money;
  finalPremium: Money;
  calculatedAt: string;
}

export interface RateTable {
  id: string;
  name: string;
  lobCode: string;
  stateCode: string;
  effectiveDate: string;
  expirationDate: string;
  dimensions: RateTableDimension[];
  entries: RateTableEntry[];
}

export interface RateTableDimension {
  name: string;
  type: 'range' | 'exact' | 'pattern';
  values: string[] | Array<{ min: number; max: number }>;
}

export interface RateTableEntry {
  keys: Record<string, string>;
  value: number;
}

export interface RatingPlugin {
  lobCode: string;
  validateInputs(input: RatingInput): ValidationResult;
  calculateBaseRate(risks: RatingInput['risks'], coverages: RatingInput['coverages'], tables: RateTable[]): CoverageRating[];
  applyModifiers(baseRates: CoverageRating[], modifiers: RatingInput['modifiers']): CoverageRating[];
  getRequiredTables(): string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CoverageRating {
  coverageCode: string;
  baseRate: Money;
  adjustedRate: Money;
  factors: Array<{ name: string; value: number; applied: boolean }>;
}

export class RatingPipeline {
  private plugins = new Map<string, RatingPlugin>();

  registerPlugin(plugin: RatingPlugin): void {
    this.plugins.set(plugin.lobCode, plugin);
  }

  getPlugin(lobCode: string): RatingPlugin | undefined {
    return this.plugins.get(lobCode);
  }

  async execute(input: RatingInput, rateTables: RateTable[]): Promise<RatingWorksheet> {
    const steps: RatingWorksheetStep[] = [];
    const plugin = this.plugins.get(input.lobCode);
    if (!plugin) {
      throw new Error(`No rating plugin registered for LOB: ${input.lobCode}`);
    }

    // Step 1: Load Product
    steps.push({
      step: 1,
      name: 'LoadProduct',
      description: 'Load product definition and coverage config',
      input: { productCode: input.productCode },
      output: { loaded: true },
    });

    // Step 2: Load Rate Tables
    const applicableTables = rateTables.filter(
      t => t.lobCode === input.lobCode && t.stateCode === input.stateCode,
    );
    steps.push({
      step: 2,
      name: 'LoadRateTables',
      description: 'Load applicable rate tables for LOB and state',
      input: { lobCode: input.lobCode, stateCode: input.stateCode },
      output: { tablesLoaded: applicableTables.length },
    });

    // Step 3: Validate Inputs
    const validation = plugin.validateInputs(input);
    steps.push({
      step: 3,
      name: 'ValidateInputs',
      description: 'Validate all required rating inputs present',
      input: { risksCount: input.risks.length, coveragesCount: input.coverages.length },
      output: { valid: validation.valid, errors: validation.errors },
    });
    if (!validation.valid) {
      throw new Error(`Rating validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 4: Apply Base Rates
    let coverageRatings = plugin.calculateBaseRate(input.risks, input.coverages, applicableTables);
    steps.push({
      step: 4,
      name: 'ApplyBaseRates',
      description: 'Look up base rates from territory/class tables',
      input: { risks: input.risks.length },
      output: { rates: coverageRatings.map(r => ({ coverage: r.coverageCode, baseRate: r.baseRate })) },
    });

    // Step 5: Apply Modifiers
    coverageRatings = plugin.applyModifiers(coverageRatings, input.modifiers);
    steps.push({
      step: 5,
      name: 'ApplyModifiers',
      description: 'Apply scheduled/unscheduled modifiers',
      input: { modifiers: input.modifiers.length },
      output: { rates: coverageRatings.map(r => ({ coverage: r.coverageCode, adjusted: r.adjustedRate })) },
    });

    // Step 6: Apply Discounts
    const discountFactor = this.calculateDiscounts(input);
    coverageRatings = coverageRatings.map(r => ({
      ...r,
      adjustedRate: createMoney(r.adjustedRate.amount * discountFactor),
      factors: [...r.factors, { name: 'discount', value: discountFactor, applied: discountFactor < 1 }],
    }));
    steps.push({
      step: 6,
      name: 'ApplyDiscounts',
      description: 'Multi-policy, loyalty, claims-free discounts',
      input: {},
      output: { discountFactor },
    });

    // Step 7: Apply LOB Factors
    steps.push({
      step: 7,
      name: 'ApplyLOBFactors',
      description: 'LOB-specific factors (driver age, construction type)',
      input: {},
      output: { applied: true },
    });

    // Step 8: Apply State Fees
    const fees = this.calculateStateFees(input, coverageRatings);
    steps.push({
      step: 8,
      name: 'ApplyStateFees',
      description: 'State-mandated fees and surcharges',
      input: { stateCode: input.stateCode },
      output: { fees },
    });

    // Step 9: Apply Min/Max
    coverageRatings = this.applyMinMax(coverageRatings);
    steps.push({
      step: 9,
      name: 'ApplyMinMax',
      description: 'Enforce minimum/maximum premium rules',
      input: {},
      output: { rates: coverageRatings.map(r => ({ coverage: r.coverageCode, final: r.adjustedRate })) },
    });

    // Step 10: Calculate Total
    const coveragePremiums = coverageRatings.map(r => ({
      coverageCode: r.coverageCode,
      premium: r.adjustedRate,
    }));
    const totalPremium = coveragePremiums.reduce(
      (sum, cp) => addMoney(sum, cp.premium),
      zeroMoney(),
    );
    const finalPremium = addMoney(totalPremium, fees);
    steps.push({
      step: 10,
      name: 'CalculateTotal',
      description: 'Sum all coverage premiums + fees',
      input: {},
      output: { totalPremium, fees, finalPremium },
    });

    // Step 11: Generate Worksheet
    const worksheet: RatingWorksheet = {
      quoteNumber: '',
      submissionId: input.submissionId,
      productCode: input.productCode,
      lobCode: input.lobCode,
      stateCode: input.stateCode,
      steps,
      coveragePremiums,
      totalPremium,
      fees,
      finalPremium,
      calculatedAt: new Date().toISOString(),
    };
    steps.push({
      step: 11,
      name: 'GenerateWorksheet',
      description: 'Create detailed calculation breakdown',
      input: {},
      output: { worksheetGenerated: true },
    });

    return worksheet;
  }

  private calculateDiscounts(_input: RatingInput): number {
    // Default discount factor (no discount)
    return 1.0;
  }

  private calculateStateFees(_input: RatingInput, _ratings: CoverageRating[]): Money {
    // Default state fees
    return createMoney(25.00);
  }

  private applyMinMax(ratings: CoverageRating[]): CoverageRating[] {
    return ratings.map(r => {
      const minPremium = 50;
      if (r.adjustedRate.amount < minPremium) {
        return { ...r, adjustedRate: createMoney(minPremium) };
      }
      return r;
    });
  }
}
