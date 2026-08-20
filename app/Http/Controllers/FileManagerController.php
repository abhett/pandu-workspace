<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Folder;
use App\Models\Organization;
use App\Models\Project;
use App\Services\FileManager\FileManagerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileManagerController extends Controller
{
    public function __construct(
        protected FileManagerService $fileManagerService
    ) {}

    /**
     * Display the Centralized File Manager page.
     */
    public function index(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project && $project->organization_id !== $organization->id) {
            abort(404);
        }

        $filters = [
            'view' => $request->input('view', 'all'),
            'folder_id' => $request->input('folder_id'),
            'search' => $request->input('search'),
            'type' => $request->input('type', 'all'),
        ];

        $data = $this->fileManagerService->getFilesAndFolders($organization, $project, $filters);

        return Inertia::render('files/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
            ] : null,
            'folders' => $data['folders'],
            'files' => $data['files'],
            'storage' => $data['storage'],
            'total_items' => $data['total_items'],
            'filters' => $filters,
        ]);
    }

    /**
     * Upload a new file.
     */
    public function upload(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $request->validate([
            'file' => ['required', 'file', 'max:51200'], // 50MB max
            'folder_id' => ['nullable', 'string', 'exists:folders,id'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
        ]);

        $attachment = $this->fileManagerService->uploadFile(
            $organization,
            $user,
            $request->file('file'),
            $request->input('folder_id'),
            $request->input('project_id')
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Berkas berhasil diunggah.',
                'file' => $attachment,
            ]);
        }

        return back()->with('success', 'Berkas berhasil diunggah.');
    }

    /**
     * Create a new folder.
     */
    public function storeFolder(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:30'],
            'project_id' => ['nullable', 'string', 'exists:projects,id'],
            'parent_id' => ['nullable', 'string', 'exists:folders,id'],
        ]);

        $folder = $this->fileManagerService->createFolder($organization, $user, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Folder berhasil dibuat.',
                'folder' => $folder,
            ]);
        }

        return back()->with('success', 'Folder berhasil dibuat.');
    }

    /**
     * Delete a file.
     */
    public function destroyFile(Request $request, Attachment $file): JsonResponse|RedirectResponse
    {
        $this->fileManagerService->deleteFile($file, $request->boolean('force', false));

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Berkas berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Berkas berhasil dihapus.');
    }

    /**
     * Delete a folder.
     */
    public function destroyFolder(Request $request, Folder $folder): JsonResponse|RedirectResponse
    {
        $this->fileManagerService->deleteFolder($folder);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Folder berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Folder berhasil dihapus.');
    }

    /**
     * Download an attachment file.
     */
    public function download(Request $request, Attachment $file): StreamedResponse
    {
        return Storage::disk($file->disk)->download($file->object_key, $file->filename);
    }
}
