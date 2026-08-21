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
        Schema::create('cicd_pipeline_configs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('repository_url')->nullable();
            $table->string('provider', 30)->default('github_actions'); // github_actions, gitlab_ci, jenkins, custom_webhook
            $table->string('default_branch', 50)->default('main');
            $table->string('webhook_secret', 64)->nullable();
            $table->boolean('require_prod_approval')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->index(['organization_id', 'project_id']);
        });

        Schema::create('cicd_pipeline_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pipeline_config_id')->constrained('cicd_pipeline_configs')->cascadeOnDelete();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->integer('run_number')->default(1);
            $table->string('environment', 30)->default('staging'); // development, staging, production
            $table->string('status', 30)->default('running'); // pending, running, passed, failed, cancelled, blocked_by_gate
            $table->string('branch', 100)->default('main');
            $table->string('commit_sha', 40);
            $table->string('commit_message', 255)->nullable();
            $table->string('author_name', 100)->nullable();
            $table->string('trigger_type', 30)->default('webhook_push'); // webhook_push, pull_request, manual_trigger, rollback
            $table->json('stages')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->foreignId('gate_approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTimeTz('gate_approved_at')->nullable();
            $table->text('gate_notes')->nullable();
            $table->dateTimeTz('started_at')->nullable();
            $table->dateTimeTz('finished_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'project_id', 'environment']);
            $table->index(['pipeline_config_id', 'run_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cicd_pipeline_runs');
        Schema::dropIfExists('cicd_pipeline_configs');
    }
};
