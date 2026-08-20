<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Task;
use App\Services\Inbox\InboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InboxController extends Controller
{
    public function __construct(
        protected InboxService $inboxService
    ) {}

    /**
     * Display the Personal Work Inbox & Notification Feed.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $filters = [
            'view' => $request->input('view', 'all_unread'),
        ];

        $feedData = $this->inboxService->getInboxFeed($user, $organization, $filters);

        return Inertia::render('inbox/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'counts' => $feedData['counts'],
            'items' => $feedData['items'],
            'total_items' => $feedData['total_items'],
            'filters' => $filters,
        ]);
    }

    /**
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $this->inboxService->markAsRead($request->user(), $id);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Notifikasi ditandai telah dibaca.',
            ]);
        }

        return back()->with('success', 'Notifikasi ditandai telah dibaca.');
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllRead(Request $request): JsonResponse|RedirectResponse
    {
        $this->inboxService->markAllAsRead($request->user());

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Semua notifikasi berhasil ditandai telah dibaca.',
            ]);
        }

        return back()->with('success', 'Semua notifikasi berhasil ditandai telah dibaca.');
    }

    /**
     * Snooze a notification.
     */
    public function snooze(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $duration = $request->input('duration', 'tomorrow');
        $this->inboxService->snoozeNotification($request->user(), $id, $duration);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Notifikasi berhasil ditunda.',
            ]);
        }

        return back()->with('success', 'Notifikasi berhasil ditunda.');
    }

    /**
     * Quick complete a task from inbox.
     */
    public function completeTask(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $result = $this->inboxService->quickCompleteTask($request->user(), $task);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return back()->with('success', $result['message']);
    }
}
