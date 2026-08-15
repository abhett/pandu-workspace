<?php

use App\Http\Controllers\OrganizationController;
use App\Http\Controllers\OrganizationInvitationController;
use App\Http\Controllers\OrganizationMemberController;
use App\Http\Controllers\RolePermissionController;
use App\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    // Onboarding
    Route::get('/onboarding/organization', [OrganizationController::class, 'create'])->name('onboarding.organization');
    Route::post('/onboarding/organization', [OrganizationController::class, 'store'])->name('onboarding.organization.store');
    Route::get('/onboarding/invite-members', [OrganizationInvitationController::class, 'showOnboarding'])->name('onboarding.invite-members');

    // Organization Switching
    Route::post('/organizations/{organization}/switch', [OrganizationController::class, 'switch'])->name('organizations.switch');

    // Dashboard
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Teams Management
    Route::get('/teams', [TeamController::class, 'index'])->name('teams.index');
    Route::post('/teams', [TeamController::class, 'store'])->name('teams.store');
    Route::put('/teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::delete('/teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');

    // Members Management
    Route::get('/organization/members', [OrganizationMemberController::class, 'index'])->name('organization.members.index');
    Route::post('/organization/members', [OrganizationMemberController::class, 'store'])->name('organization.members.store');
    Route::patch('/organization/members/{membership}/role', [OrganizationMemberController::class, 'updateRole'])->name('organization.members.update-role');
    Route::delete('/organization/members/{membership}', [OrganizationMemberController::class, 'destroy'])->name('organization.members.destroy');

    // Invitations
    Route::post('/organization/invitations', [OrganizationInvitationController::class, 'store'])->name('organization.invitations.store');
    Route::delete('/organization/invitations/{invitation}', [OrganizationInvitationController::class, 'destroy'])->name('organization.invitations.destroy');

    // Roles & Granular Permissions Matrix
    Route::get('/organization/roles', [RolePermissionController::class, 'index'])->name('organization.roles.index');
    Route::post('/organization/roles', [RolePermissionController::class, 'store'])->name('organization.roles.store');
    Route::put('/organization/roles/matrix', [RolePermissionController::class, 'updateMatrix'])->name('organization.roles.matrix.update');
    Route::delete('/organization/roles/{role}', [RolePermissionController::class, 'destroy'])->name('organization.roles.destroy');
});

require __DIR__.'/settings.php';
