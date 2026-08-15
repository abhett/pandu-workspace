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
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('status_id')->constrained('workflow_statuses')->cascadeOnDelete();
            $table->foreignUuid('parent_id')->nullable()->constrained('tasks')->nullOnDelete();

            $table->integer('sequence_number');
            $table->string('key', 30);
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('type', 30)->default('task'); // task, bug, story, epic, subtask
            $table->string('priority', 20)->default('medium'); // lowest, low, medium, high, highest
            $table->decimal('estimate_points', 5, 1)->nullable();
            $table->date('due_date')->nullable();
            $table->timestampTz('completed_at')->nullable();

            $table->string('rank', 64);
            $table->integer('version')->default(1);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->unique(['project_id', 'sequence_number']);
            $table->index(['project_id', 'status_id', 'rank']);
            $table->index(['project_id', 'key']);
            $table->index(['organization_id', 'project_id']);
            $table->index(['project_id', 'type']);
            $table->index(['project_id', 'priority']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
