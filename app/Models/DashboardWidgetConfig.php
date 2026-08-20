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
 * @property int $user_id
 * @property string $organization_id
 * @property string $name
 * @property bool $is_default
 * @property array $layout
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $user
 * @property-read Organization $organization
 */
#[Fillable([
    'user_id',
    'organization_id',
    'name',
    'is_default',
    'layout',
])]
class DashboardWidgetConfig extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
            'layout' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
