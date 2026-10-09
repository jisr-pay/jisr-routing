import { Asset, Networks, StrKey, Operation } from '@stellar/stellar-sdk';

const MAX_AMOUNT = 9223372036854775807n;

export function amountUnits(value) {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)(\.\d{1,7})?$/.test(value)) {
    throw new Error('Amount must be an exact decimal string with at most seven places');
  }
  const [whole, fractional = ''] = value.split('.');
  const units = BigInt(whole) * 10000000n + BigInt(fractional.padEnd(7, '0'));
  if (units <= 0n || units > MAX_AMOUNT) throw new Error('Amount is outside the Stellar int64 range');
  return units;
}

function asset(value) {
  if (value === 'native') return Asset.native();
  if (typeof value !== 'string') throw new Error('Invalid asset');
  const parts = value.split(':');
  if (parts.length !== 2 || !/^[a-zA-Z0-9]{1,12}$/.test(parts[0]) || !StrKey.isValidEd25519PublicKey(parts[1])) {
    throw new Error('Asset must be native or CODE:ISSUER');
  }
  return new Asset(parts[0], parts[1]);
}

function recordAsset(record, prefix = '') {
  const type = record[`${prefix}asset_type`];
  if (type === 'native') return 'native';
  const code = record[`${prefix}asset_code`];
  if (!['credit_alphanum4', 'credit_alphanum12'].includes(type)
      || typeof code !== 'string' || (code.length <= 4) !== (type === 'credit_alphanum4')) {
    throw new Error('Invalid Horizon asset type');
  }
  const value = `${code}:${record[`${prefix}asset_issuer`]}`;
  asset(value);
  return value;
}

function validateQuote(quote, now) {
  if (!quote || quote.provider !== 'horizon' || quote.network !== 'TESTNET'
      || !Number.isSafeInteger(quote.expiresAt) || quote.expiresAt <= now
      || !Array.isArray(quote.path) || quote.path.length > 5) throw new Error('Invalid or expired quote');
  asset(quote.sourceAsset);
  asset(quote.destinationAsset);
  quote.path.forEach(asset);
  amountUnits(quote.sourceAmount);
  amountUnits(quote.destinationAmount);
}

/** Read-only Testnet adapter. Quotes describe available order-book paths, not settlement. */
export function createHorizonProvider({ url = 'https://horizon-testnet.stellar.org',
  fetchImpl = fetch, clock = Date.now, timeoutMs = 5000, quoteTtlMs = 15000 } = {}) {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Horizon URL must use HTTPS without credentials, query or fragment');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000
      || !Number.isSafeInteger(quoteTtlMs) || quoteTtlMs <= 0 || quoteTtlMs > 60000) {
    throw new Error('Invalid provider time limits');
  }
  async function read(path, signal) {
    const response = await fetchImpl(new URL(path, endpoint), {
      signal, redirect: 'error', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Horizon request failed (${response.status})`);
    return response.json();
  }
  return {
    async quote({ sourceAsset, destinationAsset, sourceAmount, signal }) {
      const source = asset(sourceAsset);
      asset(destinationAsset);
      const requested = amountUnits(sourceAmount);
      const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
      const root = await read('/', combined);
      if (root.network_passphrase !== Networks.TESTNET) throw new Error('Horizon network identity is not Testnet');
      const params = new URLSearchParams({ source_asset_type: source.getAssetType(),
        source_amount: sourceAmount, destination_assets: destinationAsset });
      if (!source.isNative()) {
        params.set('source_asset_code', source.getCode());
        params.set('source_asset_issuer', source.getIssuer());
      }
      const result = await read(`/paths/strict-send?${params}`, combined);
      if (!Array.isArray(result?._embedded?.records)) throw new Error('Malformed Horizon path response');
      const quotes = result._embedded.records.map(record => {
        if (recordAsset(record, 'source_') !== sourceAsset
            || recordAsset(record, 'destination_') !== destinationAsset
            || amountUnits(record.source_amount) !== requested || !Array.isArray(record.path)) {
          throw new Error('Horizon path does not match requested assets and amount');
        }
        const quote = { provider: 'horizon', network: 'TESTNET', sourceAsset, destinationAsset,
          sourceAmount, destinationAmount: record.destination_amount,
          path: record.path.map(item => recordAsset(item)), expiresAt: clock() + quoteTtlMs };
        validateQuote(quote, clock());
        return quote;
      });
      return quotes;
    },
  };
}

/** Compare only like-for-like quotes; maximize destination amount with deterministic ties. */
export function selectRoute(quotes, { sourceAsset, destinationAsset, sourceAmount }, now = Date.now()) {
  asset(sourceAsset);
  asset(destinationAsset);
  const requested = amountUnits(sourceAmount);
  const candidates = quotes.filter(quote => {
    try {
      validateQuote(quote, now);
      return quote.sourceAsset === sourceAsset && quote.destinationAsset === destinationAsset
        && amountUnits(quote.sourceAmount) === requested;
    } catch { return false; }
  });
  candidates.sort((a, b) => {
    const delta = amountUnits(b.destinationAmount) - amountUnits(a.destinationAmount);
    if (delta) return delta > 0n ? 1 : -1;
    const left = JSON.stringify(a.path);
    const right = JSON.stringify(b.path);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return candidates[0] ?? null;
}

/** Build one unsigned operation. Wallet/sequence/network fee and settlement belong to the caller. */
export function buildPathPayment(quote, { sender, recipient, destinationMin, now = Date.now() }) {
  validateQuote(quote, now);
  if (!StrKey.isValidEd25519PublicKey(sender) || !StrKey.isValidEd25519PublicKey(recipient)) {
    throw new Error('Sender and recipient must be checksummed Stellar account addresses');
  }
  if (amountUnits(destinationMin) > amountUnits(quote.destinationAmount)) {
    throw new Error('Minimum destination amount exceeds the quote');
  }
  return Operation.pathPaymentStrictSend({ source: sender, destination: recipient,
    sendAsset: asset(quote.sourceAsset), sendAmount: quote.sourceAmount,
    destAsset: asset(quote.destinationAsset), destMin: destinationMin, path: quote.path.map(asset) });
}
