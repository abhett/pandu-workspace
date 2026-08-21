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
        Schema::create('data_residency_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('primary_region', 50)->default('ap-southeast-3'); // ap-southeast-3, eu-central-1, us-east-1
            $table->string('compliance_framework', 50)->default('id_pdp'); // id_pdp, eu_gdpr, us_hipaa_soc2
            $table->boolean('cross_border_transfer_allowed')->default(false);
            $table->boolean('encryption_at_rest_verified')->default(true);
            $table->string('encryption_key_management', 50)->default('aws_kms_managed'); // aws_kms_managed, byok_customer_managed
            $table->timestampsTz();

            $table->index(['organization_id']);
        });

        Schema::create('pii_masking_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('field_name', 100);
            $table->string('resource_model', 100)->default('User');
            $table->string('masking_strategy', 50)->default('partial_mask'); // partial_mask, full_redaction, hashing_sha256, pseudonymization
            $table->string('sample_input', 150);
            $table->string('sample_masked_output', 150);
            $table->boolean('is_active')->default(true);
            $table->json('exempt_roles')->nullable(); // ["owner", "dpo_officer"]
            $table->timestampsTz();

            $table->index(['organization_id', 'is_active']);
        });

        Schema::create('data_subject_access_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('request_number', 50); // DSAR-2026-001
            $table->string('request_type', 50)->default('erasure'); // erasure, export, rectification
            $table->string('subject_identifier', 150);
            $table->string('status', 30)->default('pending_review'); // pending_review, processing, completed, rejected
            $table->text('reason')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTimeTz('completed_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('data_subject_access_requests');
        Schema::dropIfExists('pii_masking_rules');
        Schema::dropIfExists('data_residency_configs');
    }
};
