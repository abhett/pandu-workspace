<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserAiPreference;
use App\Models\UserRegionalPreference;

class UserPreferenceService
{
    /**
     * Get or create personal AI preferences.
     */
    public function getOrCreateAiPreferences(User $user): UserAiPreference
    {
        return UserAiPreference::firstOrCreate(
            ['user_id' => $user->id],
            [
                'default_model' => 'gemini',
                'context_window' => 75,
                'tone_style' => 40,
                'custom_system_prompt' => 'Selalu format tanggapan dalam Markdown terstruktur. Utamakan ringkasan poin-poin singkat dan daftar tugas.',
                'auto_summarize_notifications' => true,
                'inline_suggestions' => true,
                'suggestion_density' => 'medium',
                'model_training_opt_in' => false,
            ]
        );
    }

    /**
     * Update personal AI preferences.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateAiPreferences(User $user, array $data): UserAiPreference
    {
        $prefs = $this->getOrCreateAiPreferences($user);

        $prefs->update([
            'default_model' => $data['default_model'] ?? $prefs->default_model,
            'context_window' => (int) ($data['context_window'] ?? $prefs->context_window),
            'tone_style' => (int) ($data['tone_style'] ?? $prefs->tone_style),
            'custom_system_prompt' => $data['custom_system_prompt'] ?? $prefs->custom_system_prompt,
            'auto_summarize_notifications' => (bool) ($data['auto_summarize_notifications'] ?? $prefs->auto_summarize_notifications),
            'inline_suggestions' => (bool) ($data['inline_suggestions'] ?? $prefs->inline_suggestions),
            'suggestion_density' => $data['suggestion_density'] ?? $prefs->suggestion_density,
            'model_training_opt_in' => (bool) ($data['model_training_opt_in'] ?? $prefs->model_training_opt_in),
        ]);

        return $prefs->fresh();
    }

    /**
     * Get or create personal regional & timezone preferences.
     */
    public function getOrCreateRegionalPreferences(User $user): UserRegionalPreference
    {
        return UserRegionalPreference::firstOrCreate(
            ['user_id' => $user->id],
            [
                'language' => $user->locale ?? 'id',
                'date_format' => 'DD/MM/YYYY',
                'number_format' => 'EU',
                'first_day_of_week' => 1,
                'timezone' => $user->timezone ?? 'Asia/Jakarta',
                'time_format_24h' => true,
            ]
        );
    }

    /**
     * Update personal regional & timezone preferences.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateRegionalPreferences(User $user, array $data): UserRegionalPreference
    {
        $prefs = $this->getOrCreateRegionalPreferences($user);

        $prefs->update([
            'language' => $data['language'] ?? $prefs->language,
            'date_format' => $data['date_format'] ?? $prefs->date_format,
            'number_format' => $data['number_format'] ?? $prefs->number_format,
            'first_day_of_week' => (int) ($data['first_day_of_week'] ?? $prefs->first_day_of_week),
            'timezone' => $data['timezone'] ?? $prefs->timezone,
            'time_format_24h' => (bool) ($data['time_format_24h'] ?? $prefs->time_format_24h),
        ]);

        // Synchronize on user model
        $user->update([
            'locale' => $prefs->language,
            'timezone' => $prefs->timezone,
        ]);

        return $prefs->fresh();
    }
}
