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
        Schema::create('chaos_experiments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('title', 200);
            $table->string('target_service', 100);
            $table->string('fault_type', 50);
            $table->string('environment', 30)->default('staging');
            $table->text('hypothesis');
            $table->json('safety_tripwire')->nullable();
            $table->string('status', 30)->default('planned');
            $table->float('resilience_score')->nullable();
            $table->json('execution_logs')->nullable();
            $table->dateTime('executed_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['organization_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chaos_experiments');
    }
};
