<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OncallPagingLog extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'oncall_paging_logs';

    protected $fillable = [
        'oncall_schedule_id',
        'triggered_by',
        'trigger_reason',
        'escalation_level',
        'responder_user_id',
        'response_time_seconds',
        'resolved_at',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'escalation_level' => 'integer',
            'response_time_seconds' => 'integer',
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(OncallSchedule::class, 'oncall_schedule_id');
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by');
    }

    public function responder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responder_user_id');
    }
}
