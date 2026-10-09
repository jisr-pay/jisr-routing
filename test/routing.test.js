import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, Networks, Operation } from '@stellar/stellar-sdk';
import { amountUnits, createHorizonProvider, selectRoute, buildPathPayment } from '../src/index.js';

const issuer = Keypair.random().publicKey();
const request = { sourceAsset: 'native', destinationAsset: `USD:${issuer}`, sourceAmount: '10' };
const pathRecord = { source_asset_type: 'native', source_amount: '10.0000000',
  destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USD',
  destination_asset_issuer: issuer, destination_amount: '11.0000001', path: [] };
function provider(record = pathRecord, passphrase = Networks.TESTNET) {
  const calls = [];
  return { calls, api: createHorizonProvider({ clock: () => 100,
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => url.pathname === '/'
        ? { network_passphrase: passphrase } : { _embedded: { records: [record] } } };
    } }) };
}

test('Horizon quote verifies identity, exact request and unsigned operation', async () => {
  const { api, calls } = provider();
  const quotes = await api.quote(request);
  assert.equal(calls[1][0].pathname, '/paths/strict-send');
  assert.equal(calls[1][0].searchParams.get('source_amount'), '10');
  assert.equal(calls[1][1].redirect, 'error');
  const chosen = selectRoute(quotes, request, 100);
  const sender = Keypair.random().publicKey();
  const recipient = Keypair.random().publicKey();
  const decoded = Operation.fromXDRObject(buildPathPayment(chosen, {
    sender, recipient, destinationMin: '10.99', now: 100,
  }));
  assert.equal(decoded.type, 'pathPaymentStrictSend');
  assert.equal(decoded.sendAmount, '10.0000000');
  assert.equal(decoded.destMin, '10.9900000');
  assert.equal(decoded.destination, recipient);
});

test('exact amounts reject invalid grammar, zero and int64 overflow', () => {
  assert.equal(amountUnits('90000000000.0000001'), 900000000000000001n);
  for (const amount of ['0', '-1', '01', '1e7', '1.00000001', '922337203685.4775808', 1]) {
    assert.throws(() => amountUnits(amount));
  }
});

test('mismatched identity and malformed paths fail closed', async () => {
  await assert.rejects(provider(pathRecord, Networks.PUBLIC).api.quote(request), /identity/);
  for (const record of [{ ...pathRecord, source_amount: '9' },
    { ...pathRecord, destination_asset_issuer: Keypair.random().publicKey() },
    { ...pathRecord, path: [{}] }, { ...pathRecord, destination_amount: '0' }]) {
    await assert.rejects(provider(record).api.quote(request));
  }
});

test('selection excludes expired, unrelated and malformed quotes; ties are deterministic', async () => {
  const [quote] = await provider().api.quote(request);
  const better = { ...quote, destinationAmount: '11.0000002' };
  assert.equal(selectRoute([quote, better], request, 100), better);
  assert.equal(selectRoute([{ ...better, expiresAt: 100 },
    { ...better, sourceAmount: '9' }, { ...better, path: [{}] }], request, 100), null);
  const tie = { ...quote, path: ['native'] };
  assert.deepEqual(selectRoute([quote, tie], request, 100), selectRoute([tie, quote], request, 100));
});

test('operation construction refuses expired quotes, invalid addresses and excessive minimum', async () => {
  const [quote] = await provider().api.quote(request);
  const parties = { sender: Keypair.random().publicKey(), recipient: Keypair.random().publicKey(),
    destinationMin: '11', now: 100 };
  assert.throws(() => buildPathPayment(quote, { ...parties, now: quote.expiresAt }));
  assert.throws(() => buildPathPayment(quote, { ...parties, sender: 'Gfake' }));
  assert.throws(() => buildPathPayment(quote, { ...parties, destinationMin: '12' }));
});

test('provider failures and caller cancellation propagate without broadcasting', async () => {
  const controller = new AbortController();
  controller.abort();
  const api = createHorizonProvider({ fetchImpl: async (_, { signal }) => {
    signal.throwIfAborted();
    throw new Error('unavailable');
  } });
  await assert.rejects(api.quote({ ...request, signal: controller.signal }));
  await assert.rejects(api.quote(request), /unavailable/);
  await assert.rejects(createHorizonProvider({ fetchImpl: async () => ({ ok: false, status: 503 }) }).quote(request), /503/);
});
