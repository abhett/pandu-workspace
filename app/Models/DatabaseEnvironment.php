<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DatabaseEnvironment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'database_environments';

    protected $fillable = [
        'organization_id',
        'name',
        'environment_slug',
        'database_type',
        'schema_version',
        'total_tables_count',
        'total_indexes_count',
        'drift_status',
        'last_scanned_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_tables_count' => 'integer',
            'total_indexes_count' => 'integer',
            'last_scanned_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function sourceDriftReports(): HasMany
    {
        return $this->hasMany(SchemaDriftReport::class, 'source_environment_id');
    }

    public function targetDriftReports(): HasMany
    {
        return $this->hasMany(SchemaDriftReport::class, 'target_environment_id');
    }
}
