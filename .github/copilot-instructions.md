# PyStudio Agent Instructions

## Deployment
- After each completed application update, run the relevant tests, lint, and production build. If they pass, commit and push the update to `origin/main` to trigger the existing Render Blueprint deployment.
- Verify the live Render route and confirm it serves the newly built bundle before reporting deployment complete.
- Keep `render.yaml` and existing deployment settings unchanged unless the user explicitly requests a deployment configuration change.
- If validation fails, do not deploy; fix the issue and rerun validation first.
