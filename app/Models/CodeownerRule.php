<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodeownerRule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'codeowner_rules';

    protected $fillable = [
        'organization_id',
        'path_pattern',
        'domain_name',
        'lead_reviewer_id',
        'fallback_reviewer_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function leadReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_reviewer_id');
    }

    public function fallbackReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fallback_reviewer_id');
    }
}
