<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationMfaSetting extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'organization_mfa_settings';

    protected $fillable = [
        'organization_id',
        'enforcement_mode',
        'grace_period_days',
        'remember_device_days',
        'allowed_methods',
        'kill_switch_last_triggered_at',
        'kill_switch_triggered_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'grace_period_days' => 'integer',
            'remember_device_days' => 'integer',
            'allowed_methods' => 'array',
            'kill_switch_last_triggered_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function killSwitchTriggerer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'kill_switch_triggered_by');
    }
}
