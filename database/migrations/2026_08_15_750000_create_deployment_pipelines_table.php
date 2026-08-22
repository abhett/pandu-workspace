<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deployment_pipelines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('title', 200);
            $table->string('version_tag', 50);
            $table->string('commit_sha', 40)->nullable();
            $table->string('repository_url', 300)->nullable();
            $table->json('environments')->nullable();
            $table->float('risk_score')->default(0.0);
            $table->json('risk_factors')->nullable();
            $table->string('current_environment', 30)->default('dev');
            $table->string('status', 30)->default('pending');
            $table->boolean('auto_rollback_enabled')->default(true);
            $table->float('rollback_threshold_pct')->default(2.0);
            $table->foreignId('deployed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'current_environment']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deployment_pipelines');
    }
};
