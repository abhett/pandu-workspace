<?php

use App\Models\Organization;
use App\Models\OrganizationInvoice;
use App\Models\OrganizationMembership;
use App\Models\OrganizationSubscription;
use App\Models\Role;
use App\Models\User;
use App\Services\Billing\BillingService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Finance Director', 'email' => 'finance@example.com']);
    $this->org = Organization::factory()->create(['name' => 'SaaS Global Enterprise']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view billing dashboard with subscription overview and usage metrics', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/organization/billing');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('organization/billing')
        ->has('subscription')
        ->has('usage')
        ->has('invoices')
    );

    $sub = OrganizationSubscription::where('organization_id', $this->org->id)->first();
    expect($sub)->not->toBeNull();
    expect($sub->plan_tier)->toBe('enterprise');

    $invCount = OrganizationInvoice::where('organization_id', $this->org->id)->count();
    expect($invCount)->toBeGreaterThan(0);
});

test('user can switch subscription plan tier and cycle', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/billing/plan', [
            'plan_tier' => 'pro',
            'billing_cycle' => 'monthly',
        ]);

    $response->assertOk();
    $sub = OrganizationSubscription::where('organization_id', $this->org->id)->first();
    expect($sub->plan_tier)->toBe('pro');
    expect($sub->billing_cycle)->toBe('monthly');
    expect($sub->seat_limit)->toBe(25);
    expect($sub->storage_limit_gb)->toBe(50);
});

test('user can update payment method and billing email', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/organization/billing/payment-method', [
            'payment_method_brand' => 'Visa',
            'payment_method_last4' => '8888',
            'billing_email' => 'invoicing@saasglobal.com',
        ]);

    $response->assertOk();
    $sub = OrganizationSubscription::where('organization_id', $this->org->id)->first();
    expect($sub->payment_method_brand)->toBe('Visa');
    expect($sub->payment_method_last4)->toBe('8888');
    expect($sub->billing_email)->toBe('invoicing@saasglobal.com');
});

test('user can download invoice receipt', function () {
    $service = app(BillingService::class);
    $sub = $service->getOrCreateSubscription($this->org);
    $invoice = OrganizationInvoice::where('organization_id', $this->org->id)->first();

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get("/organization/billing/invoices/{$invoice->id}/download");

    $response->assertOk();
    expect($response->getContent())->toContain($invoice->invoice_number);
    expect($response->getContent())->toContain('Faktur Penagihan');
});
