# Provider onboarding

This document defines what a provider integration must satisfy before it is
accepted into the comparison. The reference implementation is
`src/providers/fixture.js` (`createFixtureProvider`) — copy its structure when
adding a real provider.

## The contract

A provider is an object with a unique `id` (`/^[a-z0-9-]{1,64}$/`) and an
asynchronous `quote(request, { signal })` that returns a resolved `IndicativeQuote`
or throws. See `src/index.d.ts`. `collectQuotes` enforces the contract and
isolates every failure:

- Providers are cloned against the caller's comparison basis; adapters cannot
  mutate the request.
- Quotes are validated again before return; expiry is rechecked after all
  providers finish.
- Failures, timeouts (default 5 s, cap 60 s) and expired quotes are reported
  as `unavailable` / `invalid_or_expired_quote` by `id`, never with internal
  error payloads.

## Required conventions

| Convention | Rule |
| --- | --- |
| Corridor | Return exactly the requested `source`/`destination` units and `sendAmount`, or throw `CORRIDOR_UNSUPPORTED`. Only the identical corridor is compared. |
| Amounts | Integer strings in base units, no floats, no safe-integer ceiling games. `receiveAmount` may be `0` — the engine then excludes the quote as invalid. |
| Fees | `sendAmount` is the total source debit **including** fees; `feeAmount` is the fee portion already inside it; `feeIncluded: true`. Providers with other pricing must normalize. |
| Nature | `indicative: true`. This package never executes payments. |
| Speed/expiry | Integer `estimatedSeconds` ≥ 0 and a future `expiresAt` (milliseconds). |
| Abort | Honour `signal` and stop promptly so providers slow to die don't hold the engine. |

## Adding a provider

1. Copy `src/providers/fixture.js` as `src/providers/<name>.js`.
2. Keep transport/key handling out of the returned quote — the engine only
   forwards the documented fields (`src/index.js` builds the response).
3. Add a real integration test: a configured fixture-style provider wired
   through `collectQuotes` asserting exact `receiveAmount`/`feeAmount`,
   ranking, corridor mismatch and abort/unavailable behaviour
   (see `test/providers.fixture.test.js`).
4. Document corridor support, decimals, fee model and expiry in the provider
   README section. `private: true` stays set in `package.json`.