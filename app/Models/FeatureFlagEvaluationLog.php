<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeatureFlagEvaluationLog extends Model
{
    use HasFactory, HasUuids;

    public $timestamps = false;

    protected $table = 'feature_flag_evaluation_logs';

    protected $fillable = [
        'feature_flag_id',
        'user_id',
        'environment',
        'evaluated_result',
        'evaluation_reason',
        'evaluated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'evaluated_result' => 'boolean',
            'evaluated_at' => 'datetime',
        ];
    }

    public function featureFlag(): BelongsTo
    {
        return $this->belongsTo(FeatureFlag::class, 'feature_flag_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
