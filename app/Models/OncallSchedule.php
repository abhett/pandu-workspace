<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OncallSchedule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'oncall_schedules';

    protected $fillable = [
        'organization_id',
        'name',
        'rotation_type',
        'members',
        'escalation_policy',
        'status',
        'started_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'members' => 'array',
            'escalation_policy' => 'array',
            'started_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function pagingLogs(): HasMany
    {
        return $this->hasMany(OncallPagingLog::class, 'oncall_schedule_id');
    }
}
