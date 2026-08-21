<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceIncident extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'compliance_incidents';

    protected $fillable = [
        'organization_id',
        'audit_log_id',
        'reporter_id',
        'assigned_to',
        'title',
        'severity',
        'framework',
        'status',
        'summary',
        'mitigation_notes',
        'resolved_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function auditLog(): BelongsTo
    {
        return $this->belongsTo(OrganizationAuditLog::class, 'audit_log_id');
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
