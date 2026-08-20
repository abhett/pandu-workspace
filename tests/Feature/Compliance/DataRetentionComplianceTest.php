<?php

use App\Models\Organization;
use App\Models\OrganizationComplianceExport;
use App\Models\OrganizationMembership;
use App\Models\OrganizationRetentionPolicy;
use App\Models\Project;
use App\Models\Role;
use App\Models\Task;
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
        'name' => 'Compliance Officer',
        'email' => 'compliance@example.com',
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Compliance Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view data retention and compliance dashboard', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/data-retention');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/data-retention')
        ->has('policy')
        ->has('exports')
    );

    $policy = OrganizationRetentionPolicy::where('organization_id', $this->org->id)->first();
    expect($policy)->not->toBeNull();
    expect($policy->audit_logs_retention_days)->toBe(365);
});

test('user can update data retention policy', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/organization/data-retention/policy', [
            'audit_logs_retention_days' => 90,
            'deleted_tasks_retention_days' => 14,
            'orphan_attachments_retention_days' => 7,
            'auto_purge_enabled' => false,
        ]);

    $response->assertOk();
    $policy = OrganizationRetentionPolicy::where('organization_id', $this->org->id)->first();
    expect($policy->audit_logs_retention_days)->toBe(90);
    expect($policy->deleted_tasks_retention_days)->toBe(14);
    expect($policy->orphan_attachments_retention_days)->toBe(7);
    expect($policy->auto_purge_enabled)->toBeFalse();
});

test('user can execute on-demand purge of expired deleted records with confirmation', function () {
    // Seed project & soft-deleted task
    $project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'lead_user_id' => $this->user->id,
        'key' => 'RET',
    ]);

    $task = Task::factory()->create([
        'organization_id' => $this->org->id,
        'project_id' => $project->id,
        'created_by' => $this->user->id,
    ]);

    // Soft delete task and set deleted_at to 60 days ago
    $task->delete();
    $task->deleted_at = now()->subDays(60);
    $task->save();

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/data-retention/purge', [
            'confirmation' => 'PURGE-EXPIRED-DATA',
        ]);

    $response->assertOk();
    $response->assertJsonStructure([
        'success',
        'message',
        'summary',
    ]);

    // Verify task is permanently deleted
    $existsInTrash = Task::onlyTrashed()->where('id', $task->id)->exists();
    expect($existsInTrash)->toBeFalse();
});

test('user can request and download gdpr compliance data export', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/data-retention/export');

    $response->assertOk();
    $export = OrganizationComplianceExport::where('organization_id', $this->org->id)->first();
    expect($export)->not->toBeNull();
    expect($export->export_type)->toBe('gdpr_full');
    expect($export->status)->toBe('completed');

    $dlResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/organization/data-retention/exports/{$export->id}/download");

    $dlResponse->assertOk();
});
