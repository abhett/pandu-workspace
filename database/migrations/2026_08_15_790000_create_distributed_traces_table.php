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
        Schema::create('service_nodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('service_type')->default('service'); // gateway, service, database, cache, queue, third_party
            $table->string('environment')->default('production');
            $table->string('status')->default('healthy'); // healthy, degraded, critical
            $table->unsignedInteger('throughput_rpm')->default(0);
            $table->decimal('error_rate_pct', 5, 2)->default(0.00);
            $table->unsignedInteger('p95_latency_ms')->default(0);
            $table->unsignedInteger('p99_latency_ms')->default(0);
            $table->json('dependencies')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('distributed_traces', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->string('trace_id')->index();
            $table->string('root_service');
            $table->string('root_operation');
            $table->string('http_method')->default('GET');
            $table->unsignedSmallInteger('http_status_code')->default(200);
            $table->decimal('total_duration_ms', 8, 2)->default(0.00);
            $table->unsignedSmallInteger('span_count')->default(1);
            $table->unsignedSmallInteger('error_count')->default(0);
            $table->string('status')->default('ok'); // ok, error, degraded
            $table->string('user_agent')->nullable();
            $table->string('client_ip')->nullable();
            $table->json('spans');
            $table->json('breakdown')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'created_at']);
            $table->index(['organization_id', 'root_service']);
            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('distributed_traces');
        Schema::dropIfExists('service_nodes');
    }
};
