<?php

namespace App\Services\FileManager;

use App\Models\Attachment;
use App\Models\Folder;
use App\Models\Organization;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class FileManagerService
{
    /**
     * Get files, folders, and storage metrics for the organization.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getFilesAndFolders(Organization $organization, ?Project $project = null, array $filters = []): array
    {
        // 1. Folders Query
        $foldersQuery = Folder::where('organization_id', $organization->id);
        if ($project) {
            $foldersQuery->where(function ($q) use ($project) {
                $q->whereNull('project_id')->orWhere('project_id', $project->id);
            });
        }
        $folders = $foldersQuery->withCount('files')->orderBy('name')->get();

        // If organization has 0 folders, create default standard folders
        if ($folders->isEmpty()) {
            $defaultFolders = [
                ['name' => 'Design Assets', 'color' => 'emerald'],
                ['name' => 'PRDs & Dokumentasi', 'color' => 'blue'],
                ['name' => 'Lampiran Tugas', 'color' => 'amber'],
            ];

            $firstUser = $organization->memberships()->first()?->user_id ?? 1;

            foreach ($defaultFolders as $df) {
                Folder::create([
                    'organization_id' => $organization->id,
                    'project_id' => $project?->id,
                    'name' => $df['name'],
                    'color' => $df['color'],
                    'created_by' => $firstUser,
                ]);
            }

            $folders = Folder::where('organization_id', $organization->id)->withCount('files')->orderBy('name')->get();
        }

        // 2. Files Query
        $filesQuery = Attachment::where('organization_id', $organization->id)
            ->with(['uploader:id,name,avatar', 'project:id,name,key', 'folder:id,name,color'])
            ->orderByDesc('created_at');

        if ($project) {
            $filesQuery->where('project_id', $project->id);
        }

        $view = $filters['view'] ?? 'all';

        if ($view === 'recent') {
            $filesQuery->where('created_at', '>=', now()->subDays(7));
        } elseif ($view === 'attachments') {
            $filesQuery->whereNotNull('attachable_id');
        } elseif ($view === 'trash') {
            $filesQuery->onlyTrashed();
        }

        if (! empty($filters['folder_id'])) {
            $filesQuery->where('folder_id', $filters['folder_id']);
        }

        if (! empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $filesQuery->where(function ($q) use ($search) {
                $q->where('filename', 'like', "%{$search}%")
                    ->orWhere('mime_type', 'like', "%{$search}%");
            });
        }

        if (! empty($filters['type']) && $filters['type'] !== 'all') {
            $type = $filters['type'];
            if ($type === 'image') {
                $filesQuery->where('mime_type', 'like', 'image/%');
            } elseif ($type === 'document') {
                $filesQuery->where(function ($q) {
                    $q->where('mime_type', 'like', '%pdf%')
                        ->orWhere('mime_type', 'like', '%document%')
                        ->orWhere('mime_type', 'like', '%word%')
                        ->orWhere('mime_type', 'like', '%text%');
                });
            } elseif ($type === 'archive') {
                $filesQuery->where(function ($q) {
                    $q->where('mime_type', 'like', '%zip%')
                        ->orWhere('mime_type', 'like', '%rar%')
                        ->orWhere('mime_type', 'like', '%tar%');
                });
            }
        }

        $files = $filesQuery->get()->map(function (Attachment $file) {
            $url = null;
            if (str_starts_with($file->mime_type, 'image/')) {
                $url = Storage::disk($file->disk)->url($file->object_key);
            }

            return [
                'id' => $file->id,
                'filename' => $file->filename,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
                'size_formatted' => $this->formatBytes($file->size_bytes),
                'url' => $url,
                'download_url' => route('files.download', $file->id),
                'folder' => $file->folder ? ['id' => $file->folder->id, 'name' => $file->folder->name, 'color' => $file->folder->color] : null,
                'project' => $file->project ? ['id' => $file->project->id, 'name' => $file->project->name, 'key' => $file->project->key] : null,
                'uploader' => $file->uploader ? ['id' => $file->uploader->id, 'name' => $file->uploader->name, 'avatar' => $file->uploader->avatar] : null,
                'created_at' => $file->created_at?->toIso8601String(),
                'created_at_formatted' => $file->created_at?->translatedFormat('d M Y, H:i'),
            ];
        });

        // 3. Storage Calculation
        $storage = $this->calculateStorageUsage($organization);

        return [
            'folders' => $folders,
            'files' => $files,
            'storage' => $storage,
            'total_items' => $files->count(),
        ];
    }

    /**
     * Upload and store a new file.
     */
    public function uploadFile(
        Organization $organization,
        User $user,
        UploadedFile $file,
        ?string $folderId = null,
        ?string $projectId = null,
        ?string $attachableType = null,
        ?string $attachableId = null
    ): Attachment {
        $disk = 'public';
        $path = $file->store("attachments/{$organization->id}", $disk);

        $checksum = hash_file('sha256', $file->getRealPath());

        return Attachment::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'folder_id' => $folderId,
            'attachable_type' => $attachableType,
            'attachable_id' => $attachableId,
            'uploader_id' => $user->id,
            'disk' => $disk,
            'object_key' => $path,
            'filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'checksum_sha256' => $checksum,
            'metadata' => [
                'original_name' => $file->getClientOriginalName(),
                'extension' => $file->getClientOriginalExtension(),
            ],
        ]);
    }

    /**
     * Create a new folder.
     *
     * @param  array<string, mixed>  $data
     */
    public function createFolder(Organization $organization, User $user, array $data): Folder
    {
        return Folder::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => trim($data['name']),
            'color' => $data['color'] ?? 'blue',
            'created_by' => $user->id,
        ]);
    }

    /**
     * Delete an attachment.
     */
    public function deleteFile(Attachment $attachment, bool $force = false): void
    {
        if ($force) {
            Storage::disk($attachment->disk)->delete($attachment->object_key);
            $attachment->forceDelete();
        } else {
            $attachment->delete();
        }
    }

    /**
     * Delete a folder and unlink or delete its files.
     */
    public function deleteFolder(Folder $folder): void
    {
        $folder->files()->update(['folder_id' => null]);
        $folder->delete();
    }

    /**
     * Calculate storage usage metrics.
     *
     * @return array<string, mixed>
     */
    public function calculateStorageUsage(Organization $organization): array
    {
        $totalBytes = (int) Attachment::where('organization_id', $organization->id)->sum('size_bytes');
        $quotaBytes = 100 * 1024 * 1024 * 1024; // 100 GB standard quota
        $percent = $quotaBytes > 0 ? round(($totalBytes / $quotaBytes) * 100, 2) : 0;

        return [
            'used_bytes' => $totalBytes,
            'used_formatted' => $this->formatBytes($totalBytes),
            'quota_bytes' => $quotaBytes,
            'quota_formatted' => '100 GB',
            'percentage' => max($percent, 0.1),
        ];
    }

    /**
     * Format bytes into human readable format.
     */
    public function formatBytes(int $bytes, int $precision = 1): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);

        return round($bytes, $precision).' '.$units[$pow];
    }
}
