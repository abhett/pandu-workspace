<?php

use App\Models\OncallPagingLog;
use App\Models\OncallSchedule;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Sre\OncallScheduleService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE OnCall Org']);

    $this->sreLead = User::factory()->create(['name' => 'SRE Lead', 'email' => 'srelead@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreLead->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest SRE', 'email' => 'guest_sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view oncall dashboard', function () {
    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/oncall')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/oncall')
            ->has('metrics')
            ->has('schedules')
            ->has('paging_logs')
            ->has('org_members')
        );
});

test('dashboard seeds default oncall schedules on first visit', function () {
    expect(OncallSchedule::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/oncall')
        ->assertOk();

    expect(OncallSchedule::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(2);
    expect(OncallPagingLog::whereHas('schedule', fn ($q) => $q->where('organization_id', $this->org->id))->count())->toBeGreaterThanOrEqual(2);
});

test('user can create oncall schedule', function () {
    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/oncall', [
            'name' => 'Database Reliability On-Call',
            'rotation_type' => 'weekly',
            'members' => [
                ['user_id' => $this->sreLead->id, 'name' => $this->sreLead->name, 'email' => $this->sreLead->email, 'order' => 1],
            ],
            'escalation_policy' => [
                ['level' => 1, 'target' => 'Primary DBA', 'timeout_minutes' => 5],
                ['level' => 2, 'target' => 'Secondary DBA', 'timeout_minutes' => 15],
            ],
            'status' => 'active',
        ]);

    $response->assertCreated()->assertJson(['success' => true]);

    $schedule = OncallSchedule::where('name', 'Database Reliability On-Call')->first();
    expect($schedule)->not->toBeNull();
    expect($schedule->rotation_type)->toBe('weekly');
    expect($schedule->status)->toBe('active');
    expect(count($schedule->members))->toBe(1);
});

test('current oncall engineer is resolved correctly', function () {
    $schedule = OncallSchedule::create([
        'organization_id' => $this->org->id,
        'name' => 'API Gateway Rotation',
        'rotation_type' => 'weekly',
        'members' => [
            ['user_id' => $this->sreLead->id, 'name' => 'SRE Lead', 'email' => 'srelead@pandu.com', 'order' => 1],
        ],
        'escalation_policy' => [
            ['level' => 1, 'target' => 'Primary SRE', 'timeout_minutes' => 5],
        ],
        'status' => 'active',
        'started_at' => now()->startOfWeek(),
    ]);

    $service = app(OncallScheduleService::class);
    $oncallInfo = $service->resolveCurrentOncallInfo($schedule);

    expect($oncallInfo['user_id'])->toBe($this->sreLead->id);
    expect($oncallInfo['user_name'])->toBe($this->sreLead->name);
    expect($oncallInfo['shift_ends_at'])->not->toBeNull();
});

test('user can trigger paging event', function () {
    $schedule = OncallSchedule::create([
        'organization_id' => $this->org->id,
        'name' => 'Kafka Streaming Paging',
        'rotation_type' => 'weekly',
        'members' => [
            ['user_id' => $this->sreLead->id, 'name' => 'SRE Lead', 'order' => 1],
        ],
        'status' => 'active',
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/oncall/{$schedule->id}/page", [
            'trigger_reason' => 'Consumer Lag > 100,000 messages on topic orders.created',
            'escalation_level' => 1,
        ]);

    $response->assertCreated()->assertJson(['success' => true]);

    $log = OncallPagingLog::where('oncall_schedule_id', $schedule->id)->first();
    expect($log)->not->toBeNull();
    expect($log->status)->toBe('pending');
    expect($log->escalation_level)->toBe(1);
    expect($log->triggered_by)->toBe($this->sreLead->id);
});

test('user can acknowledge paging', function () {
    $schedule = OncallSchedule::create([
        'organization_id' => $this->org->id,
        'name' => 'Ack Test Schedule',
        'rotation_type' => 'weekly',
        'status' => 'active',
    ]);

    $log = OncallPagingLog::create([
        'oncall_schedule_id' => $schedule->id,
        'triggered_by' => $this->sreLead->id,
        'trigger_reason' => 'Test alert',
        'escalation_level' => 1,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/oncall/logs/{$log->id}/acknowledge");

    $response->assertOk()->assertJson(['success' => true]);

    $log->refresh();
    expect($log->status)->toBe('acknowledged');
    expect($log->responder_user_id)->toBe($this->sreLead->id);
    expect($log->response_time_seconds)->not->toBeNull();
});

test('user can resolve paging', function () {
    $schedule = OncallSchedule::create([
        'organization_id' => $this->org->id,
        'name' => 'Resolve Test Schedule',
        'rotation_type' => 'weekly',
        'status' => 'active',
    ]);

    $log = OncallPagingLog::create([
        'oncall_schedule_id' => $schedule->id,
        'triggered_by' => $this->sreLead->id,
        'trigger_reason' => 'Critical Memory Spike',
        'escalation_level' => 1,
        'status' => 'acknowledged',
    ]);

    $response = $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/oncall/logs/{$log->id}/resolve");

    $response->assertOk()->assertJson(['success' => true]);

    $log->refresh();
    expect($log->status)->toBe('resolved');
    expect($log->resolved_at)->not->toBeNull();
});

test('user can delete oncall schedule', function () {
    $schedule = OncallSchedule::create([
        'organization_id' => $this->org->id,
        'name' => 'Delete Me Schedule',
        'rotation_type' => 'weekly',
        'status' => 'active',
    ]);

    $this->actingAs($this->sreLead)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/oncall/{$schedule->id}")
        ->assertOk()
        ->assertJson(['success' => true]);

    expect(OncallSchedule::where('id', $schedule->id)->exists())->toBeFalse();
});

test('guest role forbidden from managing oncall', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/oncall', [
            'name' => 'Unauthorized Schedule',
            'rotation_type' => 'weekly',
        ])
        ->assertForbidden();
});
