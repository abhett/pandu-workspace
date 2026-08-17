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
        Schema::create('organization_ai_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('default_provider', 30)->default('mock'); // mock, openai, gemini, ollama
            $table->text('openai_api_key')->nullable(); // encrypted
            $table->text('gemini_api_key')->nullable(); // encrypted
            $table->string('ollama_base_url')->nullable()->default('http://localhost:11434');
            $table->string('default_model', 60)->default('gpt-4o-mini');
            $table->unsignedBigInteger('monthly_token_budget')->default(500000);
            $table->unsignedBigInteger('current_month_tokens_used')->default(0);
            $table->decimal('current_month_cost_estimate', 10, 4)->default(0);
            $table->integer('budget_alert_threshold')->default(80); // percent
            $table->boolean('is_enabled')->default(true);
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index('organization_id');
        });

        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('model', 60);
            $table->string('capability', 50); // sprint_summary, task_breakdown, acceptance_criteria, etc.
            $table->integer('prompt_tokens')->default(0);
            $table->integer('completion_tokens')->default(0);
            $table->integer('total_tokens')->default(0);
            $table->decimal('cost_estimate', 10, 6)->default(0);
            $table->integer('latency_ms')->default(0);
            $table->string('status', 30)->default('success'); // success, failed, budget_exceeded
            $table->text('error_message')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['organization_id', 'created_at']);
            $table->index(['project_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('organization_ai_settings');
    }
};
