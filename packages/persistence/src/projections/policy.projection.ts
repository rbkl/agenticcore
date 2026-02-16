import { DomainEvent } from '@agenticcore/shared';
import { db, Database } from '../database';
import { policies, coverages, risks } from '../schema/policies';
import { eq } from 'drizzle-orm';
import { PolicyEventTypes } from './event-types';

export class PolicyProjection {
  constructor(private readonly database: Database = db) {}

  async handleEvent(event: DomainEvent): Promise<void> {
    const handler = this.handlers[event.eventType];
    if (handler) {
      await handler(event);
    }
  }

  private handlers: Record<string, (event: DomainEvent) => Promise<void>> = {
    [PolicyEventTypes.SUBMISSION_CREATED]: async (event) => {
      const payload = event.payload as {
        accountId: string;
        productCode: string;
        lobCode: string;
        effectiveDate: string;
      };
      await this.database.insert(policies).values({
        id: event.aggregateId,
        accountId: payload.accountId,
        productCode: payload.productCode,
        lobCode: payload.lobCode,
        effectiveDate: payload.effectiveDate,
        status: 'draft',
      });
    },

    ['Submitted']: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'submitted', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_REVIEW_STARTED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'underwriting_review', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_APPROVED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'quoted', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.UNDERWRITING_DECLINED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'declined', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.RATING_COMPLETED]: async (event) => {
      const payload = event.payload as {
        premium: { amount: number; currency: string };
      };
      await this.database
        .update(policies)
        .set({
          premiumAmount: String(payload.premium.amount),
          premiumCurrency: payload.premium.currency,
          updatedAt: new Date(),
        })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.POLICY_BOUND]: async (event) => {
      const payload = event.payload as {
        policyNumber: string;
        premium: { amount: number; currency: string };
      };
      await this.database
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

    [PolicyEventTypes.POLICY_ISSUED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'issued', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.POLICY_IN_FORCE]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'in_force', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.CANCELLATION_APPLIED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.REINSTATEMENT_APPLIED]: async (event) => {
      await this.database
        .update(policies)
        .set({ status: 'reinstated', updatedAt: new Date() })
        .where(eq(policies.id, event.aggregateId));
    },

    [PolicyEventTypes.RISK_ADDED]: async (event) => {
      const payload = event.payload as {
        riskId: string;
        riskType: string;
        riskData: Record<string, unknown>;
      };
      await this.database.insert(risks).values({
        id: payload.riskId,
        policyId: event.aggregateId,
        riskType: payload.riskType,
        data: payload.riskData,
      });
    },

    [PolicyEventTypes.COVERAGE_SELECTED]: async (event) => {
      const payload = event.payload as {
        coverageId: string;
        coverageCode: string;
        limit: { amount: number; currency: string };
        deductible: { amount: number; currency: string };
      };
      await this.database.insert(coverages).values({
        id: payload.coverageId,
        policyId: event.aggregateId,
        coverageCode: payload.coverageCode,
        limitAmount: String(payload.limit.amount),
        limitCurrency: payload.limit.currency,
        deductibleAmount: String(payload.deductible.amount),
        deductibleCurrency: payload.deductible.currency,
      });
    },
  };
}
