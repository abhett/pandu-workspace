<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\PlanningPokerSession;
use App\Models\PlanningPokerVote;
use App\Models\Project;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowStatus;
use App\Services\Agile\PlanningPokerService;
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

    $this->org = Organization::factory()->create(['name' => 'Poker Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Scrum Master', 'email' => 'sm@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Developer Alpha', 'email' => 'alpha@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devB = User::factory()->create(['name' => 'Developer Beta', 'email' => 'beta@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devB->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::create([
        'organization_id' => $this->org->id,
        'name' => 'E-Commerce Platform',
        'slug' => 'e-commerce-platform',
        'key' => 'ECOMM',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
    ]);

    $this->sprint = Sprint::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 14',
        'status' => 'active',
        'start_date' => now()->subDay(),
        'end_date' => now()->addDays(13),
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

    $this->task1 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 1,
        'key' => 'ECOMM-1',
        'title' => 'Implement Stripe Payment Gateway',
        'type' => 'story',
        'priority' => 'high',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => null,
        'rank' => '0|hzzzzz:',
    ]);

    $this->task2 = Task::create([
        'organization_id' => $this->org->id,
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'status_id' => $this->todoStatus->id,
        'sequence_number' => 2,
        'key' => 'ECOMM-2',
        'title' => 'Design Checkout Confirmation Page',
        'type' => 'story',
        'priority' => 'medium',
        'created_by' => $this->ownerUser->id,
        'estimate_points' => null,
        'rank' => '0|hzzzzz:0',
    ]);
});

test('user can view planning poker sessions index', function () {
    PlanningPokerSession::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'moderator_id' => $this->ownerUser->id,
        'title' => 'Sprint 14 Estimation Session',
        'card_deck_type' => 'fibonacci',
        'active_task_id' => $this->task1->id,
        'status' => 'voting',
    ]);

    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/planning-poker");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/planning-poker/index')
            ->has('sessions', 1)
            ->has('metrics')
            ->has('deck_definitions')
        );
});

test('user can create a new planning poker session', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker", [
            'title' => 'Sprint 15 Planning Poker',
            'sprint_id' => $this->sprint->id,
            'card_deck_type' => 'fibonacci',
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $session = PlanningPokerSession::where('project_id', $this->project->id)->first();
    expect($session)->not->toBeNull();
    expect($session->title)->toBe('Sprint 15 Planning Poker');
    expect($session->active_task_id)->toBe($this->task1->id); // Auto-picked first unestimated
});

test('team members can cast votes and remain hidden until revealed', function () {
    $session = PlanningPokerSession::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'moderator_id' => $this->ownerUser->id,
        'title' => 'Live Estimation Session',
        'card_deck_type' => 'fibonacci',
        'active_task_id' => $this->task1->id,
        'status' => 'voting',
    ]);

    // Dev A votes 5
    $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker/{$session->id}/vote", [
            'vote_value' => '5',
        ])
        ->assertOk();

    // Dev B votes 8
    $this->actingAs($this->devB)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker/{$session->id}/vote", [
            'vote_value' => '8',
        ])
        ->assertOk();

    $service = app(PlanningPokerService::class);

    // Dev A views room: Dev A sees their own vote (5), but Dev B's vote is HIDDEN
    $detailA = $service->getSessionDetail($session, $this->devA);
    $voteDevA = collect($detailA['votes'])->firstWhere('user.id', $this->devA->id);
    $voteDevB = collect($detailA['votes'])->firstWhere('user.id', $this->devB->id);

    expect($voteDevA['vote_value'])->toBe('5');
    expect($voteDevB['vote_value'])->toBe('HIDDEN');
});

test('moderator can reveal votes and compute consensus statistics', function () {
    $session = PlanningPokerSession::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'moderator_id' => $this->ownerUser->id,
        'title' => 'Live Estimation Session',
        'card_deck_type' => 'fibonacci',
        'active_task_id' => $this->task1->id,
        'status' => 'voting',
    ]);

    PlanningPokerVote::create([
        'session_id' => $session->id,
        'task_id' => $this->task1->id,
        'user_id' => $this->devA->id,
        'vote_value' => '5',
        'numeric_value' => 5.0,
    ]);

    PlanningPokerVote::create([
        'session_id' => $session->id,
        'task_id' => $this->task1->id,
        'user_id' => $this->devB->id,
        'vote_value' => '8',
        'numeric_value' => 8.0,
    ]);

    // Reveal votes
    $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker/{$session->id}/reveal")
        ->assertOk();

    $session->refresh();
    expect($session->status)->toBe('revealed');

    $service = app(PlanningPokerService::class);
    $detail = $service->getSessionDetail($session, $this->devA);

    // Both votes are now visible
    $voteDevA = collect($detail['votes'])->firstWhere('user.id', $this->devA->id);
    $voteDevB = collect($detail['votes'])->firstWhere('user.id', $this->devB->id);
    expect($voteDevA['vote_value'])->toBe('5');
    expect($voteDevB['vote_value'])->toBe('8');

    // Statistics computed
    expect($detail['statistics']['average'])->toEqual(6.5);
    expect($detail['statistics']['median'])->toEqual(6.5);
    expect($detail['statistics']['min'])->toEqual(5.0);
    expect($detail['statistics']['max'])->toEqual(8.0);
    expect($detail['statistics']['has_consensus'])->toBeFalse();
});

test('moderator can apply story points to task and advance queue', function () {
    $session = PlanningPokerSession::create([
        'project_id' => $this->project->id,
        'sprint_id' => $this->sprint->id,
        'moderator_id' => $this->ownerUser->id,
        'title' => 'Live Estimation Session',
        'card_deck_type' => 'fibonacci',
        'active_task_id' => $this->task1->id,
        'status' => 'revealed',
    ]);

    // Apply 5 story points to task1
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker/{$session->id}/apply-points", [
            'estimate_points' => 5,
        ]);

    $response->assertOk();

    $this->task1->refresh();
    expect($this->task1->estimate_points)->toEqual(5.0);

    $session->refresh();
    // Auto advanced to task2 in queue
    expect($session->active_task_id)->toBe($this->task2->id);
    expect($session->status)->toBe('voting');
});

test('guest role forbidden from creating poker sessions', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/planning-poker", [
            'title' => 'Unauthorized Session',
            'card_deck_type' => 'fibonacci',
        ])
        ->assertForbidden();
});
