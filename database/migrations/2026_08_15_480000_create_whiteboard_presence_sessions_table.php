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
        Schema::create('whiteboard_presence_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('whiteboard_id')->constrained('project_whiteboards')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->float('cursor_x')->nullable();
            $table->float('cursor_y')->nullable();
            $table->uuid('selected_node_id')->nullable();
            $table->uuid('locked_node_id')->nullable();
            $table->string('client_color', 20)->default('#6366f1');
            $table->timestamp('last_active_at')->useCurrent();
            $table->timestampsTz();

            $table->unique(['whiteboard_id', 'user_id']);
            $table->index(['whiteboard_id', 'last_active_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whiteboard_presence_sessions');
    }
};
