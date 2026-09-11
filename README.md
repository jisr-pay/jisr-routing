# Jisr Routing

Provider interface and indicative quote comparison foundation. No live providers are configured, and this package neither executes payments nor claims to provide live exchange rates.

Use Node 24.15+ within Node 24; run `npm ci`, `npm test`, and `npm run build`. There are no runtime dependencies. TypeScript consumers can use the included declarations.

```js
import { collectQuotes } from './src/index.js';
const result = await collectQuotes({
  source: { code: 'USD', decimals: 2 },
  destination: { code: 'NGN', decimals: 2 },
  sendAmount: '10000',
}, []);
// { quotes: [], unavailable: [] } until actual providers are supplied.
```

Each provider has a unique `id` and an asynchronous `quote(request, { signal })` method. See [the interface](src/index.d.ts). Return only indicative quotes. Amounts are integer strings in explicitly stated base units, preserving precision beyond JavaScript safe integers. `sendAmount` is the total source debit including fees; `feeAmount` is the fee portion already included; `receiveAmount` is the net destination amount. Providers with other pricing conventions must normalize them before returning a quote.

Only quotes for the identical source/destination units and send amount are compared. Results rank by net recipient amount descending, then estimated time ascending, then provider ID. Expired or malformed quotes are excluded; provider failures and timeouts are isolated and reported without internal error details. Expiry is checked again after all providers finish.

Six tests exercise exact ranking, currency/debit consistency, failures, timeouts, payload stripping, expiry, input validation and adapter input isolation. CI runs Windows and Linux. No marketing comparison data is imported from the web app.

The repository was created by the project owner ahead of live-provider integration. Keep the npm package unpublished (`private: true` in package.json), and consume it from jisr-api only when the API needs quote collection. This setting does not change GitHub repository visibility. Provider onboarding requires documented corridor support, precision, fee conventions, expiry and a real integration test. Wallet/payments remain SDK responsibilities.
