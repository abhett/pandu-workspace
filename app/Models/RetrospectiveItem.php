<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RetrospectiveItem extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'retrospective_items';

    protected $fillable = [
        'retrospective_id',
        'user_id',
        'category',
        'content',
        'votes_count',
        'action_owner_id',
        'task_id',
        'is_action_item',
        'action_status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'votes_count' => 'integer',
            'is_action_item' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function retrospective(): BelongsTo
    {
        return $this->belongsTo(SprintRetrospective::class, 'retrospective_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function actionOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'action_owner_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(RetrospectiveItemVote::class, 'retrospective_item_id');
    }
}
