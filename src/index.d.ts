export interface AssetUnit { code: string; decimals: number }
export interface QuoteRequest {
  source: AssetUnit;
  destination: AssetUnit;
  /** Total debit, including fees, in source base units. */
  sendAmount: string;
}
export interface IndicativeQuote extends QuoteRequest {
  providerId: string;
  /** Net recipient amount, in destination base units. */
  receiveAmount: string;
  /** Fee portion already included in sendAmount, in source base units. */
  feeAmount: string;
  feeIncluded: true;
  indicative: true;
  estimatedSeconds: number;
  /** Unix milliseconds. */
  expiresAt: number;
}
export interface QuoteProvider {
  id: string;
  quote(request: QuoteRequest, options: { signal: AbortSignal }): Promise<IndicativeQuote>;
}
export function collectQuotes(request: QuoteRequest, providers: QuoteProvider[], options?: {
  now?: () => number; timeoutMs?: number;
}): Promise<{
  quotes: IndicativeQuote[];
  unavailable: Array<{ providerId: string; reason: 'unavailable' | 'invalid_or_expired_quote' }>;
}>;
