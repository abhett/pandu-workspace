<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Models\WhiteboardEdge;
use App\Models\WhiteboardNode;
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

    $this->org = Organization::factory()->create(['name' => 'Whiteboard Studio Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Lead Architect', 'email' => 'architect@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->memberUser = User::factory()->create(['name' => 'UI Designer', 'email' => 'designer@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->memberUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Stakeholder Viewer', 'email' => 'viewer@example.com']);
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
        'name' => 'Fintech NextGen Mobile App',
        'key' => 'FAPP',
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

    $this->whiteboard = ProjectWhiteboard::create([
        'project_id' => $this->project->id,
        'title' => 'System Architecture & User Journey Mind Map',
        'viewport_x' => 0,
        'viewport_y' => 0,
        'viewport_zoom' => 1.0,
        'grid_type' => 'dots',
        'created_by' => $this->ownerUser->id,
    ]);
});

test('user can view project whiteboard canvas page', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/whiteboard");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/whiteboard')
            ->has('currentWhiteboard')
            ->has('nodes')
            ->has('edges')
            ->where('currentWhiteboard.title', 'System Architecture & User Journey Mind Map')
        );
});

test('user can create and update canvas nodes', function () {
    // 1. Create a sticky note
    $createResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/nodes", [
            'type' => 'sticky_note',
            'title' => 'Biometric Auth Login',
            'content' => 'Implement FaceID and Fingerprint authentication on iOS/Android',
            'pos_x' => 250,
            'pos_y' => 180,
            'width' => 220,
            'height' => 160,
            'color' => '#bbf7d0',
        ]);

    $createResponse->assertCreated()
        ->assertJson(['success' => true]);

    $node = WhiteboardNode::where('title', 'Biometric Auth Login')->first();
    expect($node)->not->toBeNull();
    expect($node->pos_x)->toEqual(250.0);
    expect($node->color)->toBe('#bbf7d0');

    // 2. Update position and content
    $updateResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/nodes/{$node->id}", [
            'pos_x' => 400,
            'pos_y' => 320,
            'title' => 'Biometric Auth & Passkeys',
        ]);

    $updateResponse->assertOk()
        ->assertJson(['success' => true]);

    $node->refresh();
    expect($node->pos_x)->toEqual(400.0);
    expect($node->title)->toBe('Biometric Auth & Passkeys');
});

test('user can connect two nodes with a relation edge and delete it', function () {
    $nodeA = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'idea_card',
        'title' => 'KYC Verification Service',
        'pos_x' => 100,
        'pos_y' => 100,
    ]);

    $nodeB = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'shape',
        'title' => 'Third-party Identity Provider',
        'pos_x' => 450,
        'pos_y' => 100,
    ]);

    // Connect nodeA -> nodeB
    $connectResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/edges", [
            'source_node_id' => $nodeA->id,
            'target_node_id' => $nodeB->id,
            'label' => 'API Webhook Verification',
            'style' => 'curved',
            'color' => '#3b82f6',
        ]);

    $connectResponse->assertCreated()
        ->assertJson(['success' => true]);

    $edge = WhiteboardEdge::where('source_node_id', $nodeA->id)->where('target_node_id', $nodeB->id)->first();
    expect($edge)->not->toBeNull();
    expect($edge->label)->toBe('API Webhook Verification');

    // Delete edge
    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/edges/{$edge->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(WhiteboardEdge::find($edge->id))->toBeNull();
});

test('user can convert an ideation node into a real project task', function () {
    $node = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'sticky_note',
        'title' => 'Push Notification Dispatcher',
        'content' => 'Implement FCM and APNs background push notification workers',
        'pos_x' => 200,
        'pos_y' => 200,
    ]);

    $convertResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/nodes/{$node->id}/convert-to-task", [
            'title' => 'Push Notification Dispatcher Engine',
            'description' => 'FCM and APNs background push notification workers',
            'type' => 'task',
            'priority' => 'high',
            'status_id' => $this->todoStatus->id,
            'story_points' => 5,
        ]);

    $convertResponse->assertOk()
        ->assertJson(['success' => true]);

    $task = Task::where('title', 'Push Notification Dispatcher Engine')->first();
    expect($task)->not->toBeNull();
    expect($task->key)->toBe('FAPP-1');
    expect($task->priority)->toBe('high');
    expect($task->estimate_points)->toEqual(5.0);

    $node->refresh();
    expect($node->task_id)->toBe($task->id);
});

test('deleting a node cascades and removes connected edges', function () {
    $nodeA = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'sticky_note',
        'title' => 'Node A',
    ]);

    $nodeB = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'sticky_note',
        'title' => 'Node B',
    ]);

    $edge = WhiteboardEdge::create([
        'whiteboard_id' => $this->whiteboard->id,
        'source_node_id' => $nodeA->id,
        'target_node_id' => $nodeB->id,
    ]);

    $deleteResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/nodes/{$nodeA->id}");

    $deleteResponse->assertOk()
        ->assertJson(['success' => true]);

    expect(WhiteboardNode::find($nodeA->id))->toBeNull();
    expect(WhiteboardEdge::find($edge->id))->toBeNull();
});

test('user can save whiteboard viewport pan and zoom state', function () {
    $response = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/viewport", [
            'viewport_x' => -150.5,
            'viewport_y' => 220.0,
            'viewport_zoom' => 1.35,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->whiteboard->refresh();
    expect($this->whiteboard->viewport_x)->toEqual(-150.5);
    expect($this->whiteboard->viewport_y)->toEqual(220.0);
    expect($this->whiteboard->viewport_zoom)->toEqual(1.35);
});

test('guest role is forbidden from modifying nodes or edges', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/nodes", [
            'type' => 'sticky_note',
            'title' => 'Guest Unauthorized Note',
            'pos_x' => 100,
            'pos_y' => 100,
        ])
        ->assertForbidden();
});
