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
        Schema::create('task_dependencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id')->index();
            $table->uuid('predecessor_id')->index(); // Task that must come first
            $table->uuid('successor_id')->index();   // Task that depends on predecessor
            $table->string('type', 30)->default('finish_to_start'); // finish_to_start, start_to_start, finish_to_finish, start_to_finish
            $table->integer('lag_days')->default(0);
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->foreign('predecessor_id')->references('id')->on('tasks')->cascadeOnDelete();
            $table->foreign('successor_id')->references('id')->on('tasks')->cascadeOnDelete();

            $table->unique(['predecessor_id', 'successor_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_dependencies');
    }
};
