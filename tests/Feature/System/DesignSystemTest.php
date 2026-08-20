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

    $this->user = User::factory()->create();
    $this->org = Organization::factory()->create();

    $ownerRole = Role::where('slug', 'owner')->first();
    OrganizationMembership::create([
        'user_id' => $this->user->id,
        'organization_id' => $this->org->id,
        'role_id' => $ownerRole->id,
    ]);

    $this->user->update(['current_organization_id' => $this->org->id]);
});

test('authenticated user can view design system documentation hub', function () {
    $response = $this->actingAs($this->user)->get('/design-system');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('system/design-system'));
});

test('unauthenticated guest is redirected from design system', function () {
    $response = $this->get('/design-system');

    $response->assertRedirect('/login');
});
