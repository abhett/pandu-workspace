<?php

namespace App\Services\Audit;

use App\Models\Organization;
use App\Models\OrganizationAuditLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogService
{
    /**
     * Record an audit trail log entry.
     *
     * @param  array<string, mixed>|null  $changes
     */
    public function log(
        Organization $organization,
        User|int|null $actor,
        string $eventCategory,
        string $action,
        string $resourceType,
        ?string $resourceId = null,
        ?array $changes = null,
        string $status = 'success',
        ?string $errorMessage = null,
        ?Request $request = null
    ): OrganizationAuditLog {
        $actorId = $actor instanceof User ? $actor->id : $actor;

        $ipAddress = $request ? $request->ip() : request()->ip();
        $userAgent = $request ? $request->userAgent() : request()->userAgent();

        return OrganizationAuditLog::create([
            'organization_id' => $organization->id,
            'user_id' => $actorId,
            'event_category' => $eventCategory,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId ? (string) $resourceId : null,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'status' => $status,
            'changes' => $changes,
            'error_message' => $errorMessage,
        ]);
    }

    /**
     * Get filtered paginated audit logs for an organization.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getLogs(Organization $organization, array $filters = []): LengthAwarePaginator
    {
        $query = OrganizationAuditLog::where('organization_id', $organization->id)
            ->with(['actor:id,name,email,avatar'])
            ->orderByDesc('created_at');

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('event_category', $filters['category']);
        }

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('resource_type', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('actor', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['days'])) {
            $days = (int) $filters['days'];
            $query->where('created_at', '>=', now()->subDays($days));
        }

        return $query->paginate($filters['per_page'] ?? 20)->withQueryString();
    }

    /**
     * Export filtered audit logs as a downloadable CSV stream.
     *
     * @param  array<string, mixed>  $filters
     */
    public function exportCsv(Organization $organization, array $filters = []): StreamedResponse
    {
        $filename = 'audit-logs-'.now()->format('Y-m-d_His').'.csv';

        $query = OrganizationAuditLog::where('organization_id', $organization->id)
            ->with(['actor:id,name,email'])
            ->orderByDesc('created_at');

        if (! empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('event_category', $filters['category']);
        }

        if (! empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['search'])) {
            $search = strtolower($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('resource_type', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%")
                    ->orWhereHas('actor', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($query) {
            $handle = fopen('php://output', 'w');

            // Header row
            fputcsv($handle, [
                'Waktu (UTC)',
                'Aktor Nama',
                'Aktor Email',
                'Kategori Event',
                'Aksi',
                'Tipe Resource',
                'ID Resource',
                'Alamat IP',
                'Status',
                'Pesan Error',
                'Perubahan (JSON)',
            ]);

            $query->chunk(200, function ($logs) use ($handle) {
                foreach ($logs as $log) {
                    fputcsv($handle, [
                        $log->created_at?->toIso8601String(),
                        $log->actor?->name ?? 'Sistem / Tamu',
                        $log->actor?->email ?? '-',
                        $log->event_category,
                        $log->action,
                        $log->resource_type,
                        $log->resource_id ?? '-',
                        $log->ip_address ?? '-',
                        $log->status,
                        $log->error_message ?? '-',
                        $log->changes ? json_encode($log->changes, JSON_UNESCAPED_UNICODE) : '-',
                    ]);
                }
            });

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
