import test from 'node:test';
import assert from 'node:assert/strict';
import { collectQuotes } from '../src/index.js';
import { createFixtureProvider } from '../src/providers/fixture.js';

const request = { source: { code: 'USD', decimals: 2 }, destination: { code: 'NGN', decimals: 2 }, sendAmount: '10000' };
const provider = (overrides = {}) => createFixtureProvider({ id: 'fixture-a',
  source: { code: 'USD', decimals: 2 }, destination: { code: 'NGN', decimals: 2 },
  rate: '1550', feeRateBps: 100, estimatedSeconds: 5, expiresInMs: 30_000,
  now: () => 1000, ...overrides });

test('fixture provider produces exact fee-inclusive math at 1% debit', async () => {
  const result = await collectQuotes(request, [provider()], { now: () => 1000 });
  assert.equal(result.unavailable.length, 0);
  const q = result.quotes[0];
  assert.equal(q.feeAmount, '100');          // 1% of 10000
  assert.equal(q.receiveAmount, '15345000'); // 9900 * 1550
  assert.equal(q.feeIncluded, true);
  assert.equal(q.indicative, true);
  assert.equal(q.estimatedSeconds, 5);
  assert.equal(q.expiresAt, 31000);
});

test('no-fee provider ranks after lower rate when net receipt decides', async () => {
  const slow = provider({ id: 'fixture-b', rate: '1520', feeRateBps: 0, estimatedSeconds: 5 });
  const result = await collectQuotes(request, [slow, provider()], { now: () => 1000 });
  assert.deepEqual(result.quotes.map(q => q.providerId), ['fixture-a', 'fixture-b']);
  assert.deepEqual(result.quotes.map(q => q.receiveAmount), ['15345000', '15200000']);
});

test('abort and expiry propagate as isolated unavailable/expired outcomes', async () => {
  const fixture = provider({ id: 'fixture-a' });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => fixture.quote(structuredClone(request), { signal: controller.signal }));
  const freshExpiry = provider({ id: 'expired', expiresInMs: 1000, now: () => 1000 });
  const result = await collectQuotes(request, [freshExpiry, provider()], { now: () => 2000 });
  assert.deepEqual(result.quotes.map(q => q.providerId), ['fixture-a']);
  assert.deepEqual(result.unavailable.map(u => u.providerId).sort(), ['expired']);
  assert.equal(result.unavailable[0].reason, 'invalid_or_expired_quote');
  const instant = { id: 'explode', async quote() { throw new Error('vendor down'); } };
  const mixed = await collectQuotes(request, [instant, provider()], { now: () => 1000 });
  assert.deepEqual(mixed.quotes.map(q => q.providerId), ['fixture-a']);
  assert.deepEqual(mixed.unavailable.map(u => u.providerId), ['explode']);
});

test('unsupported corridors and malformed requests isolate as unavailable', async () => {
  const wrongCorridor = provider({ id: 'fixture-kes', source: { code: 'USD', decimals: 2 }, destination: { code: 'KES', decimals: 2 } });
  const result = await collectQuotes(request, [wrongCorridor, provider()], { now: () => 1000 });
  assert.deepEqual(result.quotes.map(q => q.providerId), ['fixture-a']);
  assert.equal(result.unavailable[0].providerId, 'fixture-kes');
  assert.equal(result.unavailable[0].reason, 'unavailable');
});

test('cross-decimals conversion keeps integer precision', async () => {
  const cross = createFixtureProvider({ id: 'cross', source: { code: 'USD', decimals: 2 },
    destination: { code: 'XYZ', decimals: 0 }, rate: '10', feeRateBps: 0, now: () => 1000 });
  const result = await collectQuotes({ source: { code: 'USD', decimals: 2 },
    destination: { code: 'XYZ', decimals: 0 }, sendAmount: '9900' }, [cross], { now: () => 1000 });
  assert.equal(result.quotes[0].receiveAmount, '990');
});

test('tiny rate below one destination unit is rejected by the engine, not invented', async () => {
  const tiny = provider({ rate: '0.00001', feeRateBps: 0 });
  const result = await collectQuotes(request, [tiny], { now: () => 1000 });
  assert.deepEqual(result.quotes, []);
  assert.equal(result.unavailable[0].providerId, 'fixture-a');
  assert.equal(result.unavailable[0].reason, 'invalid_or_expired_quote');
});

test('constructor validation rejects malformed configuration', () => {
  assert.throws(() => createFixtureProvider({}), TypeError);
  assert.throws(() => createFixtureProvider({ id: 'x',
    source: { code: 'USD', decimals: 2 }, destination: { code: 'NGN', decimals: 2 },
    rate: '1.5.5' }), TypeError);
  assert.throws(() => createFixtureProvider({ id: 'x',
    source: { code: 'USD', decimals: 2 }, destination: { code: 'NGN', decimals: 2 },
    rate: '1', feeRateBps: -1 }), TypeError);
});