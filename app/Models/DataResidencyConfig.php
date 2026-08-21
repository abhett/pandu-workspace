<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DataResidencyConfig extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'data_residency_configs';

    protected $fillable = [
        'organization_id',
        'primary_region',
        'compliance_framework',
        'cross_border_transfer_allowed',
        'encryption_at_rest_verified',
        'encryption_key_management',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'cross_border_transfer_allowed' => 'boolean',
            'encryption_at_rest_verified' => 'boolean',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
