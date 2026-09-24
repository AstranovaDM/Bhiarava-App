import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

class FakePlotLock {
  private locked = false;
  status: 'AVAILABLE' | 'RESERVED' = 'AVAILABLE';
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    while (this.locked) await new Promise((r) => setTimeout(r, 1));
    this.locked = true;
    try { return await fn(); } finally { this.locked = false; }
  }
}

async function tryReserve(plot: FakePlotLock): Promise<'ok' | 'conflict'> {
  return plot.withLock(async () => {
    if (plot.status !== 'AVAILABLE') return 'conflict';
    await new Promise((r) => setTimeout(r, 5));
    plot.status = 'RESERVED';
    return 'ok';
  });
}

describe('reservation concurrency', () => {
  it('allows exactly one winner under concurrent reserve', async () => {
    const plot = new FakePlotLock();
    const results = await Promise.all([
      tryReserve(plot), tryReserve(plot), tryReserve(plot), tryReserve(plot), tryReserve(plot),
    ]);
    assert.equal(results.filter((r) => r === 'ok').length, 1);
    assert.equal(results.filter((r) => r === 'conflict').length, 4);
    assert.equal(plot.status, 'RESERVED');
  });
});
