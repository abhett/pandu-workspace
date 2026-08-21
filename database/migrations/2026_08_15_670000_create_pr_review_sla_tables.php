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
        Schema::create('pull_request_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->integer('pr_number');
            $table->string('title', 250);
            $table->string('repository_name', 150)->default('pandu-app');
            $table->string('branch_name', 150);
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('additions_count')->default(0);
            $table->integer('deletions_count')->default(0);
            $table->string('status', 30)->default('pending_review'); // pending_review, changes_requested, approved, merged
            $table->string('sla_status', 30)->default('within_sla'); // within_sla, at_risk, breached
            $table->float('ttfr_hours')->nullable();
            $table->float('turnaround_hours')->nullable();
            $table->dateTimeTz('opened_at');
            $table->dateTimeTz('first_reviewed_at')->nullable();
            $table->dateTimeTz('approved_at')->nullable();
            $table->dateTimeTz('merged_at')->nullable();
            $table->string('matched_codeowner_rule', 150)->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'sla_status']);
        });

        Schema::create('codeowner_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('path_pattern', 250);
            $table->string('domain_name', 100);
            $table->foreignId('lead_reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('fallback_reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('codeowner_rules');
        Schema::dropIfExists('pull_request_reviews');
    }
};
