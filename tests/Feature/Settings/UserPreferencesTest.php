<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\User;
use App\Models\UserAiPreference;
use App\Models\UserRegionalPreference;
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
        'name' => 'Alex Rivera',
        'email' => 'alex@example.com',
        'email_verified_at' => now(),
    ]);

    $this->org = Organization::factory()->create(['name' => 'Kinetic Dev Studio']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);
});

test('user can view personal ai preferences page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/settings/ai-preferences');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/ai-preferences')
        ->has('ai_preferences')
    );

    $pref = UserAiPreference::where('user_id', $this->user->id)->first();
    expect($pref)->not->toBeNull();
    expect($pref->default_model)->toBe('gemini');
});

test('user can update personal ai preferences', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/settings/ai-preferences', [
            'default_model' => 'claude3',
            'context_window' => 90,
            'tone_style' => 60,
            'custom_system_prompt' => 'Always format responses with bullet points.',
            'auto_summarize_notifications' => true,
            'inline_suggestions' => true,
            'suggestion_density' => 'high',
            'model_training_opt_in' => false,
        ]);

    $response->assertOk();
    $pref = UserAiPreference::where('user_id', $this->user->id)->first();
    expect($pref->default_model)->toBe('claude3');
    expect($pref->context_window)->toBe(90);
    expect($pref->tone_style)->toBe(60);
    expect($pref->custom_system_prompt)->toBe('Always format responses with bullet points.');
    expect($pref->suggestion_density)->toBe('high');
});

test('user can view language and timezone preferences page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/settings/language-timezone');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/language-timezone')
        ->has('regional_preferences')
    );

    $pref = UserRegionalPreference::where('user_id', $this->user->id)->first();
    expect($pref)->not->toBeNull();
    expect($pref->language)->toBe('id');
});

test('user can update language and timezone preferences', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->putJson('/settings/language-timezone', [
            'language' => 'en',
            'date_format' => 'YYYY-MM-DD',
            'number_format' => 'US',
            'first_day_of_week' => 0,
            'timezone' => 'America/New_York',
            'time_format_24h' => false,
        ]);

    $response->assertOk();
    $pref = UserRegionalPreference::where('user_id', $this->user->id)->first();
    expect($pref->language)->toBe('en');
    expect($pref->date_format)->toBe('YYYY-MM-DD');
    expect($pref->number_format)->toBe('US');
    expect($pref->first_day_of_week)->toBe(0);
    expect($pref->timezone)->toBe('America/New_York');
    expect($pref->time_format_24h)->toBeFalse();

    $this->user->refresh();
    expect($this->user->locale)->toBe('en');
    expect($this->user->timezone)->toBe('America/New_York');
});
