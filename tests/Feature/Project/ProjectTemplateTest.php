<?php

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\ProjectTemplate;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);

    $this->user = User::factory()->create();
    $this->organization = Organization::create([
        'name' => 'Acme Template Corp',
        'slug' => 'acme-template-corp',
        'status' => 'active',
    ]);

    $this->ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();

    OrganizationMembership::create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'role' => 'owner',
        'role_id' => $this->ownerRole?->id,
        'status' => 'active',
        'joined_at' => now(),
    ]);

    session(['current_organization_id' => $this->organization->id]);
});

test('system templates are available with default workflow configs', function () {
    $templates = ProjectTemplate::system()->get();

    expect($templates)->toHaveCount(4);
    expect($templates->pluck('slug')->all())->toContain('scrum', 'kanban', 'bug_tracking', 'general');

    $scrum = $templates->where('slug', 'scrum')->first();
    expect($scrum->workflow_config)->toBeArray();
    expect($scrum->workflow_config)->toHaveCount(6);
});

test('creating project from bug tracking template sets correct initial statuses', function () {
    $bugTemplate = ProjectTemplate::where('slug', 'bug_tracking')->first();

    $this->actingAs($this->user)->post('/projects', [
        'name' => 'Security Vulnerability Tracker',
        'key' => 'SEC',
        'template_id' => $bugTemplate->id,
    ]);

    $project = Project::where('key', 'SEC')->first();
    expect($project)->not->toBeNull();
    expect($project->type)->toBe('bug_tracking');
    expect($project->statuses)->toHaveCount(5);
    expect($project->statuses->pluck('name')->all())->toContain('Reported', 'Resolved');
});
