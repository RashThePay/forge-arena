# Forge Arena system contract

This document records the decisions the engine may rely on.

## Stable decisions

- Battles use a deterministic event timeline, not alternating turns or a frame-based physics loop.
- The MVP has no spatial position or distance model.
- Intrinsic stats are purchased directly with build budget.
- Equipment does not grant intrinsic stat points. It grants actions, timings, tags, effects, and resource interactions, and may require minimum stats.
- Tactics are free and evaluated in priority order. The MVP permits at most five rules.
- A build may be edited and encoded while invalid, but only valid builds may enter battle.
- Appearance is mechanically free and separate from combat validation.
- Persisted content uses positive numeric protocol IDs. IDs are stable, never derived from array position, and never reused.

## Extensibility boundary

The battle engine owns generic primitives: actions, effects, resources, statuses, triggers, and events. Content owns their combinations. The engine must not contain class checks such as warrior, rogue, or mage.

Stats and content definitions live in a rules catalog rather than engine conditionals. The starter catalog is provisional balance content; changing labels or costs does not change the engine contract. Once a protocol ID is published in a shareable build code it becomes permanent.

## Not decided yet

- Final stat names, ranges, and costs
- Initial equipment and skill catalog
- Action accuracy and damage formulas
- Build-code byte layout and checksum
- The first representative matchup set used for balance tests
