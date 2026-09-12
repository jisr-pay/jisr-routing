/**
 * Reference QuoteProvider implementation for onboarding and integration tests.
 *
 * Deterministic, corridor-checked, abort-aware and fee-inclusive. It consumes
 * base-unit integer amounts and returns destination base-unit receipts using
 * integer math only. A single cross-currency rate is applied to the net debit.
 *
 * Pricing model (documented in docs/PROVIDER_ONBOARDING.md):
 *   feeAmount   = floor(sendAmount * feeRateBps / 10000), capped at sendAmount
 *   netSend     = sendAmount - feeAmount
 *   receiveAmount = floor(netSend * rateScale * 10^dest.decimals
 *                        / 10^(source.decimals + rateScale.decimals))
 */

const integer = value => typeof value === 'string' && /^(0|[1-9]\d{0,29})$/.test(value);
const unit = value => value && typeof value.code === 'string' && /^[A-Z0-9]{2,12}$/.test(value.code)
  && Number.isInteger(value.decimals) && value.decimals >= 0 && value.decimals <= 18;
const sameUnit = (a, b) => a.code === b.code && a.decimals === b.decimals;

export function createFixtureProvider(config = {}) {
  const { id, source, destination, rate, feeRateBps = 0, estimatedSeconds = 5,
    expiresInMs = 30_000, now = () => Date.now() } = config;
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(id)) throw new TypeError('Invalid provider id.');
  if (!unit(source) || !unit(destination)) throw new TypeError('Invalid asset units.');
  if (typeof rate !== 'string' || !/^\d+(\.\d{1,18})?$/.test(rate)) throw new TypeError('Invalid rate.');
  if (!Number.isInteger(feeRateBps) || feeRateBps < 0 || feeRateBps > 100_00) throw new TypeError('Invalid feeRateBps.');
  if (!Number.isSafeInteger(estimatedSeconds) || estimatedSeconds < 0) throw new TypeError('Invalid estimatedSeconds.');
  if (!Number.isSafeInteger(expiresInMs) || expiresInMs <= 0) throw new TypeError('Invalid expiresInMs.');
  if (typeof now !== 'function') throw new TypeError('Invalid now.');
  const [rateWhole, rateFraction = ''] = rate.split('.');
  const scaleDecimals = rateFraction.length;
  const rateScale = BigInt(`${rateWhole}${rateFraction}`);

  return {
    id,
    async quote(request, { signal } = {}) {
      if (signal?.aborted) throw new Error('aborted');
      if (!request || !unit(request.source) || !unit(request.destination) ||
          !sameUnit(request.source, source) || !sameUnit(request.destination, destination) ||
          !integer(request.sendAmount)) {
        throw new Error('CORRIDOR_UNSUPPORTED');
      }
      if (signal?.aborted) throw new Error('aborted');
      const sendAmount = BigInt(request.sendAmount);
      let feeAmount = sendAmount * BigInt(feeRateBps) / 10_000n;
      if (feeAmount > sendAmount) feeAmount = sendAmount;
      const netSend = sendAmount - feeAmount;
      const denominator = 10n ** BigInt(source.decimals + scaleDecimals);
      const receiveAmount = netSend * rateScale *
        (10n ** BigInt(destination.decimals)) / denominator;
      return {
        providerId: id,
        source: { ...source },
        destination: { ...destination },
        sendAmount: request.sendAmount,
        receiveAmount: receiveAmount.toString(),
        feeAmount: feeAmount.toString(),
        feeIncluded: true,
        indicative: true,
        estimatedSeconds,
        expiresAt: now() + expiresInMs,
      };
    },
  };
}