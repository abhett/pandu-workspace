<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\ProjectTemplateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $name
 * @property string $slug
 * @property string $category
 * @property string|null $description
 * @property string $icon
 * @property string $color
 * @property bool $is_system
 * @property array<int, array{name: string, slug: string, category: string, color: string, position: int, is_initial?: bool, is_completed?: bool, wip_limit?: int|null}>|null $workflow_config
 * @property array<int, string>|null $default_views
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'slug',
    'category',
    'description',
    'icon',
    'color',
    'is_system',
    'workflow_config',
    'default_views',
])]
class ProjectTemplate extends Model
{
    /** @use HasFactory<ProjectTemplateFactory> */
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'workflow_config' => 'array',
            'default_views' => 'array',
        ];
    }

    /**
     * Scope a query to only include system templates.
     *
     * @param  Builder<ProjectTemplate>  $query
     */
    public function scopeSystem(Builder $query): void
    {
        $query->where('is_system', true);
    }
}
