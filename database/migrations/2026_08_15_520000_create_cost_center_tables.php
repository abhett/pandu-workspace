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
        Schema::create('cost_centers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->string('department', 100)->default('Engineering');
            $table->decimal('allocated_budget', 14, 2)->default(0);
            $table->string('currency', 10)->default('IDR');
            $table->text('description')->nullable();
            $table->timestampsTz();

            $table->index(['organization_id', 'code']);
        });

        Schema::create('project_cost_center_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cost_center_id')->constrained('cost_centers')->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->decimal('allocation_percentage', 5, 2)->default(100.00);
            $table->timestampsTz();

            $table->unique(['cost_center_id', 'project_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_cost_center_allocations');
        Schema::dropIfExists('cost_centers');
    }
};
