export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains';
  value: unknown;
}

export interface RuleAction {
  type: 'block' | 'warn' | 'log' | 'escalate';
  message: string;
  escalateTo?: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  category: 'underwriting' | 'rating' | 'compliance' | 'authority';
  condition: RuleCondition;
  action: RuleAction;
  severity: 'info' | 'warning' | 'block';
  lobCode?: string;
  stateCode?: string;
  active: boolean;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  severity: string;
  action?: RuleAction;
  message?: string;
}

export interface RuleEngineContext {
  agentType: string;
  action: string;
  payload: Record<string, unknown>;
  lobCode?: string;
  stateCode?: string;
}

export class RuleEngine {
  private rules: BusinessRule[] = [];

  loadRules(rules: BusinessRule[]): void {
    this.rules = rules;
  }

  addRule(rule: BusinessRule): void {
    this.rules.push(rule);
  }

  evaluate(context: RuleEngineContext): RuleEvaluationResult[] {
    const results: RuleEvaluationResult[] = [];
    const applicableRules = this.rules.filter(rule => {
      if (!rule.active) return false;
      if (rule.lobCode && rule.lobCode !== context.lobCode) return false;
      if (rule.stateCode && rule.stateCode !== context.stateCode) return false;
      return true;
    });

    for (const rule of applicableRules) {
      const triggered = this.evaluateCondition(rule.condition, context.payload);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        triggered,
        severity: rule.severity,
        action: triggered ? rule.action : undefined,
        message: triggered ? rule.action.message : undefined,
      });
    }

    return results;
  }

  hasBlockingRules(results: RuleEvaluationResult[]): boolean {
    return results.some(r => r.triggered && r.severity === 'block');
  }

  getBlockingResults(results: RuleEvaluationResult[]): RuleEvaluationResult[] {
    return results.filter(r => r.triggered && r.severity === 'block');
  }

  private evaluateCondition(condition: RuleCondition, payload: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(payload, condition.field);

    switch (condition.operator) {
      case 'eq': return fieldValue === condition.value;
      case 'neq': return fieldValue !== condition.value;
      case 'gt': return typeof fieldValue === 'number' && fieldValue > (condition.value as number);
      case 'lt': return typeof fieldValue === 'number' && fieldValue < (condition.value as number);
      case 'gte': return typeof fieldValue === 'number' && fieldValue >= (condition.value as number);
      case 'lte': return typeof fieldValue === 'number' && fieldValue <= (condition.value as number);
      case 'in': return Array.isArray(condition.value) && (condition.value as unknown[]).includes(fieldValue);
      case 'not_in': return Array.isArray(condition.value) && !(condition.value as unknown[]).includes(fieldValue);
      case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(String(condition.value));
      default: return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }
}
