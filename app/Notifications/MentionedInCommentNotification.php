<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class MentionedInCommentNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Comment $comment,
        public Task $task,
        public Project $project,
        public User $author
    ) {}

    public function via(object $notifiable): array
    {
        $channels = [];
        if ($notifiable instanceof User && $notifiable->wantsNotification('mentioned', 'in_app')) {
            $channels[] = 'database';
        }

        return $channels;
    }

    public function toArray(object $notifiable): array
    {
        $snippet = Str::limit(strip_tags($this->comment->content), 80);

        return [
            'category' => 'mention',
            'title' => 'Anda Disebutkan',
            'message' => "{$this->author->name} menyebut Anda di [{$this->task->key}]: \"{$snippet}\"",
            'task_id' => $this->task->id,
            'task_key' => $this->task->key,
            'comment_id' => $this->comment->id,
            'project_id' => $this->project->id,
            'project_name' => $this->project->name,
            'actor_id' => $this->author->id,
            'actor_name' => $this->author->name,
            'action_url' => "/projects/{$this->project->id}?task={$this->task->id}",
            'icon' => 'alternate_email',
        ];
    }
}
