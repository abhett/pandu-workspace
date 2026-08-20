<?php

use App\Models\ImportJob;
use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    $this->user = User::factory()->create(['name' => 'Migration Lead', 'email' => 'migrator@example.com']);
    $this->org = Organization::factory()->create(['name' => 'Migration Org']);

    OrganizationMembership::create([
        'organization_id' => $this->org->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    $this->project = app(ProjectCreationService::class)->create($this->org, $this->user, [
        'name' => 'Target Migration Project',
        'key' => 'TMP',
        'type' => 'scrum',
    ]);
});

test('user can view data import wizard page', function () {
    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->get('/import');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('import/index')
        ->has('projects', 1)
        ->where('projects.0.id', $this->project->id)
    );
});

test('user can upload and parse raw CSV data with auto field mappings', function () {
    $csvContent = "issue_title,desc,priority,estimate,due_date\n"
        ."Setup OAuth2,Configure google and github providers,high,5,2026-09-01\n"
        .'Add Unit Tests,Test auth flow,medium,3,2026-09-05';

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/import/upload', [
            'source_type' => 'csv',
            'raw_data' => $csvContent,
        ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'data' => [
            'total_rows' => 2,
            'headers' => ['issue_title', 'desc', 'priority', 'estimate', 'due_date'],
            'suggested_mappings' => [
                'issue_title' => 'title',
                'desc' => 'description',
                'priority' => 'priority',
                'estimate' => 'story_points',
                'due_date' => 'due_date',
            ],
        ],
    ]);
});

test('user can execute batch import and create tasks in target project', function () {
    $rows = [
        [
            'issue_title' => 'Migrated Feature Alpha',
            'desc' => 'Detailed description of alpha',
            'priority' => 'High',
            'estimate' => '8',
            'due_date' => '2026-09-15',
            'is_milestone' => 'yes',
        ],
        [
            'issue_title' => 'Migrated Feature Beta',
            'desc' => 'Detailed description of beta',
            'priority' => 'Low',
            'estimate' => '3',
            'due_date' => '2026-09-20',
            'is_milestone' => 'no',
        ],
    ];

    $mappings = [
        'issue_title' => 'title',
        'desc' => 'description',
        'priority' => 'priority',
        'estimate' => 'story_points',
        'due_date' => 'due_date',
        'is_milestone' => 'is_milestone',
    ];

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/import/process', [
            'project_id' => $this->project->id,
            'source_type' => 'jira',
            'mappings' => $mappings,
            'rows' => $rows,
        ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'result' => [
            'total_rows' => 2,
            'imported_rows' => 2,
            'failed_rows' => 0,
        ],
    ]);

    expect(Task::where('project_id', $this->project->id)->count())->toBe(2);

    $alphaTask = Task::where('project_id', $this->project->id)->where('title', 'Migrated Feature Alpha')->first();
    expect($alphaTask)->not->toBeNull();
    expect($alphaTask->priority)->toBe('high');
    expect((float) $alphaTask->estimate_points)->toBe(8.0);
    expect($alphaTask->due_date?->toDateString())->toBe('2026-09-15');
    expect((bool) $alphaTask->is_milestone)->toBeTrue();

    // Verify import job audit log
    expect(ImportJob::where('project_id', $this->project->id)->count())->toBe(1);
});

test('import skips and records audit error for rows with empty title', function () {
    $rows = [
        [
            'task_name' => '', // Empty title
            'details' => 'Missing title row',
        ],
        [
            'task_name' => 'Valid Task Row',
            'details' => 'Valid details',
        ],
    ];

    $mappings = [
        'task_name' => 'title',
        'details' => 'description',
    ];

    $response = $this->actingAs($this->user)
        ->withSession(['current_organization_id' => $this->org->id])
        ->postJson('/import/process', [
            'project_id' => $this->project->id,
            'source_type' => 'csv',
            'mappings' => $mappings,
            'rows' => $rows,
        ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'result' => [
            'total_rows' => 2,
            'imported_rows' => 1,
            'failed_rows' => 1,
            'errors' => [
                [
                    'row' => 1,
                    'message' => 'Judul tugas kosong.',
                ],
            ],
        ],
    ]);

    expect(Task::where('project_id', $this->project->id)->count())->toBe(1);
});
