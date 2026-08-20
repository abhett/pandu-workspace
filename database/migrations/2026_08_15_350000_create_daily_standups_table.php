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
        Schema::create('daily_standups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('yesterday_work');
            $table->text('today_work');
            $table->text('blockers')->nullable();
            $table->string('mood', 32)->default('good'); // great, good, neutral, blocked
            $table->text('ai_summary')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'user_id', 'date', 'project_id'], 'user_daily_standup_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_standups');
    }
};
