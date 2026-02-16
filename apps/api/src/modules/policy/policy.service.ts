import { Injectable } from '@nestjs/common';
import { PolicyAggregate } from '@agenticcore/domain-policy';
import { EventStoreRepository, PolicyRepository, PolicyProjection, db } from '@agenticcore/persistence';
import { generateId, generatePolicyNumber, DomainEventMetadata, DomainEvent } from '@agenticcore/shared';
import { CreateSubmissionDto, AddRiskDto, SelectCoverageDto } from './dto/create-submission.dto';

@Injectable()
export class PolicyService {
  private readonly eventStore = new EventStoreRepository();
  private readonly policyRepo = new PolicyRepository();
  private readonly projection = new PolicyProjection();

  private createMetadata(actorId = 'system', actorName = 'System'): Omit<DomainEventMetadata, 'timestamp'> {
    return {
      correlationId: generateId(),
      actor: { type: 'system', id: actorId, name: actorName },
    };
  }

  async createSubmission(dto: CreateSubmissionDto) {
    const id = generateId();
    const metadata = this.createMetadata();

    const aggregate = PolicyAggregate.createSubmission(
      id,
      dto.accountId,
      dto.productCode,
      dto.lobCode,
      dto.effectiveDate,
      metadata,
    );

    await this.saveAndProject(aggregate);
    return { id, status: aggregate.status };
  }

  async getSubmission(id: string) {
    const aggregate = await this.loadAggregate(id);
    return aggregate.toSnapshot();
  }

  async addRisk(submissionId: string, dto: AddRiskDto) {
    const aggregate = await this.loadAggregate(submissionId);
    const riskId = aggregate.addRisk(dto.riskType, dto.riskData, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { riskId };
  }

  async selectCoverage(submissionId: string, dto: SelectCoverageDto) {
    const aggregate = await this.loadAggregate(submissionId);
    const coverageId = aggregate.selectCoverage(
      dto.coverageCode,
      { amount: dto.limitAmount, currency: dto.limitCurrency || 'USD' },
      { amount: dto.deductibleAmount, currency: dto.deductibleCurrency || 'USD' },
      this.createMetadata(),
    );
    await this.saveAndProject(aggregate);
    return { coverageId };
  }

  async submitForReview(submissionId: string) {
    const aggregate = await this.loadAggregate(submissionId);
    aggregate.submit(this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async startUnderwriting(submissionId: string, assignedTo: string, riskScore: number) {
    const aggregate = await this.loadAggregate(submissionId);
    aggregate.startUnderwritingReview(assignedTo, riskScore, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async approveUnderwriting(submissionId: string, approvedBy: string, conditions: string[] = []) {
    const aggregate = await this.loadAggregate(submissionId);
    aggregate.approveUnderwriting(approvedBy, conditions, 'standard', this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async declineUnderwriting(submissionId: string, declinedBy: string, reasons: string[]) {
    const aggregate = await this.loadAggregate(submissionId);
    aggregate.declineUnderwriting(declinedBy, reasons, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async bindPolicy(policyId: string) {
    const aggregate = await this.loadAggregate(policyId);
    const policyNumber = generatePolicyNumber();
    aggregate.acceptAndBind(this.createMetadata());
    aggregate.receivePayment(this.createMetadata());
    aggregate.bindPolicy(policyNumber, aggregate.effectiveDate, aggregate.premium, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { policyNumber, status: aggregate.status };
  }

  async issuePolicy(policyId: string) {
    const aggregate = await this.loadAggregate(policyId);
    aggregate.issuePolicy(['policy-dec-page.pdf'], new Date().toISOString(), this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async activatePolicy(policyId: string) {
    const aggregate = await this.loadAggregate(policyId);
    aggregate.activatePolicy(aggregate.effectiveDate, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async requestEndorsement(policyId: string, changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>, effectiveDate: string) {
    const aggregate = await this.loadAggregate(policyId);
    aggregate.requestEndorsement(changes, effectiveDate, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async requestCancellation(policyId: string, reason: string, effectiveDate: string, requestedBy: string) {
    const aggregate = await this.loadAggregate(policyId);
    aggregate.requestCancellation(reason, effectiveDate, requestedBy, this.createMetadata());
    await this.saveAndProject(aggregate);
    return { status: aggregate.status };
  }

  async getEvents(policyId: string) {
    return this.eventStore.getEvents(policyId);
  }

  private async loadAggregate(id: string): Promise<PolicyAggregate> {
    const events = await this.eventStore.getEvents(id);
    if (events.length === 0) {
      throw new Error(`Policy aggregate ${id} not found`);
    }
    const aggregate = new PolicyAggregate(id);
    aggregate.loadFromHistory(events);
    return aggregate;
  }

  private async saveAndProject(aggregate: PolicyAggregate): Promise<void> {
    const events = aggregate.uncommittedEvents;
    const expectedVersion = aggregate.version - events.length;

    // Wrap event store append + projection in a single transaction
    // so they succeed or fail atomically — prevents orphaned events
    // with missing read model rows (the FK issue).
    await db.transaction(async (tx) => {
      await this.eventStore.appendEvents([...events], expectedVersion, tx);
      await this.projection.handleEvents([...events], tx);
    });

    aggregate.clearUncommittedEvents();
  }
}
