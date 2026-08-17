<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Display the full Notification Center page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $category = $request->query('category', 'all');
        $unreadOnly = $request->boolean('unread_only');

        $query = $user->notifications();

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        if ($category !== 'all') {
            $query->where('data->category', $category);
        }

        $notifications = $query->latest()->paginate(20)->through(function (DatabaseNotification $n) {
            $data = $n->data;

            return [
                'id' => $n->id,
                'category' => $data['category'] ?? 'system',
                'title' => $data['title'] ?? 'Notifikasi',
                'message' => $data['message'] ?? '',
                'action_url' => $data['action_url'] ?? '#',
                'icon' => $data['icon'] ?? 'notifications',
                'read_at' => $n->read_at?->toISOString(),
                'is_read' => $n->read_at !== null,
                'created_at' => $n->created_at->toISOString(),
                'created_at_formatted' => $n->created_at->diffForHumans(),
                'data' => $data,
            ];
        });

        // Category counts
        $counts = [
            'all' => $user->notifications()->count(),
            'unread' => $user->unreadNotifications()->count(),
            'assigned' => $user->notifications()->where('data->category', 'assigned')->count(),
            'mention' => $user->notifications()->where('data->category', 'mention')->count(),
            'comment' => $user->notifications()->where('data->category', 'comment')->count(),
            'sprint' => $user->notifications()->where('data->category', 'sprint')->count(),
            'ai' => $user->notifications()->where('data->category', 'ai')->count(),
        ];

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
            'counts' => $counts,
            'currentCategory' => $category,
            'unreadOnly' => $unreadOnly,
        ]);
    }

    /**
     * Get quick unread notifications for the header dropdown.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();

        $unreadCount = $user->unreadNotifications()->count();
        $notifications = $user->unreadNotifications()
            ->latest()
            ->take(10)
            ->get()
            ->map(function (DatabaseNotification $n) {
                $data = $n->data;

                return [
                    'id' => $n->id,
                    'category' => $data['category'] ?? 'system',
                    'title' => $data['title'] ?? 'Notifikasi',
                    'message' => $data['message'] ?? '',
                    'action_url' => $data['action_url'] ?? '#',
                    'icon' => $data['icon'] ?? 'notifications',
                    'is_read' => false,
                    'created_at_formatted' => $n->created_at->diffForHumans(),
                ];
            });

        return response()->json([
            'unread_count' => $unreadCount,
            'notifications' => $notifications,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $notification = $user->notifications()->where('id', $id)->first();

        if ($notification && is_null($notification->read_at)) {
            $notification->markAsRead();
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'unread_count' => $user->unreadNotifications()->count(),
            ]);
        }

        return back();
    }

    /**
     * Mark all unread notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $user->unreadNotifications->markAsRead();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'unread_count' => 0,
            ]);
        }

        return back()->with('success', 'Semua notifikasi telah ditandai sebagai dibaca.');
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, string $id): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $user->notifications()->where('id', $id)->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
            ]);
        }

        return back()->with('success', 'Notifikasi berhasil dihapus.');
    }
}
