<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AiAnalysisCompletedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public string $capabilityTitle,
        public string $summaryText,
        public ?Project $project = null,
        public ?string $actionUrl = null
    ) {}

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable instanceof User && $notifiable->wantsNotification('ai_completed', 'in_app')) {
            $channels[] = 'database';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'category' => 'ai',
            'title' => "Analisis AI Selesai: {$this->capabilityTitle}",
            'message' => $this->summaryText,
            'project_id' => $this->project?->id,
            'project_name' => $this->project?->name,
            'action_url' => $this->actionUrl ?: ($this->project ? "/projects/{$this->project->id}" : '/'),
            'icon' => 'auto_awesome',
        ];
    }
}
