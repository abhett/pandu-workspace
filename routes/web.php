<?php

use App\Http\Controllers\AiAssistantController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\OrganizationInvitationController;
use App\Http\Controllers\OrganizationMemberController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectWorkflowController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\SprintController;
use App\Http\Controllers\TaskActivityController;
use App\Http\Controllers\TaskChecklistController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Onboarding
    Route::get('/onboarding/organization', [OrganizationController::class, 'create'])->name('onboarding.organization');
    Route::post('/onboarding/organization', [OrganizationController::class, 'store'])->name('onboarding.organization.store');
    Route::get('/onboarding/invite-members', [OrganizationInvitationController::class, 'showOnboarding'])->name('onboarding.invite-members');

    // Organization Switching
    Route::post('/organizations/{organization}/switch', [OrganizationController::class, 'switch'])->name('organizations.switch');

    // Dashboard
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Projects Management
    Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
    Route::get('/projects/create', [ProjectController::class, 'create'])->name('projects.create');
    Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
    Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('projects.show');
    Route::get('/projects/{project}/settings', [ProjectController::class, 'settings'])->name('projects.settings');
    Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('projects.update');
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');

    // Project Members
    Route::post('/projects/{project}/members', [ProjectMemberController::class, 'store'])->name('projects.members.store');
    Route::patch('/projects/{project}/members/{member}', [ProjectMemberController::class, 'update'])->name('projects.members.update');
    Route::delete('/projects/{project}/members/{member}', [ProjectMemberController::class, 'destroy'])->name('projects.members.destroy');

    // Project Workflow & Statuses
    Route::put('/projects/{project}/workflow/statuses', [ProjectWorkflowController::class, 'updateStatuses'])->name('projects.workflow.statuses.update');

    // Project Tasks & Kanban Board
    Route::get('/projects/{project}/tasks', [TaskController::class, 'index'])->name('projects.tasks.index');
    Route::get('/projects/{project}/board', [TaskController::class, 'board'])->name('projects.board');
    Route::post('/projects/{project}/tasks', [TaskController::class, 'store'])->name('projects.tasks.store');
    Route::get('/projects/{project}/tasks/{task}', [TaskController::class, 'show'])->name('projects.tasks.show');
    Route::put('/projects/{project}/tasks/{task}', [TaskController::class, 'update'])->name('projects.tasks.update');
    Route::patch('/projects/{project}/tasks/{task}/move', [TaskController::class, 'move'])->name('projects.tasks.move');
    Route::delete('/projects/{project}/tasks/{task}', [TaskController::class, 'destroy'])->name('projects.tasks.destroy');
    Route::get('/projects/{project}/tasks/{task}/activities', [TaskActivityController::class, 'index'])->name('projects.tasks.activities');

    // Task Comments
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store'])->name('tasks.comments.store');
    Route::put('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'update'])->name('tasks.comments.update');
    Route::delete('/tasks/{task}/comments/{comment}', [TaskCommentController::class, 'destroy'])->name('tasks.comments.destroy');

    // Task Checklists
    Route::post('/tasks/{task}/checklists', [TaskChecklistController::class, 'store'])->name('tasks.checklists.store');
    Route::patch('/tasks/{task}/checklists/{checklist}/toggle', [TaskChecklistController::class, 'toggle'])->name('tasks.checklists.toggle');
    Route::delete('/tasks/{task}/checklists/{checklist}', [TaskChecklistController::class, 'destroy'])->name('tasks.checklists.destroy');

    // Attachments
    Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store'])->name('tasks.attachments.store');
    Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('attachments.download');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('attachments.destroy');

    // Scrum Backlog & Sprint Lifecycle
    Route::get('/projects/{project}/backlog', [SprintController::class, 'index'])->name('projects.backlog');
    Route::post('/projects/{project}/sprints', [SprintController::class, 'store'])->name('projects.sprints.store');
    Route::put('/projects/{project}/sprints/{sprint}', [SprintController::class, 'update'])->name('projects.sprints.update');
    Route::delete('/projects/{project}/sprints/{sprint}', [SprintController::class, 'destroy'])->name('projects.sprints.destroy');
    Route::post('/projects/{project}/sprints/{sprint}/start', [SprintController::class, 'start'])->name('projects.sprints.start');
    Route::post('/projects/{project}/sprints/{sprint}/complete', [SprintController::class, 'complete'])->name('projects.sprints.complete');
    Route::patch('/projects/{project}/tasks/{task}/sprint', [SprintController::class, 'moveTask'])->name('projects.tasks.sprint');
    Route::get('/projects/{project}/sprints/{sprint}/burndown', [SprintController::class, 'burndown'])->name('projects.sprints.burndown');

    // Teams Management
    Route::get('/teams', [TeamController::class, 'index'])->name('teams.index');
    Route::post('/teams', [TeamController::class, 'store'])->name('teams.store');
    Route::put('/teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');

    // Members Management
    Route::get('/organization/members', [OrganizationMemberController::class, 'index'])->name('organization.members.index');
    Route::post('/organization/members', [OrganizationMemberController::class, 'store'])->name('organization.members.store');
    Route::patch('/organization/members/{membership}/role', [OrganizationMemberController::class, 'updateRole'])->name('organization.members.update-role');
    Route::delete('/organization/members/{membership}', [OrganizationMemberController::class, 'destroy'])->name('organization.members.destroy');

    // Invitations
    Route::post('/organization/invitations', [OrganizationInvitationController::class, 'store'])->name('organization.invitations.store');
    Route::delete('/organization/invitations/{invitation}', [OrganizationInvitationController::class, 'destroy'])->name('organization.invitations.destroy');

    // AI Assistant & Capabilities
    Route::post('/projects/{project}/ai/sprint-summary/{sprint}', [AiAssistantController::class, 'sprintSummary'])->name('projects.ai.sprint-summary');
    Route::post('/projects/{project}/ai/task-breakdown', [AiAssistantController::class, 'taskBreakdown'])->name('projects.ai.task-breakdown');
    Route::post('/projects/{project}/ai/acceptance-criteria', [AiAssistantController::class, 'acceptanceCriteria'])->name('projects.ai.acceptance-criteria');

    // Organization AI Configuration & Quota Dashboard
    Route::get('/organization/ai-settings', [AiAssistantController::class, 'settings'])->name('organization.ai-settings');
    Route::put('/organization/ai-settings', [AiAssistantController::class, 'updateSettings'])->name('organization.ai-settings.update');

    // Roles & Permissions
    Route::get('/organization/roles', [RolePermissionController::class, 'index'])->name('organization.roles.index');
    Route::post('/organization/roles', [RolePermissionController::class, 'store'])->name('organization.roles.store');
    Route::put('/organization/roles/matrix', [RolePermissionController::class, 'updateMatrix'])->name('organization.roles.matrix.update');
    Route::delete('/organization/roles/{role}', [RolePermissionController::class, 'destroy'])->name('organization.roles.destroy');
});

require __DIR__.'/settings.php';
