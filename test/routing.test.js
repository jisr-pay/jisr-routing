import test from 'node:test';
import assert from 'node:assert/strict';
import { collectQuotes } from '../src/index.js';
const request = { source: { code: 'USD', decimals: 2 }, destination: { code: 'NGN', decimals: 2 }, sendAmount: '10000' };
const quote = (id, overrides = {}) => ({ ...structuredClone(request), providerId: id,
  receiveAmount: '15000000', feeAmount: '100', feeIncluded: true, indicative: true,
  estimatedSeconds: 10, expiresAt: 2000, ...overrides });
const provider = (id, overrides) => ({ id, quote: async () => quote(id, overrides) });

test('no configured providers produces no invented quotes', async () => {
  assert.deepEqual(await collectQuotes(request, []), { quotes: [], unavailable: [] });
});
test('ranks exact net amounts beyond safe-number precision and breaks ties by speed', async () => {
  const result = await collectQuotes(request, [provider('a', { receiveAmount: '9007199254740992' }),
    provider('b', { receiveAmount: '9007199254740993' }), provider('c', { receiveAmount: '9007199254740993', estimatedSeconds: 5 })], { now: () => 1000 });
  assert.deepEqual(result.quotes.map(q => q.providerId), ['c', 'b', 'a']);
});
test('rejects expired, mismatched and ambiguous quotes; isolates provider failure', async () => {
  const result = await collectQuotes(request, [provider('valid'), provider('expired', { expiresAt: 999 }),
    provider('currency', { destination: { code: 'KES', decimals: 2 } }),
    provider('fees', { feeIncluded: false }), provider('debit', { sendAmount: '10001' }),
    { id: 'offline', quote: async () => { throw new Error('secret'); } }], { now: () => 1000 });
  assert.equal(result.quotes.length, 1); assert.equal(result.unavailable.length, 5);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('times out unresponsive providers and excludes payloads', async () => {
  const result = await collectQuotes(request, [provider('valid', { signedXdr: 'secret' }),
    { id: 'slow', quote: () => new Promise(() => {}) }], { now: () => 1000, timeoutMs: 10 });
  assert.equal(result.quotes.length, 1); assert.equal(result.unavailable[0].reason, 'unavailable');
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('rejects duplicate providers and floating point inputs', async () => {
  await assert.rejects(collectQuotes(request, [provider('a'), provider('a')]), TypeError);
  await assert.rejects(collectQuotes({ ...request, sendAmount: 100 }, []), TypeError);
});
test('rechecks expiry after provider collection and keeps request unchanged', async () => {
  let clock = 1000;
  const original = structuredClone(request);
  const result = await collectQuotes(request, [{ id: 'mutator', quote: async input => {
    input.sendAmount = '1'; return quote('mutator');
  } }, { id: 'later', quote: async () => { await new Promise(r => setTimeout(r, 5)); clock = 3000; return quote('later', { expiresAt: 4000 }); } }], { now: () => clock });
  assert.deepEqual(request, original); assert.deepEqual(result.quotes.map(q => q.providerId), ['later']);
});
