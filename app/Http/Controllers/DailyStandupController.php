<?php

namespace App\Http\Controllers;

use App\Models\DailyStandup;
use App\Models\Organization;
use App\Models\Project;
use App\Services\Scrum\StandupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DailyStandupController extends Controller
{
    public function __construct(
        protected StandupService $standupService
    ) {}

    protected function getActiveOrganization($user): ?Organization
    {
        $orgId = session('current_organization_id') ?? $user->current_organization_id ?? $user->memberships()->value('organization_id');

        return $orgId ? Organization::find($orgId) : null;
    }

    /**
     * Display the Daily Standup Hub.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        $date = $request->query('date', now()->toDateString());
        $projectId = $request->query('project_id');

        $feed = collect();
        $myStandup = null;
        $projects = collect();
        $aiSynthesis = null;

        if ($organization) {
            $feed = $this->standupService->getTodayFeed($organization, $projectId, $date);

            $myStandup = DailyStandup::where('organization_id', $organization->id)
                ->where('user_id', $user->id)
                ->where('date', $date)
                ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
                ->first();

            $projects = Project::where('organization_id', $organization->id)
                ->select(['id', 'name', 'key'])
                ->get();

            $aiSynthesis = $this->standupService->synthesizeAiSummary($organization, $projectId, $date);
        }

        return Inertia::render('scrum/daily-standup', [
            'feed' => $feed,
            'myStandup' => $myStandup,
            'projects' => $projects,
            'selectedProjectId' => $projectId,
            'selectedDate' => $date,
            'aiSynthesis' => $aiSynthesis,
        ]);
    }

    /**
     * Store or update user's daily standup.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        if (! $organization) {
            return redirect()->back()->with('error', 'Organisasi aktif tidak ditemukan.');
        }

        $validated = $request->validate([
            'yesterday_work' => ['required', 'string', 'max:2000'],
            'today_work' => ['required', 'string', 'max:2000'],
            'blockers' => ['nullable', 'string', 'max:2000'],
            'mood' => ['nullable', 'string', 'in:great,good,neutral,blocked'],
            'project_id' => ['nullable', 'uuid', 'exists:projects,id'],
            'date' => ['nullable', 'date'],
        ]);

        $this->standupService->submitStandup($user, $organization, $validated);

        return redirect()->back()->with('success', 'Check-in standup harian Anda berhasil disimpan!');
    }

    /**
     * Trigger AI standup synthesis briefing.
     */
    public function synthesize(Request $request): JsonResponse
    {
        $user = $request->user();
        $organization = $this->getActiveOrganization($user);

        if (! $organization) {
            return response()->json(['error' => 'Organisasi aktif tidak ditemukan.'], 404);
        }

        $date = $request->input('date', now()->toDateString());
        $projectId = $request->input('project_id');

        $synthesis = $this->standupService->synthesizeAiSummary($organization, $projectId, $date);

        return response()->json($synthesis);
    }
}
