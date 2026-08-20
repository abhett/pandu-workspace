<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\User\AccessibilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KeyboardShortcutController extends Controller
{
    public function __construct(
        protected AccessibilityService $accessibilityService
    ) {}

    /**
     * Display Keyboard Shortcuts & Accessibility settings page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $preferences = $this->accessibilityService->getOrCreatePreferences($user);
        $shortcuts = $this->accessibilityService->getShortcutsList();

        return Inertia::render('settings/keyboard-shortcuts', [
            'preferences' => $preferences,
            'shortcuts' => $shortcuts,
        ]);
    }

    /**
     * Update Keyboard Shortcuts & Accessibility preferences.
     */
    public function update(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'single_key_shortcuts_enabled' => ['required', 'boolean'],
            'reduce_motion' => ['required', 'boolean'],
            'high_contrast' => ['required', 'boolean'],
        ]);

        $this->accessibilityService->updatePreferences($request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preferensi pintasan keyboard & aksesibilitas berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Preferensi pintasan keyboard & aksesibilitas berhasil diperbarui.');
    }
}
