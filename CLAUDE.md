# Claude Code Instructions

## Commit Workflow

Before creating any git commits, run the vibecheck:

```bash
yarn vibecheck
```

This runs:

- Format checking (prettier)
- Type checking (tsc)
- All tests (jest)

Only create the commit if vibecheck passes.
