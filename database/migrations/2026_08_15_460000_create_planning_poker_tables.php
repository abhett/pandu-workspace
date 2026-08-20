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
        Schema::create('planning_poker_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('sprint_id')->nullable()->constrained('sprints')->nullOnDelete();
            $table->foreignId('moderator_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 150);
            $table->string('card_deck_type', 50)->default('fibonacci'); // fibonacci, modified_fibonacci, t_shirt, powers_of_two
            $table->foreignUuid('active_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('status', 30)->default('voting'); // voting, revealed, completed
            $table->decimal('consensus_points', 5, 2)->nullable();
            $table->timestampsTz();

            $table->index(['project_id', 'status']);
        });

        Schema::create('planning_poker_votes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('planning_poker_sessions')->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('vote_value', 20); // e.g. "5", "8", "XS", "coffee", "?"
            $table->decimal('numeric_value', 5, 2)->nullable();
            $table->timestampTz('voted_at')->useCurrent();
            $table->timestampsTz();

            $table->unique(['session_id', 'task_id', 'user_id']);
            $table->index(['session_id', 'task_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('planning_poker_votes');
        Schema::dropIfExists('planning_poker_sessions');
    }
};
