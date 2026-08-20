<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectWhiteboard extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'viewport_x',
        'viewport_y',
        'viewport_zoom',
        'grid_type',
        'is_favorite',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'viewport_x' => 'float',
            'viewport_y' => 'float',
            'viewport_zoom' => 'float',
            'is_favorite' => 'boolean',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(WhiteboardNode::class, 'whiteboard_id');
    }

    public function edges(): HasMany
    {
        return $this->hasMany(WhiteboardEdge::class, 'whiteboard_id');
    }
}
