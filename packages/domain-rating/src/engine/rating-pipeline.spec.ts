import { describe, it, expect } from 'vitest';
import { RatingPipeline, RatingInput, RateTable } from './rating-pipeline';
import { PersonalAutoRatingPlugin } from '../plugins/personal-auto.plugin';
import { HomeownersRatingPlugin } from '../plugins/homeowners.plugin';

describe('RatingPipeline', () => {
  const pipeline = new RatingPipeline();
  pipeline.registerPlugin(new PersonalAutoRatingPlugin());
  pipeline.registerPlugin(new HomeownersRatingPlugin());

  const autoTables: RateTable[] = [
    {
      id: 'auto-base-1',
      name: 'auto-base-rates',
      lobCode: 'personal-auto',
      stateCode: 'CA',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-12-31',
      dimensions: [{ name: 'coverageCode', type: 'exact', values: ['liability', 'collision'] }],
      entries: [
        { keys: { coverageCode: 'liability' }, value: 475 },
        { keys: { coverageCode: 'collision' }, value: 340 },
      ],
    },
  ];

  const hoTables: RateTable[] = [
    {
      id: 'ho-base-1',
      name: 'ho-base-rates',
      lobCode: 'homeowners',
      stateCode: 'CA',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-12-31',
      dimensions: [{ name: 'coverageCode', type: 'exact', values: ['dwelling', 'personal-liability'] }],
      entries: [
        { keys: { coverageCode: 'dwelling' }, value: 850 },
        { keys: { coverageCode: 'personal-liability' }, value: 210 },
      ],
    },
  ];

  it('should calculate personal auto quote', async () => {
    const input: RatingInput = {
      submissionId: 'sub-1',
      productCode: 'personal-auto',
      lobCode: 'personal-auto',
      stateCode: 'CA',
      effectiveDate: '2026-03-01',
      risks: [
        { riskType: 'vehicle', data: { vin: '1HGBH41JXMN109186', year: 2024, make: 'Honda', model: 'Civic', usage: 'commute' } },
        { riskType: 'driver', data: { licenseNumber: 'D1234567', licenseState: 'CA', dateOfBirth: '1990-05-15', accidents: [], violations: [] } },
      ],
      coverages: [
        { coverageCode: 'liability', limit: { amount: 100000, currency: 'USD' }, deductible: { amount: 0, currency: 'USD' } },
        { coverageCode: 'collision', limit: { amount: 50000, currency: 'USD' }, deductible: { amount: 500, currency: 'USD' } },
      ],
      modifiers: [],
    };

    const worksheet = await pipeline.execute(input, autoTables);

    expect(worksheet.submissionId).toBe('sub-1');
    expect(worksheet.lobCode).toBe('personal-auto');
    expect(worksheet.steps).toHaveLength(11);
    expect(worksheet.coveragePremiums).toHaveLength(2);
    expect(worksheet.totalPremium.amount).toBeGreaterThan(0);
    expect(worksheet.finalPremium.amount).toBeGreaterThan(worksheet.totalPremium.amount); // includes fees
    expect(worksheet.fees.amount).toBe(25);
  });

  it('should calculate homeowners quote', async () => {
    const input: RatingInput = {
      submissionId: 'sub-2',
      productCode: 'homeowners',
      lobCode: 'homeowners',
      stateCode: 'CA',
      effectiveDate: '2026-03-01',
      risks: [
        {
          riskType: 'property',
          data: {
            address: { line1: '123 Main St', city: 'Sacramento', state: 'CA', zipCode: '95814' },
            constructionType: 'masonry',
            yearBuilt: 2010,
            squareFeet: 2000,
          },
        },
      ],
      coverages: [
        { coverageCode: 'dwelling', limit: { amount: 250000, currency: 'USD' }, deductible: { amount: 1000, currency: 'USD' } },
        { coverageCode: 'personal-liability', limit: { amount: 100000, currency: 'USD' }, deductible: { amount: 0, currency: 'USD' } },
      ],
      modifiers: [],
    };

    const worksheet = await pipeline.execute(input, hoTables);

    expect(worksheet.submissionId).toBe('sub-2');
    expect(worksheet.lobCode).toBe('homeowners');
    expect(worksheet.steps).toHaveLength(11);
    expect(worksheet.coveragePremiums).toHaveLength(2);
    expect(worksheet.totalPremium.amount).toBeGreaterThan(0);
    expect(worksheet.finalPremium.amount).toBeGreaterThan(0);
  });

  it('should fail validation for auto without vehicle', async () => {
    const input: RatingInput = {
      submissionId: 'sub-3',
      productCode: 'personal-auto',
      lobCode: 'personal-auto',
      stateCode: 'CA',
      effectiveDate: '2026-03-01',
      risks: [
        { riskType: 'driver', data: { licenseNumber: 'D123', licenseState: 'CA', dateOfBirth: '1990-01-01' } },
      ],
      coverages: [
        { coverageCode: 'liability', limit: { amount: 100000, currency: 'USD' }, deductible: { amount: 0, currency: 'USD' } },
      ],
      modifiers: [],
    };

    await expect(pipeline.execute(input, autoTables)).rejects.toThrow('Rating validation failed');
  });

  it('should fail for unregistered LOB', async () => {
    const input: RatingInput = {
      submissionId: 'sub-4',
      productCode: 'commercial-auto',
      lobCode: 'commercial-auto',
      stateCode: 'CA',
      effectiveDate: '2026-03-01',
      risks: [],
      coverages: [],
      modifiers: [],
    };

    await expect(pipeline.execute(input, [])).rejects.toThrow('No rating plugin registered');
  });

  it('should apply modifiers to premiums', async () => {
    const input: RatingInput = {
      submissionId: 'sub-5',
      productCode: 'personal-auto',
      lobCode: 'personal-auto',
      stateCode: 'CA',
      effectiveDate: '2026-03-01',
      risks: [
        { riskType: 'vehicle', data: { vin: '1HGBH41JXMN109186', year: 2024, make: 'Honda', model: 'Civic', usage: 'commute' } },
        { riskType: 'driver', data: { licenseNumber: 'D1234567', licenseState: 'CA', dateOfBirth: '1990-05-15', accidents: [], violations: [] } },
      ],
      coverages: [
        { coverageCode: 'liability', limit: { amount: 100000, currency: 'USD' }, deductible: { amount: 0, currency: 'USD' } },
      ],
      modifiers: [{ code: 'good-student', type: 'boolean', factor: 0.9 }],
    };

    const withoutModifiers = await pipeline.execute({ ...input, modifiers: [] }, autoTables);
    const withModifiers = await pipeline.execute(input, autoTables);

    expect(withModifiers.totalPremium.amount).toBeLessThan(withoutModifiers.totalPremium.amount);
  });
});
