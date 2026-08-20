<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Skill;
use App\Models\Task;
use App\Models\User;
use App\Models\UserSkill;
use App\Services\Skills\SkillAllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SkillMatrixController extends Controller
{
    public function __construct(
        protected SkillAllocationService $skillService
    ) {}

    /**
     * Authorize user access to organization skills.
     */
    protected function authorizeOrgAccess(Request $request, string $action = 'view'): Organization
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $role = $user->roleInOrganization($organization);
        if (! in_array($role, ['owner', 'admin', 'manager', 'member', 'guest'])) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        if ($action === 'manage_skills' && in_array($role, ['guest'])) {
            abort(403, 'Role Guest tidak memiliki izin mengubah data keahlian organisasi.');
        }

        return $organization;
    }

    /**
     * Display Organization Skills & Competency Matrix Dashboard.
     */
    public function index(Request $request): Response
    {
        $organization = $this->authorizeOrgAccess($request, 'view');

        $matrixData = $this->skillService->getOrganizationSkillMatrix($organization);

        $organizationMembers = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        $projects = $organization->projects()
            ->with(['tasks:id,project_id,key,title,priority,type'])
            ->select(['id', 'name', 'key'])
            ->get();

        return Inertia::render('organization/skills/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'skills' => $matrixData['skills'],
            'memberProfiles' => $matrixData['member_profiles'],
            'metrics' => $matrixData['metrics'],
            'members' => $organizationMembers,
            'projects' => $projects,
        ]);
    }

    /**
     * Store a new skill in organization catalog.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', 'string', 'in:frontend,backend,devops,design,qa,product_management,data,other'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $skill = $this->skillService->createSkill($organization, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Keahlian baru berhasil ditambahkan.',
                'skill' => $skill,
            ], 201);
        }

        return back()->with('success', 'Keahlian baru berhasil ditambahkan.');
    }

    /**
     * Update an existing skill.
     */
    public function update(Request $request, Skill $skill): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        if ($skill->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'category' => ['required', 'string', 'in:frontend,backend,devops,design,qa,product_management,data,other'],
            'description' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', 'string', 'max:30'],
        ]);

        $updatedSkill = $this->skillService->updateSkill($skill, $validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Keahlian berhasil diperbarui.',
                'skill' => $updatedSkill,
            ]);
        }

        return back()->with('success', 'Keahlian berhasil diperbarui.');
    }

    /**
     * Delete a skill.
     */
    public function destroy(Request $request, Skill $skill): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        if ($skill->organization_id !== $organization->id) {
            abort(404);
        }

        $this->skillService->deleteSkill($skill);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Keahlian berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Keahlian berhasil dihapus.');
    }

    /**
     * Assign or update skill endorsement on a member.
     */
    public function storeMemberSkill(Request $request): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'skill_id' => ['required', 'string', 'exists:skills,id'],
            'proficiency_level' => ['required', 'string', 'in:beginner,intermediate,advanced,expert'],
            'years_of_experience' => ['required', 'numeric', 'min:0', 'max:50'],
        ]);

        $userSkill = $this->skillService->assignUserSkill(
            $organization,
            (int) $validated['user_id'],
            $validated['skill_id'],
            $validated['proficiency_level'],
            (float) $validated['years_of_experience'],
            $request->user()
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Keahlian anggota tim berhasil ditetapkan.',
                'user_skill' => $userSkill,
            ], 201);
        }

        return back()->with('success', 'Keahlian anggota tim berhasil ditetapkan.');
    }

    /**
     * Remove a skill from a member.
     */
    public function destroyMemberSkill(Request $request, UserSkill $userSkill): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        if ($userSkill->organization_id !== $organization->id) {
            abort(404);
        }

        $this->skillService->removeUserSkill($userSkill->id);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Keahlian anggota tim berhasil dihapus.',
            ]);
        }

        return back()->with('success', 'Keahlian anggota tim berhasil dihapus.');
    }

    /**
     * Compute Smart Resource Allocation recommendations for a task.
     */
    public function recommendAssignees(Request $request, Task $task): JsonResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'view');

        if ($task->organization_id !== $organization->id) {
            abort(404);
        }

        $recommendations = $this->skillService->recommendAssigneesForTask($task);

        return response()->json([
            'success' => true,
            'task' => [
                'id' => $task->id,
                'key' => $task->key,
                'title' => $task->title,
                'priority' => $task->priority,
            ],
            'recommendations' => $recommendations,
        ]);
    }

    /**
     * Store task required skills.
     */
    public function storeTaskSkills(Request $request, Task $task): JsonResponse|RedirectResponse
    {
        $organization = $this->authorizeOrgAccess($request, 'manage_skills');

        if ($task->organization_id !== $organization->id) {
            abort(404);
        }

        $validated = $request->validate([
            'required_skills' => ['required', 'array'],
            'required_skills.*.skill_id' => ['required', 'string', 'exists:skills,id'],
            'required_skills.*.min_proficiency' => ['nullable', 'string', 'in:beginner,intermediate,advanced,expert'],
        ]);

        $this->skillService->attachTaskRequiredSkills($task, $validated['required_skills']);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kebutuhan keahlian tugas berhasil diperbarui.',
            ]);
        }

        return back()->with('success', 'Kebutuhan keahlian tugas berhasil diperbarui.');
    }
}
