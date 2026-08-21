<?php

namespace App\Services\Ops;

use App\Models\Incident;
use App\Models\IncidentPostMortem;
use App\Models\IncidentUpdate;
use App\Models\OnCallRota;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\User;

class IncidentManagementService
{
    /**
     * Get complete Incident War Room, On-Call Rota, and Post-Mortem Studio Dashboard.
     *
     * @return array<string, mixed>
     */
    public function getIncidentsDashboard(
        Organization $organization,
        ?string $severity = null,
        ?string $status = null
    ): array {
        $hasIncidents = Incident::where('organization_id', $organization->id)->exists();
        if (! $hasIncidents) {
            $defaultProject = Project::where('organization_id', $organization->id)->first();
            $this->seedDefaultIncidents($organization, $defaultProject);
        }

        $query = Incident::where('organization_id', $organization->id)
            ->when($severity, fn ($q) => $q->where('severity', $severity))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with([
                'commander:id,name,email',
                'project:id,name,key',
                'updates.user:id,name',
                'postMortem.author:id,name',
            ])
            ->orderByDesc('started_at');

        $incidents = $query->get()->map(fn (Incident $inc) => [
            'id' => $inc->id,
            'incident_number' => $inc->incident_number,
            'incident_code' => sprintf('INC-%03d', $inc->incident_number),
            'title' => $inc->title,
            'severity' => $inc->severity,
            'status' => $inc->status,
            'impact_summary' => $inc->impact_summary,
            'commander' => $inc->commander ? [
                'id' => $inc->commander->id,
                'name' => $inc->commander->name,
                'email' => $inc->commander->email,
            ] : null,
            'project_name' => $inc->project?->name,
            'started_at_formatted' => $inc->started_at?->translatedFormat('d M Y, H:i'),
            'acknowledged_at_formatted' => $inc->acknowledged_at?->translatedFormat('d M Y, H:i'),
            'resolved_at_formatted' => $inc->resolved_at?->translatedFormat('d M Y, H:i'),
            'mtta_minutes' => $inc->mtta_minutes,
            'mttr_minutes' => $inc->mttr_minutes,
            'updates_count' => $inc->updates->count(),
            'latest_update' => $inc->updates->first() ? [
                'status_update' => $inc->updates->first()->status_update,
                'message' => $inc->updates->first()->message,
                'user_name' => $inc->updates->first()->user?->name,
                'posted_at_formatted' => $inc->updates->first()->posted_at?->translatedFormat('H:i:s'),
            ] : null,
            'updates' => $inc->updates->map(fn (IncidentUpdate $u) => [
                'id' => $u->id,
                'status_update' => $u->status_update,
                'message' => $u->message,
                'user_name' => $u->user?->name ?? 'SRE On-Call',
                'posted_at_formatted' => $u->posted_at?->translatedFormat('d M Y, H:i:s'),
            ])->values()->all(),
            'has_post_mortem' => (bool) $inc->postMortem,
            'post_mortem' => $inc->postMortem ? [
                'id' => $inc->postMortem->id,
                'root_cause' => $inc->postMortem->root_cause,
                'trigger_event' => $inc->postMortem->trigger_event,
                'lessons_learned' => $inc->postMortem->lessons_learned,
                'action_items' => $inc->postMortem->action_items ?? [],
                'status' => $inc->postMortem->status,
                'author_name' => $inc->postMortem->author?->name,
            ] : null,
        ]);

        $allIncidents = Incident::where('organization_id', $organization->id)->get();
        $totalCount = $allIncidents->count();
        $activeCount = $allIncidents->whereIn('status', ['investigating', 'identified', 'monitoring'])->count();
        $p1Count = $allIncidents->where('severity', 'P1')->count();

        $avgMtta = $allIncidents->whereNotNull('mtta_minutes')->count() > 0
            ? round($allIncidents->whereNotNull('mtta_minutes')->avg('mtta_minutes'), 1)
            : 3.4;

        $avgMttr = $allIncidents->whereNotNull('mttr_minutes')->count() > 0
            ? round($allIncidents->whereNotNull('mttr_minutes')->avg('mttr_minutes'), 1)
            : 24.8;

        $metrics = [
            'total_incidents' => $totalCount,
            'active_incidents' => $activeCount,
            'mtta_minutes' => $avgMtta,
            'mttr_minutes' => $avgMttr,
            'p1_outages' => $p1Count,
        ];

        // Active On-Call Rota
        $onCallRota = OnCallRota::where('organization_id', $organization->id)
            ->where('is_active', true)
            ->with(['primaryUser:id,name,email', 'secondaryUser:id,name,email'])
            ->first();

        $rotaData = $onCallRota ? [
            'id' => $onCallRota->id,
            'shift_name' => $onCallRota->shift_name,
            'primary_user' => $onCallRota->primaryUser ? [
                'id' => $onCallRota->primaryUser->id,
                'name' => $onCallRota->primaryUser->name,
                'email' => $onCallRota->primaryUser->email,
            ] : null,
            'secondary_user' => $onCallRota->secondaryUser ? [
                'id' => $onCallRota->secondaryUser->id,
                'name' => $onCallRota->secondaryUser->name,
                'email' => $onCallRota->secondaryUser->email,
            ] : null,
            'shift_start_formatted' => $onCallRota->shift_start?->translatedFormat('d M, H:i'),
            'shift_end_formatted' => $onCallRota->shift_end?->translatedFormat('d M, H:i'),
        ] : null;

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        $memberIds = $organization->memberships()->pluck('user_id');
        $members = User::whereIn('id', $memberIds)->select(['id', 'name', 'email'])->get();

        return [
            'metrics' => $metrics,
            'onCallRota' => $rotaData,
            'incidents' => $incidents->values()->all(),
            'projects' => $projects,
            'members' => $members,
            'selectedSeverity' => $severity,
            'selectedStatus' => $status,
        ];
    }

