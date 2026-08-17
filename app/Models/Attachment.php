<?php

namespace App\Models;

use App\Models\Concerns\HasUuidPrimaryKey;
use Database\Factories\AttachmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $organization_id
 * @property string|null $project_id
 * @property string $attachable_type
 * @property string $attachable_id
 * @property int $uploader_id
 * @property string $disk
 * @property string $object_key
 * @property string $filename
 * @property string $mime_type
 * @property int $size_bytes
 * @property string|null $checksum_sha256
 * @property string $scan_status
 * @property array<string, mixed> $metadata
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable([
    'organization_id',
    'project_id',
    'attachable_type',
    'attachable_id',
    'uploader_id',
    'disk',
    'object_key',
    'filename',
    'mime_type',
    'size_bytes',
    'checksum_sha256',
    'scan_status',
    'metadata',
])]
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use HasFactory, HasUuidPrimaryKey, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'uploader_id' => 'integer',
            'metadata' => 'array',
        ];
    }

    /**
     * Get the owning attachable model.
     *
     * @return MorphTo<Model, $this>
     */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the organization that owns the attachment.
     *
     * @return BelongsTo<Organization, $this>
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    /**
     * Get the project associated with the attachment.
     *
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Get the user who uploaded the attachment.
     *
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}
