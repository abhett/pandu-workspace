<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SlaEscalationRule extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sla_policy_id',
        'trigger_type',
        'trigger_offset_minutes',
        'action_type',
        'action_payload',
        'position',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'trigger_offset_minutes' => 'integer',
            'action_payload' => 'array',
            'position' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(SlaPolicy::class, 'sla_policy_id');
    }
}
