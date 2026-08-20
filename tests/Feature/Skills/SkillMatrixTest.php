<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Skill;
use App\Models\Task;
use App\Models\TaskRequiredSkill;
use App\Models\User;
use App\Models\UserSkill;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Skills\SkillAllocationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Skill Matrix Tech Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Tech Director', 'email' => 'techdir@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devReact = User::factory()->create(['name' => 'React Guru', 'email' => 'react@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devReact->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devDevOps = User::factory()->create(['name' => 'DevOps Specialist', 'email' => 'devops@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devDevOps->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Auditor Guest', 'email' => 'auditor@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'AI SaaS Platform',
        'key' => 'AISAAS',
    ]);

    $this->workflow = Workflow::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Default Workflow',
        'is_default' => true,
    ]);

    $this->todoStatus = WorkflowStatus::create([
        'workflow_id' => $this->workflow->id,
        'project_id' => $this->project->id,
        'name' => 'Backlog',
        'slug' => 'backlog',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->task = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'AISAAS-1',
        'title' => 'Build React Interactive Canvas Component',
        'type' => 'task',
        'priority' => 'high',
        'rank' => '0|hzzzzz:',
    ]);
});

test('user can view organization skills matrix dashboard', function () {
    Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'React & TypeScript',
        'category' => 'frontend',
        'description' => 'Modern React SPA development',
        'color' => '#06b6d4',
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/skills');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/skills/index')
            ->has('skills')
            ->has('memberProfiles')
            ->has('metrics')
        );
});

test('admin can create, update, and delete skills', function () {
    // 1. Create skill
    $createResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/skills', [
            'name' => 'Kubernetes & Helm',
            'category' => 'devops',
            'description' => 'Container orchestration and cluster scaling',
            'color' => '#3b82f6',
        ]);

    $createResponse->assertCreated()
        ->assertJson(['success' => true]);

    $skill = Skill::where('name', 'Kubernetes & Helm')->first();
    expect($skill)->not->toBeNull();
    expect($skill->category)->toBe('devops');

    // 2. Update skill
    $updateResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/skills/{$skill->id}", [
            'name' => 'Kubernetes, Helm & ArgoCD',
            'category' => 'devops',
            'description' => 'GitOps and container orchestration',
            'color' => '#2563eb',
        ]);

    $updateResponse->assertOk()
        ->assertJson(['success' => true]);

    $skill->refresh();
    expect($skill->name)->toBe('Kubernetes, Helm & ArgoCD');

    // 3. Delete skill
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/skills/{$skill->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(Skill::find($skill->id))->toBeNull();
});

test('admin can assign and remove member skills with proficiency', function () {
    $skill = Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'React',
        'category' => 'frontend',
        'color' => '#06b6d4',
    ]);

    // Assign skill to developer
    $assignResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/skills/member-skills', [
            'user_id' => $this->devReact->id,
            'skill_id' => $skill->id,
            'proficiency_level' => 'expert',
            'years_of_experience' => 5.5,
        ]);

    $assignResponse->assertCreated()
        ->assertJson(['success' => true]);

    $userSkill = UserSkill::where('user_id', $this->devReact->id)->where('skill_id', $skill->id)->first();
    expect($userSkill)->not->toBeNull();
    expect($userSkill->proficiency_level)->toBe('expert');
    expect($userSkill->years_of_experience)->toEqual(5.5);

    // Remove skill
    $removeResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/skills/member-skills/{$userSkill->id}");

    $removeResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(UserSkill::find($userSkill->id))->toBeNull();
});

test('admin can attach required skills to a task', function () {
    $skillReact = Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'React',
        'category' => 'frontend',
    ]);

    $skillTs = Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'TypeScript',
        'category' => 'frontend',
    ]);

    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/tasks/{$this->task->id}/required-skills", [
            'required_skills' => [
                ['skill_id' => $skillReact->id, 'min_proficiency' => 'advanced'],
                ['skill_id' => $skillTs->id, 'min_proficiency' => 'intermediate'],
            ],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(TaskRequiredSkill::where('task_id', $this->task->id)->count())->toBe(2);
});

test('smart resource allocation matcher computes accurate scores and factors in workload', function () {
    $skillReact = Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'React',
        'category' => 'frontend',
    ]);

    // devReact has Expert in React (score should be very high)
    UserSkill::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devReact->id,
        'skill_id' => $skillReact->id,
        'proficiency_level' => 'expert',
        'years_of_experience' => 4.0,
    ]);

    // devDevOps has no React skill
    $skillDocker = Skill::create([
        'organization_id' => $this->org->id,
        'name' => 'Docker',
        'category' => 'devops',
    ]);
    UserSkill::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devDevOps->id,
        'skill_id' => $skillDocker->id,
        'proficiency_level' => 'expert',
        'years_of_experience' => 6.0,
    ]);

    // Attach React requirement to task
    TaskRequiredSkill::create([
        'task_id' => $this->task->id,
        'skill_id' => $skillReact->id,
        'min_proficiency' => 'advanced',
    ]);

    $service = app(SkillAllocationService::class);
    $recommendations = $service->recommendAssigneesForTask($this->task);

    expect($recommendations)->not->toBeEmpty();
    // React Guru should be ranked #1
    expect($recommendations[0]['user_id'])->toBe($this->devReact->id);
    expect($recommendations[0]['match_score'])->toBeGreaterThan($recommendations[1]['match_score']);
    expect($recommendations[0]['verdict'])->toBe('Best Fit');
});

test('guest role is forbidden from modifying skills', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/skills', [
            'name' => 'Unauthorized Skill',
            'category' => 'backend',
        ])
        ->assertForbidden();
});
