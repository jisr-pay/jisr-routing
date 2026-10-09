# Wave engineering backlog

Drafted October 8, 2026 against current implementation. These are proposed contributor tasks, not Wave enrollment or earned points. Complexity requires maintainer review in the app.

## 1. Add captured Horizon path fixtures with provenance

## Context

Capture synthetic Testnet strict-send paths with endpoint, ledger/time and assets; distinguish captured observations from deterministic unit fixtures.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

test/routing.test.js

## Proposed complexity

medium; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## 2. Expose quote identity and refresh metadata

## Context

Define stable identifiers bound to network, assets, amounts, path and expiry; reject reused identity after any economic field changes.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

src/index.js

## Proposed complexity

medium; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## 3. Bound Horizon response sizes and path counts

## Context

Limit accepted response bytes and candidate counts; reject oversized payloads without building any operation, with boundary fixtures.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

src/index.js

## Proposed complexity

medium; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## 4. Add typed package exports and a consumer check

## Context

Ship declarations for every public helper and verify an independently installed package can import them and construct an unsigned operation.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

package.json, src/index.js

## Proposed complexity

medium; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## 5. Add an explicit delivered-amount slippage policy

## Context

Define caller-selected basis-point tolerance with exact integer rounding, positive minimums and tests at one-stroop boundaries.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

src/index.js

## Proposed complexity

medium; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## 6. Document empty-liquidity and expired-quote recovery

## Context

Show no-route, unavailable-provider and expired-quote results; never imply a quote guarantees execution or fiat settlement.

## Acceptance criteria

- Implement and document the specific behavior above.
- Cover positive, negative and unavailable-input cases appropriate to the change.
- Pass the repository documented build/test checks and required CI.
- Preserve exact identities/amounts and uncertain evidence outcomes.

## Relevant files

README.md, examples/quote.js

## Proposed complexity

trivial; planning only. Actual Wave complexity and enrollment are set by maintainers in the Drips app.

## Contribution

Open a focused feat/fix/test/docs branch. PRs explain behavior and actual validation and include Closes #<issue_id>. Follow CONTRIBUTING.md and SECURITY.md.

## Published issue links

- [Add captured Horizon path fixtures with provenance](https://github.com/jisr-pay/jisr-routing/issues/2)
- [Expose quote identity and refresh metadata](https://github.com/jisr-pay/jisr-routing/issues/3)
- [Bound Horizon response sizes and path counts](https://github.com/jisr-pay/jisr-routing/issues/4)
- [Add typed package exports and a consumer check](https://github.com/jisr-pay/jisr-routing/issues/5)

## Published contributor issues

- [Add captured Horizon path fixtures with provenance](https://github.com/jisr-pay/jisr-routing/issues/2) — proposed medium.
- [Expose quote identity and refresh metadata](https://github.com/jisr-pay/jisr-routing/issues/3) — proposed medium.
- [Bound Horizon response sizes and path counts](https://github.com/jisr-pay/jisr-routing/issues/4) — proposed medium.
- [Add typed package exports and a consumer check](https://github.com/jisr-pay/jisr-routing/issues/5) — proposed medium.
- [Add an explicit delivered-amount slippage policy](https://github.com/jisr-pay/jisr-routing/issues/9) — proposed medium.
- [Document empty-liquidity and expired-quote recovery](https://github.com/jisr-pay/jisr-routing/issues/6) — proposed trivial.
