<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\SearchHistory;
use App\Models\Task;
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

    $this->org = Organization::factory()->create(['name' => 'OmniSearch Org']);

    $this->leadUser = User::factory()->create(['name' => 'Search Master', 'email' => 'search@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->guestUser = User::factory()->create(['name' => 'Guest Observer', 'email' => 'guest@pandu.com']);
    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->guestUser->id,
        'role' => 'guest',
        'role_id' => $this->guestRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = Project::factory()->create([
        'organization_id' => $this->org->id,
        'name' => 'Payments Gateway Microservice',
        'description' => 'Handles secure credit card checkout and recurring invoices',
    ]);

    $this->task = Task::factory()->create([
        'project_id' => $this->project->id,
        'title' => 'Integrate Stripe Webhook Handler',
        'description' => 'Fix signature verification for invoice.payment_succeeded events',
    ]);
});

test('user can view search omnibar page', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/search/omnibar');

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('search/omnibar')
            ->has('metrics')
            ->has('counts')
            ->has('recentSearches')
            ->has('trendingQueries')
        );
});

test('user can perform live multi entity search', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson('/search/omnibar/query?q=Payments');

    $response->assertOk()
        ->assertJson(['success' => true])
        ->assertJsonPath('query', 'Payments');

    $results = $response->json('results');
    expect(count($results))->toBeGreaterThan(0);
    expect($results[0]['title'])->toContain('Payments Gateway Microservice');
});

test('user can search task entities', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->getJson('/search/omnibar/query?q=Stripe&category=tasks');

    $response->assertOk()
        ->assertJson(['success' => true]);

    $results = $response->json('results');
    expect(count($results))->toBeGreaterThan(0);
    expect($results[0]['category'])->toBe('tasks');
    expect($results[0]['title'])->toContain('Stripe Webhook');
});

test('user can record search click', function () {
    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/search/omnibar/click', [
            'query' => 'Stripe',
            'clicked_entity_type' => 'tasks',
            'clicked_entity_id' => (string) $this->task->id,
        ]);

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(SearchHistory::where('organization_id', $this->org->id)
        ->where('query', 'Stripe')
        ->where('clicked_entity_id', (string) $this->task->id)
        ->exists()
    )->toBeTrue();
});

test('user can clear search history', function () {
    SearchHistory::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->leadUser->id,
        'query' => 'old test query',
        'results_count' => 5,
    ]);

    $response = $this->actingAs($this->leadUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/search/omnibar/clear');

    $response->assertOk()
        ->assertJson(['success' => true]);

    expect(SearchHistory::where('organization_id', $this->org->id)
        ->where('user_id', $this->leadUser->id)
        ->exists()
    )->toBeFalse();
});

test('guest role can search accessible entities', function () {
    $this->actingAs($this->guestUser)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/search/omnibar')
        ->assertOk();
});
