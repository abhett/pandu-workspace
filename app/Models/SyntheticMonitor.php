<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SyntheticMonitor extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'synthetic_monitors';

    protected $fillable = [
        'organization_id',
        'name',
        'target_url',
        'probe_type',
        'interval_seconds',
        'timeout_seconds',
        'expected_status_code',
        'response_regex_match',
        'locations',
        'ssl_expires_at',
        'ssl_issuer',
        'uptime_percentage_24h',
        'uptime_percentage_30d',
        'avg_latency_ms',
        'status',
        'last_checked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'locations' => 'array',
            'interval_seconds' => 'integer',
            'timeout_seconds' => 'integer',
            'expected_status_code' => 'integer',
            'uptime_percentage_24h' => 'float',
            'uptime_percentage_30d' => 'float',
            'avg_latency_ms' => 'integer',
            'ssl_expires_at' => 'datetime',
            'last_checked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function probeLogs(): HasMany
    {
        return $this->hasMany(SyntheticProbeLog::class, 'synthetic_monitor_id');
    }
}
