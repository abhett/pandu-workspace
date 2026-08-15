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
        Schema::create('organizations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 200);
            $table->string('slug', 100)->unique();
            $table->string('status', 24)->default('active');
            $table->string('timezone', 64)->default('UTC');
            $table->string('locale', 16)->default('en');
            $table->jsonb('settings')->default('{}');
            $table->timestampsTz();
            $table->softDeletesTz();

            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
