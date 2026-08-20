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
 * @property string $organization_id
 * @property string|null $project_id
 * @property int $user_id
 * @property string $date
 * @property string $yesterday_work
 * @property string $today_work
 * @property string|null $blockers
 * @property string $mood
 * @property string|null $ai_summary
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Organization $organization
 * @property-read Project|null $project
 * @property-read User $user
 */
#[Fillable([
    'organization_id',
    'project_id',
    'user_id',
    'date',
    'yesterday_work',
    'today_work',
    'blockers',
    'mood',
    'ai_summary',
])]
class DailyStandup extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
