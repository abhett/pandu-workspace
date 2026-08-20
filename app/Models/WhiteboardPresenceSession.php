<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhiteboardPresenceSession extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'whiteboard_presence_sessions';

    protected $fillable = [
        'whiteboard_id',
        'user_id',
        'cursor_x',
        'cursor_y',
        'selected_node_id',
        'locked_node_id',
        'client_color',
        'last_active_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cursor_x' => 'float',
            'cursor_y' => 'float',
            'last_active_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function whiteboard(): BelongsTo
    {
        return $this->belongsTo(ProjectWhiteboard::class, 'whiteboard_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
