<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserAccessibilityPreference;

class AccessibilityService
{
    /**
     * Get or create accessibility and shortcut preferences.
     */
    public function getOrCreatePreferences(User $user): UserAccessibilityPreference
    {
        return UserAccessibilityPreference::firstOrCreate(
            ['user_id' => $user->id],
            [
                'single_key_shortcuts_enabled' => true,
                'reduce_motion' => false,
                'high_contrast' => false,
            ]
        );
    }

    /**
     * Update accessibility and shortcut preferences.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePreferences(User $user, array $data): UserAccessibilityPreference
    {
        $prefs = $this->getOrCreatePreferences($user);

        $prefs->update([
            'single_key_shortcuts_enabled' => (bool) ($data['single_key_shortcuts_enabled'] ?? $prefs->single_key_shortcuts_enabled),
            'reduce_motion' => (bool) ($data['reduce_motion'] ?? $prefs->reduce_motion),
            'high_contrast' => (bool) ($data['high_contrast'] ?? $prefs->high_contrast),
        ]);

        return $prefs->fresh();
    }

    /**
     * Get default structured list of keyboard shortcuts.
     *
     * @return array<string, mixed>
     */
    public function getShortcutsList(): array
    {
        return [
            'global' => [
                'title' => 'Global & Sistem',
                'icon' => 'globe',
                'shortcuts' => [
                    ['label' => 'Buka Command Palette', 'keys' => ['Ctrl', 'K']],
                    ['label' => 'Pencarian Global', 'keys' => ['/']],
                    ['label' => 'Buat Tugas Baru', 'keys' => ['C']],
                    ['label' => 'Tampilkan Pintasan Keyboard', 'keys' => ['Shift', '?']],
                ],
            ],
            'navigation' => [
                'title' => 'Navigasi Cepat',
                'icon' => 'compass',
                'shortcuts' => [
                    ['label' => 'Buka Papan Kanban', 'keys' => ['G', 'B']],
                    ['label' => 'Buka Daftar Proyek', 'keys' => ['G', 'P']],
                    ['label' => 'Buka Kotak Masuk (Inbox)', 'keys' => ['G', 'I']],
                    ['label' => 'Buka Daftar Tugas', 'keys' => ['G', 'T']],
                    ['label' => 'Buka Pengaturan', 'keys' => ['G', 'S']],
                    ['label' => 'Navigasi Baris Atas / Bawah', 'keys' => ['J', 'K']],
                ],
            ],
            'task_actions' => [
                'title' => 'Aksi Tugas (Task Actions)',
                'icon' => 'check-square',
                'shortcuts' => [
                    ['label' => 'Edit Tugas Terpilih', 'keys' => ['E']],
                    ['label' => 'Tugaskan ke Anggota', 'keys' => ['M']],
                    ['label' => 'Ubah Status Alur Kerja', 'keys' => ['S']],
                    ['label' => 'Atur Prioritas Tugas', 'keys' => ['P']],
                    ['label' => 'Arsipkan / Hapus Tugas', 'keys' => ['Del']],
                ],
            ],
            'views' => [
                'title' => 'Pergantian Tampilan (Views)',
                'icon' => 'layout-grid',
                'shortcuts' => [
                    ['label' => 'Tampilan Papan Kanban', 'keys' => ['1']],
                    ['label' => 'Tampilan Tabel / List', 'keys' => ['2']],
                    ['label' => 'Tampilan Gantt Timeline', 'keys' => ['3']],
                    ['label' => 'Tampilan Kalender Tim', 'keys' => ['4']],
                ],
            ],
        ];
    }
}
