<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoardroomBriefing extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'boardroom_briefings';

    protected $fillable = [
        'organization_id',
        'title',
        'period',
        'executive_summary',
        'strategic_pillars',
        'quarterly_okrs',
        'status',
        'presented_at',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'strategic_pillars' => 'array',
            'quarterly_okrs' => 'array',
            'presented_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
