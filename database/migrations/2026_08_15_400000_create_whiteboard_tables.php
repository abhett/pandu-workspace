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
        Schema::create('project_whiteboards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->double('viewport_x')->default(0);
            $table->double('viewport_y')->default(0);
            $table->double('viewport_zoom')->default(1.0);
            $table->string('grid_type', 30)->default('dots'); // dots, grid, blank
            $table->boolean('is_favorite')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index(['project_id', 'created_at']);
        });

        Schema::create('whiteboard_nodes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('whiteboard_id')->constrained('project_whiteboards')->cascadeOnDelete();
            $table->string('type', 50)->default('sticky_note'); // sticky_note, idea_card, shape, text_block
            $table->text('title')->nullable();
            $table->text('content')->nullable();
            $table->double('pos_x')->default(100);
            $table->double('pos_y')->default(100);
            $table->double('width')->default(200);
            $table->double('height')->default(160);
            $table->string('color', 30)->default('#fef08a');
            $table->foreignUuid('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestampsTz();

            $table->index(['whiteboard_id']);
            $table->index(['task_id']);
        });

        Schema::create('whiteboard_edges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('whiteboard_id')->constrained('project_whiteboards')->cascadeOnDelete();
            $table->foreignUuid('source_node_id')->constrained('whiteboard_nodes')->cascadeOnDelete();
            $table->foreignUuid('target_node_id')->constrained('whiteboard_nodes')->cascadeOnDelete();
            $table->string('label', 100)->nullable();
            $table->string('style', 30)->default('curved'); // curved, straight, step
            $table->string('color', 30)->default('#94a3b8');
            $table->timestampsTz();

            $table->index(['whiteboard_id']);
            $table->index(['source_node_id', 'target_node_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whiteboard_edges');
        Schema::dropIfExists('whiteboard_nodes');
        Schema::dropIfExists('project_whiteboards');
    }
};
