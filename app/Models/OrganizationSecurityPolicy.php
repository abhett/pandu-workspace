<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property bool $mfa_enforced
 * @property int $min_password_length
 * @property int $password_rotation_days
 * @property bool $require_uppercase
 * @property bool $require_lowercase
 * @property bool $require_numeric
 * @property bool $require_symbols
 * @property bool $lockout_enabled
 * @property int $lockout_max_attempts
 * @property int $lockout_duration_minutes
 * @property int $session_timeout_minutes
 * @property array<string>|null $ip_allowlist
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'mfa_enforced',
    'min_password_length',
    'password_rotation_days',
    'require_uppercase',
    'require_lowercase',
    'require_numeric',
    'require_symbols',
    'lockout_enabled',
    'lockout_max_attempts',
    'lockout_duration_minutes',
    'session_timeout_minutes',
    'ip_allowlist',
])]
class OrganizationSecurityPolicy extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'mfa_enforced' => 'boolean',
            'min_password_length' => 'integer',
            'password_rotation_days' => 'integer',
            'require_uppercase' => 'boolean',
            'require_lowercase' => 'boolean',
            'require_numeric' => 'boolean',
            'require_symbols' => 'boolean',
            'lockout_enabled' => 'boolean',
            'lockout_max_attempts' => 'integer',
            'lockout_duration_minutes' => 'integer',
            'session_timeout_minutes' => 'integer',
            'ip_allowlist' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
