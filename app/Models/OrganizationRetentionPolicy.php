<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property int $audit_logs_retention_days
 * @property int $deleted_tasks_retention_days
 * @property int $orphan_attachments_retention_days
 * @property bool $auto_purge_enabled
 * @property Carbon|null $last_purged_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'audit_logs_retention_days',
    'deleted_tasks_retention_days',
    'orphan_attachments_retention_days',
    'auto_purge_enabled',
    'last_purged_at',
])]
class OrganizationRetentionPolicy extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'audit_logs_retention_days' => 'integer',
            'deleted_tasks_retention_days' => 'integer',
            'orphan_attachments_retention_days' => 'integer',
            'auto_purge_enabled' => 'boolean',
            'last_purged_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
