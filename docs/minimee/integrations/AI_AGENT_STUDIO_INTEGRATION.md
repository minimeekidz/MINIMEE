# MiniMee ↔ Multi-brand AI Agent Studio Integration

MiniMee remains the canonical source-of-truth for MiniMee product/game rules. The separate AI Agent Studio repo should orchestrate tasks across multiple brands/projects and must not become a second editable copy of MiniMee truth.

## Studio should read from MiniMee at runtime
- `/AGENTS.md`
- `/MINIMEE_FILE_ROUTER.md`
- `docs/minimee/governance/*` as routed
- `docs/minimee/art/*` for visual tasks
- relevant scene manifests / UI registries / character Bibles / learning sources

## Project adapter model
The Studio should store a small adapter pointing to:
- source repo: `minimeekidz/MINIMEE`
- default branch: `main`
- canonical entry files: `AGENTS.md`, `MINIMEE_FILE_ROUTER.md`
- optional read-only cache pinned to source commit SHA

## Write-back
The Studio may generate official images/code/docs and write them back to MiniMee only through the project's configured write policy (for example PR_REQUIRED or DIRECT_WRITE_ALLOWED). Every write should be auditable with task, actor, source files read, model/tool, references and approval state.

## No source-of-truth duplication
If Studio caches MiniMee files for speed, cache entries are non-authoritative and must record the MiniMee commit SHA they came from. Any conflict resolves in favor of the MiniMee repo's latest approved canonical files.
