import { setup, assign, createActor } from 'xstate';

export type PolicyLifecycleContext = {
  policyId: string;
  requiredFieldsComplete: boolean;
  underwriterDecision: 'pending' | 'approved' | 'declined' | 'referred';
  customerAccepted: boolean;
  paymentReceived: boolean;
  effectiveDateReached: boolean;
  cancellationApproved: boolean;
  reinstatementApproved: boolean;
};

export type PolicyLifecycleEvent =
  | { type: 'SUBMIT' }
  | { type: 'START_UNDERWRITING'; assignedTo: string; riskScore: number }
  | { type: 'APPROVE_UNDERWRITING'; approvedBy: string; conditions: string[] }
  | { type: 'DECLINE_UNDERWRITING'; declinedBy: string; reasons: string[] }
  | { type: 'REFER_UNDERWRITING'; referredTo: string; reasons: string[] }
  | { type: 'CUSTOMER_ACCEPT' }
  | { type: 'RECEIVE_PAYMENT' }
  | { type: 'ISSUE_POLICY' }
  | { type: 'ACTIVATE_POLICY' }
  | { type: 'REQUEST_ENDORSEMENT' }
  | { type: 'COMPLETE_ENDORSEMENT' }
  | { type: 'REQUEST_RENEWAL' }
  | { type: 'COMPLETE_RENEWAL' }
  | { type: 'REQUEST_CANCELLATION' }
  | { type: 'APPROVE_CANCELLATION' }
  | { type: 'REQUEST_REINSTATEMENT' }
  | { type: 'APPROVE_REINSTATEMENT' }
  | { type: 'EXPIRE' }
  | { type: 'SET_REQUIRED_FIELDS_COMPLETE'; complete: boolean };

export const policyLifecycleMachine = setup({
  types: {
    context: {} as PolicyLifecycleContext,
    events: {} as PolicyLifecycleEvent,
  },
  guards: {
    requiredFieldsComplete: ({ context }) => context.requiredFieldsComplete,
    underwriterApproved: ({ context }) => context.underwriterDecision === 'approved',
    underwriterDeclined: ({ context }) => context.underwriterDecision === 'declined',
    customerAccepted: ({ context }) => context.customerAccepted,
    paymentReceived: ({ context }) => context.paymentReceived,
    effectiveDateReached: ({ context }) => context.effectiveDateReached,
    cancellationApproved: ({ context }) => context.cancellationApproved,
    reinstatementApproved: ({ context }) => context.reinstatementApproved,
  },
}).createMachine({
  id: 'policyLifecycle',
  initial: 'draft',
  context: {
    policyId: '',
    requiredFieldsComplete: false,
    underwriterDecision: 'pending',
    customerAccepted: false,
    paymentReceived: false,
    effectiveDateReached: false,
    cancellationApproved: false,
    reinstatementApproved: false,
  },
  states: {
    draft: {
      on: {
        SET_REQUIRED_FIELDS_COMPLETE: {
          actions: assign({ requiredFieldsComplete: ({ event }) => event.complete }),
        },
        SUBMIT: {
          target: 'submitted',
          guard: 'requiredFieldsComplete',
        },
      },
    },
    submitted: {
      on: {
        START_UNDERWRITING: {
          target: 'underwriting_review',
        },
      },
    },
    underwriting_review: {
      on: {
        APPROVE_UNDERWRITING: {
          target: 'quoted',
          actions: assign({ underwriterDecision: 'approved' }),
        },
        DECLINE_UNDERWRITING: {
          target: 'declined',
          actions: assign({ underwriterDecision: 'declined' }),
        },
        REFER_UNDERWRITING: {
          target: 'underwriting_review',
          actions: assign({ underwriterDecision: 'referred' }),
        },
      },
    },
    quoted: {
      on: {
        CUSTOMER_ACCEPT: {
          target: 'binding',
          actions: assign({ customerAccepted: true }),
        },
      },
    },
    declined: {
      type: 'final',
    },
    binding: {
      on: {
        RECEIVE_PAYMENT: {
          target: 'bound',
          actions: assign({ paymentReceived: true }),
        },
      },
    },
    bound: {
      on: {
        ISSUE_POLICY: {
          target: 'issued',
        },
      },
    },
    issued: {
      on: {
        ACTIVATE_POLICY: {
          target: 'in_force',
          actions: assign({ effectiveDateReached: true }),
        },
      },
    },
    in_force: {
      on: {
        REQUEST_ENDORSEMENT: {
          target: 'endorsement_pending',
        },
        REQUEST_RENEWAL: {
          target: 'renewal_pending',
        },
        REQUEST_CANCELLATION: {
          target: 'cancellation_pending',
        },
        EXPIRE: {
          target: 'expired',
        },
      },
    },
    endorsement_pending: {
      on: {
        COMPLETE_ENDORSEMENT: {
          target: 'in_force',
        },
      },
    },
    renewal_pending: {
      on: {
        COMPLETE_RENEWAL: {
          target: 'in_force',
        },
      },
    },
    cancellation_pending: {
      on: {
        APPROVE_CANCELLATION: {
          target: 'cancelled',
          actions: assign({ cancellationApproved: true }),
        },
      },
    },
    cancelled: {
      on: {
        REQUEST_REINSTATEMENT: {
          target: 'cancelled',
        },
        APPROVE_REINSTATEMENT: {
          target: 'reinstated',
          actions: assign({ reinstatementApproved: true }),
        },
      },
    },
    reinstated: {
      on: {
        REQUEST_ENDORSEMENT: {
          target: 'endorsement_pending',
        },
        REQUEST_RENEWAL: {
          target: 'renewal_pending',
        },
        REQUEST_CANCELLATION: {
          target: 'cancellation_pending',
        },
        EXPIRE: {
          target: 'expired',
        },
      },
    },
    expired: {
      type: 'final',
    },
  },
});

export type PolicyLifecycleState = 'draft' | 'submitted' | 'underwriting_review' | 'quoted' | 'declined' | 'binding' | 'bound' | 'issued' | 'in_force' | 'endorsement_pending' | 'renewal_pending' | 'cancellation_pending' | 'cancelled' | 'reinstated' | 'expired';

export function createPolicyLifecycleActor(context?: Partial<PolicyLifecycleContext>) {
  return createActor(policyLifecycleMachine, {
    input: context,
  });
}

export function canTransition(currentState: PolicyLifecycleState, event: string): boolean {
  const stateConfig = policyLifecycleMachine.config.states?.[currentState];
  if (!stateConfig || !('on' in stateConfig)) return false;
  const on = stateConfig.on as Record<string, unknown> | undefined;
  return on ? event in on : false;
}
