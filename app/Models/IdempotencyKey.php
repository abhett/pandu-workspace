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
 * @property string $key
 * @property string|null $organization_id
 * @property int|null $user_id
 * @property string $request_method
 * @property string $request_path
 * @property string $request_checksum
 * @property string $status
 * @property int|null $response_status
 * @property array<string, mixed>|null $response_headers
 * @property string|null $response_body
 * @property Carbon $expires_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'key',
    'organization_id',
    'user_id',
    'request_method',
    'request_path',
    'request_checksum',
    'status',
    'response_status',
    'response_headers',
    'response_body',
    'expires_at',
])]
class IdempotencyKey extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'response_status' => 'integer',
            'response_headers' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Get the organization associated with the idempotency key.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the user associated with the idempotency key.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
