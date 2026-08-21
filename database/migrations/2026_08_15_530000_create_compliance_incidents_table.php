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
        Schema::create('compliance_incidents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('audit_log_id')->nullable()->constrained('organization_audit_logs')->nullOnDelete();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 255);
            $table->string('severity', 30)->default('medium'); // critical, high, medium, low, info
            $table->string('framework', 50)->default('SOC2_TYPE_II'); // SOC2_TYPE_II, ISO_27001, GDPR_PRIVACY, HIPAA, INTERNAL_SECURITY
            $table->string('status', 30)->default('open'); // open, investigating, mitigated, resolved, false_positive
            $table->text('summary');
            $table->text('mitigation_notes')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compliance_incidents');
    }
};
