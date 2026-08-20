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
 * @property string $provider_type
 * @property bool $is_enabled
 * @property bool $is_enforced
 * @property string|null $entity_id
 * @property string|null $sso_url
 * @property string|null $certificate
 * @property string|null $client_id
 * @property string|null $client_secret
 * @property string|null $issuer_url
 * @property array<string>|null $allowed_domains
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'organization_id',
    'provider_type',
    'is_enabled',
    'is_enforced',
    'entity_id',
    'sso_url',
    'certificate',
    'client_id',
    'client_secret',
    'issuer_url',
    'allowed_domains',
])]
class OrganizationSsoConfig extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'is_enforced' => 'boolean',
            'allowed_domains' => 'array',
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
