<?php

use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Security Auditor', 'email' => 'auditor@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Enterprise Security Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view organization audit logs page with pagination', function () {
    OrganizationAuditLog::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'event_category' => 'security',
        'action' => 'user.login',
        'resource_type' => 'user',
        'resource_id' => (string) $this->user->id,
        'ip_address' => '192.168.1.100',
        'status' => 'success',
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/audit-logs')
        ->has('logs.data', 1)
        ->where('logs.data.0.action', 'user.login')
    );
});

test('user can filter audit logs by event category and search query', function () {
    OrganizationAuditLog::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'event_category' => 'security',
        'action' => 'password.reset',
        'resource_type' => 'user',
        'resource_id' => (string) $this->user->id,
        'status' => 'success',
    ]);

    OrganizationAuditLog::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'event_category' => 'access',
        'action' => 'role.updated',
        'resource_type' => 'role',
        'resource_id' => 'admin',
        'status' => 'success',
    ]);

    // Filter category = access
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/audit-logs?category=access');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/audit-logs')
        ->has('logs.data', 1)
        ->where('logs.data.0.action', 'role.updated')
    );

    // Search query = password
    $searchResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/audit-logs?search=password');

    $searchResponse->assertOk();
    $searchResponse->assertInertia(fn ($page) => $page
        ->component('organization/audit-logs')
        ->has('logs.data', 1)
        ->where('logs.data.0.action', 'password.reset')
    );
});

test('user can export audit logs as CSV stream', function () {
    OrganizationAuditLog::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'event_category' => 'security',
        'action' => 'two_factor.enabled',
        'resource_type' => 'user',
        'resource_id' => (string) $this->user->id,
        'ip_address' => '10.0.0.1',
        'status' => 'success',
        'changes' => ['method' => 'totp_app'],
    ]);

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/audit-logs/export');

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
    expect($response->headers->get('Content-Disposition'))->toContain('attachment; filename=');
});

test('audit log service records activity and captures changes diff', function () {
    $service = app(AuditLogService::class);

    $log = $service->log(
        $this->org,
        $this->user,
        'data_change',
        'project.archived',
        'project',
        'PRJ-123',
        ['status' => 'archived', 'reason' => 'Quarter Completed'],
        'success'
    );

    expect($log)->not->toBeNull();
    expect($log->event_category)->toBe('data_change');
    expect($log->action)->toBe('project.archived');
    expect($log->changes)->toBe(['status' => 'archived', 'reason' => 'Quarter Completed']);
    expect(OrganizationAuditLog::where('id', $log->id)->exists())->toBeTrue();
});
