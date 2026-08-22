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
        Schema::create('root_cause_analyses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('incident_id')->nullable()->index();
            $table->string('trace_id')->nullable()->index();
            $table->string('title');
            $table->string('status')->default('completed'); // analyzing, completed, verified, dismissed
            $table->string('severity')->default('high'); // critical, high, medium, low
            $table->string('primary_cause_category')->default('code_defect'); // code_defect, database_bottleneck, network_timeout, resource_exhaustion, third_party_outage, config_drift
            $table->string('suspect_service')->nullable();
            $table->string('suspect_operation')->nullable();
            $table->decimal('confidence_score', 5, 2)->default(90.00);
            $table->text('impact_summary')->nullable();
            $table->json('blast_radius')->nullable(); // affected_users_count, affected_tenants_count, error_rate_spike, latency_p99_ms, estimated_revenue_loss
            $table->json('five_whys')->nullable(); // recursive 5-whys causality chain
            $table->json('contributing_factors')->nullable();
            $table->json('blame_commits')->nullable(); // suspected commits, authors, diffs, similarity
            $table->json('telemetry_correlations')->nullable(); // correlated spans, metric spikes, timestamps
            $table->json('timeline_events')->nullable(); // incident progression timestamps & phases
            $table->json('mitigation_steps')->nullable();
            $table->json('post_mortem_report')->nullable(); // structured post-mortem document
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'severity']);
        });

        Schema::create('rca_action_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('root_cause_analysis_id')->constrained('root_cause_analyses')->cascadeOnDelete();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority')->default('p1'); // p0, p1, p2, p3
            $table->string('type')->default('preventative'); // preventative, monitoring, architectural, runbook
            $table->string('status')->default('open'); // open, in_progress, completed, wont_fix
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['root_cause_analysis_id', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rca_action_items');
        Schema::dropIfExists('root_cause_analyses');
    }
};
