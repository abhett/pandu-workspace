<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\WikiPage;
use App\Models\WikiPageRevision;
use App\Models\WikiSpace;
use App\Services\Wiki\WikiService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Lead Architect', 'email' => 'architect@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Kinetic Tech Space']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view wiki index and auto-initializes default documentation space', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/wiki');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('wiki/index')
        ->has('spaces', 1)
        ->has('favorites', 1)
        ->has('active_page')
    );

    expect(WikiSpace::where('organization_id', $this->org->id)->count())->toBe(1);
    expect(WikiPage::whereHas('space', fn ($q) => $q->where('organization_id', $this->org->id))->count())->toBe(1);
});

test('user can create a new wiki space and wiki page', function () {
    // Create Space
    $spaceResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/wiki/spaces', [
            'name' => 'Engineering Architecture',
            'description' => 'System architectural decision records and runbooks.',
        ]);

    $spaceResponse->assertOk();
    $spaceResponse->assertJson(['success' => true]);

    $space = WikiSpace::where('name', 'Engineering Architecture')->first();
    expect($space)->not->toBeNull();

    // Create Page in Space
    $pageResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/wiki/spaces/{$space->id}/pages", [
            'title' => 'ADR 001 - Microservices Architecture',
            'content' => '# ADR 001\n\nWe decide to use microservices architecture.',
        ]);

    $pageResponse->assertOk();
    $pageResponse->assertJson(['success' => true]);

    $page = WikiPage::where('title', 'ADR 001 - Microservices Architecture')->first();
    expect($page)->not->toBeNull();
    expect($page->version)->toBe(1);
    expect(WikiPageRevision::where('wiki_page_id', $page->id)->count())->toBe(1);
});

test('user can update a wiki page and increment revision version snapshot', function () {
    $service = app(WikiService::class);
    $space = WikiSpace::create([
        'organization_id' => $this->org->id,
        'name' => 'Product Specs',
        'slug' => 'product-specs',
        'created_by' => $this->user->id,
    ]);

    $page = $service->createPage($space, $this->user, [
        'title' => 'Initial PRD Draft',
        'content' => '# Initial PRD',
    ]);

    expect($page->version)->toBe(1);

    // Update Page
    $updateResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson("/wiki/pages/{$page->id}", [
            'title' => 'Final Approved PRD',
            'content' => '# Final PRD\n\nApproved by management.',
        ]);

    $updateResponse->assertOk();
    $page->refresh();

    expect($page->title)->toBe('Final Approved PRD');
    expect($page->version)->toBe(2);
    expect(WikiPageRevision::where('wiki_page_id', $page->id)->count())->toBe(2);
});

test('user can toggle favorite on a wiki page and delete a wiki page', function () {
    $service = app(WikiService::class);
    $space = WikiSpace::create([
        'organization_id' => $this->org->id,
        'name' => 'Operations',
        'slug' => 'operations',
        'created_by' => $this->user->id,
    ]);

    $page = $service->createPage($space, $this->user, [
        'title' => 'Deployment Runbook',
        'content' => '# Deployment',
        'is_favorite' => false,
    ]);

    // Toggle Favorite
    $favResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson("/wiki/pages/{$page->id}/favorite");

    $favResponse->assertOk();
    $page->refresh();
    expect($page->is_favorite)->toBeTrue();

    // Delete Page
    $deleteResponse = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->deleteJson("/wiki/pages/{$page->id}");

    $deleteResponse->assertOk();
    expect(WikiPage::where('id', $page->id)->exists())->toBeFalse();
});
