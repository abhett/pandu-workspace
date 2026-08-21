<?php

use App\Models\CloudCostAnomaly;
use App\Models\CloudCostRecommendation;
use App\Models\CloudCostSnapshot;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
    $this->memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();
    $this->guestRole = Role::whereNull('organization_id')->where('slug', 'guest')->first();

    $this->org = Organization::factory()->create(['name' => 'FinOps Enterprise Org']);

    $this->leadUser = User::factory()->create(['name' => 'FinOps Director', 'email' => 'finops@cloud.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->devUser = User::factory()->create(['name' => 'Cloud Engineer', 'email' => 'engineer@cloud.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->devUser->id,
        'role' => 'member',
        'role_id' => $this->memberRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@cloud.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view cloud cost dashboard', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/cloud/costs');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('organization/cloud/costs')
            ->has('metrics')
            ->has('providerDistribution')
            ->has('categoryDistribution')
            ->has('dailyTrend')
            ->has('anomalies')
            ->has('recommendations')
        );

    expect(CloudCostSnapshot::where('organization_id', $this->org->id)->exists())->toBeTrue();
});

test('user can resolve cost anomaly', function () {
    $anomaly = CloudCostAnomaly::create([
        'organization_id' => $this->org->id,
        'provider' => 'aws',
        'service_name' => 'Amazon Aurora PostgreSQL',
        'anomaly_date' => now()->toDateString(),
        'actual_cost' => 250.00,
        'expected_cost' => 50.00,
        'spike_percentage' => 400.0,
        'severity' => 'critical_spike',
        'root_cause_analysis' => 'Long-running analytics job without query limit.',
        'status' => 'unresolved',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/cloud/costs/anomalies/{$anomaly->id}/resolve", [
            'status' => 'resolved',
            'notes' => 'Analytics query rewritten with indexed partitions.',
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    $anomaly->refresh();
    expect($anomaly->status)->toBe('resolved');
    expect($anomaly->resolved_by)->toBe($this->leadUser->id);
    expect($anomaly->resolution_notes)->toBe('Analytics query rewritten with indexed partitions.');
});

test('user can apply cost recommendation', function () {
    $rec = CloudCostRecommendation::create([
        'organization_id' => $this->org->id,
        'provider' => 'gcp',
        'title' => 'Downgrade Idle Cloud Run Instances',
        'description' => 'Scale minimum instances to 0 during non-business hours.',
        'resource_id' => 'cr-staging-api',
        'action_type' => 'rightsize',
        'estimated_monthly_savings' => 140.00,
        'currency' => 'USD',
        'status' => 'open',
    ]);

    $response = $this->actingAs($this->devUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/cloud/costs/recommendations/{$rec->id}/apply");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $rec->refresh();
    expect($rec->status)->toBe('applied');
    expect($rec->applied_by)->toBe($this->devUser->id);
});

test('user can dismiss cost recommendation', function () {
    $rec = CloudCostRecommendation::create([
        'organization_id' => $this->org->id,
        'provider' => 'aws',
        'title' => 'Turn off NAT Gateway in Test VPC',
        'description' => 'Test VPC traffic is zero.',
        'resource_id' => 'nat-012345',
        'action_type' => 'terminate_idle',
        'estimated_monthly_savings' => 35.00,
        'currency' => 'USD',
        'status' => 'open',
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/cloud/costs/recommendations/{$rec->id}/dismiss");

    $response->assertOk()
        ->assertJson(['success' => true]);

    $rec->refresh();
    expect($rec->status)->toBe('dismissed');
});

test('guest role forbidden from modifying cloud costs', function () {
    $rec = CloudCostRecommendation::create([
        'organization_id' => $this->org->id,
        'provider' => 'aws',
        'title' => 'Test Rec',
        'description' => 'Test description',
        'action_type' => 'rightsize',
        'estimated_monthly_savings' => 50.00,
        'status' => 'open',
    ]);

    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/organization/cloud/costs/recommendations/{$rec->id}/apply")
        ->assertForbidden();
});
