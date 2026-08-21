<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchemaDriftReport extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'schema_drift_reports';

    protected $fillable = [
        'organization_id',
        'source_environment_id',
        'target_environment_id',
        'table_name',
        'drift_type',
        'severity',
        'description',
        'safe_ddl_remedy',
        'is_resolved',
        'detected_at',
        'resolved_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_resolved' => 'boolean',
            'detected_at' => 'datetime',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function sourceEnvironment(): BelongsTo
    {
        return $this->belongsTo(DatabaseEnvironment::class, 'source_environment_id');
    }

    public function targetEnvironment(): BelongsTo
    {
        return $this->belongsTo(DatabaseEnvironment::class, 'target_environment_id');
    }
}
