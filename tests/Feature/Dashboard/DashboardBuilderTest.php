<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
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
    session(['current_organization_id' => $this->org->id]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'lead_user_id' => $this->user->id,
    ]);
});

test('authenticated user can access dashboard builder page', function () {
    $response = $this->actingAs($this->user)->get('/dashboard/builder');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('dashboard/builder')
        ->has('config')
        ->has('metrics')
        ->has('projects')
        ->has('defaultWidgets')
    );
});

test('authenticated user can save custom widget layout', function () {
    $layout = [
        [
            'id' => 'kpi_summary_grid',
            'type' => 'kpi_summary',
            'title' => 'Ringkasan KPI Eksekutif Kustom',
            'size' => 'full',
            'enabled' => true,
        ],
        [
            'id' => 'velocity_trend_chart',
            'type' => 'velocity_trend',
            'title' => 'Tren Kecepatan Sprint',
            'size' => 'half',
            'enabled' => true,
        ],
    ];

    $response = $this->actingAs($this->user)->post('/dashboard/builder/save', [
        'layout' => $layout,
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('dashboard_widget_configs', [
        'user_id' => $this->user->id,
        'organization_id' => $this->org->id,
        'is_default' => false,
    ]);
});

test('authenticated user can reset widget layout to default', function () {
    $response = $this->actingAs($this->user)->post('/dashboard/builder/reset');

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('dashboard_widget_configs', [
        'user_id' => $this->user->id,
        'organization_id' => $this->org->id,
        'is_default' => true,
    ]);
});

test('unauthenticated guest is redirected to login', function () {
    $response = $this->get('/dashboard/builder');

    $response->assertRedirect('/login');
});
