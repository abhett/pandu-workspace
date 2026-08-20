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
 * @property string $automation_rule_id
 * @property string $event_name
 * @property string $status
 * @property array<string, mixed>|null $input_payload
 * @property array<string, mixed>|null $output_summary
 * @property string|null $error_message
 * @property Carbon $executed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'automation_rule_id',
    'event_name',
    'status',
    'input_payload',
    'output_summary',
    'error_message',
    'executed_at',
])]
class AutomationLog extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'input_payload' => 'array',
            'output_summary' => 'array',
            'executed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AutomationRule, $this>
     */
    public function rule(): BelongsTo
    {
        return $this->belongsTo(AutomationRule::class, 'automation_rule_id');
    }
}
