<?php

use App\Models\IncidentRunbook;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\RunbookExecution;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE Ops Org']);

    $this->sreUser = User::factory()->create(['name' => 'SRE Lead', 'email' => 'sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest User', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view incident runbooks dashboard', function () {
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/runbooks')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/runbooks')
            ->has('metrics')
            ->has('runbooks')
            ->has('executions')
            ->has('categories')
        );
});

test('dashboard seeds default operational playbooks on first visit', function () {
    expect(IncidentRunbook::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/runbooks')
        ->assertOk();

    expect(IncidentRunbook::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(4);
});

test('user can create a custom incident remediation runbook', function () {
    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/runbooks', [
            'title' => 'Emergency Kubernetes Worker Evacuation Playbook',
            'description' => 'Evakuasi node worker yang mengalami memory leak tinggi ke cluster cadangan.',
            'category' => 'scaling',
            'severity' => 'critical',
            'estimated_duration_minutes' => 8,
            'is_automated' => true,
            'steps' => [
                [
                    'id' => 'step_1',
                    'title' => 'Cordon & Drain Node Worker',
                    'type' => 'automated_script',
                    'action_command' => 'kubectl cordon node-prod-04 && kubectl drain node-prod-04 --ignore-daemonsets',
                    'timeout_seconds' => 60,
                ],
                [
                    'id' => 'step_2',
                    'title' => 'Persetujuan SRE Lead untuk Evakuasi Pods',
                    'type' => 'approval_gate',
                    'action_command' => 'approval:sre_lead_evacuation',
                    'timeout_seconds' => 120,
                ],
            ],
            'parameters' => [
                [
                    'key' => 'node_name',
                    'label' => 'Nama Worker Node',
                    'type' => 'string',
                    'default' => 'node-prod-04',
                    'required' => true,
                ],
            ],
        ]);

    $response->assertCreated()->assertJson(['success' => true]);

    $runbook = IncidentRunbook::where('title', 'Emergency Kubernetes Worker Evacuation Playbook')->first();
    expect($runbook)->not->toBeNull();
    expect($runbook->category)->toBe('scaling');
    expect($runbook->severity)->toBe('critical');
    expect($runbook->steps)->toHaveCount(2);
    expect($runbook->is_automated)->toBeTrue();
});

test('user can execute an incident runbook and record execution audit logs', function () {
    $runbook = IncidentRunbook::create([
        'organization_id' => $this->org->id,
        'title' => 'Flush Redis Hot Cache Playbook',
        'slug' => 'flush-redis-hot-cache-playbook',
        'category' => 'cache',
        'severity' => 'high',
        'estimated_duration_minutes' => 3,
        'is_automated' => true,
        'steps' => [
            [
                'id' => 'step_1',
                'title' => 'Verifikasi Redis Memory Usage',
                'type' => 'automated_script',
                'action_command' => 'redis-cli info memory',
                'timeout_seconds' => 15,
            ],
            [
                'id' => 'step_2',
                'title' => 'Purge Invalidation Cache Key',
                'type' => 'automated_script',
                'action_command' => 'redis-cli EVAL "return redis.call(\'del\', unpack(redis.call(\'keys\', ARGV[1])))" 0 "session:*"',
                'timeout_seconds' => 30,
            ],
        ],
        'total_runs' => 0,
        'successful_runs' => 0,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/runbooks/{$runbook->id}/execute", [
            'execution_params' => [
                'cache_cluster' => 'redis-master-cluster',
                'dry_run' => false,
            ],
            'trigger_type' => 'manual',
        ]);

    $response->assertOk()->assertJson(['success' => true]);

    $runbook->refresh();
    expect($runbook->total_runs)->toBe(1);
    expect($runbook->last_executed_at)->not->toBeNull();

    $execution = RunbookExecution::where('incident_runbook_id', $runbook->id)->first();
    expect($execution)->not->toBeNull();
    expect($execution->status)->toBe('completed');
    expect($execution->executed_by_user_id)->toBe($this->sreUser->id);
    expect($execution->step_results)->toHaveCount(2);
    expect($execution->total_duration_ms)->toBeGreaterThan(0);
});

test('user can delete an incident runbook', function () {
    $runbook = IncidentRunbook::create([
        'organization_id' => $this->org->id,
        'title' => 'Obsolete Deprecated Playbook',
        'slug' => 'obsolete-deprecated-playbook',
        'category' => 'database',
        'severity' => 'low',
    ]);

    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/runbooks/{$runbook->id}")
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(IncidentRunbook::find($runbook->id))->toBeNull();
});

test('guest user cannot create, execute, or delete incident runbooks', function () {
    $runbook = IncidentRunbook::create([
        'organization_id' => $this->org->id,
        'title' => 'Protected SRE Playbook',
        'slug' => 'protected-sre-playbook',
        'category' => 'networking',
        'severity' => 'high',
    ]);

    // Guest cannot create
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/runbooks', [
            'title' => 'Unauthorized Playbook',
            'category' => 'networking',
            'severity' => 'low',
        ])
        ->assertForbidden();

    // Guest cannot execute
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/runbooks/{$runbook->id}/execute", [])
        ->assertForbidden();

    // Guest cannot delete
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/runbooks/{$runbook->id}")
        ->assertForbidden();
});

test('cross-tenant isolation protects runbooks', function () {
    $otherOrg = Organization::factory()->create(['name' => 'Other Security Org']);

    $otherRunbook = IncidentRunbook::create([
        'organization_id' => $otherOrg->id,
        'title' => 'Other Org Private Playbook',
        'slug' => 'other-org-private-playbook',
        'category' => 'deployment',
        'severity' => 'critical',
    ]);

    // User from $this->org attempting to execute other org's runbook gets 404
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/runbooks/{$otherRunbook->id}/execute", [])
        ->assertNotFound();

    // User from $this->org attempting to delete other org's runbook gets 404
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/runbooks/{$otherRunbook->id}")
        ->assertNotFound();
});
