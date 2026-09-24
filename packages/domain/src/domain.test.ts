import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLOT_STATUSES, isTransitionAllowed, calculatePlotPrice, evaluateReservationState,
  projectCustomerPii, rupeesToPaise, addPaise, DEFAULT_RESERVATION_HOURS,
} from './index';

describe('domain package', () => {
  it('has 9 plot statuses without HOLD', () => {
    assert.equal(PLOT_STATUSES.length, 9);
    assert.ok(!(PLOT_STATUSES as readonly string[]).includes('HOLD'));
  });
  it('allows happy-path transitions', () => {
    assert.equal(isTransitionAllowed('AVAILABLE', 'RESERVED'), true);
    assert.equal(isTransitionAllowed('RESERVED', 'BOOKED'), true);
    assert.equal(isTransitionAllowed('AVAILABLE', 'SOLD'), false);
  });
  it('calculates price', () => {
    const r = calculatePlotPrice(
      { areaSqYd: 100, facing: 'East' },
      { baseRatePerSqYd: 1000, facingPremium: { East: 50 }, cornerPremium: 0, featurePremium: {} },
    );
    assert.equal(r.ratePerSqYd, 1050);
    assert.equal(r.total, 105000);
  });
  it('evaluates reservation expiry', () => {
    const past = new Date(Date.now() - 3600_000).toISOString();
    assert.equal(evaluateReservationState({ expiresAt: past, state: 'ACTIVE' }), 'EXPIRED');
  });
  it('redacts agent unrelated PII', () => {
    const v = projectCustomerPii(
      { id: 'c1', name: 'A', phone: '9999999999', email: 'a@b.com' },
      { role: 'Agent', ownsRelationship: false, isSelf: false },
    );
    assert.equal(v.redacted, true);
    assert.equal(v.phone, null);
  });
  it('money uses integer paise', () => {
    assert.equal(rupeesToPaise(10.5), 1050);
    assert.equal(addPaise(100, 50), 150);
  });
  it('default reservation hours is 48', () => {
    assert.equal(DEFAULT_RESERVATION_HOURS, 48);
  });
});
