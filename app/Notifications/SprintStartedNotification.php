<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\Sprint;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SprintStartedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Sprint $sprint,
        public Project $project,
        public User $startedBy
    ) {}

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable instanceof User && $notifiable->wantsNotification('sprint_events', 'in_app')) {
            $channels[] = 'database';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'category' => 'sprint',
            'title' => 'Sprint Dimulai',
            'message' => "Sprint \"{$this->sprint->name}\" telah dimulai oleh {$this->startedBy->name}.",
            'sprint_id' => $this->sprint->id,
            'sprint_name' => $this->sprint->name,
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'actor_id' => $this->startedBy->id,
            'actor_name' => $this->startedBy->name,
            'action_url' => "/projects/{$this->project->id}/backlog",
            'icon' => 'directions_run',
        ];
    }
}
