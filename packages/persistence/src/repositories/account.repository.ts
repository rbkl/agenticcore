import { eq } from 'drizzle-orm';
import { db, Database } from '../database';
import { accounts, contacts, accountContacts } from '../schema/accounts';

export class AccountRepository {
  constructor(private readonly database: Database = db) {}

  async findById(id: string) {
    const rows = await this.database.select().from(accounts).where(eq(accounts.id, id));
    return rows[0] ?? null;
  }

  async findByAccountNumber(accountNumber: string) {
    const rows = await this.database.select().from(accounts).where(eq(accounts.accountNumber, accountNumber));
    return rows[0] ?? null;
  }

  async create(data: typeof accounts.$inferInsert) {
    const rows = await this.database.insert(accounts).values(data).returning();
    return rows[0]!;
  }

  async update(id: string, data: Partial<typeof accounts.$inferInsert>) {
    const rows = await this.database
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return rows[0]!;
  }

  async createContact(data: typeof contacts.$inferInsert) {
    const rows = await this.database.insert(contacts).values(data).returning();
    return rows[0]!;
  }

  async linkContactToAccount(accountId: string, contactId: string, role: string) {
    const rows = await this.database
      .insert(accountContacts)
      .values({ accountId, contactId, role })
      .returning();
    return rows[0]!;
  }

  async getAccountContacts(accountId: string) {
    return this.database
      .select()
      .from(accountContacts)
      .innerJoin(contacts, eq(accountContacts.contactId, contacts.id))
      .where(eq(accountContacts.accountId, accountId));
  }
}
