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
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('parent_id')->nullable();
            $table->text('content');
            $table->json('mentions')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['task_id', 'created_at']);
            $table->index(['organization_id', 'user_id']);
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->foreign('parent_id')->references('id')->on('comments')->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
