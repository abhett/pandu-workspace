<?php

use App\Models\DistributedTrace;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\ServiceNode;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'SRE Cloud Org']);

    $this->sreUser = User::factory()->create(['name' => 'SRE Engineer', 'email' => 'sre.engineer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->sreUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest.observer@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view distributed tracing dashboard with topology and kpis', function () {
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/traces')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/sre/traces')
            ->has('organization')
            ->has('kpi')
            ->has('topology')
            ->has('service_nodes')
            ->has('traces')
            ->has('services_list')
            ->has('filters')
        );
});

test('dashboard seeds default service mesh nodes and sample traces on initial load', function () {
    expect(ServiceNode::where('organization_id', $this->org->id)->count())->toBe(0);
    expect(DistributedTrace::where('organization_id', $this->org->id)->count())->toBe(0);

    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/traces')
        ->assertOk();

    expect(ServiceNode::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(4);
    expect(DistributedTrace::where('organization_id', $this->org->id)->count())->toBeGreaterThanOrEqual(3);
});

test('user can filter distributed traces by service, status, and duration', function () {
    // First trigger initial seeding
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/traces')
        ->assertOk();

    // Create a specific high duration error trace
    DistributedTrace::create([
        'organization_id' => $this->org->id,
        'trace_id' => 'trace_payment_fail_9988',
        'root_service' => 'payment-gateway',
        'root_operation' => 'POST /api/v1/charge/capture',
        'http_method' => 'POST',
        'http_status_code' => 500,
        'total_duration_ms' => 3500.50,
        'span_count' => 8,
        'error_count' => 2,
        'status' => 'error',
        'spans' => [
            ['id' => 'span_1', 'name' => 'charge', 'duration_ms' => 3500.5, 'status' => 'ERROR'],
        ],
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/sre/traces?service=payment-gateway&status=error&min_duration=3000')
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('organization/sre/traces')
        ->where('filters.service', 'payment-gateway')
        ->where('filters.status', 'error')
        ->has('traces', 1)
        ->where('traces.0.trace_id', 'trace_payment_fail_9988')
    );
});

test('user can simulate and record a new distributed trace with multi-span waterfall', function () {
    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/traces', [
            'scenario' => 'ai_inference_pipeline',
            'root_service' => 'ai-assistant-service',
            'http_method' => 'POST',
            'root_operation' => 'POST /api/v1/ai/generate-insights',
        ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Distributed trace berhasil direkam dan disimulasikan.',
        ]);

    $trace = DistributedTrace::where('organization_id', $this->org->id)
        ->where('root_service', 'ai-assistant-service')
        ->first();

    expect($trace)->not->toBeNull();
    expect($trace->root_operation)->toBe('POST /api/v1/ai/generate-insights');
    expect($trace->http_method)->toBe('POST');
    expect($trace->spans)->toBeArray();
    expect(count($trace->spans))->toBeGreaterThan(0);
});

test('user can view detailed waterfall and span tree of a specific trace', function () {
    $trace = DistributedTrace::create([
        'organization_id' => $this->org->id,
        'trace_id' => 'trace_doc_export_123',
        'root_service' => 'report-generator',
        'root_operation' => 'POST /api/v1/exports/pdf',
        'http_method' => 'POST',
        'http_status_code' => 200,
        'total_duration_ms' => 240.2,
        'span_count' => 3,
        'error_count' => 0,
        'status' => 'ok',
        'spans' => [
            ['id' => 'span_root', 'name' => 'POST /pdf', 'duration_ms' => 240.2, 'status' => 'OK'],
            ['id' => 'span_db', 'name' => 'SELECT metrics', 'duration_ms' => 45.0, 'status' => 'OK'],
            ['id' => 'span_render', 'name' => 'Render PDF', 'duration_ms' => 195.2, 'status' => 'OK'],
        ],
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/sre/traces/{$trace->id}");

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'trace' => [
                'id' => $trace->id,
                'trace_id' => 'trace_doc_export_123',
                'root_service' => 'report-generator',
            ],
        ]);
});

test('user can delete a trace record', function () {
    $trace = DistributedTrace::create([
        'organization_id' => $this->org->id,
        'trace_id' => 'trace_to_delete_5544',
        'root_service' => 'auth-service',
        'root_operation' => 'POST /oauth/token',
        'http_method' => 'POST',
        'http_status_code' => 200,
        'total_duration_ms' => 45.0,
        'span_count' => 2,
        'error_count' => 0,
        'status' => 'ok',
        'spans' => [],
    ]);

    $response = $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/traces/{$trace->id}");

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Trace record berhasil dihapus.',
        ]);

    expect(DistributedTrace::find($trace->id))->toBeNull();
});

test('guest user cannot simulate or delete distributed traces', function () {
    $simulateResponse = $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/sre/traces', [
            'scenario' => 'checkout_flow',
        ]);

    $simulateResponse->assertForbidden();

    $trace = DistributedTrace::create([
        'organization_id' => $this->org->id,
        'trace_id' => 'trace_protected_guest',
        'root_service' => 'api-gateway',
        'root_operation' => 'GET /healthz',
        'http_method' => 'GET',
        'http_status_code' => 200,
        'total_duration_ms' => 5.0,
        'span_count' => 1,
        'error_count' => 0,
        'status' => 'ok',
        'spans' => [],
    ]);

    $deleteResponse = $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/traces/{$trace->id}");

    $deleteResponse->assertForbidden();
});

test('multi-tenant isolation prevents cross-organization trace access or deletion', function () {
    $otherOrg = Organization::factory()->create(['name' => 'Target Other Org']);
    $otherTrace = DistributedTrace::create([
        'organization_id' => $otherOrg->id,
        'trace_id' => 'trace_other_org_secret',
        'root_service' => 'secret-vault',
        'root_operation' => 'GET /keys',
        'http_method' => 'GET',
        'http_status_code' => 200,
        'total_duration_ms' => 10.0,
        'span_count' => 1,
        'error_count' => 0,
        'status' => 'ok',
        'spans' => [],
    ]);

    // SRE user in Org A cannot view trace from Org B
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson("/organization/sre/traces/{$otherTrace->id}")
        ->assertNotFound();

    // SRE user in Org A cannot delete trace from Org B
    $this->actingAs($this->sreUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/organization/sre/traces/{$otherTrace->id}")
        ->assertNotFound();

    expect(DistributedTrace::find($otherTrace->id))->not->toBeNull();
});
