<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskActivityController extends Controller
{
    /**
     * Display a listing of activities for the specified task.
     */
    public function index(Request $request, Project $project, Task $task): JsonResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId || $task->project_id !== $project->id) {
            abort(403);
        }

        $activities = $task->activities()
            ->with('user:id,name,email')
            ->latest('created_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'changes' => $a->changes,
                'created_at' => $a->created_at?->diffForHumans(),
                'user' => $a->user ? [
                    'id' => $a->user->id,
                    'name' => $a->user->name,
                ] : null,
            ]);

        return response()->json(['activities' => $activities]);
    }
}
