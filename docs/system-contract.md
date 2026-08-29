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
- Phase-one actions expose resolved accuracy and damage values. The future stat formula belongs to the rules/content layer and must feed those values without introducing named-stat checks into the event loop.
- Simultaneous timeline events resolve by stable insertion sequence. Fighter input order therefore acts as the explicit tie-breaker until a content-level initiative rule is introduced.
- Actions are data: tags, timing, accuracy, costs, and ordered effects. The engine resolves generic effect primitives rather than checking named weapons, classes, or skills.
- Phase-two generic effects are damage, healing, resource change, and status application. Statuses may react to generic trigger events.
- Equipment occupies explicit slots, may gate on intrinsic stats, and grants actions/resources/statuses without adding intrinsic stat points.
- The rules layer compiles stat formulas into resolved health, accuracy, healing, and damage before the fighter enters the simulation.
- Tactics are ordered references to a condition, a granted action, and a target rule. The first matching affordable rule wins; otherwise the fallback action is used.
- Every tactic evaluation is emitted to the battle log, including whether its condition matched and whether its action was usable.
- Build codes use the `FA1.` envelope: format/ruleset versions, UTF-8 name, canonical numeric selections, ordered tactics, CRC32, and unpadded Base64URL.
- Numeric fields use unsigned varints. Stats, equipment, skills, and appearance are sorted before encoding; tactic order is preserved because it is mechanically meaningful.
- Decoders reject corruption, truncation, unsupported formats, unsafe values, and trailing data before ruleset validation.
- Appearance uses stable numeric slot and asset IDs, remains mechanically free, and round-trips through the build code.
- The first character renderer uses a vendored, attributed subset of Universal LPC idle layers. Runtime rendering never depends on the external generator or an API.
- A duel room accepts exactly two `FA1` build codes, decodes and validates both against the active ruleset, and only then compiles them into engine fighters.
- Re-running the same two builds with the same explicit seed must produce the same winner, elapsed time, final health, and event chronicle.

## Extensibility boundary

The battle engine owns generic primitives: actions, effects, resources, statuses, triggers, and events. Content owns their combinations. The engine must not contain class checks such as warrior, rogue, or mage.

Stats and content definitions live in a rules catalog rather than engine conditionals. The starter catalog is provisional balance content; changing labels or costs does not change the engine contract. Once a protocol ID is published in a shareable build code it becomes permanent.

## Not decided yet

- Final stat names, ranges, and costs
- Initial equipment and skill catalog
- The rules-layer formulas that derive an action's resolved accuracy and damage
- Build-code byte layout and checksum
- The first representative matchup set used for balance tests
