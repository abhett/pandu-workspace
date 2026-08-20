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
        Schema::create('sprint_daily_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('sprint_id')->index();
            $table->uuid('project_id')->index();
            $table->date('date')->index();
            $table->integer('total_points')->default(0);
            $table->integer('completed_points')->default(0);
            $table->integer('remaining_points')->default(0);
            $table->integer('total_tasks')->default(0);
            $table->integer('completed_tasks')->default(0);
            $table->timestamps();

            $table->foreign('sprint_id')->references('id')->on('sprints')->cascadeOnDelete();
            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->unique(['sprint_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sprint_daily_metrics');
    }
};
