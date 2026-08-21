<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomDashboard extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'custom_dashboards';

    protected $fillable = [
        'organization_id',
        'created_by',
        'title',
        'description',
        'category',
        'icon',
        'is_starred',
        'is_shared',
        'layout',
        'refresh_interval_seconds',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_starred' => 'boolean',
            'is_shared' => 'boolean',
            'layout' => 'array',
            'refresh_interval_seconds' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
