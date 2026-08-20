<?php

namespace App\Services\Compliance;

use App\Models\Attachment;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\OrganizationComplianceExport;
use App\Models\OrganizationRetentionPolicy;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class DataRetentionService
{
    /**
     * Get or create data retention policy for an organization.
     */
    public function getOrCreatePolicy(Organization $organization): OrganizationRetentionPolicy
    {
        return OrganizationRetentionPolicy::firstOrCreate(
            ['organization_id' => $organization->id],
            [
                'audit_logs_retention_days' => 365,
                'deleted_tasks_retention_days' => 30,
                'orphan_attachments_retention_days' => 0,
                'auto_purge_enabled' => true,
                'last_purged_at' => now()->subDays(2),
            ]
        );
    }

    /**
     * Update data retention policy.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePolicy(Organization $organization, array $data): OrganizationRetentionPolicy
    {
        $policy = $this->getOrCreatePolicy($organization);

        $policy->update([
            'audit_logs_retention_days' => (int) ($data['audit_logs_retention_days'] ?? $policy->audit_logs_retention_days),
            'deleted_tasks_retention_days' => (int) ($data['deleted_tasks_retention_days'] ?? $policy->deleted_tasks_retention_days),
            'orphan_attachments_retention_days' => (int) ($data['orphan_attachments_retention_days'] ?? $policy->orphan_attachments_retention_days),
            'auto_purge_enabled' => (bool) ($data['auto_purge_enabled'] ?? $policy->auto_purge_enabled),
        ]);

        return $policy->fresh();
    }

    /**
     * Execute on-demand data purge of expired records.
     *
     * @return array<string, mixed>
     */
    public function executePurge(Organization $organization, User $actor): array
    {
        $policy = $this->getOrCreatePolicy($organization);

        // 1. Force delete soft-deleted tasks older than threshold
        $taskThreshold = now()->subDays($policy->deleted_tasks_retention_days);
        $purgedTasks = Task::where('organization_id', $organization->id)
            ->onlyTrashed()
            ->where('deleted_at', '<=', $taskThreshold)
            ->forceDelete();

        // 2. Delete orphan attachments
        $purgedAttachments = Attachment::where('organization_id', $organization->id)
            ->whereNull('attachable_id')
            ->whereNull('folder_id')
            ->where('created_at', '<=', now()->subDays(max($policy->orphan_attachments_retention_days, 0)))
            ->delete();

        // 3. Purge old audit logs if configured
        $purgedLogs = 0;
        if ($policy->audit_logs_retention_days > 0 && $policy->audit_logs_retention_days < 3650) {
            $purgedLogs = OrganizationAuditLog::where('organization_id', $organization->id)
                ->where('created_at', '<=', now()->subDays($policy->audit_logs_retention_days))
                ->delete();
        }

        $policy->update(['last_purged_at' => now()]);

        // Record audit event for compliance tracking
        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $actor->id,
            'event_category' => 'security',
            'action' => 'data_retention.purge_executed',
            'resource_type' => OrganizationRetentionPolicy::class,
            'resource_id' => $policy->id,
            'changes' => [
                'purged_tasks_count' => $purgedTasks,
                'purged_attachments_count' => $purgedAttachments,
                'purged_audit_logs_count' => $purgedLogs,
            ],
            'ip_address' => request()->ip() ?? '127.0.0.1',
            'user_agent' => request()->userAgent(),
            'status' => 'success',
        ]);

        return [
            'purged_tasks' => $purgedTasks,
            'purged_attachments' => $purgedAttachments,
            'purged_logs' => $purgedLogs,
            'last_purged_at' => now()->translatedFormat('d M Y H:i'),
        ];
    }

    /**
     * Generate GDPR Full Workspace Data Export package.
     */
    public function createDataExport(Organization $organization, User $user, string $type = 'gdpr_full'): OrganizationComplianceExport
    {
        $projects = Project::where('organization_id', $organization->id)->with('tasks')->get();
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))->get(['id', 'name', 'email']);
        $auditLogsCount = OrganizationAuditLog::where('organization_id', $organization->id)->count();

        $exportData = [
            'metadata' => [
                'organization_id' => $organization->id,
                'organization_name' => $organization->name,
                'exported_by' => $user->email,
                'exported_at' => now()->toIso8601String(),
                'format_version' => '1.0',
                'standard' => 'GDPR / ISO 27001 Data Portability',
            ],
            'summary' => [
                'total_projects' => $projects->count(),
                'total_tasks' => Task::where('organization_id', $organization->id)->count(),
                'total_members' => $members->count(),
                'total_audit_logs' => $auditLogsCount,
            ],
            'members' => $members,
            'projects' => $projects,
        ];

        $jsonContent = json_encode($exportData, JSON_PRETTY_PRINT);
        $fileName = 'exports/gdpr-export-'.$organization->id.'-'.now()->timestamp.'.json';
        Storage::disk('local')->put($fileName, $jsonContent);

        return OrganizationComplianceExport::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'export_type' => $type,
            'status' => 'completed',
            'file_path' => $fileName,
            'file_size_bytes' => strlen($jsonContent),
            'summary' => $exportData['summary'],
            'expires_at' => now()->addDays(7),
        ]);
    }

    /**
     * Get all compliance exports for an organization.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getExports(Organization $organization): array
    {
        return OrganizationComplianceExport::where('organization_id', $organization->id)
            ->with('user')
            ->orderByDesc('created_at')
            ->get()
            ->map(function (OrganizationComplianceExport $exp) {
                return [
                    'id' => $exp->id,
                    'export_type' => $exp->export_type === 'gdpr_full' ? 'GDPR Full Archive' : ucfirst($exp->export_type),
                    'status' => $exp->status,
                    'file_size_formatted' => round($exp->file_size_bytes / 1024, 1).' KB',
                    'requested_by' => $exp->user?->name ?? 'System',
                    'created_at_formatted' => $exp->created_at?->translatedFormat('d M Y H:i') ?? '-',
                    'expires_at_formatted' => $exp->expires_at?->translatedFormat('d M Y') ?? '-',
                    'summary' => $exp->summary,
                    'download_url' => route('organization.data-retention.exports.download', $exp->id),
                ];
            })
            ->toArray();
    }
}
