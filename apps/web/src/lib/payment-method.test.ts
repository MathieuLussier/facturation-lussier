import { describe, expect, it } from 'vitest';
import { PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from './payment-method';

describe('payment-method', () => {
  it('chaque mode de paiement a un libellé non vide', () => {
    for (const method of PAYMENT_METHODS) {
      expect(PAYMENT_METHOD_LABEL[method]).toBeTruthy();
    }
  });

  it('expose les 5 modes attendus', () => {
    expect(PAYMENT_METHODS).toEqual(['VIREMENT', 'CHEQUE', 'CARTE', 'COMPTANT', 'AUTRE']);
  });
});
