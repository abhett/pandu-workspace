<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ApiRateLimitPolicy extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'api_rate_limit_policies';

    protected $fillable = [
        'organization_id',
        'name',
        'tier',
        'requests_per_minute',
        'burst_allowance',
        'daily_quota',
        'is_throttling_enabled',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'requests_per_minute' => 'integer',
            'burst_allowance' => 'integer',
            'daily_quota' => 'integer',
            'is_throttling_enabled' => 'boolean',
            'is_active' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(ApiTrafficSnapshot::class, 'policy_id');
    }
}
