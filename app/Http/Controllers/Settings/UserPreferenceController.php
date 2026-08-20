<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\User\UserPreferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserPreferenceController extends Controller
{
    public function __construct(
        protected UserPreferenceService $userPreferenceService
    ) {}

    /**
     * Display personal AI preferences page.
     */
    public function aiIndex(Request $request): Response
    {
        $user = $request->user();
        $aiPrefs = $this->userPreferenceService->getOrCreateAiPreferences($user);

        return Inertia::render('settings/ai-preferences', [
            'ai_preferences' => $aiPrefs,
        ]);
    }

    /**
     * Update personal AI preferences.
     */
    public function updateAi(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'default_model' => ['required', 'string', 'in:gpt4,claude3,gemini'],
            'context_window' => ['required', 'integer', 'min:1', 'max:100'],
            'tone_style' => ['required', 'integer', 'min:0', 'max:100'],
            'custom_system_prompt' => ['nullable', 'string', 'max:2000'],
            'auto_summarize_notifications' => ['required', 'boolean'],
            'inline_suggestions' => ['required', 'boolean'],
            'suggestion_density' => ['required', 'string', 'in:low,medium,high'],
            'model_training_opt_in' => ['required', 'boolean'],
        ]);

        $this->userPreferenceService->updateAiPreferences($request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preferensi AI berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Preferensi AI berhasil diperbarui.');
    }

    /**
     * Display personal Language, Regional & Timezone preferences page.
     */
    public function regionalIndex(Request $request): Response
    {
        $user = $request->user();
        $regionalPrefs = $this->userPreferenceService->getOrCreateRegionalPreferences($user);

        return Inertia::render('settings/language-timezone', [
            'regional_preferences' => $regionalPrefs,
        ]);
    }

    /**
     * Update personal Language, Regional & Timezone preferences.
     */
    public function updateRegional(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'language' => ['required', 'string', 'in:id,en,en-gb,fr,ja,es'],
            'date_format' => ['required', 'string', 'in:DD/MM/YYYY,MM/DD/YYYY,YYYY-MM-DD'],
            'number_format' => ['required', 'string', 'in:EU,US,CH'],
            'first_day_of_week' => ['required', 'integer', 'in:0,1,6'],
            'timezone' => ['required', 'string', 'max:100'],
            'time_format_24h' => ['required', 'boolean'],
        ]);

        $this->userPreferenceService->updateRegionalPreferences($request->user(), $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Preferensi regional & zona waktu berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Preferensi regional & zona waktu berhasil diperbarui.');
    }
}
