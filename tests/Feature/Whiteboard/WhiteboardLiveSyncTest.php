<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectWhiteboard;
use App\Models\Role;
use App\Models\User;
use App\Models\WhiteboardNode;
use App\Models\WhiteboardPresenceSession;
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

    $this->org = Organization::factory()->create(['name' => 'Live Collab Org']);

    $this->ownerUser = User::factory()->create(['name' => 'Lead Architect', 'email' => 'arch@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->ownerUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devA = User::factory()->create(['name' => 'Dev Beta', 'email' => 'beta@example.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devA->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Viewer', 'email' => 'guest@example.com']);
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
        'name' => 'Live Collab Workspace',
        'slug' => 'live-collab-workspace',
        'key' => 'LCW',
        'status' => 'active',
        'visibility' => 'private',
        'created_by' => $this->ownerUser->id,
    ]);

    $this->whiteboard = ProjectWhiteboard::create([
        'project_id' => $this->project->id,
        'title' => 'System Architecture Live Canvas',
        'created_by' => $this->ownerUser->id,
    ]);

    $this->node1 = WhiteboardNode::create([
        'whiteboard_id' => $this->whiteboard->id,
        'type' => 'sticky_note',
        'title' => 'API Gateway Cluster',
        'content' => 'High throughput reverse proxy',
        'pos_x' => 100,
        'pos_y' => 150,
        'width' => 200,
        'height' => 160,
        'color' => '#fef08a',
    ]);
});

test('user can join live whiteboard room', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live");

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('projects/whiteboard/live')
            ->has('whiteboard')
            ->has('nodes', 1)
            ->has('edges')
            ->has('initial_presence')
        );

    expect(WhiteboardPresenceSession::where('whiteboard_id', $this->whiteboard->id)->where('user_id', $this->devA->id)->exists())->toBeTrue();
});

test('presence heartbeat and cursor sync', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/presence", [
            'cursor_x' => 450.5,
            'cursor_y' => 320.0,
            'selected_node_id' => $this->node1->id,
        ]);

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'presence' => [
                'collaborators',
                'active_count',
                'current_user_color',
            ],
        ]);

    $session = WhiteboardPresenceSession::where('whiteboard_id', $this->whiteboard->id)->where('user_id', $this->devA->id)->first();
    expect($session)->not->toBeNull();
    expect($session->cursor_x)->toBe(450.5);
    expect($session->cursor_y)->toBe(320.0);
    expect($session->selected_node_id)->toBe($this->node1->id);
});

test('node locking prevents concurrent overwrite', function () {
    // 1. Dev A locks node 1
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/lock", [
            'node_id' => $this->node1->id,
            'action' => 'lock',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    // 2. Lead Architect attempts to lock node 1 while Dev A holds lock
    $conflictResponse = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/lock", [
            'node_id' => $this->node1->id,
            'action' => 'lock',
        ]);

    $conflictResponse->assertStatus(423)
        ->assertJson([
            'success' => false,
            'locked' => true,
        ]);

    // 3. Dev A unlocks node 1
    $unlockResponse = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/lock", [
            'node_id' => $this->node1->id,
            'action' => 'unlock',
        ]);

    $unlockResponse->assertOk();

    // 4. Lead Architect can now acquire lock
    $leadLock = $this->actingAs($this->ownerUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/lock", [
            'node_id' => $this->node1->id,
            'action' => 'lock',
        ]);

    $leadLock->assertOk()
        ->assertJson(['success' => true]);
});

test('batch sync updates nodes and edges', function () {
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/sync", [
            'nodes' => [
                [
                    'id' => $this->node1->id,
                    'pos_x' => 500,
                    'pos_y' => 600,
                    'title' => 'Updated Cluster Name',
                ],
            ],
            'new_nodes' => [
                [
                    'type' => 'sticky_note',
                    'title' => 'Database Primary',
                    'content' => 'Postgres 16 Read Replica',
                    'pos_x' => 800,
                    'pos_y' => 600,
                    'color' => '#bfdbfe',
                ],
            ],
        ]);

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'whiteboard',
            'nodes',
            'edges',
        ]);

    expect(WhiteboardNode::where('whiteboard_id', $this->whiteboard->id)->count())->toBe(2);

    $updatedNode = WhiteboardNode::find($this->node1->id);
    expect($updatedNode->pos_x)->toBe(500.0);
    expect($updatedNode->pos_y)->toBe(600.0);
    expect($updatedNode->title)->toBe('Updated Cluster Name');
});

test('leaving room cleans up presence', function () {
    // Join
    WhiteboardPresenceSession::create([
        'whiteboard_id' => $this->whiteboard->id,
        'user_id' => $this->devA->id,
        'cursor_x' => 100,
        'cursor_y' => 100,
        'client_color' => '#6366f1',
    ]);

    expect(WhiteboardPresenceSession::where('whiteboard_id', $this->whiteboard->id)->where('user_id', $this->devA->id)->exists())->toBeTrue();

    // Leave
    $response = $this->actingAs($this->devA)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/leave");

    $response->assertOk();
    expect(WhiteboardPresenceSession::where('whiteboard_id', $this->whiteboard->id)->where('user_id', $this->devA->id)->exists())->toBeFalse();
});

test('guest role forbidden from locking or modifying', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/lock", [
            'node_id' => $this->node1->id,
            'action' => 'lock',
        ])
        ->assertForbidden();

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/projects/{$this->project->id}/whiteboards/{$this->whiteboard->id}/live/sync", [
            'nodes' => [],
        ])
        ->assertForbidden();
});
