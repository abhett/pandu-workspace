<?php

use Database\Seeders\ProjectTemplateSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $this->seed(ProjectTemplateSeeder::class);
});

test('guest can view news and insights page', function () {
    $response = $this->get('/news');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('public/news'));
});

test('guest can view about us page', function () {
    $response = $this->get('/about');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('public/about'));
});

test('guest can view contact page', function () {
    $response = $this->get('/contact');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('public/contact'));
});

test('guest can submit contact inquiry form', function () {
    $response = $this->post('/contact', [
        'name' => 'Budi Santoso',
        'email' => 'budi@techcorp.co.id',
        'subject' => 'sales',
        'message' => 'Kami ingin menjadwalkan demo enterprise untuk 150 developer tim kami.',
    ]);

    $response->assertSessionHas('success');

    $this->assertDatabaseHas('contact_inquiries', [
        'name' => 'Budi Santoso',
        'email' => 'budi@techcorp.co.id',
        'subject' => 'sales',
        'status' => 'pending',
    ]);
});
