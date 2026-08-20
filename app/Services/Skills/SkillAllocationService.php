<?php

namespace App\Services\Skills;

use App\Models\Organization;
use App\Models\Skill;
use App\Models\Task;
use App\Models\TaskRequiredSkill;
use App\Models\User;
use App\Models\UserSkill;

class SkillAllocationService
{
    /**
     * Get aggregate organization skill matrix and competency data.
     *
     * @return array<string, mixed>
     */
    public function getOrganizationSkillMatrix(Organization $organization): array
    {
        $skills = Skill::where('organization_id', $organization->id)
            ->withCount('userSkills')
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $userSkills = UserSkill::where('organization_id', $organization->id)
            ->with(['user:id,name,email', 'skill:id,name,category,color'])
            ->get();

        // Group skills by category
        $categoryBreakdown = [];
        foreach ($skills as $skill) {
            $cat = $skill->category ?? 'other';
            if (! isset($categoryBreakdown[$cat])) {
                $categoryBreakdown[$cat] = 0;
            }
            $categoryBreakdown[$cat] += $skill->user_skills_count;
        }

        // Group by user
        $memberSkillProfiles = [];
        foreach ($userSkills as $us) {
            $uId = $us->user_id;
            if (! isset($memberSkillProfiles[$uId])) {
                $memberSkillProfiles[$uId] = [
                    'user_id' => $uId,
                    'user_name' => $us->user?->name,
                    'user_email' => $us->user?->email,
                    'skills' => [],
                ];
            }
            $memberSkillProfiles[$uId]['skills'][] = [
                'id' => $us->id,
                'skill_id' => $us->skill_id,
                'skill_name' => $us->skill?->name,
                'category' => $us->skill?->category,
                'color' => $us->skill?->color,
                'proficiency_level' => $us->proficiency_level,
                'years_of_experience' => (float) $us->years_of_experience,
                'verified' => (bool) $us->verified,
            ];
        }

        $totalMembers = $organization->memberships()->count();
        $membersWithSkills = count($memberSkillProfiles);
        $coverageRate = $totalMembers > 0
            ? round(($membersWithSkills / $totalMembers) * 100, 1)
            : 0.0;

        return [
            'skills' => $skills,
            'member_profiles' => array_values($memberSkillProfiles),
            'metrics' => [
                'total_skills' => $skills->count(),
                'members_with_skills' => $membersWithSkills,
                'total_members' => $totalMembers,
                'coverage_rate' => $coverageRate,
                'category_breakdown' => $categoryBreakdown,
            ],
        ];
    }

