<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\AttachmentResource;
use App\Models\Attachment;
use App\Models\Task;
use App\Services\Storage\AttachmentService;
use App\Services\Webhook\WebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService,
        protected WebhookService $webhookService
    ) {}

    /**
     * List attachments for a task.
     */
    public function index(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $attachments = $task->attachments()->latest('created_at')->get();

        return response()->json([
            'data' => AttachmentResource::collection($attachments),
        ]);
    }

    /**
     * Upload an attachment for a task.
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $request->validate([
            'file' => ['required', 'file', 'max:25600'], // 25MB max
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
            (new AttachmentResource($attachment))->resolve(),
            $task->organization,
            $task->project
        );

        return response()->json([
            'data' => new AttachmentResource($attachment),
        ], 201);
    }

    /**
     * Get attachment details.
     */
    public function show(Request $request, Attachment $attachment): JsonResponse
    {
        $this->authorizeAttachmentAccess($request, $attachment);

        return response()->json([
            'data' => new AttachmentResource($attachment),
        ]);
    }

    /**
     * Download the attachment file.
     */
    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        $this->authorizeAttachmentAccess($request, $attachment);

        return $this->attachmentService->download($attachment);
    }

    /**
     * Delete an attachment.
     */
    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        $this->authorizeAttachmentAccess($request, $attachment);

        $this->attachmentService->delete($attachment, true);

        return response()->json([
            'message' => 'Attachment deleted successfully.',
        ]);
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
