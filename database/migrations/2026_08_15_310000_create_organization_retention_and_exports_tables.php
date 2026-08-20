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
        Schema::create('organization_retention_policies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->unique()->index();
            $table->integer('audit_logs_retention_days')->default(365);
            $table->integer('deleted_tasks_retention_days')->default(30);
            $table->integer('orphan_attachments_retention_days')->default(0); // 0 = immediately
            $table->boolean('auto_purge_enabled')->default(true);
            $table->timestamp('last_purged_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });

        Schema::create('organization_compliance_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('organization_id')->index();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('export_type', 50)->default('gdpr_full'); // gdpr_full, audit_trail, tasks_only
            $table->string('status', 30)->default('completed'); // completed, processing, failed
            $table->string('file_path')->nullable();
            $table->bigInteger('file_size_bytes')->default(0);
            $table->jsonb('summary')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('organization_id')->references('id')->on('organizations')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organization_compliance_exports');
        Schema::dropIfExists('organization_retention_policies');
    }
};
