<?php

use App\Models\AiUsageLog;
use App\Models\Organization;
use App\Models\OrganizationAiSetting;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Services\Ai\AiGatewayService;
use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Redaction\RedactionService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->gateway = app(AiGatewayService::class);
});

test('redaction service successfully removes emails, api keys, and phone numbers', function () {
    $redactor = new RedactionService;

    $input = 'Hubungi admin di john.doe@pandu.id atau 081234567890 dengan sk-abcdef1234567890abcdef123456.';
    $redacted = $redactor->redact($input);

    expect($redacted)->toContain('[EMAIL_REDACTED]');
    expect($redacted)->toContain('[PHONE_REDACTED]');
    expect($redacted)->toContain('[SECRET_REDACTED]');
    expect($redacted)->not->toContain('john.doe@pandu.id');
    expect($redacted)->not->toContain('081234567890');
    expect($redacted)->not->toContain('sk-abcdef1234567890abcdef123456');
});

test('ai gateway executes request using mock provider and records usage logs', function () {
    $request = new AiRequest(
        organization: $this->organization,
        user: $this->user,
        capability: 'task_breakdown',
        prompt: 'Pecah tugas autentikasi multi-faktor.',
        jsonSchema: ['type' => 'object']
    );

    $response = $this->gateway->execute($request);

    expect($response->success)->toBeTrue();
    expect($response->provider)->toBe('mock');
    expect($response->totalTokens)->toBeGreaterThan(0);
    expect($response->structuredData)->toHaveKey('suggested_subtasks');

    // Verify usage log in DB
    $log = AiUsageLog::where('organization_id', $this->organization->id)->first();
    expect($log)->not->toBeNull();
    expect($log->capability)->toBe('task_breakdown');
    expect($log->status)->toBe('success');
    expect($log->total_tokens)->toBe($response->totalTokens);

    // Verify token accumulation in organization settings
    $setting = OrganizationAiSetting::where('organization_id', $this->organization->id)->first();
    expect($setting->current_month_tokens_used)->toBe($response->totalTokens);
});

test('ai gateway enforces monthly token budget limit', function () {
    // Set budget to 100 tokens and current usage to 100
    OrganizationAiSetting::create([
        'organization_id' => $this->organization->id,
        'default_provider' => 'mock',
        'default_model' => 'gpt-4o-mini',
        'monthly_token_budget' => 100,
        'current_month_tokens_used' => 100,
        'is_enabled' => true,
    ]);

    $request = new AiRequest(
        organization: $this->organization,
        user: $this->user,
        capability: 'sprint_summary',
        prompt: 'Ringkas sprint ini.',
        jsonSchema: ['type' => 'object']
    );

    $response = $this->gateway->execute($request);

    expect($response->success)->toBeFalse();
    expect($response->status)->toBe('budget_exceeded');

    $log = AiUsageLog::where('organization_id', $this->organization->id)
        ->where('status', 'budget_exceeded')
        ->first();
    expect($log)->not->toBeNull();
});

test('organization owner can view and update ai settings via web', function () {
    session(['current_organization_id' => $this->organization->id]);

    $response = $this->actingAs($this->user)->get('/organization/ai-settings');
    $response->assertOk();

    $updateResponse = $this->actingAs($this->user)->put('/organization/ai-settings', [
        'default_provider' => 'openai',
        'openai_api_key' => 'sk-test-secret-key-12345678901234567890',
        'default_model' => 'gpt-4o',
        'monthly_token_budget' => 1000000,
        'is_enabled' => true,
    ]);

    $updateResponse->assertRedirect();

    $setting = OrganizationAiSetting::where('organization_id', $this->organization->id)->first();
    expect($setting->default_provider)->toBe('openai');
    expect($setting->default_model)->toBe('gpt-4o');
    expect($setting->monthly_token_budget)->toBe(1000000);
    expect($setting->openai_api_key)->toBe('sk-test-secret-key-12345678901234567890');
});
