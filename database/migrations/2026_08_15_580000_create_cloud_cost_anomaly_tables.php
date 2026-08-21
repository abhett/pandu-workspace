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
        Schema::create('cloud_cost_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('provider', 30); // aws, gcp, azure, kubernetes
            $table->string('service_name', 100);
            $table->string('category', 50); // compute, database, storage, networking, ai_ml
            $table->string('region', 50)->default('global');
            $table->decimal('cost_amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->float('usage_quantity')->default(0.0);
            $table->string('usage_unit', 30)->default('hours');
            $table->date('snapshot_date');
            $table->timestampsTz();

            $table->index(['organization_id', 'snapshot_date']);
            $table->index(['organization_id', 'provider', 'category']);
        });

        Schema::create('cloud_cost_anomalies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('service_name', 100);
            $table->date('anomaly_date');
            $table->decimal('actual_cost', 12, 2);
            $table->decimal('expected_cost', 12, 2);
            $table->float('spike_percentage');
            $table->string('severity', 30)->default('moderate_anomaly'); // critical_spike, high_anomaly, moderate_anomaly
            $table->text('root_cause_analysis');
            $table->string('status', 30)->default('unresolved'); // unresolved, investigating, resolved, dismissed
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolution_notes')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status', 'severity']);
        });

        Schema::create('cloud_cost_recommendations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('title', 200);
            $table->text('description');
            $table->string('resource_id', 100)->nullable();
            $table->string('action_type', 50); // rightsize, terminate_idle, savings_plan, storage_cleanup
            $table->decimal('estimated_monthly_savings', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 30)->default('open'); // open, applied, dismissed
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTimeTz('applied_at')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cloud_cost_recommendations');
        Schema::dropIfExists('cloud_cost_anomalies');
        Schema::dropIfExists('cloud_cost_snapshots');
    }
};
