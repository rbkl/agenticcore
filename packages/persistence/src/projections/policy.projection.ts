import { DomainEvent } from '@agenticcore/shared';
import { db, DatabaseOperations } from '../database';
import { policies, coverages, risks } from '../schema/policies';
import { eq } from 'drizzle-orm';
import { PolicyEventTypes } from './event-types';

export class PolicyProjection {
  constructor(private readonly database: DatabaseOperations = db) {}

  /** Handle a single event using the provided transaction or default db. */
  async handleEvent(event: DomainEvent, tx?: DatabaseOperations): Promise<void> {
    const database = tx || this.database;
    const handler = this.getHandler(event.eventType);
    if (handler) {
      await handler(event, database);
    }
  }

  /** Handle multiple events in order. Used for projection replay. */
  async handleEvents(events: DomainEvent[], tx?: DatabaseOperations): Promise<void> {
    for (const event of events) {
      await this.handleEvent(event, tx);
    }
  }

  /** Rebuild projections for a single aggregate: delete existing read model rows, then replay all events. */
  async rebuildAggregate(aggregateId: string, events: DomainEvent[], tx?: DatabaseOperations): Promise<void> {
    const database = tx || this.database;
    // Delete existing read model rows (children first to respect FK constraints)
    await database.delete(coverages).where(eq(coverages.policyId, aggregateId));
    await database.delete(risks).where(eq(risks.policyId, aggregateId));
    await database.delete(policies).where(eq(policies.id, aggregateId));
    // Replay all events
    await this.handleEvents(events, database);
  }

  private getHandler(eventType: string): ((event: DomainEvent, database: DatabaseOperations) => Promise<void>) | undefined {
    return this.handlers[eventType];
  }

  private handlers: Record<string, (event: DomainEvent, database: DatabaseOperations) => Promise<void>> = {
    [PolicyEventTypes.SUBMISSION_CREATED]: async (event, database) => {
      const payload = event.payload as {
        accountId: string;
        productCode: string;
        lobCode: string;
        effectiveDate: string;
      };
      await database.insert(policies).values({
        id: event.aggregateId,
        accountId: payload.accountId,
        productCode: payload.productCode,
        lobCode: payload.lobCode,
        effectiveDate: payload.effectiveDate,
        status: 'draft',
      });
    },

    ['Submitted']: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'submitted', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_REVIEW_STARTED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'underwriting_review', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_APPROVED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'quoted', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_DECLINED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.RATING_COMPLETED]: async (event, database) => {
      const payload = event.payload as {
        premium: { amount: number; currency: string };
      };
      await database
        .update(policies)
        .set({
          premiumAmount: String(payload.premium.amount),
          premiumCurrency: payload.premium.currency,
          updatedAt: new Date(),
        })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.POLICY_BOUND]: async (event, database) => {
      const payload = event.payload as {
        policyNumber: string;
        premium: { amount: number; currency: string };
      };
      await database
        .update(policies)
        .set({
          policyNumber: payload.policyNumber,
          status: 'bound',
          premiumAmount: String(payload.premium.amount),
          premiumCurrency: payload.premium.currency,
          updatedAt: new Date(),
        })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.POLICY_ISSUED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'issued', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.POLICY_IN_FORCE]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'in_force', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.CANCELLATION_APPLIED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.REINSTATEMENT_APPLIED]: async (event, database) => {
      await database
        .update(policies)
        .set({ status: 'reinstated', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.RISK_ADDED]: async (event, database) => {
      const payload = event.payload as {
        riskId: string;
        riskType: string;
        riskData: Record<string, unknown>;
      };
      await database.insert(risks).values({
        id: payload.riskId,
        policyId: event.aggregateId,
        riskType: payload.riskType,
        data: payload.riskData,
      });
    },

    [PolicyEventTypes.RISK_REMOVED]: async (event, database) => {
      const payload = event.payload as { riskId: string };
      await database.delete(risks).where(eq(risks.id, payload.riskId));
    },

    [PolicyEventTypes.COVERAGE_SELECTED]: async (event, database) => {
      const payload = event.payload as {
        coverageId: string;
        coverageCode: string;
        limit: { amount: number; currency: string };
        deductible: { amount: number; currency: string };
      };
      await database.insert(coverages).values({
        id: payload.coverageId,
        policyId: event.aggregateId,
        coverageCode: payload.coverageCode,
        limitAmount: String(payload.limit.amount),
        limitCurrency: payload.limit.currency,
        deductibleAmount: String(payload.deductible.amount),
        deductibleCurrency: payload.deductible.currency,
      });
    },

    [PolicyEventTypes.COVERAGE_REMOVED]: async (event, database) => {
      const payload = event.payload as { coverageId: string };
      await database.delete(coverages).where(eq(coverages.id, payload.coverageId));
    },
  };
}
