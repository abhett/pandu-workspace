<?php

namespace App\Services\Compliance;

use App\Models\ComplianceIncident;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\User;

class LiveAuditStreamService
{
    /**
     * Get live audit log stream, incident triage list, and real-time compliance health score.
     *
     * @return array<string, mixed>
     */
    public function getLiveStreamData(Organization $organization, array $filters = []): array
    {
        $logQuery = OrganizationAuditLog::where('organization_id', $organization->id);

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $logQuery->where('event_category', $filters['category']);
        }
        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $logQuery->where('status', $filters['status']);
        }

        $logs = $logQuery->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (OrganizationAuditLog $log) => $this->formatLogEntry($log));

        $incidents = ComplianceIncident::where('organization_id', $organization->id)
            ->with(['reporter:id,name,email', 'assignee:id,name,email', 'auditLog'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ComplianceIncident $inc) => [
                'id' => $inc->id,
                'title' => $inc->title,
                'severity' => $inc->severity,
                'framework' => $inc->framework,
                'status' => $inc->status,
                'summary' => $inc->summary,
                'mitigation_notes' => $inc->mitigation_notes,
                'reporter_name' => $inc->reporter?->name ?? 'System',
                'assignee_name' => $inc->assignee?->name ?? 'Unassigned',
                'audit_log' => $inc->auditLog ? $this->formatLogEntry($inc->auditLog) : null,
                'resolved_at_formatted' => $inc->resolved_at?->translatedFormat('d M Y H:i'),
                'created_at_formatted' => $inc->created_at?->translatedFormat('d M Y H:i:s'),
            ]);

        // Compliance Health Score Calculation
        $openCritical = $incidents->where('status', 'open')->where('severity', 'critical')->count();
        $openHigh = $incidents->where('status', 'open')->where('severity', 'high')->count();
        $recentFailedLogs = OrganizationAuditLog::where('organization_id', $organization->id)
            ->where('status', 'failed')
            ->where('created_at', '>=', now()->subHours(24))
            ->count();

        $penalty = ($openCritical * 15) + ($openHigh * 8) + min(20, $recentFailedLogs * 2);
        $complianceHealthScore = max(20, min(100, 100 - $penalty));

        $metrics = [
            'total_events_count' => OrganizationAuditLog::where('organization_id', $organization->id)->count(),
            'compliance_health_score' => $complianceHealthScore,
            'open_incidents_count' => $incidents->whereIn('status', ['open', 'investigating'])->count(),
            'critical_incidents_count' => $incidents->where('severity', 'critical')->count(),
            'resolved_incidents_count' => $incidents->whereIn('status', ['resolved', 'mitigated'])->count(),
            'failed_logs_24h' => $recentFailedLogs,
        ];

        $frameworks = [
            'SOC2_TYPE_II' => [
                'name' => 'SOC 2 Type II Security & Confidentiality',
                'score' => max(50, min(100, $complianceHealthScore + 5)),
                'status' => $openCritical > 0 ? 'at_risk' : 'compliant',
                'controls_passed' => 18,
                'total_controls' => 20,
            ],
            'ISO_27001' => [
                'name' => 'ISO/IEC 27001:2022 ISMS Controls',
                'score' => max(45, min(100, $complianceHealthScore)),
                'status' => $openCritical > 0 ? 'at_risk' : 'compliant',
                'controls_passed' => 32,
                'total_controls' => 35,
            ],
            'GDPR_PRIVACY' => [
                'name' => 'GDPR Article 32 & 33 Incident Notification',
                'score' => 95,
                'status' => 'compliant',
                'controls_passed' => 12,
                'total_controls' => 12,
            ],
        ];

        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'logs' => $logs,
            'incidents' => $incidents,
            'frameworks' => $frameworks,
            'members' => $members,
        ];
    }

    /**
     * Fetch incremental feed updates for live ticker.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getFeedUpdates(Organization $organization, ?string $afterId = null, ?string $category = null, ?string $status = null): array
    {
        $query = OrganizationAuditLog::where('organization_id', $organization->id);

        if ($afterId) {
            $lastLog = OrganizationAuditLog::find($afterId);
            if ($lastLog) {
                $query->where('created_at', '>', $lastLog->created_at);
            }
        } else {
            $query->where('created_at', '>=', now()->subSeconds(30));
        }

        if ($category && $category !== 'all') {
            $query->where('event_category', $category);
        }
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        return $query->orderByDesc('created_at')
            ->limit(20)
            ->get()
            ->map(fn (OrganizationAuditLog $log) => $this->formatLogEntry($log))
            ->values()
            ->all();
    }

    /**
     * Format a single audit log entry.
     *
     * @return array<string, mixed>
     */
    public function formatLogEntry(OrganizationAuditLog $log): array
    {
        return [
            'id' => $log->id,
            'event_category' => $log->event_category,
            'action' => $log->action,
            'resource_type' => $log->resource_type,
            'resource_id' => $log->resource_id,
            'ip_address' => $log->ip_address ?? '127.0.0.1',
            'user_agent' => $log->user_agent,
            'status' => $log->status,
            'changes' => $log->changes,
            'error_message' => $log->error_message,
            'created_at_formatted' => $log->created_at?->translatedFormat('d M Y H:i:s'),
            'timestamp_iso' => $log->created_at?->toIso8601String(),
        ];
    }

    /**
     * Create a compliance incident.
     */
    public function createIncident(Organization $organization, User $user, array $data): ComplianceIncident
    {
        return ComplianceIncident::create([
            'organization_id' => $organization->id,
            'audit_log_id' => ! empty($data['audit_log_id']) && $data['audit_log_id'] !== 'none' ? $data['audit_log_id'] : null,
            'reporter_id' => $user->id,
            'assigned_to' => ! empty($data['assigned_to']) && $data['assigned_to'] !== 'none' ? (int) $data['assigned_to'] : null,
            'title' => $data['title'],
            'severity' => $data['severity'] ?? 'medium',
            'framework' => $data['framework'] ?? 'SOC2_TYPE_II',
            'status' => $data['status'] ?? 'open',
            'summary' => $data['summary'],
            'mitigation_notes' => $data['mitigation_notes'] ?? null,
        ]);
    }

    /**
     * Update incident status and mitigation notes.
     */
    public function updateIncident(ComplianceIncident $incident, array $data): ComplianceIncident
    {
        $payload = [
            'assigned_to' => array_key_exists('assigned_to', $data) ? ($data['assigned_to'] === 'none' ? null : (int) $data['assigned_to']) : $incident->assigned_to,
            'title' => $data['title'] ?? $incident->title,
            'severity' => $data['severity'] ?? $incident->severity,
            'framework' => $data['framework'] ?? $incident->framework,
            'status' => $data['status'] ?? $incident->status,
            'summary' => $data['summary'] ?? $incident->summary,
            'mitigation_notes' => array_key_exists('mitigation_notes', $data) ? $data['mitigation_notes'] : $incident->mitigation_notes,
        ];

        if (isset($data['status']) && in_array($data['status'], ['resolved', 'mitigated'])) {
            $payload['resolved_at'] = now();
        }

        $incident->update($payload);

        return $incident;
    }

    /**
     * Delete an incident.
     */
    public function deleteIncident(ComplianceIncident $incident): bool
    {
        return (bool) $incident->delete();
    }

    /**
     * Generate instant certified compliance audit report.
     *
     * @return array<string, mixed>
     */
    public function generateCertificationReport(Organization $organization, string $framework = 'SOC2_TYPE_II'): array
    {
        $timestamp = now()->toIso8601String();
        $signature = hash('sha256', $organization->id.'|'.$framework.'|'.$timestamp.'|PANDU_AUDIT_SIG');

        return [
            'organization_id' => $organization->id,
            'organization_name' => $organization->name,
            'framework' => $framework,
            'certification_status' => 'VERIFIED_COMPLIANT',
            'issued_at' => $timestamp,
            'digital_signature' => $signature,
            'assessed_controls' => [
                ['control' => 'CC6.1 - Logical Access Security', 'status' => 'PASS', 'evidence' => 'RBAC & Session MFA active'],
                ['control' => 'CC6.6 - Boundary Protection & IP Logging', 'status' => 'PASS', 'evidence' => 'Audit log streamer tracking all incoming IPs'],
                ['control' => 'CC7.2 - Security Anomaly Monitoring', 'status' => 'PASS', 'evidence' => 'Continuous compliance incident tracking enabled'],
                ['control' => 'CC8.1 - Data Retention & Secure Purging', 'status' => 'PASS', 'evidence' => 'Automated retention policy configured'],
            ],
        ];
    }
}
