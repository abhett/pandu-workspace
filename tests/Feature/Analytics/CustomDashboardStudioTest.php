<?php

use App\Models\CustomDashboard;
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
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'Analytics Studio Org']);

    $this->leadUser = User::factory()->create(['name' => 'Lead Strategist', 'email' => 'lead@analytics.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@analytics.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->dashboard = CustomDashboard::create([
        'organization_id' => $this->org->id,
        'created_by' => $this->leadUser->id,
        'title' => 'Executive Q3 BI Matrix',
        'description' => 'Macro strategy tracking overview',
        'category' => 'executive',
        'icon' => 'layout-dashboard',
        'is_starred' => true,
        'is_shared' => true,
        'layout' => [
            ['id' => 'w_kpi', 'type' => 'kpi_summary', 'title' => 'Executive KPIs', 'size' => 'full'],
            ['id' => 'w_velocity', 'type' => 'velocity_trend', 'title' => 'Sprint Velocity', 'size' => 'half'],
        ],
    ]);
});

test('user can view custom dashboards studio', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/analytics/custom-dashboards');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/analytics/custom-dashboards')
            ->has('dashboards')
            ->has('activeDashboard')
            ->has('templates')
            ->has('widgetCatalog')
            ->has('projects')
            ->has('metrics')
        );
});

test('user can create dashboard from template', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/analytics/custom-dashboards', [
            'title' => 'Engineering Velocity Hub',
            'description' => 'Sprint cycle times and code quality',
            'category' => 'engineering',
            'template_id' => 'engineering_velocity',
            'is_shared' => true,
        ]);

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $created = CustomDashboard::where('title', 'Engineering Velocity Hub')->first();
    expect($created)->not->toBeNull();
    expect($created->category)->toBe('engineering');
    expect(count($created->layout))->toBeGreaterThan(0);
});

test('user can update dashboard layout and metadata', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/organization/analytics/custom-dashboards/{$this->dashboard->id}", [
            'title' => 'Executive Q3 BI Matrix (Updated)',
            'category' => 'financial',
            'layout' => [
                ['id' => 'w_cost', 'type' => 'cost_profitability', 'title' => 'Margin & Budget', 'size' => 'full'],
            ],
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $this->dashboard->refresh();
    expect($this->dashboard->title)->toBe('Executive Q3 BI Matrix (Updated)');
    expect($this->dashboard->category)->toBe('financial');
    expect($this->dashboard->layout[0]['type'])->toBe('cost_profitability');
});

test('user can duplicate custom dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/analytics/custom-dashboards/{$this->dashboard->id}/duplicate");

    $response->assertCreated()
        ->assertJson(['success' => true]);

    $cloned = CustomDashboard::where('title', 'like', '%(Salinan)%')->first();
    expect($cloned)->not->toBeNull();
    expect($cloned->category)->toBe('executive');
});

test('user can toggle star on dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/analytics/custom-dashboards/{$this->dashboard->id}/toggle-star");

    $response->assertOk()
        ->assertJson(['success' => true, 'is_starred' => false]);
});

test('user can delete custom dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/analytics/custom-dashboards/{$this->dashboard->id}");

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(CustomDashboard::find($this->dashboard->id))->toBeNull();
});

test('guest role forbidden from managing dashboards', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/analytics/custom-dashboards', [
            'title' => 'Unauthorized Dashboard',
            'category' => 'executive',
        ])
        ->assertForbidden();
});
