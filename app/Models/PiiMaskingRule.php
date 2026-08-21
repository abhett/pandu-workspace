<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PiiMaskingRule extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'pii_masking_rules';

    protected $fillable = [
        'organization_id',
        'field_name',
        'resource_model',
        'masking_strategy',
        'sample_input',
        'sample_masked_output',
        'is_active',
        'exempt_roles',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'exempt_roles' => 'array',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
