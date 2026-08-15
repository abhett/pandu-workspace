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
        Schema::create('project_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category')->default('general'); // software, operations, marketing, general
            $table->text('description')->nullable();
            $table->string('icon')->default('FolderKanban');
            $table->string('color')->default('#3b82f6');
            $table->boolean('is_system')->default(true);
            $table->json('workflow_config')->nullable(); // Default status list with categories, colors, WIP
            $table->json('default_views')->nullable(); // ['board', 'list', 'summary', 'timeline']
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_templates');
    }
};
