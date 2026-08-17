<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Attachment
 */
class AttachmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'project_id' => $this->project_id,
            'attachable_type' => $this->attachable_type,
            'attachable_id' => $this->attachable_id,
            'uploader_id' => $this->uploader_id,
            'filename' => $this->filename,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'checksum_sha256' => $this->checksum_sha256,
            'scan_status' => $this->scan_status,
            'download_url' => url("/api/v1/attachments/{$this->id}/download"),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
