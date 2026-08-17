<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

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

    $this->project = app(ProjectCreationService::class)->create(
        $this->organization,
        $this->user,
        [
            'name' => 'AI Test Project',
            'key' => 'AIT',
            'type' => 'scrum',
        ]
    );

    $this->sprint = Sprint::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'name' => 'Sprint 1 - Core',
        'goal' => 'Menyelesaikan modul AI Gateway',
        'status' => 'active',
        'sequence' => 1,
        'start_date' => now()->startOfDay(),
        'end_date' => now()->addDays(14)->endOfDay(),
        'committed_points' => 20,
        'completed_points' => 15,
        'created_by' => $this->user->id,
    ]);

    $status = $this->project->statuses()->first();

    $this->task = Task::create([
        'organization_id' => $this->organization->id,
        'project_id' => $this->project->id,
        'status_id' => $status->id,
        'sprint_id' => $this->sprint->id,
        'sequence_number' => 1,
        'key' => 'AIT-1',
        'title' => 'Implementasi Autentikasi OAuth2 dan Passkeys',
        'description' => 'Mendukung login via biometrik dan SSO Google Workspace.',
        'type' => 'story',
        'priority' => 'high',
        'estimate_points' => 5,
        'rank' => '0|hzzzzz:',
        'created_by' => $this->user->id,
    ]);
});

test('user can generate AI Sprint Summary via web and API', function () {
    // 1. Web Endpoint
    $webResponse = $this->actingAs($this->user)->postJson(
        "/projects/{$this->project->id}/ai/sprint-summary/{$this->sprint->id}"
    );

    $webResponse->assertOk();
    $webResponse->assertJsonStructure([
        'success',
        'data' => [
            'executive_summary',
            'velocity_analysis',
            'key_achievements',
            'identified_blockers',
            'retrospective_recommendations',
            'overall_health_score',
        ],
        'meta' => ['provider', 'total_tokens', 'latency_ms'],
    ]);

    // 2. REST API v1 Endpoint (Sanctum)
    Sanctum::actingAs($this->user, ['*']);

    $apiResponse = $this->withHeaders([
        'X-Tenant-ID' => $this->organization->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/ai/sprint-summary/{$this->sprint->id}");

    $apiResponse->assertOk();
    $apiResponse->assertJsonStructure([
        'data' => [
            'executive_summary',
            'velocity_analysis',
            'key_achievements',
            'overall_health_score',
        ],
        'meta' => ['provider', 'total_tokens'],
    ]);
});

test('user can generate AI Task Breakdown via web and API', function () {
    // 1. Web Endpoint
    $webResponse = $this->actingAs($this->user)->postJson(
        "/projects/{$this->project->id}/ai/task-breakdown",
        [
            'title' => 'Rancang arsitektur microservices untuk pelaporan',
            'description' => 'Memisahkan service query analitik dari database transaksional.',
            'type' => 'task',
            'priority' => 'high',
        ]
    );

    $webResponse->assertOk();
    $webResponse->assertJsonStructure([
        'success',
        'data' => [
            'suggested_subtasks' => [
                '*' => ['title', 'type', 'priority', 'estimate_points'],
            ],
            'total_estimated_points',
            'complexity_level',
        ],
    ]);

    // 2. REST API v1 Endpoint
    Sanctum::actingAs($this->user, ['*']);

    $apiResponse = $this->withHeaders([
        'X-Tenant-ID' => $this->organization->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/ai/task-breakdown", [
        'title' => 'Buat pipeline CI/CD di GitHub Actions',
        'type' => 'task',
    ]);

    $apiResponse->assertOk();
    $apiResponse->assertJsonStructure([
        'data' => [
            'suggested_subtasks',
            'total_estimated_points',
        ],
    ]);
});

test('user can generate AI Acceptance Criteria via web and API', function () {
    // 1. Web Endpoint
    $webResponse = $this->actingAs($this->user)->postJson(
        "/projects/{$this->project->id}/ai/acceptance-criteria",
        [
            'title' => 'Sistem upload lampiran tugas',
            'description' => 'Mendukung upload gambar dan dokumen hingga 25MB.',
            'type' => 'story',
        ]
    );

    $webResponse->assertOk();
    $webResponse->assertJsonStructure([
        'success',
        'data' => [
            'criteria_list',
            'edge_cases',
        ],
    ]);

    // 2. REST API v1 Endpoint
    Sanctum::actingAs($this->user, ['*']);

    $apiResponse = $this->withHeaders([
        'X-Tenant-ID' => $this->organization->id,
    ])->postJson("/api/v1/projects/{$this->project->id}/ai/acceptance-criteria", [
        'title' => 'Fitur ekspor CSV daftar task',
        'type' => 'task',
    ]);

    $apiResponse->assertOk();
    $apiResponse->assertJsonStructure([
        'data' => [
            'criteria_list',
            'edge_cases',
        ],
    ]);
});
