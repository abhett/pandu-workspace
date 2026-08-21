<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('organization_mfa_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('enforcement_mode', 50)->default('privileged_roles_only'); // disabled, privileged_roles_only, all_members
            $table->integer('grace_period_days')->default(7);
            $table->integer('remember_device_days')->default(30);
            $table->json('allowed_methods')->nullable();
            $table->timestampTz('kill_switch_last_triggered_at')->nullable();
            $table->foreignId('kill_switch_triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique('organization_id');
        });

        Schema::create('mfa_grace_exemptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('granted_by')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 255);
            $table->timestampTz('expires_at');
            $table->timestampsTz();

            $table->unique(['organization_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mfa_grace_exemptions');
        Schema::dropIfExists('organization_mfa_settings');
    }
};
