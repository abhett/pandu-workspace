<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\Portfolio\PortfolioService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    public function __construct(
        protected PortfolioService $portfolioService
    ) {}

    /**
     * Display the Executive Portfolio Overview Dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $orgId = session('current_organization_id') ?? $user->memberships()->value('organization_id');
        $organization = Organization::where('id', (string) $orgId)->firstOrFail();

        if (! in_array($user->roleInOrganization($organization), ['owner', 'admin', 'manager']) && ! $user->hasPermissionInOrganization($organization, 'portfolios:manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat portofolio eksekutif.');
        }

        $portfolioData = $this->portfolioService->getPortfolioSummary($organization);

        return Inertia::render('portfolio/index', [
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'portfolio' => $portfolioData,
        ]);
    }
}
