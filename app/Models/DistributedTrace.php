<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DistributedTrace extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'distributed_traces';

    protected $fillable = [
        'organization_id',
        'trace_id',
        'root_service',
        'root_operation',
        'http_method',
        'http_status_code',
        'total_duration_ms',
        'span_count',
        'error_count',
        'status',
        'user_agent',
        'client_ip',
        'spans',
        'breakdown',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'http_status_code' => 'integer',
            'total_duration_ms' => 'float',
            'span_count' => 'integer',
            'error_count' => 'integer',
            'spans' => 'array',
            'breakdown' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
