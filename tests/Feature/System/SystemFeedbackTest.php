<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create([
        'name' => 'QA Specialist',
        'email' => 'qa@example.com',
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Toast Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view toast and loading feedback showcase page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/system/feedback');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('system/feedback')
    );
});
