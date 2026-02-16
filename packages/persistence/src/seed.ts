import { db } from './database';
import { accounts, contacts, accountContacts } from './schema/accounts';
import { products, coverageDefinitions } from './schema/products';
import { authorityLimits, businessRules } from './schema/governance';
import { rateTables, rateTableEntries } from './schema/rating';

async function seed() {
  console.log('Seeding database...');

  // Seed accounts and contacts
  const [account1] = await db.insert(accounts).values([
    { accountNumber: 'ACC-001', status: 'active' },
    { accountNumber: 'ACC-002', status: 'active' },
  ]).returning();

  const [contact1] = await db.insert(contacts).values([
    { type: 'person', firstName: 'John', lastName: 'Smith', email: 'john.smith@example.com', phone: '555-0101' },
    { type: 'person', firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', phone: '555-0102' },
  ]).returning();

  if (account1 && contact1) {
    await db.insert(accountContacts).values({
      accountId: account1.id,
      contactId: contact1.id,
      role: 'named_insured',
    });
  }

  // Seed products
  const [autoProduct] = await db.insert(products).values([
    {
      code: 'personal-auto',
      name: 'Personal Auto Insurance',
      lobCode: 'personal-auto',
      version: '1.0',
      config: { description: 'Standard personal automobile insurance' },
      status: 'active',
    },
    {
      code: 'homeowners',
      name: 'Homeowners Insurance',
      lobCode: 'homeowners',
      version: '1.0',
      config: { description: 'Standard homeowners insurance (HO-3)' },
      status: 'active',
    },
  ]).returning();

  if (autoProduct) {
    await db.insert(coverageDefinitions).values([
      { productId: autoProduct.id, coverageCode: 'liability', name: 'Bodily Injury & Property Damage Liability', required: 'true' },
      { productId: autoProduct.id, coverageCode: 'collision', name: 'Collision Coverage', required: 'false' },
      { productId: autoProduct.id, coverageCode: 'comprehensive', name: 'Comprehensive Coverage', required: 'false' },
    ]);
  }

  // Seed rate tables
  const [autoBaseRates] = await db.insert(rateTables).values([
    {
      name: 'auto-base-rates',
      lobCode: 'personal-auto',
      stateCode: 'CA',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-12-31',
      dimensions: [{ name: 'coverageCode', type: 'exact' }],
    },
    {
      name: 'ho-base-rates',
      lobCode: 'homeowners',
      stateCode: 'CA',
      effectiveDate: '2026-01-01',
      expirationDate: '2026-12-31',
      dimensions: [{ name: 'coverageCode', type: 'exact' }],
    },
  ]).returning();

  if (autoBaseRates) {
    await db.insert(rateTableEntries).values([
      { rateTableId: autoBaseRates.id, keys: { coverageCode: 'liability' }, value: '475' },
      { rateTableId: autoBaseRates.id, keys: { coverageCode: 'collision' }, value: '340' },
      { rateTableId: autoBaseRates.id, keys: { coverageCode: 'comprehensive' }, value: '185' },
    ]);
  }

  // Seed authority limits
  await db.insert(authorityLimits).values([
    { agentType: 'underwriting', action: 'approve_submission', maxAmount: '50000', maxRiskScore: 80, requiresHumanApproval: 'false' },
    { agentType: 'underwriting', action: 'decline_submission', requiresHumanApproval: 'true', escalateTo: 'senior_underwriter' },
    { agentType: 'rating', action: 'calculate_quote', requiresHumanApproval: 'false' },
    { agentType: 'policy-servicing', action: 'process_endorsement', maxAmount: '10000', requiresHumanApproval: 'false' },
    { agentType: 'policy-servicing', action: 'process_cancellation', requiresHumanApproval: 'true', escalateTo: 'manager' },
  ]);

  // Seed business rules
  await db.insert(businessRules).values([
    {
      name: 'High premium auto-escalate',
      category: 'authority',
      condition: { field: 'premium.amount', operator: 'gt', value: 50000 },
      action: { type: 'escalate', message: 'Premium exceeds $50,000' },
      severity: 'block',
      active: 'true',
    },
    {
      name: 'Decline requires human approval',
      category: 'underwriting',
      condition: { field: 'action', operator: 'eq', value: 'decline_submission' },
      action: { type: 'escalate', message: 'Declinations require human approval' },
      severity: 'block',
      active: 'true',
    },
  ]);

  console.log('Database seeded successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