    /**
     * Create a new skill in organization catalog.
     *
     * @param  array<string, mixed>  $data
     */
    public function createSkill(Organization $organization, array $data): Skill
    {
        return Skill::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'category' => $data['category'] ?? 'backend',
            'description' => $data['description'] ?? null,
            'color' => $data['color'] ?? '#3b82f6',
        ]);
    }

    /**
     * Update an existing skill.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateSkill(Skill $skill, array $data): Skill
    {
        $skill->update([
            'name' => $data['name'] ?? $skill->name,
            'category' => $data['category'] ?? $skill->category,
            'description' => $data['description'] ?? $skill->description,
            'color' => $data['color'] ?? $skill->color,
        ]);

        return $skill->fresh();
    }

    /**
     * Delete a skill and cascade user skills.
     */
    public function deleteSkill(Skill $skill): bool
    {
        return (bool) $skill->delete();
    }

    /**
     * Assign or endorse a skill on a team member.
     */
    public function assignUserSkill(
        Organization $organization,
        int $userId,
        string $skillId,
        string $proficiency = 'intermediate',
        float $years = 1.0,
        ?User $endorser = null
    ): UserSkill {
        return UserSkill::updateOrCreate(
            [
                'user_id' => $userId,
                'skill_id' => $skillId,
            ],
            [
                'organization_id' => $organization->id,
                'proficiency_level' => $proficiency,
                'years_of_experience' => $years,
                'verified' => true,
                'endorsed_by' => $endorser?->id,
            ]
        );
    }

    /**
     * Remove a skill from a member.
     */
    public function removeUserSkill(string $userSkillId): bool
    {
        return (bool) UserSkill::where('id', $userSkillId)->delete();
    }

    /**
     * Attach required skills to a task.
     *
     * @param  array<int, array{skill_id: string, min_proficiency?: string}>  $requiredSkills
     */
    public function attachTaskRequiredSkills(Task $task, array $requiredSkills): void
    {
        TaskRequiredSkill::where('task_id', $task->id)->delete();

        foreach ($requiredSkills as $req) {
            TaskRequiredSkill::create([
                'task_id' => $task->id,
                'skill_id' => $req['skill_id'],
                'min_proficiency' => $req['min_proficiency'] ?? 'intermediate',
            ]);
        }
    }

    /**
     * Smart Resource Allocation AI algorithm: recommends assignees based on skill fit and workload.
     *
     * @return array<int, array<string, mixed>>
     */
    public function recommendAssigneesForTask(Task $task): array
    {
        $organization = $task->organization;
        $project = $task->project;

        // 1. Get task required skills
        $requiredSkills = TaskRequiredSkill::where('task_id', $task->id)
            ->with('skill:id,name,category,color')
            ->get();

        $requiredSkillIds = $requiredSkills->pluck('skill_id')->toArray();

        // Fallback: If no explicit required skills, match words in task title with skills in org
        if (empty($requiredSkillIds)) {
            $orgSkills = Skill::where('organization_id', $organization->id)->get();
            $titleLower = strtolower($task->title.' '.($task->description ?? ''));
            foreach ($orgSkills as $s) {
                if (str_contains($titleLower, strtolower($s->name))) {
                    $requiredSkillIds[] = $s->id;
                }
            }
        }

        // 2. Get project members
        $members = $project->members()->select(['users.id', 'users.name', 'users.email'])->get();
        if ($members->isEmpty()) {
            $members = User::whereIn('id', $organization->memberships()->pluck('user_id'))->get();
        }

        $proficiencyScores = [
            'beginner' => 25,
            'intermediate' => 50,
            'advanced' => 75,
            'expert' => 100,
        ];

        $recommendations = [];

        foreach ($members as $member) {
            $userSkills = UserSkill::where('user_id', $member->id)
                ->with('skill:id,name,category,color')
                ->get();

            $matchedSkillsCount = 0;
            $totalSkillScore = 0;
            $matchedDetails = [];

            if (! empty($requiredSkillIds)) {
                foreach ($requiredSkillIds as $rSkillId) {
                    $us = $userSkills->firstWhere('skill_id', $rSkillId);
                    if ($us) {
                        $matchedSkillsCount++;
                        $levelScore = $proficiencyScores[$us->proficiency_level] ?? 50;
                        $expBonus = min(20, (int) ($us->years_of_experience * 3));
                        $skillScore = min(100, $levelScore + $expBonus);

                        $totalSkillScore += $skillScore;
                        $matchedDetails[] = [
                            'skill_name' => $us->skill?->name,
                            'level' => $us->proficiency_level,
                            'years' => $us->years_of_experience,
                            'score' => $skillScore,
                        ];
                    }
                }

                $skillFitPercent = $matchedSkillsCount > 0
                    ? round($totalSkillScore / count($requiredSkillIds), 1)
                    : 15.0; // Base baseline
            } else {
                // If task has no specific requirements, baseline fit is 70%
                $skillFitPercent = 70.0;
            }

            // Workload factor: count incomplete tasks assigned
            $activeWorkloadCount = Task::where('assignee_id', $member->id)
                ->whereNull('completed_at')
                ->count();

            $workloadPenalty = min(35, $activeWorkloadCount * 7);
            $compositeScore = max(5, round($skillFitPercent - $workloadPenalty, 1));

            $verdict = 'Good Fit';
            if ($compositeScore >= 80) {
                $verdict = 'Best Fit';
            } elseif ($activeWorkloadCount >= 5) {
                $verdict = 'Overloaded';
            } elseif ($compositeScore < 50) {
                $verdict = 'Needs Upskilling';
            }

            $recommendations[] = [
                'user_id' => $member->id,
                'user_name' => $member->name,
                'user_email' => $member->email,
                'match_score' => $compositeScore,
                'skill_fit_score' => $skillFitPercent,
                'active_tasks_count' => $activeWorkloadCount,
                'verdict' => $verdict,
                'matched_skills' => $matchedDetails,
                'all_skills' => $userSkills->map(fn ($us) => [
                    'name' => $us->skill?->name,
                    'level' => $us->proficiency_level,
                ]),
            ];
        }

        usort($recommendations, fn ($a, $b) => $b['match_score'] <=> $a['match_score']);

        return $recommendations;
    }
}
