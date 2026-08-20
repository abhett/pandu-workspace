<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhiteboardNode extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'whiteboard_id',
        'type',
        'title',
        'content',
        'pos_x',
        'pos_y',
        'width',
        'height',
        'color',
        'task_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'pos_x' => 'float',
            'pos_y' => 'float',
            'width' => 'float',
            'height' => 'float',
            'meta' => 'array',
        ];
    }

    public function whiteboard(): BelongsTo
    {
        return $this->belongsTo(ProjectWhiteboard::class, 'whiteboard_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function outgoingEdges(): HasMany
    {
        return $this->hasMany(WhiteboardEdge::class, 'source_node_id');
    }

    public function incomingEdges(): HasMany
    {
        return $this->hasMany(WhiteboardEdge::class, 'target_node_id');
    }
}
