<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OrganizationMembership;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationController extends Controller
{
    /**
     * Show the onboarding form to create an organization.
     */
    public function create(): Response
    {
        return Inertia::render('onboarding/create-organization');
    }

    /**
     * Store a newly created organization and set current user as owner.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:200'],
            'slug' => ['nullable', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('organizations', 'slug')],
            'industry' => ['nullable', 'string', 'max:100'],
            'size' => ['nullable', 'string', 'max:50'],
        ]);

        $slug = $validated['slug'] ?? Str::slug($validated['name']);

        // If slug already taken, append a random suffix
        if (Organization::where('slug', $slug)->exists()) {
            $slug = $slug.'-'.Str::lower(Str::random(4));
        }

        $organization = Organization::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'status' => 'active',
            'timezone' => config('app.timezone', 'UTC'),
            'locale' => config('app.locale', 'en'),
            'settings' => array_filter([
                'industry' => $validated['industry'] ?? null,
                'size' => $validated['size'] ?? null,
            ]),
        ]);

        OrganizationMembership::create([
            'organization_id' => $organization->id,
            'user_id' => $request->user()->id,
            'role' => 'owner',
            'title' => 'Founder',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        session(['current_organization_id' => $organization->id]);

        return redirect()->route('dashboard')->with('status', 'Organisasi berhasil dibuat!');
    }

    /**
     * Switch active organization in session.
     */
    public function switch(Organization $organization, Request $request): RedirectResponse
    {
        if (! $request->user()->belongsToOrganization($organization)) {
            abort(403, 'Anda tidak memiliki akses ke organisasi ini.');
        }

        session(['current_organization_id' => $organization->id]);

        return redirect()->route('dashboard')->with('status', 'Beralih ke organisasi '.$organization->name);
    }
}
