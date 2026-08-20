<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DesignSystemController extends Controller
{
    /**
     * Display the Living Design System & Component Library Hub.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('system/design-system');
    }
}
