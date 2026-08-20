<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use App\Models\Project;
use App\Models\Role;
use App\Models\User;
use App\Models\UserAiPreference;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    /**
     * Display the Multi-Step Onboarding Wizard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('onboarding/wizard', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Process and complete the Onboarding setup.
     */
    public function complete(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'org_name' => ['required', 'string', 'max:255'],
            'methodology' => ['required', 'string', 'in:kanban,scrum,scrumban'],
            'project_name' => ['required', 'string', 'max:255'],
            'project_key' => ['required', 'string', 'max:10'],
            'project_description' => ['nullable', 'string', 'max:1000'],
            'invites' => ['nullable', 'array'],
            'invites.*.email' => ['required', 'email', 'max:255'],
            'invites.*.role' => ['required', 'string', 'in:admin,member,viewer'],
            'ai_provider' => ['nullable', 'string', 'in:openai,anthropic,gemini,ollama'],
        ]);

        $user = $request->user();

        // 1. Create Organization
        $orgSlug = Str::slug($validated['org_name']).'-'.Str::lower(Str::random(4));
        $organization = Organization::create([
            'name' => $validated['org_name'],
            'slug' => $orgSlug,
        ]);

        // 2. Attach User as Owner
        $ownerRole = Role::whereNull('organization_id')->where('slug', 'owner')->first();
        OrganizationMembership::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => 'owner',
            'role_id' => $ownerRole?->id,
            'status' => 'active',
            'joined_at' => now(),
        ]);

        // 3. Create First Project
        $projSlug = Str::slug($validated['project_name']).'-'.Str::lower(Str::random(4));
        Project::create([
            'organization_id' => $organization->id,
            'lead_user_id' => $user->id,
            'name' => $validated['project_name'],
            'slug' => $projSlug,
            'key' => Str::upper($validated['project_key']),
            'description' => $validated['project_description'] ?? 'Proyek pertama yang dibuat saat onboarding.',
            'status' => 'active',
        ]);

        // 4. Save AI Preference if provided
        if (! empty($validated['ai_provider'])) {
            UserAiPreference::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'default_model' => $validated['ai_provider'],
                    'auto_summarize_notifications' => true,
                    'inline_suggestions' => true,
                ]
            );
        }

        // Set active session
        session(['current_organization_id' => $organization->id]);

        return redirect()->route('dashboard')->with('success', 'Workspace berhasil dikonfigurasi! Selamat datang di Pandu Management.');
    }
}
