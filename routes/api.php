<?php

use App\Http\Controllers\Api\V1\AiApiController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\SprintController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\TokenController;
use App\Http\Controllers\Api\V1\WebhookController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')
    ->middleware(['auth:sanctum', 'throttle:api', 'api.tenant', 'idempotency'])
    ->group(function (): void {
        // Current Authenticated User & Tokens
        Route::get('/me', [MeController::class, 'show'])->name('api.v1.me');
        Route::get('/tokens', [TokenController::class, 'index'])->name('api.v1.tokens.index');
        Route::post('/tokens', [TokenController::class, 'store'])->name('api.v1.tokens.store');
        Route::delete('/tokens/{id}', [TokenController::class, 'destroy'])->name('api.v1.tokens.destroy');

        // Organizations
        Route::get('/organizations', [OrganizationController::class, 'index'])->name('api.v1.organizations.index');
        Route::get('/organizations/{organization}', [OrganizationController::class, 'show'])->name('api.v1.organizations.show');

        // Projects
        Route::get('/organizations/{organization}/projects', [ProjectController::class, 'index'])->name('api.v1.organizations.projects.index');
        Route::post('/organizations/{organization}/projects', [ProjectController::class, 'store'])->name('api.v1.organizations.projects.store');
        Route::get('/projects', [ProjectController::class, 'index'])->name('api.v1.projects.index');
        Route::post('/projects', [ProjectController::class, 'store'])->name('api.v1.projects.store');
        Route::get('/projects/{project}', [ProjectController::class, 'show'])->name('api.v1.projects.show');
        Route::put('/projects/{project}', [ProjectController::class, 'update'])->name('api.v1.projects.update');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('api.v1.projects.destroy');

        // Tasks
        Route::get('/projects/{project}/tasks', [TaskController::class, 'index'])->name('api.v1.projects.tasks.index');
        Route::post('/projects/{project}/tasks', [TaskController::class, 'store'])->name('api.v1.projects.tasks.store');
        Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('api.v1.tasks.show');
        Route::match(['put', 'patch'], '/tasks/{task}', [TaskController::class, 'update'])->name('api.v1.tasks.update');
        Route::post('/tasks/{task}/move', [TaskController::class, 'move'])->name('api.v1.tasks.move');
        Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('api.v1.tasks.destroy');

        // Sprints
        Route::get('/projects/{project}/sprints', [SprintController::class, 'index'])->name('api.v1.projects.sprints.index');
        Route::post('/projects/{project}/sprints', [SprintController::class, 'store'])->name('api.v1.projects.sprints.store');
        Route::get('/sprints/{sprint}', [SprintController::class, 'show'])->name('api.v1.sprints.show');
        Route::post('/sprints/{sprint}/start', [SprintController::class, 'start'])->name('api.v1.sprints.start');
        Route::post('/sprints/{sprint}/complete', [SprintController::class, 'complete'])->name('api.v1.sprints.complete');
        Route::delete('/sprints/{sprint}', [SprintController::class, 'destroy'])->name('api.v1.sprints.destroy');

        // Attachments
        Route::get('/tasks/{task}/attachments', [AttachmentController::class, 'index'])->name('api.v1.tasks.attachments.index');
        Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store'])->name('api.v1.tasks.attachments.store');
        Route::get('/attachments/{attachment}', [AttachmentController::class, 'show'])->name('api.v1.attachments.show');
        Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])->name('api.v1.attachments.download');
        Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('api.v1.attachments.destroy');

        // Webhooks
        Route::get('/webhooks', [WebhookController::class, 'index'])->name('api.v1.webhooks.index');
        Route::post('/webhooks', [WebhookController::class, 'store'])->name('api.v1.webhooks.store');
        Route::get('/webhooks/{webhook}', [WebhookController::class, 'show'])->name('api.v1.webhooks.show');
        Route::put('/webhooks/{webhook}', [WebhookController::class, 'update'])->name('api.v1.webhooks.update');
        Route::delete('/webhooks/{webhook}', [WebhookController::class, 'destroy'])->name('api.v1.webhooks.destroy');
        Route::post('/webhooks/{webhook}/rotate-secret', [WebhookController::class, 'rotateSecret'])->name('api.v1.webhooks.rotate-secret');
        Route::get('/webhooks/{webhook}/deliveries', [WebhookController::class, 'deliveries'])->name('api.v1.webhooks.deliveries');
        Route::post('/webhooks/{webhook}/test', [WebhookController::class, 'test'])->name('api.v1.webhooks.test');

        // AI Assistant & Capabilities
        Route::post('/projects/{project}/ai/sprint-summary/{sprint}', [AiApiController::class, 'sprintSummary'])->name('api.v1.ai.sprint-summary');
        Route::post('/projects/{project}/ai/task-breakdown', [AiApiController::class, 'taskBreakdown'])->name('api.v1.ai.task-breakdown');
        Route::post('/projects/{project}/ai/acceptance-criteria', [AiApiController::class, 'acceptanceCriteria'])->name('api.v1.ai.acceptance-criteria');
    });
