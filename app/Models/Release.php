<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string|null $project_id
 * @property int $created_by
 * @property string $version
 * @property string $title
 * @property string|null $description
 * @property string $type
 * @property string $status
 * @property bool $is_public
 * @property Carbon|null $published_at
 * @property array|null $content
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Organization $organization
 * @property-read Project|null $project
 * @property-read User $creator
 */
#[Fillable([
    'organization_id',
    'project_id',
    'created_by',
    'version',
    'title',
    'description',
    'type',
    'status',
    'is_public',
    'published_at',
    'content',
])]
class Release extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    protected function casts(): array
    {
        return [
            'is_public' => 'boolean',
            'published_at' => 'datetime',
            'content' => 'array',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(ReleaseReaction::class);
    }
}
