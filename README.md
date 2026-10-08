# Jisr routing

A read-only Stellar Testnet path-quote adapter and deterministic route selector. It verifies Horizon network identity, checks requested assets and exact decimal amounts, rejects malformed or expired quotes, and builds an unsigned strict-send path-payment operation with a caller-specified minimum destination amount.

```sh
npm ci
npm test
npm run build
node examples/quote.js CODE:ISSUER 1
```

The package exports `amountUnits`, `createHorizonProvider`, `selectRoute` and `buildPathPayment`. See [the runnable quote example](examples/quote.js). Six tests cover exact amounts, quote identity, selection, operation construction, expiry, network/provider failures and cancellation.

Horizon paths are observations of available liquidity, not settlement guarantees. The caller owns wallet authorization, account sequence, fees, submission and settlement verification. This package never signs or broadcasts. Only Testnet is supported; no fiat provider integration or cross-border settlement is claimed.

See [submission brief](docs/SUBMISSION.md), [engineering backlog](docs/WAVE_BACKLOG.md), and organization [contribution/security guidance](https://github.com/jisr-pay/.github). Implementation PRs require relevant tests and `Closes #<issue_id>`.
