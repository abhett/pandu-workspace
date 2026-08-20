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
 * @property string $release_id
 * @property int|null $user_id
 * @property string|null $ip_address
 * @property string $emoji
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Release $release
 * @property-read User|null $user
 */
#[Fillable([
    'release_id',
    'user_id',
    'ip_address',
    'emoji',
])]
class ReleaseReaction extends Model
{
    use HasFactory, HasUuidPrimaryKey;

    public function release(): BelongsTo
    {
        return $this->belongsTo(Release::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
