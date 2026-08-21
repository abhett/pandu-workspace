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
        Schema::create('database_environments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('environment_slug', 50); // production, staging, local
            $table->string('database_type', 50)->default('PostgreSQL 16');
            $table->string('schema_version', 50);
            $table->integer('total_tables_count')->default(52);
            $table->integer('total_indexes_count')->default(184);
            $table->string('drift_status', 30)->default('in_sync'); // in_sync, drift_detected, critical_mismatch
            $table->dateTimeTz('last_scanned_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'environment_slug']);
        });

        Schema::create('schema_drift_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('source_environment_id')->constrained('database_environments')->cascadeOnDelete();
            $table->foreignUuid('target_environment_id')->constrained('database_environments')->cascadeOnDelete();
            $table->string('table_name', 150);
            $table->string('drift_type', 50); // missing_column, type_mismatch, missing_index, lock_hazard
            $table->string('severity', 20)->default('medium'); // critical, high, medium, low
            $table->text('description');
            $table->text('safe_ddl_remedy');
            $table->boolean('is_resolved')->default(false);
            $table->dateTimeTz('detected_at');
            $table->dateTimeTz('resolved_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'is_resolved']);
            $table->index(['organization_id', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('schema_drift_reports');
        Schema::dropIfExists('database_environments');
    }
};
