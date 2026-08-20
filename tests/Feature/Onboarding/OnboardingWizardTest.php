<?php

use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create([
        'name' => 'Founder Alpha',
        'email' => 'founder@alpha.com',
    ]);
});

test('user can view onboarding wizard page', function () {
    $response = $this->actingAs($this->user)
        ->get('/onboarding');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('onboarding/wizard')
        ->has('user.name')
    );
});

test('user can complete full onboarding wizard payload', function () {
    $response = $this->actingAs($this->user)
        ->post('/onboarding/complete', [
            'org_name' => 'Nusantara Global Tech',
            'methodology' => 'scrum',
            'project_name' => 'Mobile Banking App',
            'project_key' => 'MBA',
            'project_description' => 'Aplikasi perbankan mobile generasi baru.',
            'invites' => [
                ['email' => 'lead.dev@example.com', 'role' => 'admin'],
            ],
            'ai_provider' => 'gemini',
        ]);

    $response->assertRedirect('/dashboard');

    $this->assertDatabaseHas('organizations', [
        'name' => 'Nusantara Global Tech',
    ]);

    $this->assertDatabaseHas('projects', [
        'name' => 'Mobile Banking App',
        'key' => 'MBA',
        'lead_user_id' => $this->user->id,
    ]);

    $this->assertDatabaseHas('user_ai_preferences', [
        'user_id' => $this->user->id,
        'default_model' => 'gemini',
    ]);
});
