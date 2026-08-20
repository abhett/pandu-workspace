<?php

namespace App\Services\Releases;

use App\Models\Organization;
use App\Models\Release;
use App\Models\ReleaseReaction;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Collection;

class ReleaseService
{
    /**
     * Get all releases for an organization.
     */
    public function getOrganizationReleases(Organization $organization, ?string $projectId = null): Collection
    {
        return Release::where('organization_id', $organization->id)
            ->when($projectId, fn ($q) => $q->where('project_id', $projectId))
            ->with(['creator:id,name,avatar', 'project:id,name,key'])
            ->withCount('reactions')
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Get published public releases.
     */
    public function getPublicReleases(?string $organizationId = null): Collection
    {
        return Release::where('status', 'published')
            ->where('is_public', true)
            ->when($organizationId, fn ($q) => $q->where('organization_id', $organizationId))
            ->with(['creator:id,name,avatar', 'project:id,name,key'])
            ->withCount('reactions')
            ->orderByDesc('published_at')
            ->get();
    }

    /**
     * Generate release draft automatically from completed sprint tasks with AI categorization.
     */
    public function generateFromSprint(Sprint $sprint, string $version, string $type, User $user): Release
    {
        $organizationId = $sprint->project->organization_id;

        $completedTasks = Task::where('project_id', $sprint->project_id)
            ->where(function ($q) use ($sprint) {
                $q->where('sprint_id', $sprint->id)
                    ->orWhereNotNull('completed_at')
                    ->orWhereHas('status', fn ($sq) => $sq->where('category', 'done'));
            })
            ->get();

        if ($completedTasks->isEmpty()) {
            $completedTasks = Task::where('project_id', $sprint->project_id)->get();
        }

        $newFeatures = [];
        $improvements = [];
        $bugFixes = [];
        $breakingChanges = [];

        foreach ($completedTasks as $task) {
            $title = $task->title;
            $lower = strtolower($title.' '.($task->description ?? ''));

            if (str_contains($lower, 'fix') || str_contains($lower, 'bug') || str_contains($lower, 'error') || str_contains($lower, 'perbaikan')) {
                $bugFixes[] = $title;
            } elseif (str_contains($lower, 'break') || str_contains($lower, 'deprecat') || str_contains($lower, 'migrasi skema')) {
                $breakingChanges[] = $title;
            } elseif (str_contains($lower, 'optima') || str_contains($lower, 'improv') || str_contains($lower, 'refactor') || str_contains($lower, 'kecepatan')) {
                $improvements[] = $title;
            } else {
                $newFeatures[] = $title;
            }
        }

        if (empty($newFeatures) && empty($improvements) && empty($bugFixes)) {
            $newFeatures[] = "Penyelesaian tugas utama pada {$sprint->name}";
        }

        return Release::create([
            'organization_id' => $organizationId,
            'project_id' => $sprint->project_id,
            'created_by' => $user->id,
            'version' => $version,
            'title' => "Rilis Versi {$version} - {$sprint->name}",
            'description' => "Pembaruan sistem komprehensif yang dihasilkan secara otomatis dari Sprint '{$sprint->name}'.",
            'type' => $type,
            'status' => 'draft',
            'is_public' => true,
            'content' => [
                'new_features' => $newFeatures,
                'improvements' => $improvements,
                'bug_fixes' => $bugFixes,
                'breaking_changes' => $breakingChanges,
            ],
        ]);
    }

    /**
     * Toggle reaction for a release.
     */
    public function toggleReaction(Release $release, ?User $user, ?string $ipAddress, string $emoji): void
    {
        $query = ReleaseReaction::where('release_id', $release->id)
            ->where('emoji', $emoji);

        if ($user) {
            $query->where('user_id', $user->id);
        } else {
            $query->where('ip_address', $ipAddress)->whereNull('user_id');
        }

        $existing = $query->first();

        if ($existing) {
            $existing->delete();
        } else {
            ReleaseReaction::create([
                'release_id' => $release->id,
                'user_id' => $user?->id,
                'ip_address' => $ipAddress,
                'emoji' => $emoji,
            ]);
        }
    }
}
