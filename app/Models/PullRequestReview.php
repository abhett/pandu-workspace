<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PullRequestReview extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'pull_request_reviews';

    protected $fillable = [
        'organization_id',
        'project_id',
        'pr_number',
        'title',
        'repository_name',
        'branch_name',
        'author_id',
        'assigned_reviewer_id',
        'additions_count',
        'deletions_count',
        'status',
        'sla_status',
        'ttfr_hours',
        'turnaround_hours',
        'opened_at',
        'first_reviewed_at',
        'approved_at',
        'merged_at',
        'matched_codeowner_rule',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pr_number' => 'integer',
            'additions_count' => 'integer',
            'deletions_count' => 'integer',
            'ttfr_hours' => 'float',
            'turnaround_hours' => 'float',
            'opened_at' => 'datetime',
            'first_reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
            'merged_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
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

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function assignedReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_reviewer_id');
    }
}
