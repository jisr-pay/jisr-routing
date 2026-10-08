# Exact Stellar path quotes and unsigned operations

Prepared October 8, 2026 for same-day Stellar Wave application.

## Implemented utility

Read-only Horizon Testnet integration validates network identity, source/destination assets, exact int64 amounts and quote expiry. Deterministic selection chooses the highest destination amount; operation construction enforces minimum delivery.

## Reproduce and evidence

Node 22+; npm ci, npm test, npm run build. Six tests passed October 8. Run node examples/quote.js CODE:ISSUER 1 for an opt-in live liquidity query.

## Supported scope

No custom contract is needed. Quotes do not guarantee settlement. Wallet signing, transaction submission, fiat providers and Mainnet are outside scope.

## Maintainers and application

Maintainers xteesamz and EthTobi were owner-confirmed across these project families; contact through GitHub, available anytime. Follow CONTRIBUTING.md and SECURITY.md (or organization defaults). Review the preparation PR and its CI before using its final revision in the application. Engineering issues and draft complexity do not establish Wave enrollment. No application has been submitted by this work.
