<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\Sprint;
use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MobileCompanionController extends Controller
{
    /**
     * Display the Mobile Companion Workspace.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $user->currentOrganization;

        $tasks = [];
        $activeSprint = null;
        $notifications = [];

        if ($organization) {
            $tasks = Task::where('organization_id', $organization->id)
                ->with(['assignees:id,name,avatar', 'project:id,name,key'])
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();

            $activeSprint = Sprint::whereHas('project', fn ($q) => $q->where('organization_id', $organization->id))
                ->where('status', 'active')
                ->latest()
                ->first();

            $notifications = Notification::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(10)
                ->get();
        }

        return Inertia::render('mobile/index', [
            'tasks' => $tasks,
            'activeSprint' => $activeSprint,
            'notifications' => $notifications,
        ]);
    }
}
