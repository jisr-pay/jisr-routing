const integer = value => typeof value === 'string' && /^(0|[1-9]\d{0,29})$/.test(value);
const unit = value => value && typeof value.code === 'string' && /^[A-Z0-9]{2,12}$/.test(value.code)
  && Number.isInteger(value.decimals) && value.decimals >= 0 && value.decimals <= 18;
const sameUnit = (a, b) => a.code === b.code && a.decimals === b.decimals;

/** Amounts are base-unit integer strings. Provider results are indicative only. */
export async function collectQuotes(request, providers, { now = Date.now, timeoutMs = 5000 } = {}) {
  if (!request || !unit(request.source) || !unit(request.destination) ||
      !integer(request.sendAmount) || BigInt(request.sendAmount) <= 0n ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000 ||
      !Array.isArray(providers) || providers.length > 20 ||
      providers.some(p => !p || typeof p.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(p.id) || typeof p.quote !== 'function') ||
      new Set(providers.map(p => p.id)).size !== providers.length) throw new TypeError('Invalid quote request or providers.');
  // Make private copies so an adapter cannot change the caller's comparison basis.
  const basis = { source: { ...request.source }, destination: { ...request.destination }, sendAmount: request.sendAmount };
  const results = await Promise.all(providers.map(async provider => {
    const controller = new AbortController(); let timer;
    try {
      const quote = await Promise.race([
        Promise.resolve().then(() => provider.quote(structuredClone(basis), { signal: controller.signal })),
        new Promise((_, reject) => { timer = setTimeout(() => {
          controller.abort(); reject(new Error('timeout'));
        }, timeoutMs); }),
      ]);
      if (!quote || quote.providerId !== provider.id || !unit(quote.source) || !unit(quote.destination) ||
          !sameUnit(quote.source, basis.source) || !sameUnit(quote.destination, basis.destination) ||
          quote.sendAmount !== basis.sendAmount || !integer(quote.receiveAmount) || BigInt(quote.receiveAmount) <= 0n ||
          !integer(quote.feeAmount) || BigInt(quote.feeAmount) > BigInt(basis.sendAmount) ||
          quote.feeIncluded !== true || quote.indicative !== true ||
          !Number.isSafeInteger(quote.estimatedSeconds) || quote.estimatedSeconds < 0 ||
          !Number.isSafeInteger(quote.expiresAt) || quote.expiresAt <= now()) {
        return { providerId: provider.id, reason: 'invalid_or_expired_quote' };
      }
      // Do not expose arbitrary provider fields, credentials or executable payloads.
      return { quote: { providerId: provider.id, ...structuredClone(basis), receiveAmount: quote.receiveAmount,
        feeAmount: quote.feeAmount, feeIncluded: true, indicative: true,
        estimatedSeconds: quote.estimatedSeconds, expiresAt: quote.expiresAt } };
    } catch { return { providerId: provider.id, reason: 'unavailable' }; }
    finally { clearTimeout(timer); }
  }));
  const quotes = []; const unavailable = [];
  // Fast providers may expire while slower providers finish. Recheck at return time.
  for (const result of results) {
    if (!result.quote) unavailable.push(result);
    else if (result.quote.expiresAt <= now()) unavailable.push({ providerId: result.quote.providerId, reason: 'invalid_or_expired_quote' });
    else quotes.push(result.quote);
  }
  quotes.sort((a, b) => {
    const difference = BigInt(b.receiveAmount) - BigInt(a.receiveAmount);
    return difference > 0n ? 1 : difference < 0n ? -1 :
      a.estimatedSeconds - b.estimatedSeconds || a.providerId.localeCompare(b.providerId);
  });
  return { quotes, unavailable };
}
