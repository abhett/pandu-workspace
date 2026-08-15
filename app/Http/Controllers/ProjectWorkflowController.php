<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Project;
use App\Models\WorkflowStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProjectWorkflowController extends Controller
{
    /**
     * Update project workflow statuses configuration (reorder, edit colors/limits, add, delete).
     */
    public function updateStatuses(Request $request, Project $project): RedirectResponse
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::findOrFail($orgId);

        if ($project->organization_id !== $orgId) {
            abort(403, 'Akses tidak sah.');
        }

        if (! $user->hasPermissionInOrganization($organization, 'projects:edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah alur status proyek.');
        }

        $validated = $request->validate([
            'statuses' => ['required', 'array', 'min:2'],
            'statuses.*.id' => ['nullable', 'string'],
            'statuses.*.name' => ['required', 'string', 'max:50'],
            'statuses.*.category' => ['required', 'string', 'in:unstarted,started,completed,cancelled'],
            'statuses.*.color' => ['required', 'string', 'max:20'],
            'statuses.*.wip_limit' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $workflow = $project->workflow;
        if (! $workflow) {
            return back()->withErrors(['statuses' => 'Workflow untuk proyek ini tidak ditemukan.']);
        }

        $existingStatusIds = [];

        foreach ($validated['statuses'] as $index => $sData) {
            $isInitial = ($index === 0);
            $isCompleted = ($index === count($validated['statuses']) - 1) || ($sData['category'] === 'completed');

            if (! empty($sData['id']) && ! str_starts_with($sData['id'], 'temp_')) {
                // Update existing status
                $status = WorkflowStatus::where('project_id', $project->id)->find($sData['id']);
                if ($status) {
                    $status->update([
                        'name' => $sData['name'],
                        'slug' => Str::slug($sData['name']),
                        'category' => $sData['category'],
                        'color' => $sData['color'],
                        'position' => $index,
                        'is_initial' => $isInitial,
                        'is_completed' => $isCompleted,
                        'wip_limit' => $sData['wip_limit'] ?? null,
                    ]);
                    $existingStatusIds[] = $status->id;
                }
            } else {
                // Create new status
                $newStatus = WorkflowStatus::create([
                    'workflow_id' => $workflow->id,
                    'project_id' => $project->id,
                    'name' => $sData['name'],
                    'slug' => Str::slug($sData['name']),
                    'category' => $sData['category'],
                    'color' => $sData['color'],
                    'position' => $index,
                    'is_initial' => $isInitial,
                    'is_completed' => $isCompleted,
                    'wip_limit' => $sData['wip_limit'] ?? null,
                ]);
                $existingStatusIds[] = $newStatus->id;
            }
        }

        // Remove deleted statuses (only if not referenced)
        WorkflowStatus::where('project_id', $project->id)
            ->whereNotIn('id', $existingStatusIds)
            ->delete();

        return back()->with('success', 'Konfigurasi alur status berhasil diperbarui.');
    }
}
