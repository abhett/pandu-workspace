<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\RetrospectiveItem;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\SprintRetrospective;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
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

    $this->org = Organization::factory()->create(['name' => 'Agile Retros Org']);

    $this->scrumMaster = User::factory()->create(['name' => 'Scrum Master', 'email' => 'scrum@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->scrumMaster->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Frontend Dev', 'email' => 'devA@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Observer Guest', 'email' => 'guest@example.com']);
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
        'name' => 'Agile Platform App',
        'key' => 'APA',
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
        'name' => 'To Do',
        'slug' => 'to-do',
        'category' => 'todo',
        'color' => '#64748b',
        'position' => 0,
    ]);

    $this->sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Foundations',
        'status' => 'completed',
        'start_date' => now()->subDays(14)->toDateString(),
        'end_date' => now()->toDateString(),
    ]);
});

test('user can view project retrospectives index and metrics', function () {
    SprintRetrospective::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'title' => 'Sprint 1 Retrospective',
        'format' => 'what_went_well',
        'status' => 'closed',
        'facilitator_id' => $this->scrumMaster->id,
        'sentiment_score' => 4.5,
    ]);

    $response = $this->actingAs($this->scrumMaster)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/retrospectives");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/retrospectives/index')
            ->has('metrics')
            ->has('retrospectives', 1)
            ->has('format_definitions')
            ->has('sprints')
        );
});

test('user can create a new retrospective session', function () {
    $response = $this->actingAs($this->scrumMaster)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives", [
            'title' => 'Sprint 2 Retrospective - Core Engine',
            'format' => 'start_stop_continue',
            'sprint_id' => $this->sprint->id,
            'is_anonymous' => false,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $retro = SprintRetrospective::where('title', 'Sprint 2 Retrospective - Core Engine')->first();
    expect($retro)->not->toBeNull();
    expect($retro->format)->toBe('start_stop_continue');
    expect($retro->status)->toBe('active');
});

test('user can add feedback items and vote on them', function () {
    $retro = SprintRetrospective::create([
        'project_id' => $this->project->id,
        'title' => 'Sprint 1 Retro',
        'format' => 'what_went_well',
        'status' => 'active',
        'facilitator_id' => $this->scrumMaster->id,
    ]);

    // 1. Add feedback item
    $itemResponse = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives/{$retro->id}/items", [
            'category' => 'went_well',
            'content' => 'CI/CD pipeline test automation berjalan sangat cepat!',
        ]);

    $itemResponse->assertCreated()
        ->assertJson(['success' => true]);

    $item = RetrospectiveItem::where('retrospective_id', $retro->id)->first();
    expect($item)->not->toBeNull();
    expect($item->category)->toBe('went_well');
    expect($item->votes_count)->toBe(0);

    // 2. DevA votes for the item
    $voteResponse = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives/items/{$item->id}/vote");

    $voteResponse->assertOk()
        ->assertJson([
            'success' => true,
            'is_voted' => true,
            'votes_count' => 1,
        ]);

    expect($item->fresh()->votes_count)->toBe(1);

    // 3. Toggle vote off
    $unvoteResponse = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives/items/{$item->id}/vote");

    $unvoteResponse->assertOk()
        ->assertJson([
            'success' => true,
            'is_voted' => false,
            'votes_count' => 0,
        ]);

    expect($item->fresh()->votes_count)->toBe(0);
});

test('user can convert retrospective action item to a project task', function () {
    $retro = SprintRetrospective::create([
        'project_id' => $this->project->id,
        'title' => 'Sprint 1 Retro',
        'format' => 'what_went_well',
        'status' => 'active',
        'facilitator_id' => $this->scrumMaster->id,
    ]);

    $actionItem = RetrospectiveItem::create([
        'retrospective_id' => $retro->id,
        'user_id' => $this->devA->id,
        'category' => 'action_item',
        'content' => 'Tingkatkan code coverage unit test hingga 90%',
        'is_action_item' => true,
    ]);

    $convertResponse = $this->actingAs($this->scrumMaster)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives/items/{$actionItem->id}/convert-to-task", [
            'title' => 'Tingkatkan code coverage unit test hingga 90%',
            'type' => 'improvement',
            'priority' => 'high',
            'assignee_id' => $this->devA->id,
        ]);

    $convertResponse->assertCreated()
        ->assertJson(['success' => true]);

    $task = Task::where('project_id', $this->project->id)->first();
    expect($task)->not->toBeNull();
    expect($task->title)->toBe('Tingkatkan code coverage unit test hingga 90%');
    expect($task->type)->toBe('improvement');

    $actionItem->refresh();
    expect($actionItem->task_id)->toBe($task->id);
    expect($actionItem->action_status)->toBe('in_progress');
});

test('user can close retrospective with sentiment score', function () {
    $retro = SprintRetrospective::create([
        'project_id' => $this->project->id,
        'title' => 'Sprint 1 Retro',
        'format' => 'what_went_well',
        'status' => 'active',
        'facilitator_id' => $this->scrumMaster->id,
    ]);

    $response = $this->actingAs($this->scrumMaster)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives/{$retro->id}/close", [
            'sentiment_score' => 4.8,
            'summary_notes' => 'Sprint berjalan sangat memuaskan, fokus ke performa API pada sprint berikutnya.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $retro->refresh();
    expect($retro->status)->toBe('closed');
    expect((float) $retro->sentiment_score)->toEqual(4.8);
    expect($retro->summary_notes)->toContain('Sprint berjalan sangat memuaskan');
});

test('guest role is forbidden from modifying retrospectives', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/retrospectives", [
            'title' => 'Unauthorized Retro',
            'format' => 'what_went_well',
        ])
        ->assertForbidden();
});
