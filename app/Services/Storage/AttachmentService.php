<?php

namespace App\Services\Storage;

use App\Models\Attachment;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentService
{
    /**
     * Disallowed dangerous file extensions.
     *
     * @var array<int, string>
     */
    protected array $blacklistedExtensions = [
        'php', 'php3', 'php4', 'php5', 'phtml', 'exe', 'bat', 'sh', 'cmd', 'com',
        'msi', 'jar', 'vbs', 'scr', 'cgi', 'pl', 'py', 'phar',
    ];

    /**
     * Maximum allowed file size in bytes (25MB).
     */
    public const MAX_FILE_SIZE_BYTES = 26214400;

    /**
     * Store an uploaded file as an attachment.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function store(
        UploadedFile $file,
        Model $attachable,
        User $uploader,
        Organization $organization,
        ?Project $project = null,
        array $metadata = []
    ): Attachment {
        $this->validateFile($file);

        $disk = config('filesystems.default', 'local');
        $uuid = (string) Str::uuid7();
        $originalFilename = $file->getClientOriginalName();
        $sanitizedName = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)).'.'.$file->getClientOriginalExtension();
        $orgId = $organization->id;
        $projId = $project?->id ?? ($attachable->project_id ?? 'global');

        $objectKey = "organizations/{$orgId}/projects/{$projId}/attachments/{$uuid}_{$sanitizedName}";

        // Calculate SHA-256 checksum
        $checksum = hash_file('sha256', $file->getRealPath());

        // Store file onto the target disk
        Storage::disk($disk)->putFileAs(
            dirname($objectKey),
            $file,
            basename($objectKey)
        );

        return Attachment::create([
            'organization_id' => $organization->id,
            'project_id' => $project?->id ?? ($attachable->project_id ?? null),
            'attachable_type' => $attachable->getMorphClass(),
            'attachable_id' => $attachable->getKey(),
            'uploader_id' => $uploader->id,
            'disk' => $disk,
            'object_key' => $objectKey,
            'filename' => $originalFilename,
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'checksum_sha256' => $checksum,
            'scan_status' => 'clean',
            'metadata' => $metadata,
        ]);
    }

    /**
     * Stream attachment download.
     */
    public function download(Attachment $attachment): StreamedResponse
    {
        $disk = Storage::disk($attachment->disk);

        if (! $disk->exists($attachment->object_key)) {
            abort(404, 'File not found on storage disk.');
        }

        return $disk->download(
            $attachment->object_key,
            $attachment->filename,
            [
                'Content-Type' => $attachment->mime_type,
                'Content-Disposition' => 'attachment; filename="'.addslashes($attachment->filename).'"',
            ]
        );
    }

    /**
     * Delete an attachment and its storage file.
     */
    public function delete(Attachment $attachment, bool $force = false): bool
    {
        if ($force) {
            $disk = Storage::disk($attachment->disk);
            if ($disk->exists($attachment->object_key)) {
                $disk->delete($attachment->object_key);
            }

            return (bool) $attachment->forceDelete();
        }

        return (bool) $attachment->delete();
    }

    /**
     * Validate uploaded file.
     */
    protected function validateFile(UploadedFile $file): void
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (in_array($extension, $this->blacklistedExtensions, true)) {
            abort(422, 'The uploaded file type is not allowed for security reasons.');
        }

        if ($file->getSize() > self::MAX_FILE_SIZE_BYTES) {
            abort(422, 'File size exceeds the maximum allowed limit of 25MB.');
        }
    }
}
