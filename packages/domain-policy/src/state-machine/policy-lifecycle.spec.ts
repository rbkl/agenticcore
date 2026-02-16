import { describe, it, expect } from 'vitest';
import { canTransition } from './policy-lifecycle';

describe('Policy Lifecycle State Machine', () => {
  it('should allow SUBMIT from draft', () => {
    expect(canTransition('draft', 'SUBMIT')).toBe(true);
  });

  it('should not allow SUBMIT from quoted', () => {
    expect(canTransition('quoted', 'SUBMIT')).toBe(false);
  });

  it('should allow APPROVE_UNDERWRITING from underwriting_review', () => {
    expect(canTransition('underwriting_review', 'APPROVE_UNDERWRITING')).toBe(true);
  });

  it('should allow DECLINE_UNDERWRITING from underwriting_review', () => {
    expect(canTransition('underwriting_review', 'DECLINE_UNDERWRITING')).toBe(true);
  });

  it('should allow CUSTOMER_ACCEPT from quoted', () => {
    expect(canTransition('quoted', 'CUSTOMER_ACCEPT')).toBe(true);
  });

  it('should allow RECEIVE_PAYMENT from binding', () => {
    expect(canTransition('binding', 'RECEIVE_PAYMENT')).toBe(true);
  });

  it('should allow ISSUE_POLICY from bound', () => {
    expect(canTransition('bound', 'ISSUE_POLICY')).toBe(true);
  });

  it('should allow REQUEST_ENDORSEMENT from in_force', () => {
    expect(canTransition('in_force', 'REQUEST_ENDORSEMENT')).toBe(true);
  });

  it('should allow REQUEST_CANCELLATION from in_force', () => {
    expect(canTransition('in_force', 'REQUEST_CANCELLATION')).toBe(true);
  });

  it('should allow APPROVE_REINSTATEMENT from cancelled', () => {
    expect(canTransition('cancelled', 'APPROVE_REINSTATEMENT')).toBe(true);
  });

  it('should not allow transitions from expired (final state)', () => {
    expect(canTransition('expired', 'SUBMIT')).toBe(false);
  });

  it('should not allow transitions from declined (final state)', () => {
    expect(canTransition('declined', 'SUBMIT')).toBe(false);
  });
});
