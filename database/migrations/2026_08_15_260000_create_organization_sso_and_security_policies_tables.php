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
        Schema::create('organization_sso_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->unique()->index();
            $table->string('provider_type', 30)->default('saml'); // saml, oidc
            $table->boolean('is_enabled')->default(false);
            $table->boolean('is_enforced')->default(false);
            $table->string('entity_id')->nullable();
            $table->text('sso_url')->nullable();
            $table->text('certificate')->nullable();
            $table->string('client_id')->nullable();
            $table->text('client_secret')->nullable();
            $table->text('issuer_url')->nullable();
            $table->jsonb('allowed_domains')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('organization_security_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->unique()->index();
            $table->boolean('mfa_enforced')->default(false);
            $table->integer('min_password_length')->default(12);
            $table->integer('password_rotation_days')->default(90);
            $table->boolean('require_uppercase')->default(true);
            $table->boolean('require_lowercase')->default(true);
            $table->boolean('require_numeric')->default(true);
            $table->boolean('require_symbols')->default(true);
            $table->boolean('lockout_enabled')->default(true);
            $table->integer('lockout_max_attempts')->default(5);
            $table->integer('lockout_duration_minutes')->default(30);
            $table->integer('session_timeout_minutes')->default(120);
            $table->jsonb('ip_allowlist')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_security_policies');
        Schema::dropIfExists('organization_sso_configs');
    }
};
