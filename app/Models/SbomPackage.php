<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SbomPackage extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sbom_packages';

    protected $fillable = [
        'organization_id',
        'project_id',
        'ecosystem',
        'name',
        'version',
        'license',
        'license_risk',
        'has_vulnerabilities',
        'vulnerabilities_count',
        'highest_severity',
        'latest_safe_version',
        'is_direct_dependency',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'has_vulnerabilities' => 'boolean',
            'vulnerabilities_count' => 'integer',
            'is_direct_dependency' => 'boolean',
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

    public function vulnerabilities(): HasMany
    {
        return $this->hasMany(SbomVulnerability::class, 'package_id');
    }
}
