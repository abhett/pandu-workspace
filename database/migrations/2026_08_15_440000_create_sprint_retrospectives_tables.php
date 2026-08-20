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
        Schema::create('sprint_retrospectives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('sprint_id')->nullable()->constrained('sprints')->nullOnDelete();
            $table->string('title', 150);
            $table->string('format', 50)->default('what_went_well'); // what_went_well, start_stop_continue, mad_sad_glad, sailor_boat
            $table->string('status', 30)->default('draft'); // draft, active, discussing, closed
            $table->foreignId('facilitator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_anonymous')->default(false);
            $table->decimal('sentiment_score', 3, 2)->nullable(); // 1.00 to 5.00
            $table->text('summary_notes')->nullable();
            $table->timestampsTz();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'sprint_id']);
        });

        Schema::create('retrospective_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('retrospective_id')->constrained('sprint_retrospectives')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category', 50); // went_well, went_wrong, action_item, kudos, start, stop, continue, mad, sad, glad, wind, anchor, rocks, island
            $table->text('content');
            $table->unsignedInteger('votes_count')->default(0);
            $table->foreignId('action_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->boolean('is_action_item')->default(false);
            $table->string('action_status', 30)->default('pending'); // pending, in_progress, completed
            $table->timestampsTz();

            $table->index(['retrospective_id', 'category']);
        });

        Schema::create('retrospective_item_votes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('retrospective_item_id')->constrained('retrospective_items')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampsTz();

            $table->unique(['retrospective_item_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retrospective_item_votes');
        Schema::dropIfExists('retrospective_items');
        Schema::dropIfExists('sprint_retrospectives');
    }
};
