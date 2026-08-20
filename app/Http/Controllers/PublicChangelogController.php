<?php

namespace App\Http\Controllers;

use App\Models\Release;
use App\Services\Releases\ReleaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicChangelogController extends Controller
{
    public function __construct(
        protected ReleaseService $releaseService
    ) {}

    /**
     * Display the public changelog timeline.
     */
    public function index(Request $request): Response
    {
        $organizationId = $request->query('org');
        $releases = $this->releaseService->getPublicReleases($organizationId);

        return Inertia::render('public/changelog', [
            'releases' => $releases,
        ]);
    }

    /**
     * React to a release with an emoji.
     */
    public function react(Request $request, Release $release): JsonResponse
    {
        $validated = $request->validate([
            'emoji' => ['required', 'string', 'in:rocket,heart,party,fire,thumbs_up'],
        ]);

        $user = $request->user();
        $ip = $request->ip();

        $this->releaseService->toggleReaction($release, $user, $ip, $validated['emoji']);

        return response()->json([
            'success' => true,
            'reactions_count' => $release->reactions()->count(),
        ]);
    }
}
