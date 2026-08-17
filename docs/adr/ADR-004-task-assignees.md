# ADR-004: Task Assignees — Multi-Assignee Junction Table

## Status
**Accepted** — 2026-08-15

## Context

The specification documents propose different task assignment models:

- **catatan.docx** uses a single `assignee_id` nullable foreign key on the `tasks` table. One task → one assignee (or unassigned).
- **implementationplan.docx** uses a `task_assignees` junction table (`task_id, user_id, assigned_at`) with a composite primary key. One task → multiple assignees.

### Trade-offs

| Factor | Single `assignee_id` | Junction Table `task_assignees` |
|---|---|---|
| Simplicity | Very simple — one column, one FK | Requires separate table and relationship |
| Real-world usage | Insufficient for most teams | Industry standard (Jira, ClickUp, Linear) |
| Query performance | Direct join, very fast | Extra join, slightly more complex queries |
| Assignment history | Lost on reassignment | Can track `assigned_at`, assignment metadata |
| Workload distribution | Inaccurate if work is shared | Accurate representation of shared work |
| Migration cost | None (simpler schema) | Low — one additional table |

## Decision

**Use a `task_assignees` junction table** for multi-assignee support.

Rationale:
1. Every major work management tool (Jira, ClickUp, Linear, Asana) supports multiple assignees.
2. The service desk/ticketing module (catatan.docx addendum) also requires multi-assignment.
3. Single-assignee is too limiting for cross-functional teams.
4. Adding multi-assignee later would require a data migration and API breaking change.

### Schema

```php
Schema::create('task_assignees', function (Blueprint $table) {
    $table->uuid('task_id');
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->timestampTz('assigned_at')->useCurrent();
    $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();

    $table->primary(['task_id', 'user_id']);
    $table->index(['user_id', 'task_id']);

    $table->foreign('task_id')->references('id')->on('tasks')->cascadeOnDelete();
});
```

### Model Relationship

```php
// Task model
public function assignees(): BelongsToMany
{
    return $this->belongsToMany(User::class, 'task_assignees')
        ->withPivot('assigned_at', 'assigned_by')
        ->orderByPivot('assigned_at');
}

// Convenience: primary assignee (first assigned)
public function primaryAssignee(): HasOneThrough
{
    // Or simply $this->assignees()->oldest('assigned_at')->first()
}
```

### API Contract

```json
// Task response
{
  "id": "019...",
  "assignees": [
    { "id": 42, "name": "Budi", "assigned_at": "2026-08-01T10:00:00Z" },
    { "id": 58, "name": "Siti", "assigned_at": "2026-08-02T14:00:00Z" }
  ]
}

// Assign endpoint
POST /api/v1/tasks/{task}/assignees
{ "user_id": 58 }

// Unassign endpoint
DELETE /api/v1/tasks/{task}/assignees/{user}
```

### UI Implications

- Task cards show avatar stack (first 3 + "+N" overflow).
- Task detail shows full assignee list with add/remove.
- Filters support "assigned to me" and "assigned to [user]".
- Notifications go to all assignees.

## Consequences

- **Positive**: Future-proof; supports real team workflows; enables accurate workload views; no breaking migration later.
- **Negative**: Slightly more complex queries (join required); notification fan-out to multiple assignees.
- **Mitigation**: Eager-load assignees in task queries; use `withCount('assignees')` for list views; index on `user_id` for "my tasks" queries.