    /**
     * Declare a new incident.
     *
     * @param  array<string, mixed>  $data
     */
    public function createIncident(Organization $organization, array $data, User $user): Incident
    {
        $lastNumber = (int) Incident::where('organization_id', $organization->id)->max('incident_number');
        $nextNumber = $lastNumber + 1;

        $incident = Incident::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'incident_number' => $nextNumber,
            'title' => $data['title'],
            'severity' => $data['severity'] ?? 'P2',
            'status' => 'investigating',
            'impact_summary' => $data['impact_summary'],
            'commander_id' => $data['commander_id'] ?? $user->id,
            'started_at' => now(),
            'acknowledged_at' => now(),
            'mtta_minutes' => 1,
        ]);

        IncidentUpdate::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'status_update' => 'investigating',
            'message' => '🚨 Insiden dideklarasikan. Investigasi awal dan triase respon dimulai oleh tim SRE On-Call.',
            'posted_at' => now(),
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'ops',
            'action' => 'incident_declared',
            'resource_type' => 'Incident',
            'resource_id' => (string) $incident->id,
            'status' => 'success',
            'changes' => [
                'incident_code' => sprintf('INC-%03d', $incident->incident_number),
                'severity' => $incident->severity,
                'title' => $incident->title,
            ],
        ]);

        return $incident;
    }

    /**
     * Post a war room live update.
     *
     * @param  array<string, mixed>  $data
     */
    public function postIncidentUpdate(Incident $incident, array $data, User $user): IncidentUpdate
    {
        $newStatus = $data['status_update'] ?? $incident->status;

        $incident->update([
            'status' => $newStatus,
        ]);

        $update = IncidentUpdate::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'status_update' => $newStatus,
            'message' => $data['message'],
            'posted_at' => now(),
        ]);

        return $update;
    }

    /**
     * Resolve an incident and calculate MTTR.
     */
    public function resolveIncident(Incident $incident, User $user): Incident
    {
        $resolvedAt = now();
        $mttrMins = (int) max(1, $incident->started_at->diffInMinutes($resolvedAt));

        $incident->update([
            'status' => 'resolved',
            'resolved_at' => $resolvedAt,
            'mttr_minutes' => $mttrMins,
        ]);

        IncidentUpdate::create([
            'incident_id' => $incident->id,
            'user_id' => $user->id,
            'status_update' => 'resolved',
            'message' => '✅ Insiden dinyatakan SELESAI (Resolved). Seluruh metrik operasional dan performa sistem telah kembali normal.',
            'posted_at' => $resolvedAt,
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $incident->organization_id,
            'user_id' => $user->id,
            'event_category' => 'ops',
            'action' => 'incident_resolved',
            'resource_type' => 'Incident',
            'resource_id' => (string) $incident->id,
            'status' => 'success',
            'changes' => [
                'incident_code' => sprintf('INC-%03d', $incident->incident_number),
                'mttr_minutes' => $mttrMins,
            ],
        ]);

        return $incident;
    }

    /**
     * Save or update a Post-Mortem Root Cause Analysis (RCA).
     *
     * @param  array<string, mixed>  $data
     */
    public function savePostMortem(Incident $incident, array $data, User $user): IncidentPostMortem
    {
        $actionItems = is_array($data['action_items'] ?? null)
            ? $data['action_items']
            : (empty($data['action_items']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['action_items']))));

        $postMortem = IncidentPostMortem::updateOrCreate(
            ['incident_id' => $incident->id],
            [
                'organization_id' => $incident->organization_id,
                'author_id' => $user->id,
                'root_cause' => $data['root_cause'],
                'trigger_event' => $data['trigger_event'],
                'lessons_learned' => $data['lessons_learned'] ?? null,
                'action_items' => $actionItems,
                'status' => $data['status'] ?? 'published',
                'published_at' => now(),
            ]
        );

        OrganizationAuditLog::create([
            'organization_id' => $incident->organization_id,
            'user_id' => $user->id,
            'event_category' => 'ops',
            'action' => 'incident_post_mortem_saved',
            'resource_type' => 'IncidentPostMortem',
            'resource_id' => (string) $postMortem->id,
            'status' => 'success',
            'changes' => [
                'incident_code' => sprintf('INC-%03d', $incident->incident_number),
            ],
        ]);

        return $postMortem;
    }

    /**
     * Update On-Call Schedule Rota.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateOnCallRota(Organization $organization, array $data, User $user): OnCallRota
    {
        $rota = OnCallRota::where('organization_id', $organization->id)->first();

        if (! $rota) {
            $rota = new OnCallRota(['organization_id' => $organization->id]);
        }

        $rota->fill([
            'shift_name' => $data['shift_name'] ?? 'Primary 24/7 Platform SRE',
            'primary_user_id' => $data['primary_user_id'] ?? $user->id,
            'secondary_user_id' => $data['secondary_user_id'] ?? null,
            'shift_start' => now(),
            'shift_end' => now()->addDays(7),
            'is_active' => true,
        ]);

        $rota->save();

        return $rota;
    }

    /**
     * Delete an incident record.
     */
    public function deleteIncident(Incident $incident): bool
    {
        return (bool) $incident->delete();
    }

    /**
     * Seed default baseline incidents and on-call rota for demo.
     */
    public function seedDefaultIncidents(Organization $organization, ?Project $project = null): void
    {
        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))->get();
        $primaryUser = $members->first();
        $secondaryUser = $members->count() > 1 ? $members->get(1) : $primaryUser;
        $projectId = $project?->id;

        // 1. On-Call Rota
        OnCallRota::create([
            'organization_id' => $organization->id,
            'shift_name' => '24/7 Enterprise Platform SRE Rota',
            'primary_user_id' => $primaryUser?->id,
            'secondary_user_id' => $secondaryUser?->id,
            'shift_start' => now()->startOfWeek(),
            'shift_end' => now()->endOfWeek(),
            'is_active' => true,
        ]);

        // 2. Incident 1: Active P2 Payment Gateway Ingestion Timeout
        $inc1 = Incident::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'incident_number' => 1,
            'title' => 'Midtrans Payment Callback Webhook Timeout (HTTP 504)',
            'severity' => 'P2',
            'status' => 'identified',
            'impact_summary' => '28 transaksi pembayaran subscription tertahan dalam status pending akibat timeout koneksi listener webhook.',
            'commander_id' => $primaryUser?->id,
            'started_at' => now()->subMinutes(35),
            'acknowledged_at' => now()->subMinutes(32),
            'mtta_minutes' => 3,
        ]);

        IncidentUpdate::create([
            'incident_id' => $inc1->id,
            'user_id' => $primaryUser?->id,
            'status_update' => 'investigating',
            'message' => '🚨 Insiden P2 dibuka: Spike 504 Gateway Timeout terdeteksi pada endpoint `/api/v2/webhooks/billing`. Triase awal dimulai.',
            'posted_at' => now()->subMinutes(32),
        ]);

        IncidentUpdate::create([
            'incident_id' => $inc1->id,
            'user_id' => $primaryUser?->id,
            'status_update' => 'identified',
            'message' => '🔍 Akar masalah teridentifikasi: Deadlock pada tabel invoice_records saat locking transaksi burst. Fix mitigasi Dead-Letter Queue sedang di-apply.',
            'posted_at' => now()->subMinutes(12),
        ]);

        // 3. Incident 2: Resolved P1 Database Connection Pool Exhaustion
        $inc2 = Incident::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'incident_number' => 2,
            'title' => 'PostgreSQL Aurora Primary Connection Pool Exhaustion',
            'severity' => 'P1',
            'status' => 'resolved',
            'impact_summary' => 'Degradasi total API response latency naik hingga 12 detik selama 18 menit pada jam sibuk.',
            'commander_id' => $primaryUser?->id,
            'started_at' => now()->subDays(3)->subMinutes(40),
            'acknowledged_at' => now()->subDays(3)->subMinutes(38),
            'resolved_at' => now()->subDays(3)->subMinutes(18),
            'mtta_minutes' => 2,
            'mttr_minutes' => 22,
        ]);

        IncidentUpdate::create([
            'incident_id' => $inc2->id,
            'user_id' => $primaryUser?->id,
            'status_update' => 'resolved',
            'message' => '✅ Pool connection RDS PgBouncer di-scale up dari 150 ke 500 koneksi. Latensi API kembali stabil di 35ms.',
            'posted_at' => now()->subDays(3)->subMinutes(18),
        ]);

        IncidentPostMortem::create([
            'incident_id' => $inc2->id,
            'organization_id' => $organization->id,
            'author_id' => $primaryUser?->id,
            'root_cause' => 'Worker queue tidak melepaskan koneksi database saat handling background task reporting yang berjalan lebih dari 60 detik.',
            'trigger_event' => 'Cron job nightly audit report dijalankan bersamaan dengan spike load API jam 20:00.',
            'lessons_learned' => 'Perlu pemisahan connection pool khusus untuk background worker queues dan web HTTP request pool.',
            'action_items' => [
                'Konfigurasi dedicated connection pool PgBouncer untuk asynchronous workers.',
                'Tambahkan alert Prometheus saat database connection utilization > 80%.',
                'Refactor cron job reporting agar membaca dari Read-Replica database.',
            ],
            'status' => 'published',
            'published_at' => now()->subDays(2),
        ]);
    }
}
