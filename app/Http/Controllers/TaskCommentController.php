<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Task;
use App\Models\TaskActivity;
use App\Models\User;
use App\Notifications\MentionedInCommentNotification;
use App\Notifications\TaskCommentNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    /**
     * Store a newly created comment on a task.
     */
    public function store(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $this->authorizeTaskAccess($request, $task);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
            'parent_id' => ['nullable', 'string', 'exists:comments,id'],
        ]);

        $comment = Comment::create([
            'organization_id' => $task->organization_id,
            'task_id' => $task->id,
            'user_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'content' => trim($validated['content']),
        ]);

        // Record activity
        TaskActivity::create([
            'task_id' => $task->id,
            'user_id' => $user->id,
            'action' => 'comment_added',
            'changes' => [
                'comment_id' => $comment->id,
            ],
            'created_at' => now(),
        ]);

        // Dispatch notifications
        $task->loadMissing('project', 'assignees', 'creator');
        $project = $task->project;
        $notifiedUserIds = [$user->id];

        // 1. Detect @mentions in comment content
        preg_match_all('/@([a-zA-Z0-9_.+-]+(?:@[a-zA-Z0-9-.]+)?)/', $comment->content, $matches);
        if (! empty($matches[1])) {
            $identifiers = $matches[1];
            $mentionedUsers = User::where(function ($q) use ($identifiers) {
                foreach ($identifiers as $id) {
                    $q->orWhere('email', 'like', $id)
                        ->orWhere('name', 'like', '%'.$id.'%');
                }
            })->where('id', '!=', $user->id)->get();

            foreach ($mentionedUsers as $mentionedUser) {
                $mentionedUser->notify(new MentionedInCommentNotification(
                    $comment,
                    $task,
                    $project,
                    $user
                ));
                $notifiedUserIds[] = $mentionedUser->id;
            }
        }

        // 2. Notify other assignees & creator
        $candidates = $task->assignees->pluck('id')->all();
        if ($task->created_by) {
            $candidates[] = $task->created_by;
        }
        $candidates = array_unique(array_diff($candidates, $notifiedUserIds));

        foreach ($candidates as $candidateId) {
            $candidateUser = User::find($candidateId);
            if ($candidateUser) {
                $candidateUser->notify(new TaskCommentNotification(
                    $comment,
                    $task,
                    $project,
                    $user
                ));
            }
        }

        $comment->load('user');

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'comment' => $comment,
            ], 201);
        }

        return back()->with('success', 'Komentar berhasil ditambahkan.');
    }

    /**
     * Update an existing comment.
     */
    public function update(Request $request, Task $task, Comment $comment): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $this->authorizeTaskAccess($request, $task);

        if ($comment->user_id !== $user->id && ! $user->hasPermissionInOrganization($task->organization_id, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak untuk mengedit komentar ini.');
        }

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:5000'],
        ]);

        $comment->update([
            'content' => trim($validated['content']),
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'comment' => $comment->fresh('user'),
            ]);
        }

        return back()->with('success', 'Komentar berhasil diperbarui.');
    }

    /**
     * Delete a comment.
     */
    public function destroy(Request $request, Task $task, Comment $comment): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $this->authorizeTaskAccess($request, $task);

        if ($comment->user_id !== $user->id && ! $user->hasPermissionInOrganization($task->organization_id, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak untuk menghapus komentar ini.');
        }

        $comment->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Komentar berhasil dihapus.');
    }

    protected function authorizeTaskAccess(Request $request, Task $task): void
    {
        $isMember = $request->user()->organizations()
            ->where('organizations.id', $task->organization_id)
            ->wherePivot('status', 'active')
            ->exists();

        if (! $isMember) {
            abort(403, 'Akses tidak sah.');
        }
    }
}
