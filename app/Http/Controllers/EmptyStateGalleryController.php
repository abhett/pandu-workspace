<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmptyStateGalleryController extends Controller
{
    /**
     * Display the Empty States Component Gallery.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('system/empty-states');
    }
}
