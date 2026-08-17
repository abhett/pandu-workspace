<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskChecklist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TaskChecklistController extends Controller
{
    /**
     * Store a newly created checklist item on a task.
     */
    public function store(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $maxPosition = TaskChecklist::where('task_id', $task->id)->max('position') ?? 0;

        $checklist = TaskChecklist::create([
            'task_id' => $task->id,
            'title' => trim($validated['title']),
            'is_completed' => false,
            'position' => $maxPosition + 1,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'checklist' => $checklist,
            ], 201);
        }

        return back()->with('success', 'Item checklist berhasil ditambahkan.');
    }

    /**
     * Toggle completion status of a checklist item.
     */
    public function toggle(Request $request, Task $task, TaskChecklist $checklist): JsonResponse|RedirectResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $isCompleted = ! $checklist->is_completed;

        $checklist->update([
            'is_completed' => $isCompleted,
            'completed_at' => $isCompleted ? now() : null,
            'completed_by' => $isCompleted ? $request->user()->id : null,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'checklist' => $checklist->fresh('completedByUser'),
            ]);
        }

        return back()->with('success', 'Status checklist diperbarui.');
    }

    /**
     * Delete a checklist item.
     */
    public function destroy(Request $request, Task $task, TaskChecklist $checklist): JsonResponse|RedirectResponse
    {
        $this->authorizeTaskAccess($request, $task);

        $checklist->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Item checklist berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Item checklist berhasil dihapus.');
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
