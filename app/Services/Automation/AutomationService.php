<?php

namespace App\Services\Automation;

use App\Models\AutomationLog;
use App\Models\AutomationRule;
use App\Models\Organization;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Notifications\AutomationTriggeredNotification;
use Exception;
use Illuminate\Support\Facades\Http;

class AutomationService
{
    public function __construct() {}

    /**
     * Evaluate and execute all matching active automation rules for a triggered event.
     *
     * @param  array<string, mixed>  $payload
     * @return array<int, array<string, mixed>>
     */
    public function evaluateAndExecute(
        string $eventName,
        Organization $organization,
        array $payload,
        ?Project $project = null
    ): array {
        $query = AutomationRule::where('organization_id', $organization->id)
            ->where('is_active', true)
            ->where('trigger_event', $eventName);

        if ($project) {
            $query->where(function ($q) use ($project) {
                $q->whereNull('project_id')->orWhere('project_id', $project->id);
            });
        }

        $rules = $query->get();
        $executionResults = [];

        foreach ($rules as $rule) {
            $result = $this->executeSingleRule($rule, $eventName, $payload);
            $executionResults[] = $result;
        }

        return $executionResults;
    }

    /**
     * Execute a single automation rule against the payload.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function executeSingleRule(
        AutomationRule $rule,
        string $eventName,
        array $payload,
        bool $isTestRun = false
    ): array {
        $conditionsMet = $this->evaluateConditions($rule->conditions ?? [], $payload);

        if (! $conditionsMet) {
            if (! $isTestRun) {
                AutomationLog::create([
                    'automation_rule_id' => $rule->id,
                    'event_name' => $eventName,
                    'status' => 'skipped',
                    'input_payload' => $payload,
                    'output_summary' => ['message' => 'Kondisi tidak terpenuhi.'],
                    'executed_at' => now(),
                ]);
            }

            return [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'status' => 'skipped',
                'message' => 'Kondisi tidak terpenuhi.',
            ];
        }

        $actionsExecuted = [];
        $hasError = false;
        $errorMessage = null;

        try {
            foreach ($rule->actions as $action) {
                $actResult = $this->dispatchAction($action, $payload, $isTestRun);
                $actionsExecuted[] = $actResult;
            }

            if (! $isTestRun) {
                $rule->increment('execution_count');
                $rule->update(['last_executed_at' => now()]);

                AutomationLog::create([
                    'automation_rule_id' => $rule->id,
                    'event_name' => $eventName,
                    'status' => 'success',
                    'input_payload' => $payload,
                    'output_summary' => [
                        'actions_count' => count($actionsExecuted),
                        'actions' => $actionsExecuted,
                    ],
                    'executed_at' => now(),
                ]);
            }

            return [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'status' => 'success',
                'actions_executed' => $actionsExecuted,
            ];
        } catch (Exception $e) {
            $hasError = true;
            $errorMessage = $e->getMessage();

            if (! $isTestRun) {
                AutomationLog::create([
                    'automation_rule_id' => $rule->id,
                    'event_name' => $eventName,
                    'status' => 'failed',
                    'input_payload' => $payload,
                    'output_summary' => ['actions_partial' => $actionsExecuted],
                    'error_message' => $errorMessage,
                    'executed_at' => now(),
                ]);
            }

            return [
                'rule_id' => $rule->id,
                'rule_name' => $rule->name,
                'status' => 'failed',
                'error' => $errorMessage,
            ];
        }
    }

    /**
     * Evaluate rule conditions array against payload.
     *
     * @param  array<int, array<string, mixed>>  $conditions
     * @param  array<string, mixed>  $payload
     */
    public function evaluateConditions(array $conditions, array $payload): bool
    {
        if (empty($conditions)) {
            return true; // No condition = unconditional trigger
        }

        foreach ($conditions as $cond) {
            $field = $cond['field'] ?? '';
            $operator = $cond['operator'] ?? 'equals';
            $expected = $cond['value'] ?? null;

            $actual = $payload[$field] ?? null;

            $match = match ($operator) {
                'equals', '==' => (string) $actual === (string) $expected,
                'not_equals', '!=' => (string) $actual !== (string) $expected,
                'contains' => is_string($actual) && str_contains(strtolower($actual), strtolower((string) $expected)),
                'greater_than', '>' => is_numeric($actual) && is_numeric($expected) && (float) $actual > (float) $expected,
                'less_than', '<' => is_numeric($actual) && is_numeric($expected) && (float) $actual < (float) $expected,
                'is_true' => (bool) $actual === true,
                'is_false' => (bool) $actual === false,
                default => (string) $actual === (string) $expected,
            };

            if (! $match) {
                return false;
            }
        }

        return true;
    }

