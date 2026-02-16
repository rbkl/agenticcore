import { describe, it, expect } from 'vitest';
import { createMoney, addMoney, subtractMoney, multiplyMoney, zeroMoney } from './money';

describe('Money', () => {
  it('should create money with correct rounding', () => {
    const m = createMoney(100.555);
    expect(m.amount).toBe(100.56);
    expect(m.currency).toBe('USD');
  });

  it('should add money of same currency', () => {
    const a = createMoney(100);
    const b = createMoney(200.50);
    const result = addMoney(a, b);
    expect(result.amount).toBe(300.50);
  });

  it('should throw when adding different currencies', () => {
    const a = createMoney(100, 'USD');
    const b = createMoney(200, 'EUR');
    expect(() => addMoney(a, b)).toThrow('Cannot add different currencies');
  });

  it('should subtract money', () => {
    const a = createMoney(500);
    const b = createMoney(200);
    const result = subtractMoney(a, b);
    expect(result.amount).toBe(300);
  });

  it('should multiply money', () => {
    const m = createMoney(100);
    const result = multiplyMoney(m, 1.5);
    expect(result.amount).toBe(150);
  });

  it('should create zero money', () => {
    const m = zeroMoney();
    expect(m.amount).toBe(0);
    expect(m.currency).toBe('USD');
  });
});
