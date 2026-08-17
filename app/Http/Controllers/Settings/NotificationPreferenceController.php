<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\UserNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NotificationPreferenceController extends Controller
{
    /**
     * Display user notification preferences.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $eventTypes = [
            [
                'key' => 'task_assigned',
                'title' => 'Penugasan Tugas',
                'description' => 'Notifikasi saat Anda ditugaskan atau dihapus dari sebuah tugas.',
            ],
            [
                'key' => 'mentioned',
                'title' => 'Sebutan (@Mentions)',
                'description' => 'Notifikasi saat rekan tim menyebut akun Anda di dalam komentar atau deskripsi.',
            ],
            [
                'key' => 'task_commented',
                'title' => 'Aktivitas Komentar',
                'description' => 'Notifikasi saat ada komentar baru pada tugas yang Anda ikuti atau buat.',
            ],
            [
                'key' => 'sprint_events',
                'title' => 'Siklus Sprint',
                'description' => 'Peringatan saat sprint baru dimulai, diselesaikan, atau diperbarui.',
            ],
            [
                'key' => 'ai_completed',
                'title' => 'Asisten AI & Laporan',
                'description' => 'Pemberitahuan saat analisis AI (Sprint Summary, Task Breakdown) selesai digenerate.',
            ],
        ];

        $savedPreferences = $user->notificationPreferences()->get()->keyBy('event_type');

        $preferences = array_map(function ($event) use ($savedPreferences) {
            $saved = $savedPreferences->get($event['key']);

            return [
                'event_type' => $event['key'],
                'title' => $event['title'],
                'description' => $event['description'],
                'in_app_enabled' => $saved ? (bool) $saved->in_app_enabled : true,
                'email_enabled' => $saved ? (bool) $saved->email_enabled : true,
            ];
        }, $eventTypes);

        return Inertia::render('settings/notifications', [
            'preferences' => $preferences,
        ]);
    }

    /**
     * Update user notification preferences.
     */
    public function update(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*.event_type' => ['required', 'string', 'in:task_assigned,mentioned,task_commented,sprint_events,ai_completed'],
            'preferences.*.in_app_enabled' => ['required', 'boolean'],
            'preferences.*.email_enabled' => ['required', 'boolean'],
        ]);

        foreach ($validated['preferences'] as $item) {
            UserNotificationPreference::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'event_type' => $item['event_type'],
                ],
                [
                    'in_app_enabled' => $item['in_app_enabled'],
                    'email_enabled' => $item['email_enabled'],
                ]
            );
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preferensi notifikasi berhasil disimpan.',
            ]);
        }

        return back()->with('success', 'Preferensi notifikasi berhasil disimpan.');
    }
}