    /**
     * Dispatch an individual automation action.
     *
     * @param  array<string, mixed>  $action
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function dispatchAction(array $action, array $payload, bool $isTestRun = false): array
    {
        $type = $action['type'] ?? 'unknown';
        $config = $action['config'] ?? [];

        $task = null;
        if (isset($payload['task_id'])) {
            $task = Task::find($payload['task_id']);
        } elseif (isset($payload['task']) && $payload['task'] instanceof Task) {
            $task = $payload['task'];
        }

        return match ($type) {
            'update_task_field' => $this->actionUpdateTaskField($task, $config, $isTestRun),
            'assign_user' => $this->actionAssignUser($task, $config, $payload, $isTestRun),
            'send_notification' => $this->actionSendNotification($config, $payload, $isTestRun),
            'dispatch_webhook' => $this->actionDispatchWebhook($config, $payload, $isTestRun),
            'ai_auto_summary' => $this->actionAiAutoSummary($task, $config, $isTestRun),
            default => [
                'type' => $type,
                'status' => 'skipped',
                'detail' => 'Tipe aksi tidak dikenali.',
            ],
        };
    }

    /**
     * Action: Update Task Field
     */
    protected function actionUpdateTaskField(?Task $task, array $config, bool $isTestRun): array
    {
        $field = $config['field'] ?? null;
        $value = $config['value'] ?? null;

        if (! $task || ! $field) {
            return ['type' => 'update_task_field', 'status' => 'skipped', 'detail' => 'Task atau kolom tidak ditemukan.'];
        }

        if (! $isTestRun) {
            $task->update([$field => $value]);
        }

        return [
            'type' => 'update_task_field',
            'status' => 'executed',
            'field' => $field,
            'new_value' => $value,
        ];
    }

    /**
     * Action: Assign User
     */
    protected function actionAssignUser(?Task $task, array $config, array $payload, bool $isTestRun): array
    {
        $userId = $config['user_id'] ?? null;

        // Auto assign to project lead if specified
        if ($userId === 'project_lead' && isset($payload['project_lead_id'])) {
            $userId = $payload['project_lead_id'];
        }

        if (! $task || ! $userId) {
            return ['type' => 'assign_user', 'status' => 'skipped', 'detail' => 'User ID atau tugas tidak valid.'];
        }

        if (! $isTestRun) {
            $task->assignees()->syncWithoutDetaching([$userId]);
        }

        return [
            'type' => 'assign_user',
            'status' => 'executed',
            'assigned_user_id' => $userId,
        ];
    }

    /**
     * Action: Send Notification
     */
    protected function actionSendNotification(array $config, array $payload, bool $isTestRun): array
    {
        $title = $config['title'] ?? 'Otomasi Alur Kerja';
        $body = $config['body'] ?? 'Pemberitahuan otomatis dari sistem Pandu.';
        $recipientId = $config['user_id'] ?? ($payload['actor_id'] ?? null);

        if ($recipientId && ! $isTestRun) {
            $recipient = User::find($recipientId);
            if ($recipient) {
                $recipient->notify(new AutomationTriggeredNotification($title, $body, $payload));
            }
        }

        return [
            'type' => 'send_notification',
            'status' => 'executed',
            'title' => $title,
            'recipient_id' => $recipientId,
        ];
    }

    /**
     * Action: Dispatch Webhook
     */
    protected function actionDispatchWebhook(array $config, array $payload, bool $isTestRun): array
    {
        $url = $config['url'] ?? null;
        if (! $url) {
            return ['type' => 'dispatch_webhook', 'status' => 'skipped', 'detail' => 'URL Webhook kosong.'];
        }

        if (! $isTestRun) {
            try {
                Http::timeout(5)->post($url, [
                    'event' => 'automation.triggered',
                    'timestamp' => now()->toIso8601String(),
                    'payload' => $payload,
                ]);
            } catch (Exception) {
                // Non-blocking webhook failure
            }
        }

        return [
            'type' => 'dispatch_webhook',
            'status' => 'executed',
            'url' => $url,
        ];
    }

    /**
     * Action: AI Auto Summary
     */
    protected function actionAiAutoSummary(?Task $task, array $config, bool $isTestRun): array
    {
        if (! $task) {
            return ['type' => 'ai_auto_summary', 'status' => 'skipped', 'detail' => 'Tugas tidak ditemukan.'];
        }

        return [
            'type' => 'ai_auto_summary',
            'status' => 'executed',
            'summary' => "AI auto-summary: Tugas [{$task->key}] {$task->title} telah diproses secara otomatis oleh aturan otomasi.",
        ];
    }

    /**
     * Perform dry-run test execution for a rule.
     *
     * @param  array<string, mixed>  $samplePayload
     * @return array<string, mixed>
     */
    public function testRun(AutomationRule $rule, array $samplePayload): array
    {
        return $this->executeSingleRule($rule, $rule->trigger_event, $samplePayload, true);
    }
}
