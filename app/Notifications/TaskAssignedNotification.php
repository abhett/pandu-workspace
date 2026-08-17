<?php

namespace App\Notifications;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TaskAssignedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Task $task,
        public Project $project,
        public User $assignedBy
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable instanceof User && $notifiable->wantsNotification('task_assigned', 'in_app')) {
            $channels[] = 'database';
        }

        return $channels;
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => 'assigned',
            'title' => 'Tugas Baru Ditugaskan',
            'message' => "{$this->assignedBy->name} menugaskan Anda ke tugas [{$this->task->key}] {$this->task->title}.",
            'task_id' => $this->task->id,
            'task_key' => $this->task->key,
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'actor_id' => $this->assignedBy->id,
            'actor_name' => $this->assignedBy->name,
            'action_url' => "/projects/{$this->project->id}?task={$this->task->id}",
            'icon' => 'person_add',
        ];
    }
}
