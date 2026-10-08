# Contributing

Use focused feat/<topic>, fix/<topic>, docs/<topic> or test/<topic> branches. Before review run npm ci, npm test and npm run build. Add positive and failure tests for changed behavior. Keep amounts exact, preserve uncertain settlement outcomes and separate test fixtures from live observations.

PRs explain the behavior change, actual check results and remaining limitations, and include Closes #<issue_id> for the implemented issue. Required CI must pass before merge. Follow SECURITY.md, MAINTAINERS.md and the organization code of conduct. Live network demos are opt-in; never use real funds or commit credentials.
