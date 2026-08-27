# MiniMee Context Cache & Delta Refresh Policy

## Purpose
MiniMee agents must not reread unchanged source-of-truth files on every image generation or small revision. The runtime should read once, compile once, reuse aggressively, and refresh only by delta.

## Core rule
**Read once -> compile task context -> reuse -> refresh only stale/missing sources.**

Never reread unchanged canonical sources merely because another generation, edit, or small revision was requested.

## Context levels
### 1. Project Context Snapshot
Reusable project-wide compact context containing only stable, high-value rules such as canonical naming, scene-system rules, visual direction, coordinate policy, governance gates, and current registry pointers.

### 2. Task Context Snapshot
Generated for one active task, for example:
- MiniMee / Mee主城鎮 / Gameplay Day Geometry Master
- MiniMee / Buddy Cafe⨯Gether / Interaction UI
- MiniMee / new learning theme / feature intake

It should contain only the sources and resolved decisions required for that task.

### 3. Delta Refresh
Before each subsequent execution, compare source fingerprints/hashes for the files used by the snapshot.
- unchanged -> CACHE HIT -> reuse snapshot
- changed -> reload only changed source(s), then rebuild affected fields
- missing required source -> load only missing source
- task scope changed materially -> create a new Task Context Snapshot

## First use vs later use
### First use / new task
1. Read `MINIMEE_FILE_ROUTER.md`.
2. Resolve task class.
3. Load only mandatory source files.
4. Compile Project/Task Context Snapshot.
5. Record source file fingerprints.
6. Execute.

### Second and later use, same task
1. Reuse active Task Context Snapshot.
2. Check source fingerprints.
3. Load only stale/missing sources.
4. Apply the user's delta instruction.
5. Execute.

### Small change
Examples: "move the stage slightly", "more flowers", "make night warmer", "fix one button".
- Reuse the same Task Context Snapshot.
- Do not reread full visual/governance packs.
- Refresh only if the affected source changed or the requested change crosses a governance boundary.

### Major revision
Examples: changing canonical routes, changing a scene owner, changing inventory lifecycle, moving a permanent door, changing Dock architecture.
- Re-resolve routing.
- Load the affected canonical source files only.
- Invalidate the affected snapshot sections.
- Preserve unrelated cached context.

### New conversation / new agent
A new session may not possess the prior in-memory context. It should bootstrap from a persisted compact snapshot if available, then validate source hashes. It should not blindly reread every source file.

## Persisted snapshot recommendation
Recommended repo/runtime structure:

```text
context/
  project/
    MINIMEE_PROJECT_CONTEXT_SNAPSHOT.yaml
  tasks/
    <task_id>.context.yaml
```

Snapshots are runtime accelerators, not source-of-truth. If a snapshot conflicts with a canonical file, the canonical file wins.

## Minimum snapshot metadata
- project_id
- task_id / task_type
- target scene/feature
- source file paths
- source SHA/hash/fingerprint
- compiled_at
- compiled_by
- canonical names used
- resolved geometry/UI/inventory/feature decisions relevant to task
- reference bundle IDs
- model/tool preset if relevant
- invalidation reason/status

## Token and latency rule
The agent should optimise both input-token cost and latency. A cached compact snapshot should be preferred over repeated full-file reads whenever correctness is preserved.

## Invalidation triggers
Rebuild all or part of a snapshot when:
- Router changed materially
- relevant scene manifest changed
- relevant global UI registry changed
- relevant Feature Registry decision changed
- Visual Direction / Art Lock changed for a visual task
- canonical character/pet/learning source changed for the task
- user changes task scope materially
- runtime detects missing/contradictory snapshot data

## Non-trigger
A new render, retry, variation, small art adjustment, or same-scene revision is **not by itself** a reason to reread all sources.
