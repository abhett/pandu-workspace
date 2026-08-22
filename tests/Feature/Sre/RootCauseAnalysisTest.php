<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\RcaActionItem;
use App\Models\Role;
use App\Models\RootCauseAnalysis;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE Enterprise Org']);

    $this->sreUser = User::factory()->create(['name' => 'Lead SRE', 'email' => 'lead.sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest SRE Observer', 'email' => 'guest.sre@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view root cause analysis dashboard with kpis and categories', function () {
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/rca')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/rca')
            ->has('organization')
            ->has('kpi')
            ->has('category_breakdown')
            ->has('analyses')
            ->has('action_items')
            ->has('recent_traces')
            ->has('filters')
        );
});

test('dashboard seeds demo rca investigation on initial empty load', function () {
    expect(RootCauseAnalysis::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/rca')
        ->assertOk();

    expect(RootCauseAnalysis::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(1);
    expect(RcaActionItem::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(1);
});

test('user can run ai outage diagnosis for database connection pool exhaustion', function () {
    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/rca/analyze', [
            'scenario' => 'db_connection_pool_exhaustion',
            'custom_title' => 'Postgres Pool Exhaustion During Batch Billing',
        ]);

    $response->assertCreated()
        ->assertJson([
            'success' => true,
            'message' => 'AI Automated Root Cause Analysis & Post-Mortem berhasil dihasilkan.',
        ]);

    $rca = RootCauseAnalysis::where('organization_id', $this->org->id)
        ->where('primary_cause_category', 'database_bottleneck')
        ->first();

    expect($rca)->not->toBeNull();
    expect($rca->title)->toBe('Postgres Pool Exhaustion During Batch Billing');
    expect($rca->severity)->toBe('critical');
    expect($rca->five_whys)->toBeArray();
    expect(count($rca->five_whys))->toBe(5);
    expect($rca->blast_radius)->toBeArray();
    expect($rca->blast_radius['affected_users_count'])->toBeGreaterThan(0);
});

test('user can view rca details and post-mortem report via json', function () {
    $rca = RootCauseAnalysis::create([
        'organization_id' => $this->org->id,
        'incident_id' => 'INC-TEST99',
        'title' => 'Test Outage Investigation',
        'status' => 'completed',
        'severity' => 'high',
        'primary_cause_category' => 'network_timeout',
        'confidence_score' => 95.0,
        'impact_summary' => 'Test summary',
        'created_by' => $this->sreUser->id,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/sre/rca/{$rca->id}");

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'rca' => [
                'id' => $rca->id,
                'incident_id' => 'INC-TEST99',
                'title' => 'Test Outage Investigation',
            ],
        ]);
});

test('sre lead can verify rca analysis and adjust confidence score', function () {
    $rca = RootCauseAnalysis::create([
        'organization_id' => $this->org->id,
        'incident_id' => 'INC-VERIFY1',
        'title' => 'Unverified Anomaly Investigation',
        'status' => 'completed',
        'severity' => 'medium',
        'primary_cause_category' => 'code_defect',
        'confidence_score' => 88.0,
        'created_by' => $this->sreUser->id,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/rca/{$rca->id}/verify", [
            'adjusted_confidence' => 99.0,
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Analisis Root Cause telah diverifikasi oleh SRE Lead.',
        ]);

    $rca->refresh();
    expect($rca->status)->toBe('verified');
    expect((float) $rca->confidence_score)->toBe(99.0);
    expect($rca->verified_by)->toBe($this->sreUser->id);
    expect($rca->verified_at)->not->toBeNull();
});

test('user can export post-mortem report in markdown format', function () {
    $rca = RootCauseAnalysis::create([
        'organization_id' => $this->org->id,
        'incident_id' => 'INC-MD-EXPORT',
        'title' => 'Markdown Export Test Outage',
        'status' => 'completed',
        'severity' => 'critical',
        'primary_cause_category' => 'resource_exhaustion',
        'confidence_score' => 97.0,
        'impact_summary' => 'Critical impact summary details',
        'blast_radius' => [
            'affected_users_count' => 1200,
            'affected_tenants_count' => 40,
            'error_rate_spike_pct' => 25.0,
            'latency_p99_ms' => 4000,
            'estimated_revenue_impact_usd' => 5000,
        ],
        'five_whys' => [
            ['level' => 1, 'question' => 'Why 1?', 'answer' => 'Ans 1'],
            ['level' => 2, 'question' => 'Why 2?', 'answer' => 'Ans 2'],
        ],
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/sre/rca/{$rca->id}/export");

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'title',
            'markdown',
        ]);

    expect($response->json('markdown'))->toContain('Post-Mortem Report: Markdown Export Test Outage');
    expect($response->json('markdown'))->toContain('INC-MD-EXPORT');
});

test('user can create and toggle preventative action item', function () {
    $rca = RootCauseAnalysis::create([
        'organization_id' => $this->org->id,
        'incident_id' => 'INC-ACT-01',
        'title' => 'Action Items Test Incident',
        'status' => 'completed',
        'severity' => 'high',
        'primary_cause_category' => 'code_defect',
        'confidence_score' => 90.0,
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/sre/rca/{$rca->id}/action-items", [
            'title' => 'Add Redis Cluster Health Probe Alarm',
            'description' => 'Alarm triggers if memory > 85%',
            'priority' => 'p0',
            'type' => 'monitoring',
        ]);

    $response->assertCreated()
        ->assertJson([
            'success' => true,
            'message' => 'Action item berhasil ditambahkan.',
        ]);

    $actionItem = RcaActionItem::where('root_cause_analysis_id', $rca->id)->first();
    expect($actionItem)->not->toBeNull();
    expect($actionItem->title)->toBe('Add Redis Cluster Health Probe Alarm');
    expect($actionItem->status)->toBe('open');

    // Toggle status to completed
    $updateResponse = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->patchJson("/organization/sre/rca/action-items/{$actionItem->id}", [
            'status' => 'completed',
        ]);

    $updateResponse->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Status action item berhasil diperbarui.',
        ]);

    $actionItem->refresh();
    expect($actionItem->status)->toBe('completed');
    expect($actionItem->completed_at)->not->toBeNull();
});

test('guest role cannot manage or delete rca record', function () {
    $rca = RootCauseAnalysis::create([
        'organization_id' => $this->org->id,
        'incident_id' => 'INC-GUEST-TEST',
        'title' => 'Guest Access Test Incident',
        'status' => 'completed',
        'severity' => 'low',
        'primary_cause_category' => 'config_drift',
        'confidence_score' => 80.0,
    ]);

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->delete("/organization/sre/rca/{$rca->id}")
        ->assertForbidden();

    expect(RootCauseAnalysis::find($rca->id))->not->toBeNull();
});

test('tenant isolation ensures user cannot access rca of another organization', function () {
    $otherOrg = Organization::factory()->create(['name' => 'Foreign Corp']);

    $otherRca = RootCauseAnalysis::create([
        'organization_id' => $otherOrg->id,
        'incident_id' => 'INC-FOREIGN',
        'title' => 'Foreign Incident',
        'status' => 'completed',
        'severity' => 'critical',
        'primary_cause_category' => 'database_bottleneck',
        'confidence_score' => 99.0,
    ]);

    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/sre/rca/{$otherRca->id}")
        ->assertNotFound();
});
