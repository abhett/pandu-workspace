<?php

namespace App\Services\Architecture;

use App\Models\ArchitectureDecisionRecord;
use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\Project;
use App\Models\User;

class AdrGovernanceService
{
    /**
     * Get complete ADR technical governance studio, domain metrics, and records catalog.
     *
     * @return array<string, mixed>
     */
    public function getAdrDashboard(
        Organization $organization,
        ?string $projectId = null,
        ?string $domain = null,
        ?string $status = null
    ): array {
        $hasAdrs = ArchitectureDecisionRecord::where('organization_id', $organization->id)->exists();
        if (! $hasAdrs) {
            $defaultProject = Project::where('organization_id', $organization->id)->first();
            $this->seedDefaultAdrs($organization, $defaultProject);
        }

        $query = ArchitectureDecisionRecord::where('organization_id', $organization->id)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->when($domain, fn ($q) => $q->where('domain', $domain))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with(['author:id,name,email', 'project:id,name,key', 'supersededBy:id,adr_number,title'])
            ->orderBy('adr_number');

        $adrs = $query->get()->map(fn (ArchitectureDecisionRecord $a) => [
            'id' => $a->id,
            'adr_number' => $a->adr_number,
            'adr_code' => sprintf('ADR-%03d', $a->adr_number),
            'project_id' => $a->project_id,
            'project_name' => $a->project?->name,
            'domain' => $a->domain,
            'title' => $a->title,
            'status' => $a->status,
            'context_and_problem' => $a->context_and_problem,
            'decision_outcome' => $a->decision_outcome,
            'positive_consequences' => $a->positive_consequences ?? [],
            'negative_consequences' => $a->negative_consequences ?? [],
            'alternatives_considered' => $a->alternatives_considered ?? [],
            'superseded_by' => $a->supersededBy ? [
                'id' => $a->supersededBy->id,
                'adr_code' => sprintf('ADR-%03d', $a->supersededBy->adr_number),
                'title' => $a->supersededBy->title,
            ] : null,
            'decided_at_formatted' => $a->decided_at?->translatedFormat('d M Y'),
            'author' => $a->author ? [
                'id' => $a->author->id,
                'name' => $a->author->name,
            ] : null,
            'created_at_formatted' => $a->created_at?->translatedFormat('d M Y'),
        ]);

        $allAdrs = ArchitectureDecisionRecord::where('organization_id', $organization->id)->get();
        $totalCount = $allAdrs->count();
        $acceptedCount = $allAdrs->where('status', 'accepted')->count();
        $proposedCount = $allAdrs->where('status', 'proposed')->count();
        $supersededCount = $allAdrs->where('status', 'superseded')->count();

        $metrics = [
            'total_adrs' => $totalCount,
            'accepted_standards' => $acceptedCount,
            'proposed_rfcs' => $proposedCount,
            'superseded_adrs' => $supersededCount,
            'governance_health_score' => 96,
        ];

        // Domain breakdown
        $domains = [
            'data_architecture' => 'Data Architecture & Storage',
            'api_design' => 'API & Integration Protocols',
            'infrastructure' => 'Cloud & DevOps Infrastructure',
            'security_compliance' => 'Security & Identity Standards',
            'frontend_architecture' => 'Frontend & UI Architecture',
        ];

        $domainStats = [];
        foreach ($domains as $key => $label) {
            $matching = $allAdrs->where('domain', $key);
            $domainStats[] = [
                'domain' => $key,
                'label' => $label,
                'total' => $matching->count(),
                'accepted' => $matching->where('status', 'accepted')->count(),
                'proposed' => $matching->where('status', 'proposed')->count(),
            ];
        }

        $projects = Project::where('organization_id', $organization->id)
            ->select(['id', 'name', 'key'])
            ->orderBy('name')
            ->get();

        $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get();

        return [
            'metrics' => $metrics,
            'domainStats' => $domainStats,
            'adrs' => $adrs->values()->all(),
            'projects' => $projects,
            'members' => $members,
            'selectedDomain' => $domain,
            'selectedStatus' => $status,
            'selectedProjectId' => $projectId,
        ];
    }

