<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Workflow Corp',
        'slug' => 'acme-workflow-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);

    $service = app(ProjectCreationService::class);
    $this->project = $service->create($this->organization, $this->user, [
        'name' => 'Workflow Customization Project',
        'key' => 'WCP',
    ]);
});

test('owner can reorder and update project workflow statuses', function () {
    $initialStatuses = $this->project->statuses;
    expect($initialStatuses)->toHaveCount(5); // Default Kanban has 5 statuses

    $newPayload = [
        [
            'id' => $initialStatuses[0]->id,
            'name' => 'Inbox Backlog',
            'category' => 'unstarted',
            'color' => '#64748b',
            'wip_limit' => null,
        ],
        [
            'id' => $initialStatuses[1]->id,
            'name' => 'Sprint Ready',
            'category' => 'unstarted',
            'color' => '#0ea5e9',
            'wip_limit' => 10,
        ],
        [
            'id' => null, // New custom status
            'name' => 'Design & Spike',
            'category' => 'started',
            'color' => '#8b5cf6',
            'wip_limit' => 3,
        ],
        [
            'id' => $initialStatuses[4]->id,
            'name' => 'Shipped / Done',
            'category' => 'completed',
            'color' => '#10b981',
            'wip_limit' => null,
        ],
    ];

    $response = $this->actingAs($this->user)->put("/projects/{$this->project->id}/workflow/statuses", [
        'statuses' => $newPayload,
    ]);

    $response->assertRedirect();
    $this->project->refresh();

    expect($this->project->statuses)->toHaveCount(4);
    expect($this->project->statuses->first()->name)->toBe('Inbox Backlog');
    expect($this->project->statuses->where('name', 'Design & Spike')->first())->not->toBeNull();
    expect($this->project->statuses->last()->name)->toBe('Shipped / Done');
});
