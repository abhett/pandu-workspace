<?php

use App\Http\Controllers\AiAssistantController;
use App\Http\Controllers\ApiPlaygroundController;
use App\Http\Controllers\ApiRateLimiterController;
use App\Http\Controllers\ArchitectureDecisionRecordController;
use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ChaosGameDayController;
use App\Http\Controllers\CicdPipelineController;
use App\Http\Controllers\CloudCostAnomalyController;
use App\Http\Controllers\CollaborationReportController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\CostAllocationController;
use App\Http\Controllers\CrossProjectDependencyController;
use App\Http\Controllers\CustomDashboardStudioController;
use App\Http\Controllers\DailyStandupController;
use App\Http\Controllers\DashboardBuilderController;
use App\Http\Controllers\DatabaseDriftController;
use App\Http\Controllers\DataPrivacyController;
use App\Http\Controllers\DeploymentPipelineController;
use App\Http\Controllers\DesignSystemController;
use App\Http\Controllers\DeveloperFocusRadarController;
use App\Http\Controllers\DistributedTraceController;
use App\Http\Controllers\EmptyStateGalleryController;
use App\Http\Controllers\ExecutiveBoardroomController;
use App\Http\Controllers\FeatureFlagController;
use App\Http\Controllers\FileManagerController;
use App\Http\Controllers\ImportController;
use App\Http\Controllers\InboxController;
use App\Http\Controllers\IncidentManagementController;
use App\Http\Controllers\IncidentRunbookController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\KaizenImprovementController;
use App\Http\Controllers\LiveAuditStreamController;
use App\Http\Controllers\MfaEnforcementController;
use App\Http\Controllers\MobileCompanionController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OkrController;
use App\Http\Controllers\OmniSearchController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\OncallScheduleController;
use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\OrganizationInvitationController;
use App\Http\Controllers\OrganizationMemberController;
use App\Http\Controllers\OrganizationWebhookController;
use App\Http\Controllers\PlanningPokerController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ProjectBudgetController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMemberController;
use App\Http\Controllers\ProjectRiskController;
use App\Http\Controllers\ProjectWorkflowController;
use App\Http\Controllers\PrReviewSlaController;
use App\Http\Controllers\PublicChangelogController;
use App\Http\Controllers\PublicPageController;
use App\Http\Controllers\ReleaseController;
use App\Http\Controllers\ReleasePublisherController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResourceCapacityController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\RootCauseAnalysisController;
use App\Http\Controllers\SbomScannerController;
use App\Http\Controllers\ScrumMasterController;
use App\Http\Controllers\SessionSecurityController;
use App\Http\Controllers\SkillMatrixController;
use App\Http\Controllers\SlaBreachForecastController;
use App\Http\Controllers\SlaController;
use App\Http\Controllers\SprintController;
use App\Http\Controllers\SprintForecastController;
use App\Http\Controllers\SprintHealthController;
use App\Http\Controllers\SprintRetrospectiveController;
use App\Http\Controllers\SsoController;
use App\Http\Controllers\SyntheticMonitorController;
use App\Http\Controllers\SystemFeedbackController;
use App\Http\Controllers\SystemStatusController;
use App\Http\Controllers\TaskActivityController;
use App\Http\Controllers\TaskChecklistController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TaskDependencyController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamMoodPulseController;
use App\Http\Controllers\TimelineController;
use App\Http\Controllers\WebhookDlqController;
use App\Http\Controllers\WhiteboardController;
use App\Http\Controllers\WhiteboardLiveController;
use App\Http\Controllers\WikiController;
use App\Http\Controllers\WorkloadBalancerController;

Route::inertia('/', 'welcome')->name('home');

