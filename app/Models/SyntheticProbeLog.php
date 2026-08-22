<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyntheticProbeLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'synthetic_probe_logs';

    protected $fillable = [
        'synthetic_monitor_id',
        'location',
        'status_code',
        'latency_ms',
        'is_success',
        'ssl_valid_days',
        'error_message',
        'checked_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status_code' => 'integer',
            'latency_ms' => 'integer',
            'is_success' => 'boolean',
            'ssl_valid_days' => 'integer',
            'checked_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function monitor(): BelongsTo
    {
        return $this->belongsTo(SyntheticMonitor::class, 'synthetic_monitor_id');
    }
}
