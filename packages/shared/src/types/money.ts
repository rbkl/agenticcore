import { z } from 'zod';

export const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string().length(3).default('USD'),
});

export type Money = z.infer<typeof MoneySchema>;

export function createMoney(amount: number, currency = 'USD'): Money {
  return { amount: Math.round(amount * 100) / 100, currency };
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amount - b.amount, a.currency);
}

export function multiplyMoney(money: Money, factor: number): Money {
  return createMoney(money.amount * factor, money.currency);
}

export function zeroMoney(currency = 'USD'): Money {
  return createMoney(0, currency);
}
