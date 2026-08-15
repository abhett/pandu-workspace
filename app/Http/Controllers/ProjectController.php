<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\ProjectTemplate;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function __construct(
        protected ProjectCreationService $projectCreationService
    ) {}

    /**
     * Display a listing of projects.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if (! $orgId) {
            return redirect()->route('onboarding.organization');
        }

        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $search = $request->input('search');
        $status = $request->input('status', 'active');
        $type = $request->input('type');

        $query = Project::with(['lead', 'members', 'statuses'])
            ->where('organization_id', $orgId);

        if ($status === 'archived') {
            $query->where('status', 'archived');
        } else {
            $query->where('status', '!=', 'archived');
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('key', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        if ($type) {
            $query->where('type', $type);
        }

        $projects = $query->orderBy('name')->get()->map(function (Project $p) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'key' => $p->key,
                'slug' => $p->slug,
                'type' => $p->type,
                'color' => $p->color,
                'icon' => $p->icon,
                'status' => $p->status,
                'description' => $p->description,
                'lead' => $p->lead ? [
                    'id' => $p->lead->id,
                    'name' => $p->lead->name,
                    'email' => $p->lead->email,
                ] : null,
                'members_count' => $p->members->count(),
                'members' => $p->members->take(5)->map(fn (User $u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->pivot->role ?? 'member',
                ])->all(),
                'statuses_count' => $p->statuses->count(),
                'created_at' => $p->created_at?->isoFormat('D MMM Y'),
            ];
        });

        // Summary stats
        $stats = [
            'total' => Project::where('organization_id', $orgId)->count(),
            'active' => Project::where('organization_id', $orgId)->where('status', 'active')->count(),
            'archived' => Project::where('organization_id', $orgId)->where('status', 'archived')->count(),
            'scrum' => Project::where('organization_id', $orgId)->where('type', 'scrum')->count(),
            'kanban' => Project::where('organization_id', $orgId)->where('type', 'kanban')->count(),
        ];

        return Inertia::render('projects/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'projects' => $projects,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'type' => $type,
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Show the form for creating a new project.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $user->hasPermissionInOrganization($organization, 'projects:create')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuat proyek baru.');
        }

        $templates = ProjectTemplate::all()->map(fn (ProjectTemplate $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'slug' => $t->slug,
            'category' => $t->category,
            'description' => $t->description,
            'icon' => $t->icon,
            'color' => $t->color,
            'workflow_config' => $t->workflow_config,
            'default_views' => $t->default_views,
        ]);

        $organizationMembers = $organization->users()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        return Inertia::render('projects/create', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'templates' => $templates,
            'members' => $organizationMembers,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
            ],
        ]);
    }

    /**
     * Store a newly created project.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! $user->hasPermissionInOrganization($organization, 'projects:create')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuat proyek baru.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'key' => ['nullable', 'string', 'min:2', 'max:10', 'regex:/^[A-Za-z0-9]+$/'],
            'description' => ['nullable', 'string', 'max:1000'],
            'template_id' => ['nullable', 'string', 'exists:project_templates,id'],
            'type' => ['nullable', 'string', 'in:scrum,kanban,bug_tracking,general'],
            'color' => ['nullable', 'string', 'max:20'],
            'icon' => ['nullable', 'string', 'max:50'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $project = $this->projectCreationService->create($organization, $user, $validated);

        return redirect()->route('projects.show', $project->id)
            ->with('success', 'Proyek "'.$project->name.'" berhasil dibuat!');
    }

    /**
     * Display the specified project overview.
     */
    public function show(Request $request, Project $project): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        $project->load(['lead', 'defaultAssignee', 'members', 'statuses']);

        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        $availableOrgMembers = $organization->users()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        return Inertia::render('projects/overview', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'type' => $project->type,
                'color' => $project->color,
                'icon' => $project->icon,
                'status' => $project->status,
                'description' => $project->description,
                'created_at' => $project->created_at?->isoFormat('D MMMM Y'),
                'lead' => $project->lead ? [
                    'id' => $project->lead->id,
                    'name' => $project->lead->name,
                    'email' => $project->lead->email,
                ] : null,
                'default_assignee' => $project->defaultAssignee ? [
                    'id' => $project->defaultAssignee->id,
                    'name' => $project->defaultAssignee->name,
                ] : null,
                'members' => $project->members->map(fn (User $u) => [
                    'id' => $u->id,
                    'membership_id' => $u->pivot->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->pivot->role ?? 'member',
                    'joined_at' => $u->pivot->joined_at ? Carbon::parse($u->pivot->joined_at)->isoFormat('D MMM Y') : null,
                ])->all(),
                'statuses' => $project->statuses->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'category' => $s->category,
                    'color' => $s->color,
                    'position' => $s->position,
                    'is_initial' => $s->is_initial,
                    'is_completed' => $s->is_completed,
                    'wip_limit' => $s->wip_limit,
                ])->all(),
            ],
            'availableOrgMembers' => $availableOrgMembers,
        ]);
    }

    /**
     * Show project settings.
     */
    public function settings(Request $request, Project $project): Response|RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengedit pengaturan proyek.');
        }

        $project->load(['lead', 'members', 'statuses']);

        $availableOrgMembers = $organization->users()
            ->select(['users.id', 'users.name', 'users.email'])
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ]);

        return Inertia::render('projects/settings', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'key' => $project->key,
                'slug' => $project->slug,
                'type' => $project->type,
                'color' => $project->color,
                'icon' => $project->icon,
                'status' => $project->status,
                'description' => $project->description,
                'lead_user_id' => $project->lead_user_id,
                'members' => $project->members->map(fn (User $u) => [
                    'id' => $u->id,
                    'membership_id' => $u->pivot->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $u->pivot->role ?? 'member',
                    'joined_at' => $u->pivot->joined_at ? Carbon::parse($u->pivot->joined_at)->isoFormat('D MMM Y') : null,
                ])->all(),
                'statuses' => $project->statuses->map(fn ($s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'slug' => $s->slug,
                    'category' => $s->category,
                    'color' => $s->color,
                    'position' => $s->position,
                    'is_initial' => $s->is_initial,
                    'is_completed' => $s->is_completed,
                    'wip_limit' => $s->wip_limit,
                ])->all(),
            ],
            'availableOrgMembers' => $availableOrgMembers,
        ]);
    }

    /**
     * Update project general settings.
     */
    public function update(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengedit proyek.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'key' => ['required', 'string', 'min:2', 'max:10', 'regex:/^[A-Za-z0-9]+$/'],
            'description' => ['nullable', 'string', 'max:1000'],
            'color' => ['nullable', 'string', 'max:20'],
            'icon' => ['nullable', 'string', 'max:50'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['required', 'string', 'in:active,archived,on_hold'],
        ]);

        $key = strtoupper(trim($validated['key']));

        // Check key uniqueness if changed
        if ($key !== $project->key) {
            $exists = Project::where('organization_id', $orgId)
                ->where('key', $key)
                ->where('id', '!=', $project->id)
                ->exists();

            if ($exists) {
                return back()->withErrors(['key' => "Project key '{$key}' sudah digunakan."]);
            }
        }

        $project->update([
            'name' => $validated['name'],
            'key' => $key,
            'description' => $validated['description'] ?? null,
            'color' => $validated['color'] ?? $project->color,
            'icon' => $validated['icon'] ?? $project->icon,
            'lead_user_id' => $validated['lead_user_id'] ?? null,
            'status' => $validated['status'],
        ]);

        return back()->with('success', 'Pengaturan proyek berhasil diperbarui.');
    }

    /**
     * Delete or archive project.
     */
    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus proyek.');
        }

        $project->delete();

        return redirect()->route('projects.index')
            ->with('success', 'Proyek "'.$project->name.'" berhasil dihapus.');
    }
}
