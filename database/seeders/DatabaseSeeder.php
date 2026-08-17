<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamMember;
use App\Models\User;
use App\Services\Project\ProjectCreationService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Roles & Permissions and Project Templates
        $this->call(RolePermissionSeeder::class);
        $this->call(ProjectTemplateSeeder::class);

        $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
        $adminRole = Role::whereNull('organization_id')->where('slug', 'admin')->first();
        $memberRole = Role::whereNull('organization_id')->where('slug', 'member')->first();

        // 2. Create Owner User
        $user = User::firstOrCreate(
            ['email' => 'demo@example.com'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
            ]
        );

        // 3. Create Additional Team Members
        $sarah = User::firstOrCreate(
            ['email' => 'sarah.jenkins@acme.corp'],
            [
                'name' => 'Sarah Jenkins',
                'password' => Hash::make('password'),
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
            ]
        );

        $alex = User::firstOrCreate(
            ['email' => 'alex.rivera@acme.corp'],
            [
                'name' => 'Alex Rivera',
                'password' => Hash::make('password'),
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
            ]
        );

        $dina = User::firstOrCreate(
            ['email' => 'dina.putri@acme.corp'],
            [
                'name' => 'Dina Putri',
                'password' => Hash::make('password'),
                'locale' => 'id',
                'timezone' => 'Asia/Jakarta',
            ]
        );

        // 4. Create Organization
        $organization = Organization::firstOrCreate(
            ['slug' => 'acme-corp'],
            [
                'name' => 'Acme Corporation',
                'status' => 'active',
                'timezone' => 'Asia/Jakarta',
                'locale' => 'id',
                'settings' => [
                    'theme' => 'dark',
                    'plan' => 'enterprise',
                ],
            ]
        );

        // 5. Create Memberships
        OrganizationMembership::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $user->id,
            ],
            [
                'role' => 'owner',
                'role_id' => $ownerRole?->id,
                'title' => 'Product Director',
                'status' => 'active',
                'joined_at' => now(),
            ]
        );

        OrganizationMembership::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $sarah->id,
            ],
            [
                'role' => 'admin',
                'role_id' => $adminRole?->id,
                'title' => 'Staff Engineer, Platform',
                'status' => 'active',
                'joined_at' => now()->subMonths(3),
            ]
        );

        OrganizationMembership::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $alex->id,
            ],
            [
                'role' => 'member',
                'role_id' => $memberRole?->id,
                'title' => 'Senior UI/UX Designer',
                'status' => 'active',
                'joined_at' => now()->subMonths(2),
            ]
        );

        OrganizationMembership::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'user_id' => $dina->id,
            ],
            [
                'role' => 'member',
                'role_id' => $memberRole?->id,
                'title' => 'Product Manager',
                'status' => 'active',
                'joined_at' => now()->subMonth(),
            ]
        );

        // 6. Create Teams & Assign Members
        $platformTeam = Team::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'slug' => 'platform-engineering',
            ],
            [
                'name' => 'Platform Engineering',
                'department' => 'Engineering',
                'description' => 'Mengelola arsitektur inti, pipeline data, dan infrastruktur cloud enterprise.',
                'lead_user_id' => $sarah->id,
            ]
        );

        TeamMember::firstOrCreate(
            ['team_id' => $platformTeam->id, 'user_id' => $sarah->id],
            ['role' => 'lead', 'joined_at' => now()]
        );
        TeamMember::firstOrCreate(
            ['team_id' => $platformTeam->id, 'user_id' => $user->id],
            ['role' => 'member', 'joined_at' => now()]
        );

        $designTeam = Team::firstOrCreate(
            [
                'organization_id' => $organization->id,
                'slug' => 'product-design',
            ],
            [
                'name' => 'Product & Design',
                'department' => 'Design',
                'description' => 'Fokus pada riset pengguna, design system Kinetic, dan arsitektur UX interaktif.',
                'lead_user_id' => $alex->id,
            ]
        );

        TeamMember::firstOrCreate(
            ['team_id' => $designTeam->id, 'user_id' => $alex->id],
            ['role' => 'lead', 'joined_at' => now()]
        );
        TeamMember::firstOrCreate(
            ['team_id' => $designTeam->id, 'user_id' => $dina->id],
            ['role' => 'member', 'joined_at' => now()]
        );

        // 7. Seed Project Templates & Demo Projects
        $this->call(ProjectTemplateSeeder::class);

        $projectService = app(ProjectCreationService::class);

        if (! Project::where('organization_id', $organization->id)->where('key', 'KNT')->exists()) {
            $kntProject = $projectService->create($organization, $user, [
                'name' => 'Kinetic Platform Core',
                'key' => 'KNT',
                'description' => 'Arsitektur modular monolith work management enterprise, real-time worker, dan multi-provider AI engine.',
                'type' => 'scrum',
                'color' => '#6366f1',
                'icon' => 'Layers',
                'lead_user_id' => $sarah->id,
            ]);

            // Add additional members
            $kntProject->members()->syncWithoutDetaching([
                $alex->id => ['id' => (string) Str::uuid7(), 'role' => 'member', 'joined_at' => now()],
                $dina->id => ['id' => (string) Str::uuid7(), 'role' => 'member', 'joined_at' => now()],
            ]);
        }

        if (! Project::where('organization_id', $organization->id)->where('key', 'DSGN')->exists()) {
            $dsgnProject = $projectService->create($organization, $alex, [
                'name' => 'Kinetic Design System v2',
                'key' => 'DSGN',
                'description' => 'Evolusi komponen UI Radix/Tailwind 4, token tema dinamis, micro-animations, dan standar aksesibilitas.',
                'type' => 'kanban',
                'color' => '#0ea5e9',
                'icon' => 'FolderKanban',
                'lead_user_id' => $alex->id,
            ]);

            $dsgnProject->members()->syncWithoutDetaching([
                $user->id => ['id' => (string) Str::uuid7(), 'role' => 'lead', 'joined_at' => now()],
                $dina->id => ['id' => (string) Str::uuid7(), 'role' => 'member', 'joined_at' => now()],
            ]);
        }
    }
}
