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
        Schema::create('project_budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->unique()->constrained('projects')->cascadeOnDelete();
            $table->decimal('total_budget', 15, 2)->default(0);
            $table->string('currency', 10)->default('IDR');
            $table->string('budget_type', 50)->default('fixed'); // fixed, time_and_materials, monthly_recurring
            $table->decimal('capex_amount', 15, 2)->default(0);
            $table->decimal('opex_amount', 15, 2)->default(0);
            $table->unsignedSmallInteger('alert_threshold_percent')->default(85);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();
        });

        Schema::create('project_member_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('hourly_rate', 12, 2)->default(0);
            $table->string('billing_role', 100)->nullable();
            $table->timestampsTz();

            $table->unique(['project_id', 'user_id']);
            $table->index(['user_id', 'project_id']);
        });

        Schema::create('task_worklogs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('duration_minutes');
            $table->decimal('calculated_cost', 12, 2)->default(0);
            $table->date('work_date');
            $table->text('description')->nullable();
            $table->timestampsTz();

            $table->index(['project_id', 'work_date']);
            $table->index(['task_id']);
            $table->index(['user_id']);
        });

        Schema::create('project_expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('category', 50); // software_license, cloud_hosting, hardware_equipment, consulting, travel_meals, other
            $table->string('title', 150);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('IDR');
            $table->date('expense_date');
            $table->string('vendor', 150)->nullable();
            $table->text('receipt_url')->nullable();
            $table->foreignId('submitted_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 30)->default('pending'); // pending, approved, rejected
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['project_id', 'status']);
            $table->index(['submitted_by']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_expenses');
        Schema::dropIfExists('task_worklogs');
        Schema::dropIfExists('project_member_rates');
        Schema::dropIfExists('project_budgets');
    }
};
