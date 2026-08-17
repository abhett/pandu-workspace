# ADR-003: Board Ranking Strategy — Lexicographic Fractional Rank

## Status
**Accepted** — 2026-08-15

## Context

Both documents agree on fractional ranking for Kanban board card ordering, but differ on the data type:

- **catatan.docx** uses `DECIMAL(30,15)` — numeric midpoint calculation: `(prev + next) / 2`. Gap of 1024 between cards. Rebalance when precision exhausts.
- **implementationplan.docx** uses `VARCHAR(64)` — lexicographic string ranking (e.g., `"a0V"`). Generate a string between two neighbors. Rebalance when string length crosses a threshold.

### Trade-offs

| Factor | DECIMAL(30,15) | VARCHAR(64) Lexicographic |
|---|---|---|
| Simplicity | Very simple arithmetic | Requires string generation algorithm |
| Precision exhaustion | ~50 consecutive midpoint splits before precision issues | ~60+ characters before string gets too long |
| Rebalance trigger | Precision below threshold | String length above threshold |
| Index performance | B-tree on numeric, very fast | B-tree on varchar, slightly larger |
| Readability in DB | Human-readable numbers | Opaque strings |
| Industry standard | Less common | Used by Linear, Figma, Notion |
| Concurrent rebalance safety | Simple — reassign numeric values | Simple — reassign string values |

## Decision

**Use `VARCHAR(64)` lexicographic fractional ranking.**

Rationale:
1. Industry-proven approach (Linear, Figma, Notion all use string-based ranking).
2. Better density characteristics — can encode more orderings in the same precision space.
3. Aligns with the implementationplan.docx specification which has the more detailed board design.
4. Rebalancing is straightforward: regenerate evenly-spaced strings for all cards in a column.

### Implementation

```php
// Column definition
$table->string('rank', 64);
$table->index(['project_id', 'status_id', 'rank']);

// RankService
final class RankService
{
    private const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    private const DEFAULT_GAP = 8; // Characters apart in the alphabet
    private const MAX_LENGTH = 50; // Trigger rebalance threshold
    private const INITIAL_RANK = 'V'; // Middle of alphabet

    public function initial(): string { /* ... */ }
    public function between(?string $before, ?string $after): string { /* ... */ }
    public function needsRebalance(string $rank): bool { return strlen($rank) > self::MAX_LENGTH; }
    public function rebalance(array $taskIds): array { /* evenly-spaced strings */ }
}
```

### Rebalancing Strategy

- Check rank length after every move.
- If any card's rank exceeds `MAX_LENGTH` (50 chars), schedule an async rebalance job for that column.
- Rebalance assigns evenly-spaced ranks to all cards in the column within a transaction.
- Rebalance increments all affected task versions and broadcasts updates.

## Consequences

- **Positive**: Better density; industry-proven; clean VARCHAR column; works well with PostgreSQL B-tree indexes.
- **Negative**: Slightly more complex than arithmetic midpoint; requires a well-tested `RankService`; string comparison semantics must be consistent (use a fixed alphabet).
- **Mitigation**: Comprehensive property-based tests for the rank service (between always produces valid ordering, rebalance preserves order, concurrent rebalance is safe).
