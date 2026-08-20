<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhiteboardEdge extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'whiteboard_id',
        'source_node_id',
        'target_node_id',
        'label',
        'style',
        'color',
    ];

    public function whiteboard(): BelongsTo
    {
        return $this->belongsTo(ProjectWhiteboard::class, 'whiteboard_id');
    }

    public function sourceNode(): BelongsTo
    {
        return $this->belongsTo(WhiteboardNode::class, 'source_node_id');
    }

    public function targetNode(): BelongsTo
    {
        return $this->belongsTo(WhiteboardNode::class, 'target_node_id');
    }
}
