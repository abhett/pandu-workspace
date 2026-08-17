# ADR-002: Primary Key Strategy — UUIDv7

## Status
**Accepted** — 2026-08-15

## Context

The two specification documents propose different primary key strategies:

- **catatan.docx** uses Laravel's default auto-increment `$table->id()` (bigint) plus a separate `$table->uuid('uuid')->unique()` column for external reference. Example: tasks table has `id` (bigint PK) + `uuid` (UUID column).
- **implementationplan.docx** uses UUIDv7 as the sole primary key: `$table->uuid('id')->primary()`. No auto-increment column exists. All foreign keys reference UUIDs.

The existing project has one migration (`create_users_table`) using `$table->id()` (auto-increment bigint). No domain tables exist yet.

### Trade-offs

| Factor | Auto-increment + UUID | UUIDv7 Primary Key |
|---|---|---|
| API exposure | Must use UUID externally, id internally — dual lookup | Single identifier everywhere |
| Multi-tenant safety | Sequential IDs leak information (enumeration) | Non-sequential, no enumeration |
| Join performance | Smaller key, faster joins at scale | Larger key, slight index overhead |
| Distributed generation | Requires DB round-trip for ID | Generated client-side, no DB dependency |
| Migration complexity | Standard Laravel patterns | Requires `HasUuids` trait, custom factories |
| Foreign key size | 8 bytes (bigint) | 16 bytes (UUID) |
| Sort order | Natural insert order | UUIDv7 is time-ordered (sortable) |

## Decision

**Use UUIDv7 as the primary key** for all new domain tables (organizations, projects, tasks, boards, etc.).

The existing `users` table retains its auto-increment `id` because:
1. It was created by the Laravel starter kit
2. Fortify, session, and password_reset_tokens reference it
3. Changing it would break existing auth infrastructure

However, users will also get a `uuid` column for external API exposure. All new domain models use `$table->uuid('id')->primary()` with Laravel's `HasUuids` trait configured for UUIDv7.

### Implementation Rules

1. **New domain tables**: Use `$table->uuid('id')->primary()`. Apply `HasUuids` trait with `newUniqueId()` returning `Str::uuid7()`.
2. **Users table**: Keep `$table->id()`. Add `$table->uuid('uuid')->unique()` in a future migration. Use UUID in API responses.
3. **Foreign keys to users**: Use `$table->foreignId('user_id')` (bigint FK to users.id) — this is the only FK that remains bigint.
4. **All other foreign keys**: Use `$table->foreignUuid('organization_id')` etc.
5. **API responses**: Always expose UUID identifiers, never auto-increment IDs.
6. **Route model binding**: Bind by UUID for domain models.

### Base Model

```php
<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

trait HasUuidPrimaryKey
{
    use HasUuids;

    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }

    public function uniqueIds(): array
    {
        return [$this->getKeyName()];
    }
}
```

## Consequences

- **Positive**: No sequential ID leakage in API; single identifier for internal and external use; UUIDv7 maintains chronological sort order; pre-generation possible for idempotent operations; better for future distributed scenarios.
- **Negative**: Slightly larger indexes; foreign keys to users remain bigint (mixed approach); existing factories need `HasFactory` adjustments.
- **Mitigation**: UUIDv7 time-ordering minimizes index fragmentation. The users table exception is well-contained and documented.
