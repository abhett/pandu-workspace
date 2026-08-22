<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChaosExperiment extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'chaos_experiments';

    protected $fillable = [
        'organization_id',
        'title',
        'target_service',
        'fault_type',
        'environment',
        'hypothesis',
        'safety_tripwire',
        'status',
        'resilience_score',
        'execution_logs',
        'executed_at',
        'completed_at',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'safety_tripwire' => 'array',
            'execution_logs' => 'array',
            'resilience_score' => 'float',
            'executed_at' => 'datetime',
            'completed_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
