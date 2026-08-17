<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Task;
use App\Services\Storage\AttachmentService;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService,
        protected WebhookService $webhookService
    ) {}

    /**
     * Store an attachment uploaded via Web UI.
     */
    public function store(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $request->validate([
            'file' => ['required', 'file', 'max:25600'],
        ]);

        $file = $request->file('file');
        $attachment = $this->attachmentService->store(
            $file,
            $task,
            $request->user(),
            $task->organization,
            $task->project
        );

        $this->webhookService->dispatch(
            'attachment.uploaded',
            [
                'id' => $attachment->id,
                'filename' => $attachment->filename,
                'size_bytes' => $attachment->size_bytes,
                'task_id' => $task->id,
            ],
            $task->organization,
            $task->project
        );

        if ($request->wantsJson()) {
            return response()->json([
                'attachment' => $attachment,
                'message' => 'Attachment uploaded successfully.',
            ], 201);
        }

        return back()->with('success', 'Attachment uploaded successfully.');
    }

    /**
     * Download an attachment via Web UI.
     */
    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        $this->authorizeAttachmentAccess($request, $attachment);

        return $this->attachmentService->download($attachment);
    }

    /**
     * Delete an attachment via Web UI.
     */
    public function destroy(Request $request, Attachment $attachment): JsonResponse|RedirectResponse
    {
        $this->authorizeAttachmentAccess($request, $attachment);

        $this->attachmentService->delete($attachment, true);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Attachment deleted.']);
        }

        return back()->with('success', 'Attachment deleted.');
    }

    protected function authorizeTaskAccess(Request $request, Task $task): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $task->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this task.');
        }
    }

    protected function authorizeAttachmentAccess(Request $request, Attachment $attachment): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $attachment->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'You do not have access to this attachment.');
        }
    }
}
