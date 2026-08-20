<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemFeedbackController extends Controller
{
    /**
     * Display the Toast Notification & Progressive Loading Feedback Showcase.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('system/feedback');
    }
}
