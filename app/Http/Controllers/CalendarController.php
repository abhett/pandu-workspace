<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Services\Calendar\CalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    public function __construct(
        protected CalendarService $calendarService
    ) {}

    /**
     * Display the Team Project Calendar & Schedule Planning.
     */
    public function index(Request $request, ?Project $project = null): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project && $project->organization_id !== $organization->id) {
            abort(404, 'Proyek tidak ditemukan dalam organisasi ini.');
        }

        $year = $request->has('year') ? (int) $request->input('year') : null;
        $month = $request->has('month') ? (int) $request->input('month') : null;
        $assigneeId = $request->has('assignee_id') ? (int) $request->input('assignee_id') : null;

        $calendarData = $this->calendarService->getMonthViewData(
            $organization,
            $project,
            $year,
            $month,
            $assigneeId
        );

        return Inertia::render('calendar/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'type' => $project->type,
            ] : null,
            'calendar' => $calendarData,
        ]);
    }

    /**
     * Update task due date via Calendar rescheduling.
     */
    public function updateTaskDueDate(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'due_date' => ['nullable', 'date'],
        ]);

        $task = $this->calendarService->updateTaskDueDate($task, $validated['due_date'] ?? null);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Tenggat waktu tugas berhasil diperbarui.',
                'task' => $task,
            ]);
        }

        return back()->with('success', 'Tenggat waktu tugas berhasil diperbarui.');
    }
}
