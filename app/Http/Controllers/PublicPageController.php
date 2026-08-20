<?php

namespace App\Http\Controllers;

use App\Models\ContactInquiry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicPageController extends Controller
{
    /**
     * Display the News and Insights hub.
     */
    public function news(): Response
    {
        return Inertia::render('public/news');
    }

    /**
     * Display the About Us & Company Vision page.
     */
    public function about(): Response
    {
        return Inertia::render('public/about');
    }

    /**
     * Display the Contact & Consultation page.
     */
    public function contact(): Response
    {
        return Inertia::render('public/contact');
    }

    /**
     * Submit a new contact inquiry.
     */
    public function submitContact(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'in:sales,support,partnership,other'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        ContactInquiry::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'status' => 'pending',
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Pesan Anda berhasil dikirim! Tim kami akan menghubungi Anda dalam kurun waktu 1x24 jam.');
    }
}
