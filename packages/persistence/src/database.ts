import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let connectionString = process.env.DATABASE_URL || 'postgresql://agenticcore:agenticcore@localhost:5432/agenticcore';

const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

/** The full database instance type (supports .transaction()). */
export type Database = typeof db;

/**
 * A database-like object that supports query operations (insert, select, update, delete).
 * Accepts both the root Database and transaction objects from db.transaction().
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DatabaseOperations = Pick<Database, 'insert' | 'select' | 'update' | 'delete'>;
