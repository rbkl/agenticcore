import { eq } from 'drizzle-orm';
import { db, Database } from '../database';
import { policies, coverages, risks, locations, modifiers } from '../schema/policies';

export class PolicyRepository {
  constructor(private readonly database: Database = db) {}

  async findById(id: string) {
    const rows = await this.database.select().from(policies).where(eq(policies.id, id));
    return rows[0] ?? null;
  }

  async findByPolicyNumber(policyNumber: string) {
    const rows = await this.database.select().from(policies).where(eq(policies.policyNumber, policyNumber));
    return rows[0] ?? null;
  }

  async findByAccountId(accountId: string) {
    return this.database.select().from(policies).where(eq(policies.accountId, accountId));
  }

  async create(data: typeof policies.$inferInsert) {
    const rows = await this.database.insert(policies).values(data).returning();
    return rows[0]!;
  }

  async update(id: string, data: Partial<typeof policies.$inferInsert>) {
    const rows = await this.database
      .update(policies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(policies.id, id))
      .returning();
    return rows[0]!;
  }

  async getCoverages(policyId: string) {
    return this.database.select().from(coverages).where(eq(coverages.policyId, policyId));
  }

  async addCoverage(data: typeof coverages.$inferInsert) {
    const rows = await this.database.insert(coverages).values(data).returning();
    return rows[0]!;
  }

  async getRisks(policyId: string) {
    return this.database.select().from(risks).where(eq(risks.policyId, policyId));
  }

  async addRisk(data: typeof risks.$inferInsert) {
    const rows = await this.database.insert(risks).values(data).returning();
    return rows[0]!;
  }

  async getLocations(policyId: string) {
    return this.database.select().from(locations).where(eq(locations.policyId, policyId));
  }

  async addLocation(data: typeof locations.$inferInsert) {
    const rows = await this.database.insert(locations).values(data).returning();
    return rows[0]!;
  }

  async getModifiers(policyId: string) {
    return this.database.select().from(modifiers).where(eq(modifiers.policyId, policyId));
  }

  async addModifier(data: typeof modifiers.$inferInsert) {
    const rows = await this.database.insert(modifiers).values(data).returning();
    return rows[0]!;
  }
}