// Public Marketing & Communication Hub
Route::get('/news', [PublicPageController::class, 'news'])->name('public.news');
Route::get('/about', [PublicPageController::class, 'about'])->name('public.about');
Route::get('/contact', [PublicPageController::class, 'contact'])->name('public.contact');
Route::post('/contact', [PublicPageController::class, 'submitContact'])->name('public.contact.submit');
Route::get('/changelog', [PublicChangelogController::class, 'index'])->name('public.changelog');
Route::post('/changelog/{release}/react', [PublicChangelogController::class, 'react'])->name('public.changelog.react');

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

    // Task Dependencies & CPM Network Graph
    Route::get('/projects/{project}/dependencies', [TaskDependencyController::class, 'index'])->name('projects.dependencies.index');
    Route::post('/projects/{project}/dependencies', [TaskDependencyController::class, 'store'])->name('projects.dependencies.store');
    Route::delete('/projects/{project}/dependencies/{dependency}', [TaskDependencyController::class, 'destroy'])->name('projects.dependencies.destroy');
    Route::post('/projects/{project}/dependencies/simulate-cascade', [TaskDependencyController::class, 'simulateCascade'])->name('projects.dependencies.simulate-cascade');
    Route::get('/projects/{project}/dependencies/matrix', [CrossProjectDependencyController::class, 'index'])->name('projects.dependencies.matrix.index');
    Route::post('/projects/{project}/dependencies/matrix/simulate', [CrossProjectDependencyController::class, 'simulate'])->name('projects.dependencies.matrix.simulate');
    Route::post('/projects/{project}/dependencies/matrix/store', [CrossProjectDependencyController::class, 'store'])->name('projects.dependencies.matrix.store');
    Route::delete('/projects/{project}/dependencies/matrix/{dependency}', [CrossProjectDependencyController::class, 'destroy'])->name('projects.dependencies.matrix.destroy');

    // Advanced Project Timeline, Milestone Gantt Chart & Critical Path Engine
    Route::get('/projects/{project}/timeline', [TimelineController::class, 'index'])->name('projects.timeline.index');
    Route::post('/projects/{project}/timeline/dependencies', [TimelineController::class, 'storeDependency'])->name('projects.timeline.dependencies.store');
    Route::delete('/projects/{project}/timeline/dependencies/{dependency}', [TimelineController::class, 'destroyDependency'])->name('projects.timeline.dependencies.destroy');
    Route::put('/projects/{project}/timeline/tasks/{task}/schedule', [TimelineController::class, 'updateSchedule'])->name('projects.timeline.tasks.schedule');
    Route::post('/projects/{project}/timeline/auto-schedule', [TimelineController::class, 'autoSchedule'])->name('projects.timeline.auto-schedule');
    Route::post('/projects/{project}/timeline/tasks/{task}/milestone', [TimelineController::class, 'toggleMilestone'])->name('projects.timeline.tasks.milestone');

    // Project Budgeting, Cost Tracking & Expense Approvals
    Route::get('/projects/{project}/budget', [ProjectBudgetController::class, 'index'])->name('projects.budget.index');
    Route::post('/projects/{project}/budget', [ProjectBudgetController::class, 'storeOrUpdateBudget'])->name('projects.budget.store-or-update');
    Route::post('/projects/{project}/budget/rates', [ProjectBudgetController::class, 'storeMemberRate'])->name('projects.budget.rates.store');
    Route::post('/projects/{project}/budget/worklogs', [ProjectBudgetController::class, 'storeWorklog'])->name('projects.budget.worklogs.store');
    Route::post('/projects/{project}/budget/expenses', [ProjectBudgetController::class, 'storeExpense'])->name('projects.budget.expenses.store');
    Route::post('/projects/{project}/budget/expenses/{expense}/approve', [ProjectBudgetController::class, 'approveExpense'])->name('projects.budget.expenses.approve');
    Route::post('/projects/{project}/budget/expenses/{expense}/reject', [ProjectBudgetController::class, 'rejectExpense'])->name('projects.budget.expenses.reject');
    Route::delete('/projects/{project}/budget/expenses/{expense}', [ProjectBudgetController::class, 'destroyExpense'])->name('projects.budget.expenses.destroy');

    // Interactive Whiteboard, Mind Map & Ideation Canvas
    Route::get('/projects/{project}/whiteboard', [WhiteboardController::class, 'index'])->name('projects.whiteboard.index');
    Route::post('/projects/{project}/whiteboards', [WhiteboardController::class, 'store'])->name('projects.whiteboard.store');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/nodes', [WhiteboardController::class, 'storeNode'])->name('projects.whiteboard.nodes.store');
    Route::put('/projects/{project}/whiteboards/{whiteboard}/nodes/{node}', [WhiteboardController::class, 'updateNode'])->name('projects.whiteboard.nodes.update');
    Route::delete('/projects/{project}/whiteboards/{whiteboard}/nodes/{node}', [WhiteboardController::class, 'destroyNode'])->name('projects.whiteboard.nodes.destroy');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/edges', [WhiteboardController::class, 'storeEdge'])->name('projects.whiteboard.edges.store');
    Route::delete('/projects/{project}/whiteboards/{whiteboard}/edges/{edge}', [WhiteboardController::class, 'destroyEdge'])->name('projects.whiteboard.edges.destroy');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/nodes/{node}/convert-to-task', [WhiteboardController::class, 'convertToTask'])->name('projects.whiteboard.nodes.convert-to-task');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/viewport', [WhiteboardController::class, 'updateViewport'])->name('projects.whiteboard.viewport');

    // Live Collaborative Whiteboard Sync & Real-Time Multi-Cursor Presence
    Route::get('/projects/{project}/whiteboard/live', [WhiteboardLiveController::class, 'live'])->name('projects.whiteboard.live');
    Route::get('/projects/{project}/whiteboards/{whiteboard}/live', [WhiteboardLiveController::class, 'live'])->name('projects.whiteboard.live.room');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/live/presence', [WhiteboardLiveController::class, 'presence'])->name('projects.whiteboard.live.presence');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/live/lock', [WhiteboardLiveController::class, 'lock'])->name('projects.whiteboard.live.lock');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/live/sync', [WhiteboardLiveController::class, 'sync'])->name('projects.whiteboard.live.sync');
    Route::post('/projects/{project}/whiteboards/{whiteboard}/live/leave', [WhiteboardLiveController::class, 'leave'])->name('projects.whiteboard.live.leave');

    // Project Risk Management & Mitigation Register
    Route::get('/projects/{project}/risks', [ProjectRiskController::class, 'index'])->name('projects.risks.index');
    Route::post('/projects/{project}/risks', [ProjectRiskController::class, 'store'])->name('projects.risks.store');
    Route::put('/projects/{project}/risks/{risk}', [ProjectRiskController::class, 'update'])->name('projects.risks.update');
    Route::delete('/projects/{project}/risks/{risk}', [ProjectRiskController::class, 'destroy'])->name('projects.risks.destroy');
    Route::post('/projects/{project}/risks/{risk}/action-logs', [ProjectRiskController::class, 'storeActionLog'])->name('projects.risks.action-logs.store');

    // Agile Sprint Retrospectives & Action Item Tracking
    Route::get('/projects/{project}/retrospectives', [SprintRetrospectiveController::class, 'index'])->name('projects.retrospectives.index');
    Route::get('/projects/{project}/retrospectives/{retrospective}', [SprintRetrospectiveController::class, 'show'])->name('projects.retrospectives.show');
    Route::post('/projects/{project}/retrospectives', [SprintRetrospectiveController::class, 'store'])->name('projects.retrospectives.store');
    Route::put('/projects/{project}/retrospectives/{retrospective}', [SprintRetrospectiveController::class, 'update'])->name('projects.retrospectives.update');
    Route::post('/projects/{project}/retrospectives/{retrospective}/close', [SprintRetrospectiveController::class, 'close'])->name('projects.retrospectives.close');
    Route::delete('/projects/{project}/retrospectives/{retrospective}', [SprintRetrospectiveController::class, 'destroy'])->name('projects.retrospectives.destroy');
    Route::post('/projects/{project}/retrospectives/{retrospective}/items', [SprintRetrospectiveController::class, 'storeItem'])->name('projects.retrospectives.items.store');
    Route::delete('/projects/{project}/retrospectives/items/{item}', [SprintRetrospectiveController::class, 'destroyItem'])->name('projects.retrospectives.items.destroy');
    Route::post('/projects/{project}/retrospectives/items/{item}/vote', [SprintRetrospectiveController::class, 'voteItem'])->name('projects.retrospectives.items.vote');
    Route::post('/projects/{project}/retrospectives/items/{item}/convert-to-task', [SprintRetrospectiveController::class, 'convertToTask'])->name('projects.retrospectives.items.convert-to-task');

    // Smart Sprint Planning Poker & Real-Time Story Point Estimation Room
    Route::get('/projects/{project}/planning-poker', [PlanningPokerController::class, 'index'])->name('projects.planning-poker.index');
    Route::post('/projects/{project}/planning-poker', [PlanningPokerController::class, 'store'])->name('projects.planning-poker.store');
    Route::get('/projects/{project}/planning-poker/{session}', [PlanningPokerController::class, 'show'])->name('projects.planning-poker.show');
    Route::post('/projects/{project}/planning-poker/{session}/vote', [PlanningPokerController::class, 'vote'])->name('projects.planning-poker.vote');
    Route::post('/projects/{project}/planning-poker/{session}/reveal', [PlanningPokerController::class, 'reveal'])->name('projects.planning-poker.reveal');
    Route::post('/projects/{project}/planning-poker/{session}/reset', [PlanningPokerController::class, 'reset'])->name('projects.planning-poker.reset');
    Route::post('/projects/{project}/planning-poker/{session}/apply-points', [PlanningPokerController::class, 'applyPoints'])->name('projects.planning-poker.apply-points');
    Route::post('/projects/{project}/planning-poker/{session}/select-task', [PlanningPokerController::class, 'selectTask'])->name('projects.planning-poker.select-task');
    Route::delete('/projects/{project}/planning-poker/{session}', [PlanningPokerController::class, 'destroy'])->name('projects.planning-poker.destroy');

    // Advanced Sprint Velocity Forecast, Monte Carlo Simulation & Release Readiness Predictor
    Route::get('/projects/{project}/forecast', [SprintForecastController::class, 'index'])->name('projects.forecast.index');
    Route::post('/projects/{project}/forecast/simulate', [SprintForecastController::class, 'simulate'])->name('projects.forecast.simulate');
    Route::post('/projects/{project}/forecast/scenarios', [SprintForecastController::class, 'storeScenario'])->name('projects.forecast.scenarios.store');
    Route::delete('/projects/{project}/forecast/scenarios/{scenario}', [SprintForecastController::class, 'destroyScenario'])->name('projects.forecast.scenarios.destroy');

    // Scrum Backlog & Sprint Lifecycle
    Route::get('/projects/{project}/backlog', [SprintController::class, 'index'])->name('projects.backlog');
    Route::post('/projects/{project}/sprints', [SprintController::class, 'store'])->name('projects.sprints.store');
    Route::put('/projects/{project}/sprints/{sprint}', [SprintController::class, 'update'])->name('projects.sprints.update');
    Route::delete('/projects/{project}/sprints/{sprint}', [SprintController::class, 'destroy'])->name('projects.sprints.destroy');
    Route::post('/projects/{project}/sprints/{sprint}/start', [SprintController::class, 'start'])->name('projects.sprints.start');
    Route::post('/projects/{project}/sprints/{sprint}/complete', [SprintController::class, 'complete'])->name('projects.sprints.complete');
    Route::patch('/projects/{project}/tasks/{task}/sprint', [SprintController::class, 'moveTask'])->name('projects.tasks.sprint');
    Route::get('/projects/{project}/sprints/{sprint}/burndown', [SprintController::class, 'burndown'])->name('projects.sprints.burndown');

    // Advanced Scrum Sprint Health Radar, Blockers Heatmap & Impediment Escalator
    Route::get('/projects/{project}/sprints/health', [SprintHealthController::class, 'index'])->name('projects.sprints.health.index');
    Route::get('/projects/{project}/sprints/{sprint}/health', [SprintHealthController::class, 'show'])->name('projects.sprints.health.show');
    Route::post('/projects/{project}/sprints/{sprint}/impediments', [SprintHealthController::class, 'storeImpediment'])->name('projects.sprints.impediments.store');
    Route::post('/projects/{project}/sprints/impediments/{impediment}/escalate', [SprintHealthController::class, 'escalateImpediment'])->name('projects.sprints.impediments.escalate');
    Route::post('/projects/{project}/sprints/impediments/{impediment}/resolve', [SprintHealthController::class, 'resolveImpediment'])->name('projects.sprints.impediments.resolve');
    Route::delete('/projects/{project}/sprints/impediments/{impediment}', [SprintHealthController::class, 'destroyImpediment'])->name('projects.sprints.impediments.destroy');

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

    // Notification Center
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/unread', [NotificationController::class, 'unread'])->name('notifications.unread');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');

    // Scrum Master Workspace & Blocker Management
    Route::get('/projects/{project}/scrum-master', [ScrumMasterController::class, 'workspace'])->name('projects.scrum-master');
    Route::post('/projects/{project}/tasks/{task}/blockers', [ScrumMasterController::class, 'addBlocker'])->name('projects.tasks.blockers.store');
    Route::put('/projects/{project}/tasks/{task}/blockers/{blocker}/resolve', [ScrumMasterController::class, 'resolveBlocker'])->name('projects.tasks.blockers.resolve');

    // Agile Report Center & Workload Planning
    Route::get('/projects/{project}/reports', [ReportController::class, 'index'])->name('projects.reports');
    Route::get('/projects/{project}/workload', [ReportController::class, 'workload'])->name('projects.workload');
    Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('/workload', [ReportController::class, 'workload'])->name('workload.index');

    // Interactive Timeline & Gantt Chart
    Route::get('/projects/{project}/timeline', [TimelineController::class, 'index'])->name('projects.timeline');
    Route::put('/projects/{project}/tasks/{task}/schedule', [TimelineController::class, 'updateSchedule'])->name('projects.tasks.schedule.update');
    Route::get('/timeline', [TimelineController::class, 'index'])->name('timeline.index');

    // Executive Portfolio Dashboard
    Route::get('/portfolio', [PortfolioController::class, 'index'])->name('portfolio.index');

    // Interactive Team Calendar & Schedule Planning
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar.index');
    Route::get('/projects/{project}/calendar', [CalendarController::class, 'index'])->name('projects.calendar');
    Route::put('/tasks/{task}/due-date', [CalendarController::class, 'updateTaskDueDate'])->name('tasks.due-date.update');

    // Data Import & Migration Center
    Route::get('/import', [ImportController::class, 'index'])->name('import.index');
    Route::post('/import/upload', [ImportController::class, 'upload'])->name('import.upload');
    Route::post('/import/process', [ImportController::class, 'process'])->name('import.process');

    // Visual Workflow Automation Builder & Event Rules Engine
    Route::get('/automation', [AutomationController::class, 'index'])->name('automation.index');
    Route::get('/automation/create', [AutomationController::class, 'create'])->name('automation.create');
    Route::post('/automation', [AutomationController::class, 'store'])->name('automation.store');
    Route::get('/automation/{rule}/edit', [AutomationController::class, 'edit'])->name('automation.edit');
    Route::put('/automation/{rule}', [AutomationController::class, 'update'])->name('automation.update');
    Route::delete('/automation/{rule}', [AutomationController::class, 'destroy'])->name('automation.destroy');
    Route::post('/automation/{rule}/toggle', [AutomationController::class, 'toggle'])->name('automation.toggle');
    Route::post('/automation/{rule}/test-run', [AutomationController::class, 'testRun'])->name('automation.test-run');

    // Enterprise Audit Trail & Compliance Logging
    Route::get('/organization/audit-logs', [AuditLogController::class, 'index'])->name('organization.audit-logs');
    Route::get('/organization/audit-logs/export', [AuditLogController::class, 'exportCsv'])->name('organization.audit-logs.export');

    // Project Wiki, Team Knowledge Base & Documentation Hub
    Route::get('/wiki', [WikiController::class, 'index'])->name('wiki.index');
    Route::get('/projects/{project}/wiki', [WikiController::class, 'index'])->name('projects.wiki');
    Route::post('/wiki/spaces', [WikiController::class, 'storeSpace'])->name('wiki.spaces.store');
    Route::post('/wiki/spaces/{space}/pages', [WikiController::class, 'storePage'])->name('wiki.pages.store');
    Route::get('/wiki/pages/{page}', [WikiController::class, 'show'])->name('wiki.pages.show');
    Route::put('/wiki/pages/{page}', [WikiController::class, 'updatePage'])->name('wiki.pages.update');
    Route::delete('/wiki/pages/{page}', [WikiController::class, 'destroyPage'])->name('wiki.pages.destroy');
    Route::post('/wiki/pages/{page}/favorite', [WikiController::class, 'toggleFavorite'])->name('wiki.pages.favorite');

    // Marketplace & Third-Party Integrations Hub
    Route::get('/integrations', [IntegrationController::class, 'index'])->name('integrations.index');
    Route::post('/integrations', [IntegrationController::class, 'storeOrUpdate'])->name('integrations.store');
    Route::post('/integrations/{integration}/toggle', [IntegrationController::class, 'toggle'])->name('integrations.toggle');
    Route::delete('/integrations/{integration}', [IntegrationController::class, 'destroy'])->name('integrations.destroy');
    Route::post('/integrations/{integration}/test-ping', [IntegrationController::class, 'testPing'])->name('integrations.test-ping');

    // Automated Webhook Dispatcher & Outbound Integration Hub
    Route::get('/organization/webhooks', [OrganizationWebhookController::class, 'index'])->name('organization.webhooks.index');
    Route::post('/organization/webhooks', [OrganizationWebhookController::class, 'store'])->name('organization.webhooks.store');
    Route::put('/organization/webhooks/{webhook}', [OrganizationWebhookController::class, 'update'])->name('organization.webhooks.update');
    Route::delete('/organization/webhooks/{webhook}', [OrganizationWebhookController::class, 'destroy'])->name('organization.webhooks.destroy');
    Route::post('/organization/webhooks/{webhook}/rotate-secret', [OrganizationWebhookController::class, 'rotateSecret'])->name('organization.webhooks.rotate-secret');
    Route::post('/organization/webhooks/{webhook}/test', [OrganizationWebhookController::class, 'test'])->name('organization.webhooks.test');
    Route::get('/organization/webhooks/{webhook}/deliveries', [OrganizationWebhookController::class, 'deliveries'])->name('organization.webhooks.deliveries');
    Route::post('/organization/webhooks/deliveries/{delivery}/redeliver', [OrganizationWebhookController::class, 'redeliver'])->name('organization.webhooks.redeliver');

    // SLA (Service Level Agreement) Engine & Automated Escalation Matrix
    Route::get('/organization/sla', [SlaController::class, 'index'])->name('organization.sla.index');
    Route::post('/organization/sla', [SlaController::class, 'store'])->name('organization.sla.store');
    Route::put('/organization/sla/{policy}', [SlaController::class, 'update'])->name('organization.sla.update');
    Route::delete('/organization/sla/{policy}', [SlaController::class, 'destroy'])->name('organization.sla.destroy');
    Route::post('/organization/sla/{policy}/escalation-rules', [SlaController::class, 'storeRule'])->name('organization.sla.escalation-rules.store');
    Route::delete('/organization/sla/escalation-rules/{rule}', [SlaController::class, 'destroyRule'])->name('organization.sla.escalation-rules.destroy');
    Route::post('/organization/sla/run-scan', [SlaController::class, 'runScan'])->name('organization.sla.run-scan');

    // Team Skills Inventory & Smart Resource Allocation AI
    Route::get('/organization/skills', [SkillMatrixController::class, 'index'])->name('organization.skills.index');
    Route::post('/organization/skills', [SkillMatrixController::class, 'store'])->name('organization.skills.store');
    Route::put('/organization/skills/{skill}', [SkillMatrixController::class, 'update'])->name('organization.skills.update');
    Route::delete('/organization/skills/{skill}', [SkillMatrixController::class, 'destroy'])->name('organization.skills.destroy');
    Route::post('/organization/skills/member-skills', [SkillMatrixController::class, 'storeMemberSkill'])->name('organization.skills.member-skills.store');
    Route::delete('/organization/skills/member-skills/{userSkill}', [SkillMatrixController::class, 'destroyMemberSkill'])->name('organization.skills.member-skills.destroy');
    Route::get('/tasks/{task}/recommend-assignees', [SkillMatrixController::class, 'recommendAssignees'])->name('tasks.recommend-assignees');
    Route::post('/tasks/{task}/required-skills', [SkillMatrixController::class, 'storeTaskSkills'])->name('tasks.required-skills.store');

    // Live Team Workload Balancing & Resource Capacity Planner
    Route::get('/organization/capacity', [ResourceCapacityController::class, 'index'])->name('organization.capacity.index');
    Route::post('/organization/capacity/member-settings', [ResourceCapacityController::class, 'storeMemberSetting'])->name('organization.capacity.settings.store');
    Route::post('/organization/capacity/time-off', [ResourceCapacityController::class, 'storeTimeOff'])->name('organization.capacity.time-off.store');
    Route::delete('/organization/capacity/time-off/{timeOff}', [ResourceCapacityController::class, 'destroyTimeOff'])->name('organization.capacity.time-off.destroy');
    Route::post('/organization/capacity/reassign-task', [ResourceCapacityController::class, 'rebalanceTask'])->name('organization.capacity.reassign-task');
    Route::get('/organization/capacity/balancer', [WorkloadBalancerController::class, 'index'])->name('organization.capacity.balancer.index');
    Route::get('/organization/capacity/balancer/suggestions/{user}', [WorkloadBalancerController::class, 'suggestions'])->name('organization.capacity.balancer.suggestions');
    Route::post('/organization/capacity/balancer/reassign', [WorkloadBalancerController::class, 'reassign'])->name('organization.capacity.balancer.reassign');
    Route::post('/organization/capacity/balancer/batch', [WorkloadBalancerController::class, 'batch'])->name('organization.capacity.balancer.batch');

    // Interactive Team Mood, Daily Pulse & Agile Wellness Radar
    Route::get('/organization/pulse', [TeamMoodPulseController::class, 'index'])->name('organization.pulse.index');
    Route::post('/organization/pulse/check-in', [TeamMoodPulseController::class, 'checkIn'])->name('organization.pulse.check-in');
    Route::post('/organization/pulse/initiatives', [TeamMoodPulseController::class, 'storeInitiative'])->name('organization.pulse.initiatives.store');
    Route::put('/organization/pulse/initiatives/{initiative}', [TeamMoodPulseController::class, 'updateInitiative'])->name('organization.pulse.initiatives.update');
    Route::delete('/organization/pulse/initiatives/{initiative}', [TeamMoodPulseController::class, 'destroyInitiative'])->name('organization.pulse.initiatives.destroy');

    // Interactive Multi-Tier Goal & OKR Alignment Tree Visualizer
    Route::get('/organization/okrs/tree', [OkrController::class, 'index'])->name('organization.okrs.tree');
    Route::post('/organization/okrs/objectives', [OkrController::class, 'storeObjective'])->name('organization.okrs.objectives.store');
    Route::put('/organization/okrs/objectives/{objective}', [OkrController::class, 'updateObjective'])->name('organization.okrs.objectives.update');
    Route::delete('/organization/okrs/objectives/{objective}', [OkrController::class, 'destroyObjective'])->name('organization.okrs.objectives.destroy');
    Route::post('/organization/okrs/objectives/{objective}/key-results', [OkrController::class, 'storeKeyResult'])->name('organization.okrs.key-results.store');
    Route::put('/organization/okrs/key-results/{keyResult}', [OkrController::class, 'updateKeyResult'])->name('organization.okrs.key-results.update');
    Route::delete('/organization/okrs/key-results/{keyResult}', [OkrController::class, 'destroyKeyResult'])->name('organization.okrs.key-results.destroy');
    Route::post('/organization/okrs/key-results/{keyResult}/link-task', [OkrController::class, 'linkTask'])->name('organization.okrs.key-results.link-task');
    Route::delete('/organization/okrs/key-results/{keyResult}/tasks/{task}', [OkrController::class, 'unlinkTask'])->name('organization.okrs.key-results.unlink-task');

    // Comprehensive Enterprise Cost Allocation & Profitability Analytics Hub
    Route::get('/organization/financials/cost-allocation', [CostAllocationController::class, 'index'])->name('organization.financials.cost-allocation.index');
    Route::post('/organization/financials/cost-centers', [CostAllocationController::class, 'storeCostCenter'])->name('organization.financials.cost-centers.store');
    Route::put('/organization/financials/cost-centers/{costCenter}', [CostAllocationController::class, 'updateCostCenter'])->name('organization.financials.cost-centers.update');
    Route::delete('/organization/financials/cost-centers/{costCenter}', [CostAllocationController::class, 'destroyCostCenter'])->name('organization.financials.cost-centers.destroy');
    Route::post('/organization/financials/cost-centers/{costCenter}/allocate', [CostAllocationController::class, 'allocateProject'])->name('organization.financials.cost-centers.allocate');
    Route::delete('/organization/financials/allocations/{allocationId}', [CostAllocationController::class, 'destroyAllocation'])->name('organization.financials.allocations.destroy');

    // Real-Time Live Event Log & Enterprise Compliance Audit Trail Streamer
    Route::get('/organization/compliance/live-stream', [LiveAuditStreamController::class, 'index'])->name('organization.compliance.live-stream.index');
    Route::get('/organization/compliance/live-stream/feed', [LiveAuditStreamController::class, 'feed'])->name('organization.compliance.live-stream.feed');
    Route::post('/organization/compliance/incidents', [LiveAuditStreamController::class, 'storeIncident'])->name('organization.compliance.incidents.store');
    Route::put('/organization/compliance/incidents/{incident}', [LiveAuditStreamController::class, 'updateIncident'])->name('organization.compliance.incidents.update');
    Route::delete('/organization/compliance/incidents/{incident}', [LiveAuditStreamController::class, 'destroyIncident'])->name('organization.compliance.incidents.destroy');
    Route::get('/organization/compliance/certification-export', [LiveAuditStreamController::class, 'exportCertification'])->name('organization.compliance.certification-export');

    // Enterprise Multi-Factor Authentication (MFA/TOTP) Enforcement & Session Security Gate
    Route::get('/organization/security/mfa-enforcement', [MfaEnforcementController::class, 'index'])->name('organization.security.mfa-enforcement.index');
    Route::put('/organization/security/mfa-enforcement', [MfaEnforcementController::class, 'update'])->name('organization.security.mfa-enforcement.update');
    Route::post('/organization/security/mfa-enforcement/remind/{user}', [MfaEnforcementController::class, 'remind'])->name('organization.security.mfa-enforcement.remind');
    Route::post('/organization/security/mfa-enforcement/exempt/{user}', [MfaEnforcementController::class, 'exempt'])->name('organization.security.mfa-enforcement.exempt');
    Route::delete('/organization/security/mfa-enforcement/exemptions/{exemptionId}', [MfaEnforcementController::class, 'revokeExemption'])->name('organization.security.mfa-enforcement.exemptions.destroy');
    Route::post('/organization/security/mfa-enforcement/kill-switch', [MfaEnforcementController::class, 'killSwitch'])->name('organization.security.mfa-enforcement.kill-switch');

    // Dynamic Enterprise Custom Dashboard Studio & Executive Widget Builder
    Route::get('/organization/analytics/custom-dashboards', [CustomDashboardStudioController::class, 'index'])->name('organization.analytics.custom-dashboards.index');
    Route::post('/organization/analytics/custom-dashboards', [CustomDashboardStudioController::class, 'store'])->name('organization.analytics.custom-dashboards.store');
    Route::put('/organization/analytics/custom-dashboards/{dashboard}', [CustomDashboardStudioController::class, 'update'])->name('organization.analytics.custom-dashboards.update');
    Route::post('/organization/analytics/custom-dashboards/{dashboard}/duplicate', [CustomDashboardStudioController::class, 'duplicate'])->name('organization.analytics.custom-dashboards.duplicate');
    Route::post('/organization/analytics/custom-dashboards/{dashboard}/toggle-star', [CustomDashboardStudioController::class, 'toggleStar'])->name('organization.analytics.custom-dashboards.toggle-star');
    Route::delete('/organization/analytics/custom-dashboards/{dashboard}', [CustomDashboardStudioController::class, 'destroy'])->name('organization.analytics.custom-dashboards.destroy');

    // Automated Enterprise SLA Breach Forecasting & Customer Support Escalation Engine
    Route::get('/organization/sla/forecast', [SlaBreachForecastController::class, 'index'])->name('organization.sla.forecast.index');
    Route::post('/organization/sla/forecast/tasks/{task}/escalate', [SlaBreachForecastController::class, 'escalate'])->name('organization.sla.forecast.escalate');
    Route::post('/organization/sla/forecast/tasks/{task}/mitigate', [SlaBreachForecastController::class, 'mitigate'])->name('organization.sla.forecast.mitigate');

    // Automated Continuous Integration / Continuous Deployment (CI/CD) Pipeline & Deployment Gate Orchestrator
    Route::get('/organization/devops/pipelines', [CicdPipelineController::class, 'index'])->name('organization.devops.pipelines.index');
    Route::post('/organization/devops/pipelines/configs', [CicdPipelineController::class, 'storeConfig'])->name('organization.devops.pipelines.configs.store');
    Route::post('/organization/devops/pipelines/configs/{config}/trigger', [CicdPipelineController::class, 'trigger'])->name('organization.devops.pipelines.trigger');
    Route::post('/organization/devops/pipelines/runs/{run}/approve-gate', [CicdPipelineController::class, 'approveGate'])->name('organization.devops.pipelines.runs.approve-gate');
    Route::post('/organization/devops/pipelines/runs/{run}/reject-gate', [CicdPipelineController::class, 'rejectGate'])->name('organization.devops.pipelines.runs.reject-gate');
    Route::post('/organization/devops/pipelines/runs/{run}/rollback', [CicdPipelineController::class, 'rollback'])->name('organization.devops.pipelines.runs.rollback');

    // Enterprise Resource Utilization & Cloud Cost Anomaly Detector
    Route::get('/organization/cloud/costs', [CloudCostAnomalyController::class, 'index'])->name('organization.cloud.costs.index');
    Route::post('/organization/cloud/costs/anomalies/{anomaly}/resolve', [CloudCostAnomalyController::class, 'resolveAnomaly'])->name('organization.cloud.costs.anomalies.resolve');
    Route::post('/organization/cloud/costs/recommendations/{recommendation}/apply', [CloudCostAnomalyController::class, 'applyRecommendation'])->name('organization.cloud.costs.recommendations.apply');
    Route::post('/organization/cloud/costs/recommendations/{recommendation}/dismiss', [CloudCostAnomalyController::class, 'dismissRecommendation'])->name('organization.cloud.costs.recommendations.dismiss');

    // AI-Driven Sprint Retrospective Action Tracker & Kaizen Improvement Engine
    Route::get('/organization/agile/kaizen', [KaizenImprovementController::class, 'index'])->name('organization.agile.kaizen.index');
    Route::post('/organization/agile/kaizen/initiatives', [KaizenImprovementController::class, 'store'])->name('organization.agile.kaizen.initiatives.store');
    Route::put('/organization/agile/kaizen/initiatives/{initiative}', [KaizenImprovementController::class, 'update'])->name('organization.agile.kaizen.initiatives.update');
    Route::post('/organization/agile/kaizen/initiatives/{initiative}/verify', [KaizenImprovementController::class, 'verify'])->name('organization.agile.kaizen.initiatives.verify');
    Route::delete('/organization/agile/kaizen/initiatives/{initiative}', [KaizenImprovementController::class, 'destroy'])->name('organization.agile.kaizen.initiatives.destroy');

    // Enterprise License Compliance, Open-Source SBOM & Software Dependency Vulnerability Scanner
    Route::get('/organization/security/sbom', [SbomScannerController::class, 'index'])->name('organization.security.sbom.index');
    Route::post('/organization/security/sbom/scan', [SbomScannerController::class, 'scan'])->name('organization.security.sbom.scan');
    Route::post('/organization/security/sbom/vulnerabilities/{vulnerability}/triage', [SbomScannerController::class, 'triage'])->name('organization.security.sbom.vulnerabilities.triage');
    Route::get('/organization/security/sbom/export', [SbomScannerController::class, 'export'])->name('organization.security.sbom.export');

    // AI-Driven Architecture Decision Record (ADR) & Technical Governance Studio
    Route::get('/organization/architecture/adr', [ArchitectureDecisionRecordController::class, 'index'])->name('organization.architecture.adr.index');
    Route::post('/organization/architecture/adr', [ArchitectureDecisionRecordController::class, 'store'])->name('organization.architecture.adr.store');
    Route::put('/organization/architecture/adr/{adr}', [ArchitectureDecisionRecordController::class, 'update'])->name('organization.architecture.adr.update');
    Route::delete('/organization/architecture/adr/{adr}', [ArchitectureDecisionRecordController::class, 'destroy'])->name('organization.architecture.adr.destroy');

    // Real-Time Developer Focus & Context Switching Radar
    Route::get('/organization/productivity/focus', [DeveloperFocusRadarController::class, 'index'])->name('organization.productivity.focus.index');
    Route::post('/organization/productivity/focus/recommendations/{recommendation}/apply', [DeveloperFocusRadarController::class, 'applyRecommendation'])->name('organization.productivity.focus.recommendations.apply');
    Route::post('/organization/productivity/focus/recommendations/{recommendation}/acknowledge', [DeveloperFocusRadarController::class, 'acknowledgeRecommendation'])->name('organization.productivity.focus.recommendations.acknowledge');

    // Enterprise Feature Flag & Progressive Rollout Orchestrator
    Route::get('/organization/devops/feature-flags', [FeatureFlagController::class, 'index'])->name('organization.devops.feature-flags.index');
    Route::post('/organization/devops/feature-flags', [FeatureFlagController::class, 'store'])->name('organization.devops.feature-flags.store');
    Route::put('/organization/devops/feature-flags/{featureFlag}', [FeatureFlagController::class, 'update'])->name('organization.devops.feature-flags.update');
    Route::post('/organization/devops/feature-flags/{featureFlag}/toggle', [FeatureFlagController::class, 'toggle'])->name('organization.devops.feature-flags.toggle');
    Route::post('/organization/devops/feature-flags/{featureFlag}/rollout', [FeatureFlagController::class, 'rollout'])->name('organization.devops.feature-flags.rollout');
    Route::post('/organization/devops/feature-flags/{featureFlag}/kill', [FeatureFlagController::class, 'kill'])->name('organization.devops.feature-flags.kill');
    Route::delete('/organization/devops/feature-flags/{featureFlag}', [FeatureFlagController::class, 'destroy'])->name('organization.devops.feature-flags.destroy');

    // Enterprise API Rate Limiter & Traffic Throttling Console
    Route::get('/organization/developer/rate-limits', [ApiRateLimiterController::class, 'index'])->name('organization.developer.rate-limits.index');
    Route::post('/organization/developer/rate-limits', [ApiRateLimiterController::class, 'store'])->name('organization.developer.rate-limits.store');
    Route::put('/organization/developer/rate-limits/{policy}', [ApiRateLimiterController::class, 'update'])->name('organization.developer.rate-limits.update');
    Route::post('/organization/developer/rate-limits/{policy}/toggle', [ApiRateLimiterController::class, 'toggleThrottling'])->name('organization.developer.rate-limits.toggle');
    Route::post('/organization/developer/rate-limits/simulate', [ApiRateLimiterController::class, 'simulate'])->name('organization.developer.rate-limits.simulate');
    Route::delete('/organization/developer/rate-limits/{policy}', [ApiRateLimiterController::class, 'destroy'])->name('organization.developer.rate-limits.destroy');

    // Real-Time Webhook Dead-Letter Queue (DLQ) & Event Replay Engine
    Route::get('/organization/developer/webhooks/dlq', [WebhookDlqController::class, 'index'])->name('organization.developer.webhooks.dlq.index');
    Route::post('/organization/developer/webhooks/dlq/{attempt}/replay', [WebhookDlqController::class, 'replay'])->name('organization.developer.webhooks.dlq.replay');
    Route::post('/organization/developer/webhooks/dlq/bulk-replay', [WebhookDlqController::class, 'bulkReplay'])->name('organization.developer.webhooks.dlq.bulk-replay');
    Route::post('/organization/developer/webhooks/endpoints', [WebhookDlqController::class, 'storeEndpoint'])->name('organization.developer.webhooks.endpoints.store');
    Route::put('/organization/developer/webhooks/endpoints/{endpoint}', [WebhookDlqController::class, 'updateEndpoint'])->name('organization.developer.webhooks.endpoints.update');
    Route::delete('/organization/developer/webhooks/endpoints/{endpoint}', [WebhookDlqController::class, 'destroyEndpoint'])->name('organization.developer.webhooks.endpoints.destroy');
    Route::delete('/organization/developer/webhooks/dlq/{attempt}', [WebhookDlqController::class, 'destroyAttempt'])->name('organization.developer.webhooks.dlq.destroy');

    // Real-Time Incident War Room, On-Call Rota & Post-Mortem Studio
    Route::get('/organization/ops/incidents', [IncidentManagementController::class, 'index'])->name('organization.ops.incidents.index');
    Route::post('/organization/ops/incidents', [IncidentManagementController::class, 'store'])->name('organization.ops.incidents.store');
    Route::post('/organization/ops/incidents/{incident}/updates', [IncidentManagementController::class, 'postUpdate'])->name('organization.ops.incidents.updates.store');
    Route::post('/organization/ops/incidents/{incident}/resolve', [IncidentManagementController::class, 'resolve'])->name('organization.ops.incidents.resolve');
    Route::post('/organization/ops/incidents/{incident}/post-mortem', [IncidentManagementController::class, 'savePostMortem'])->name('organization.ops.incidents.post-mortem.store');
    Route::post('/organization/ops/incidents/on-call-rota', [IncidentManagementController::class, 'updateRota'])->name('organization.ops.incidents.rota.update');
    Route::delete('/organization/ops/incidents/{incident}', [IncidentManagementController::class, 'destroy'])->name('organization.ops.incidents.destroy');

    // Pull Request Review SLA, Code Reviewer Load Balancer & Bottleneck Radar
    Route::get('/organization/devops/pr-reviews', [PrReviewSlaController::class, 'index'])->name('organization.devops.pr-reviews.index');
    Route::post('/organization/devops/pr-reviews', [PrReviewSlaController::class, 'store'])->name('organization.devops.pr-reviews.store');
    Route::post('/organization/devops/pr-reviews/{pr}/reassign', [PrReviewSlaController::class, 'reassign'])->name('organization.devops.pr-reviews.reassign');
    Route::post('/organization/devops/pr-reviews/{pr}/status', [PrReviewSlaController::class, 'updateStatus'])->name('organization.devops.pr-reviews.status');
    Route::post('/organization/devops/codeowners', [PrReviewSlaController::class, 'storeCodeownerRule'])->name('organization.devops.codeowners.store');
    Route::delete('/organization/devops/codeowners/{rule}', [PrReviewSlaController::class, 'destroyCodeownerRule'])->name('organization.devops.codeowners.destroy');
    Route::delete('/organization/devops/pr-reviews/{pr}', [PrReviewSlaController::class, 'destroy'])->name('organization.devops.pr-reviews.destroy');

    // Automated AI Release Notes & SemVer Changelog Publisher Studio
    Route::get('/organization/releases/publisher', [ReleasePublisherController::class, 'index'])->name('organization.releases.publisher.index');
    Route::post('/organization/releases/publisher/generate', [ReleasePublisherController::class, 'generate'])->name('organization.releases.publisher.generate');
    Route::post('/organization/releases/publisher/{publication}/publish', [ReleasePublisherController::class, 'publish'])->name('organization.releases.publisher.publish');
    Route::put('/organization/releases/publisher/{publication}', [ReleasePublisherController::class, 'update'])->name('organization.releases.publisher.update');
    Route::delete('/organization/releases/publisher/{publication}', [ReleasePublisherController::class, 'destroy'])->name('organization.releases.publisher.destroy');

    // Database Migration Drift, Index Health & Zero-Downtime Safe DDL Studio
    Route::get('/organization/database/drift', [DatabaseDriftController::class, 'index'])->name('organization.database.drift.index');
    Route::post('/organization/database/drift/scan', [DatabaseDriftController::class, 'scan'])->name('organization.database.drift.scan');
    Route::post('/organization/database/drift/{report}/resolve', [DatabaseDriftController::class, 'resolve'])->name('organization.database.drift.resolve');
    Route::post('/organization/database/drift/generate-ddl', [DatabaseDriftController::class, 'generateDdl'])->name('organization.database.drift.generate-ddl');
    Route::delete('/organization/database/drift/{report}', [DatabaseDriftController::class, 'destroy'])->name('organization.database.drift.destroy');

    // Multi-Tenant Data Residency, PII Masking & Data Redaction Studio
    Route::get('/organization/compliance/data-privacy', [DataPrivacyController::class, 'index'])->name('organization.compliance.data-privacy.index');
    Route::post('/organization/compliance/data-privacy/residency', [DataPrivacyController::class, 'updateResidency'])->name('organization.compliance.data-privacy.residency.update');
    Route::post('/organization/compliance/data-privacy/rules', [DataPrivacyController::class, 'storeRule'])->name('organization.compliance.data-privacy.rules.store');
    Route::post('/organization/compliance/data-privacy/rules/{rule}/toggle', [DataPrivacyController::class, 'toggleRule'])->name('organization.compliance.data-privacy.rules.toggle');
    Route::delete('/organization/compliance/data-privacy/rules/{rule}', [DataPrivacyController::class, 'destroyRule'])->name('organization.compliance.data-privacy.rules.destroy');
    Route::post('/organization/compliance/data-privacy/dsar', [DataPrivacyController::class, 'storeDsar'])->name('organization.compliance.data-privacy.dsar.store');
    Route::post('/organization/compliance/data-privacy/dsar/{dsar}/process', [DataPrivacyController::class, 'processDsar'])->name('organization.compliance.data-privacy.dsar.process');
    Route::post('/organization/compliance/data-privacy/test-mask', [DataPrivacyController::class, 'testMask'])->name('organization.compliance.data-privacy.test-mask');

    // Live Executive KPI Boardroom & Investor Pitch Export Studio
    Route::get('/organization/reports/boardroom', [ExecutiveBoardroomController::class, 'index'])->name('organization.reports.boardroom.index');
    Route::post('/organization/reports/boardroom', [ExecutiveBoardroomController::class, 'store'])->name('organization.reports.boardroom.store');
    Route::put('/organization/reports/boardroom/{briefing}', [ExecutiveBoardroomController::class, 'update'])->name('organization.reports.boardroom.update');
    Route::post('/organization/reports/boardroom/{briefing}/finalize', [ExecutiveBoardroomController::class, 'finalize'])->name('organization.reports.boardroom.finalize');
    Route::delete('/organization/reports/boardroom/{briefing}', [ExecutiveBoardroomController::class, 'destroy'])->name('organization.reports.boardroom.destroy');

    // Unified Search & Global Command Palette (Spotlight ⌘K Studio)
    Route::get('/search/omnibar', [OmniSearchController::class, 'index'])->name('search.omnibar.index');
    Route::get('/search/omnibar/query', [OmniSearchController::class, 'query'])->name('search.omnibar.query');
    Route::post('/search/omnibar/click', [OmniSearchController::class, 'recordClick'])->name('search.omnibar.click');
    Route::post('/search/omnibar/clear', [OmniSearchController::class, 'clearHistory'])->name('search.omnibar.clear');

    // Interactive API Playground & Multi-Language SDK Generator Studio
    Route::get('/organization/developer/api-playground', [ApiPlaygroundController::class, 'index'])->name('organization.developer.api-playground.index');
    Route::post('/organization/developer/api-playground/execute', [ApiPlaygroundController::class, 'execute'])->name('organization.developer.api-playground.execute');
    Route::post('/organization/developer/api-playground/presets', [ApiPlaygroundController::class, 'storePreset'])->name('organization.developer.api-playground.presets.store');
    Route::delete('/organization/developer/api-playground/presets/{preset}', [ApiPlaygroundController::class, 'destroyPreset'])->name('organization.developer.api-playground.presets.destroy');

    // Enterprise Resilience & Chaos Engineering GameDay Studio
    Route::get('/organization/sre/chaos-gameday', [ChaosGameDayController::class, 'index'])->name('organization.sre.chaos-gameday.index');
    Route::post('/organization/sre/chaos-gameday', [ChaosGameDayController::class, 'store'])->name('organization.sre.chaos-gameday.store');
    Route::post('/organization/sre/chaos-gameday/{experiment}/run', [ChaosGameDayController::class, 'run'])->name('organization.sre.chaos-gameday.run');
    Route::post('/organization/sre/chaos-gameday/{experiment}/abort', [ChaosGameDayController::class, 'abort'])->name('organization.sre.chaos-gameday.abort');
    Route::delete('/organization/sre/chaos-gameday/{experiment}', [ChaosGameDayController::class, 'destroy'])->name('organization.sre.chaos-gameday.destroy');

    // Multi-Environment Deployment Pipeline Tracker & Rollout Risk Analyzer Studio
    Route::get('/organization/sre/deployments', [DeploymentPipelineController::class, 'index'])->name('organization.sre.deployments.index');
    Route::post('/organization/sre/deployments', [DeploymentPipelineController::class, 'store'])->name('organization.sre.deployments.store');
    Route::post('/organization/sre/deployments/{pipeline}/promote', [DeploymentPipelineController::class, 'promote'])->name('organization.sre.deployments.promote');
    Route::post('/organization/sre/deployments/{pipeline}/rollback', [DeploymentPipelineController::class, 'rollback'])->name('organization.sre.deployments.rollback');
    Route::delete('/organization/sre/deployments/{pipeline}', [DeploymentPipelineController::class, 'destroy'])->name('organization.sre.deployments.destroy');

    // On-Call Rotation Manager & Escalation Policy Studio
    Route::get('/organization/sre/oncall', [OncallScheduleController::class, 'index'])->name('organization.sre.oncall.index');
    Route::post('/organization/sre/oncall', [OncallScheduleController::class, 'store'])->name('organization.sre.oncall.store');
    Route::post('/organization/sre/oncall/{schedule}/page', [OncallScheduleController::class, 'page'])->name('organization.sre.oncall.page');
    Route::post('/organization/sre/oncall/logs/{log}/acknowledge', [OncallScheduleController::class, 'acknowledge'])->name('organization.sre.oncall.acknowledge');
    Route::post('/organization/sre/oncall/logs/{log}/resolve', [OncallScheduleController::class, 'resolve'])->name('organization.sre.oncall.resolve');
    Route::delete('/organization/sre/oncall/{schedule}', [OncallScheduleController::class, 'destroy'])->name('organization.sre.oncall.destroy');

    // Synthetic Monitoring & Global Uptime Probe Studio
    Route::get('/organization/sre/synthetics', [SyntheticMonitorController::class, 'index'])->name('organization.sre.synthetics.index');
    Route::post('/organization/sre/synthetics', [SyntheticMonitorController::class, 'store'])->name('organization.sre.synthetics.store');
    Route::post('/organization/sre/synthetics/{monitor}/probe', [SyntheticMonitorController::class, 'probe'])->name('organization.sre.synthetics.probe');
    Route::post('/organization/sre/synthetics/{monitor}/toggle', [SyntheticMonitorController::class, 'toggleStatus'])->name('organization.sre.synthetics.toggle');
    Route::delete('/organization/sre/synthetics/{monitor}', [SyntheticMonitorController::class, 'destroy'])->name('organization.sre.synthetics.destroy');

    // Automated Incident Remediation Runbooks & Operational Playbook Studio
    Route::get('/organization/sre/runbooks', [IncidentRunbookController::class, 'index'])->name('organization.sre.runbooks.index');
    Route::post('/organization/sre/runbooks', [IncidentRunbookController::class, 'store'])->name('organization.sre.runbooks.store');
    Route::post('/organization/sre/runbooks/{runbook}/execute', [IncidentRunbookController::class, 'execute'])->name('organization.sre.runbooks.execute');
    Route::delete('/organization/sre/runbooks/{runbook}', [IncidentRunbookController::class, 'destroy'])->name('organization.sre.runbooks.destroy');

    // Distributed Tracing, Service Mesh Topology & Latency Profiler Studio
    Route::get('/organization/sre/traces', [DistributedTraceController::class, 'index'])->name('organization.sre.traces.index');
    Route::post('/organization/sre/traces', [DistributedTraceController::class, 'store'])->name('organization.sre.traces.store');
    Route::get('/organization/sre/traces/{trace}', [DistributedTraceController::class, 'show'])->name('organization.sre.traces.show');
    Route::delete('/organization/sre/traces/{trace}', [DistributedTraceController::class, 'destroy'])->name('organization.sre.traces.destroy');

    // AI-Powered Automated Root Cause Analysis (RCA) & Smart Post-Mortem Copilot
    Route::get('/organization/sre/rca', [RootCauseAnalysisController::class, 'index'])->name('organization.sre.rca.index');
    Route::post('/organization/sre/rca/analyze', [RootCauseAnalysisController::class, 'store'])->name('organization.sre.rca.analyze');
    Route::get('/organization/sre/rca/{rca}', [RootCauseAnalysisController::class, 'show'])->name('organization.sre.rca.show');
    Route::post('/organization/sre/rca/{rca}/verify', [RootCauseAnalysisController::class, 'verify'])->name('organization.sre.rca.verify');
    Route::get('/organization/sre/rca/{rca}/export', [RootCauseAnalysisController::class, 'export'])->name('organization.sre.rca.export');
    Route::post('/organization/sre/rca/{rca}/action-items', [RootCauseAnalysisController::class, 'storeActionItem'])->name('organization.sre.rca.action-items.store');
    Route::patch('/organization/sre/rca/action-items/{actionItem}', [RootCauseAnalysisController::class, 'updateActionItem'])->name('organization.sre.rca.action-items.update');
    Route::delete('/organization/sre/rca/{rca}', [RootCauseAnalysisController::class, 'destroy'])->name('organization.sre.rca.destroy');

    // Centralized File Manager & Digital Asset Management
    Route::get('/files', [FileManagerController::class, 'index'])->name('files.index');
    Route::get('/projects/{project}/files', [FileManagerController::class, 'index'])->name('projects.files');
    Route::post('/files/upload', [FileManagerController::class, 'upload'])->name('files.upload');
    Route::post('/files/folders', [FileManagerController::class, 'storeFolder'])->name('files.folders.store');
    Route::delete('/files/{file}', [FileManagerController::class, 'destroyFile'])->name('files.destroy');
    Route::delete('/files/folders/{folder}', [FileManagerController::class, 'destroyFolder'])->name('files.folders.destroy');
    Route::get('/files/{file}/download', [FileManagerController::class, 'download'])->name('files.download');

    // Personal Work Inbox & Notification Feed
    Route::get('/inbox', [InboxController::class, 'index'])->name('inbox.index');
    Route::post('/inbox/{id}/read', [InboxController::class, 'markAsRead'])->name('inbox.read');
    Route::post('/inbox/mark-all-read', [InboxController::class, 'markAllRead'])->name('inbox.mark-all-read');
    Route::post('/inbox/{id}/snooze', [InboxController::class, 'snooze'])->name('inbox.snooze');
    Route::post('/inbox/tasks/{task}/complete', [InboxController::class, 'completeTask'])->name('inbox.tasks.complete');

    // Enterprise Identity, SSO & Session Security
    Route::get('/organization/sso', [SsoController::class, 'index'])->name('organization.sso');
    Route::post('/organization/sso/saml', [SsoController::class, 'updateSaml'])->name('organization.sso.saml');
    Route::post('/organization/sso/oidc', [SsoController::class, 'updateOidc'])->name('organization.sso.oidc');
    Route::post('/organization/sso/toggle-enforce', [SsoController::class, 'toggleEnforce'])->name('organization.sso.toggle-enforce');
    Route::post('/organization/sso/domains', [SsoController::class, 'addDomain'])->name('organization.sso.domains.add');
    Route::delete('/organization/sso/domains', [SsoController::class, 'removeDomain'])->name('organization.sso.domains.remove');
    Route::get('/organization/sso/metadata', [SsoController::class, 'downloadSpMetadata'])->name('organization.sso.metadata');

    Route::get('/organization/security-settings', [SessionSecurityController::class, 'index'])->name('organization.security-settings');
    Route::put('/organization/security-settings/policy', [SessionSecurityController::class, 'updatePolicy'])->name('organization.security-settings.policy');
    Route::post('/organization/security-settings/ip', [SessionSecurityController::class, 'addIp'])->name('organization.security-settings.ip.add');
    Route::delete('/organization/security-settings/ip', [SessionSecurityController::class, 'removeIp'])->name('organization.security-settings.ip.remove');
    Route::delete('/organization/security-settings/sessions/{session}', [SessionSecurityController::class, 'revokeSession'])->name('organization.security-settings.sessions.revoke');
    Route::post('/organization/security-settings/sessions/revoke-others', [SessionSecurityController::class, 'revokeOtherSessions'])->name('organization.security-settings.sessions.revoke-others');

    // Enterprise Billing, Subscriptions & Invoices
    Route::get('/organization/billing', [BillingController::class, 'index'])->name('organization.billing');
    Route::post('/organization/billing/plan', [BillingController::class, 'changePlan'])->name('organization.billing.plan');
    Route::post('/organization/billing/payment-method', [BillingController::class, 'updatePaymentMethod'])->name('organization.billing.payment-method');
    Route::get('/organization/billing/invoices/{invoice}/download', [BillingController::class, 'downloadInvoice'])->name('organization.billing.invoices.download');

    // Enterprise Data Retention, Compliance & GDPR Exports
    Route::get('/organization/data-retention', [ComplianceController::class, 'index'])->name('organization.data-retention');
    Route::put('/organization/data-retention/policy', [ComplianceController::class, 'updatePolicy'])->name('organization.data-retention.policy');
    Route::post('/organization/data-retention/purge', [ComplianceController::class, 'purgeNow'])->name('organization.data-retention.purge');
    Route::post('/organization/data-retention/export', [ComplianceController::class, 'requestExport'])->name('organization.data-retention.export');
    Route::get('/organization/data-retention/exports/{export}/download', [ComplianceController::class, 'downloadExport'])->name('organization.data-retention.exports.download');

    // Live System Status, Health Monitor & Kinetic Error States
    Route::get('/system-status', [SystemStatusController::class, 'index'])->name('system.status');

    // Team Collaboration Performance & Sprint Velocity Hub
    Route::get('/reports/collaboration', [CollaborationReportController::class, 'index'])->name('reports.collaboration');
    Route::get('/reports/collaboration/export', [CollaborationReportController::class, 'export'])->name('reports.collaboration.export');

    // Kinetic Empty States & FTUX Component Gallery
    Route::get('/empty-states', [EmptyStateGalleryController::class, 'index'])->name('system.empty-states');

    // Kinetic Toast Notification & Progressive Feedback Hub
    Route::get('/system/feedback', [SystemFeedbackController::class, 'index'])->name('system.feedback');

    // Multi-Step Interactive Onboarding Wizard
    Route::get('/onboarding', [OnboardingController::class, 'index'])->name('onboarding');
    Route::post('/onboarding/complete', [OnboardingController::class, 'complete'])->name('onboarding.complete');

    // Living Design System & Component Library Hub
    Route::get('/design-system', [DesignSystemController::class, 'index'])->name('system.design-system');

    // Mobile Experience & Kinetic Touch Companion Hub
    Route::get('/mobile', [MobileCompanionController::class, 'index'])->name('mobile.dashboard');

    // Async Daily Standup, AI Executive Briefing & Live Speaker Timer Hub
    Route::get('/scrum/daily-standup', [DailyStandupController::class, 'index'])->name('scrum.standup');
    Route::post('/scrum/daily-standup', [DailyStandupController::class, 'store'])->name('scrum.standup.store');
    Route::post('/scrum/daily-standup/synthesize', [DailyStandupController::class, 'synthesize'])->name('scrum.standup.synthesize');

    // Automated Release Notes & Changelog Hub
    Route::get('/releases', [ReleaseController::class, 'index'])->name('releases.index');
    Route::post('/releases', [ReleaseController::class, 'store'])->name('releases.store');
    Route::put('/releases/{release}', [ReleaseController::class, 'update'])->name('releases.update');
    Route::post('/releases/{release}/publish', [ReleaseController::class, 'publish'])->name('releases.publish');
    Route::delete('/releases/{release}', [ReleaseController::class, 'destroy'])->name('releases.destroy');
    Route::post('/releases/generate-ai', [ReleaseController::class, 'generate'])->name('releases.generate');

    // Custom Dashboard Widget Builder & Executive BI Dashboard
    Route::get('/dashboard/builder', [DashboardBuilderController::class, 'index'])->name('dashboard.builder');
    Route::post('/dashboard/builder/save', [DashboardBuilderController::class, 'save'])->name('dashboard.builder.save');
    Route::post('/dashboard/builder/reset', [DashboardBuilderController::class, 'reset'])->name('dashboard.builder.reset');
});

require __DIR__.'/settings.php';