    /**
     * Create a new Architecture Decision Record.
     *
     * @param  array<string, mixed>  $data
     */
    public function createAdr(Organization $organization, array $data, User $user): ArchitectureDecisionRecord
    {
        $maxNumber = (int) ArchitectureDecisionRecord::where('organization_id', $organization->id)->max('adr_number');
        $nextNumber = $maxNumber + 1;

        $adr = ArchitectureDecisionRecord::create([
            'organization_id' => $organization->id,
            'project_id' => $data['project_id'] ?? null,
            'author_id' => $data['author_id'] ?? $user->id,
            'adr_number' => $nextNumber,
            'domain' => $data['domain'] ?? 'data_architecture',
            'title' => $data['title'],
            'status' => $data['status'] ?? 'proposed',
            'context_and_problem' => $data['context_and_problem'],
            'decision_outcome' => $data['decision_outcome'],
            'positive_consequences' => is_array($data['positive_consequences'] ?? null)
                ? $data['positive_consequences']
                : (empty($data['positive_consequences']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['positive_consequences'])))),
            'negative_consequences' => is_array($data['negative_consequences'] ?? null)
                ? $data['negative_consequences']
                : (empty($data['negative_consequences']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['negative_consequences'])))),
            'alternatives_considered' => is_array($data['alternatives_considered'] ?? null)
                ? $data['alternatives_considered']
                : (empty($data['alternatives_considered']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['alternatives_considered'])))),
            'superseded_by_id' => $data['superseded_by_id'] ?? null,
            'decided_at' => $data['status'] === 'accepted' ? ($data['decided_at'] ?? now()->toDateString()) : null,
        ]);

        OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'event_category' => 'architecture',
            'action' => 'adr_created',
            'resource_type' => 'ArchitectureDecisionRecord',
            'resource_id' => (string) $adr->id,
            'status' => 'success',
            'changes' => [
                'adr_number' => $adr->adr_number,
                'title' => $adr->title,
                'status' => $adr->status,
            ],
        ]);

        return $adr;
    }

    /**
     * Update an existing ADR.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateAdr(ArchitectureDecisionRecord $adr, array $data, User $user): ArchitectureDecisionRecord
    {
        $positive = is_array($data['positive_consequences'] ?? null)
            ? $data['positive_consequences']
            : (empty($data['positive_consequences']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['positive_consequences']))));

        $negative = is_array($data['negative_consequences'] ?? null)
            ? $data['negative_consequences']
            : (empty($data['negative_consequences']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['negative_consequences']))));

        $alternatives = is_array($data['alternatives_considered'] ?? null)
            ? $data['alternatives_considered']
            : (empty($data['alternatives_considered']) ? [] : array_filter(array_map('trim', explode("\n", (string) $data['alternatives_considered']))));

        $adr->update([
            'project_id' => array_key_exists('project_id', $data) ? ($data['project_id'] === 'none' ? null : $data['project_id']) : $adr->project_id,
            'domain' => $data['domain'] ?? $adr->domain,
            'title' => $data['title'] ?? $adr->title,
            'status' => $data['status'] ?? $adr->status,
            'context_and_problem' => $data['context_and_problem'] ?? $adr->context_and_problem,
            'decision_outcome' => $data['decision_outcome'] ?? $adr->decision_outcome,
            'positive_consequences' => $positive,
            'negative_consequences' => $negative,
            'alternatives_considered' => $alternatives,
            'superseded_by_id' => array_key_exists('superseded_by_id', $data) ? ($data['superseded_by_id'] === 'none' ? null : $data['superseded_by_id']) : $adr->superseded_by_id,
            'decided_at' => ($data['status'] ?? $adr->status) === 'accepted' ? ($data['decided_at'] ?? $adr->decided_at ?? now()->toDateString()) : null,
        ]);

        return $adr;
    }

    /**
     * Delete an ADR.
     */
    public function deleteAdr(ArchitectureDecisionRecord $adr): bool
    {
        return (bool) $adr->delete();
    }

    /**
     * Seed baseline Architecture Decision Records for demo.
     */
    public function seedDefaultAdrs(Organization $organization, ?Project $project = null): void
    {
        $author = User::whereIn('id', $organization->memberships()->pluck('user_id'))->first();
        $projectId = $project?->id;

        // ADR 1: UUID v7
        ArchitectureDecisionRecord::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'author_id' => $author?->id,
            'adr_number' => 1,
            'domain' => 'data_architecture',
            'title' => 'Adopsi UUID v7 sebagai Primary Key Global Terdistribusi',
            'status' => 'accepted',
            'context_and_problem' => 'Auto-increment integer PK rentan terhadap scraping ID enumeration dan mempersulit replikasi multi-region sharded database.',
            'decision_outcome' => 'Gunakan UUID v7 time-ordered primary key untuk seluruh entitas enterprise dan model domain.',
            'positive_consequences' => [
                'B-Tree index insertion locality optimal berkat time-ordered prefix.',
                'Aman dari security enumeration attack pada public REST APIs.',
                'Dukungan native client-side ID generation tanpa menunggu database round-trip.',
            ],
            'negative_consequences' => [
                'Storage footprint primary key lebih besar (16 bytes vs 8 bytes bigint).',
            ],
            'alternatives_considered' => [
                'ULID (Universally Unique Lexicographically Sortable Identifier)',
                'Snowflake ID generation cluster',
            ],
            'decided_at' => now()->subMonths(3)->toDateString(),
        ]);

        // ADR 2: PostgreSQL with JSONB & Full-Text Search
        ArchitectureDecisionRecord::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'author_id' => $author?->id,
            'adr_number' => 2,
            'domain' => 'data_architecture',
            'title' => 'Konsolidasi Stack Database pada PostgreSQL dengan Ekstensi pgvector',
            'status' => 'accepted',
            'context_and_problem' => 'Mengurangi kompleksitas operasional dengan menghindari database terpisah untuk relational, audit JSONB, dan AI vector embedding.',
            'decision_outcome' => 'Standardisasi pada PostgreSQL 16+ dengan ekstensi pgvector dan GIN index untuk query audit log.',
            'positive_consequences' => [
                'Satu engine database tunggal menyederhanakan backup dan DRC.',
                'ACID transaction konsisten melintasi data relasional dan embedding.',
            ],
            'negative_consequences' => [
                'Perlu tuning vacuum dan WAL buffer untuk workload burst write audit.',
            ],
            'alternatives_considered' => [
                'MongoDB untuk Audit Logs',
                'Pinecone/Milvus untuk Vector DB mandiri',
            ],
            'decided_at' => now()->subMonths(2)->toDateString(),
        ]);

        // ADR 3: Inertia.js React Monolith
        ArchitectureDecisionRecord::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'author_id' => $author?->id,
            'adr_number' => 3,
            'domain' => 'frontend_architecture',
            'title' => 'Implementasi Inertia.js React Client-Side SPA Architecture',
            'status' => 'accepted',
            'context_and_problem' => 'Mempertahankan kecepatan pengembangan Laravel routing sekaligus memberikan UX interaktif modern tanpa kompleksitas GraphQL/REST boilerplate terpisah.',
            'decision_outcome' => 'Gunakan Inertia.js v2/v3 dengan React 19 dan TypeScript sebagai arsitektur frontend standar.',
            'positive_consequences' => [
                'Zero API boilerplate untuk CRUD dan form submissions.',
                'Type safety otomatis melalui Wayfinder route generator.',
            ],
            'negative_consequences' => [
                'Memerlukan SSR engine jika SEO publik diprioritaskan.',
            ],
            'alternatives_considered' => [
                'Next.js Headless Frontend terpisah',
                'Livewire Blade Components',
            ],
            'decided_at' => now()->subMonths(1)->toDateString(),
        ]);

        // ADR 4: RFC Proposed Event-Driven Architecture
        ArchitectureDecisionRecord::create([
            'organization_id' => $organization->id,
            'project_id' => $projectId,
            'author_id' => $author?->id,
            'adr_number' => 4,
            'domain' => 'api_design',
            'title' => 'RFC: Standardisasi CloudEvents Specification untuk Webhook & Async Broker',
            'status' => 'proposed',
            'context_and_problem' => 'Integrasi webhook dan downstream listener membutuhkan format payload seragam yang kompatibel dengan CNCF CloudEvents.',
            'decision_outcome' => 'Mengadopsi CloudEvents JSON 1.0 schema untuk seluruh outbound webhook triggers dan Redis queue messages.',
            'positive_consequences' => [
                'Interoperabilitas tinggi dengan Kafka, AWS EventBridge, dan Google Cloud Pub/Sub.',
                'Tracing context header terstandarisasi.',
            ],
            'negative_consequences' => [
                'Breaking change pada legacy webhook consumer jika format tidak backward-compatible.',
            ],
            'alternatives_considered' => [
                'Custom proprietary JSON envelope',
            ],
        ]);
    }
}
