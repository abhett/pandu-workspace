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
        Schema::create('permissions', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('name', 100);
            $table->string('category', 64);
            $table->text('description')->nullable();
            $table->timestampsTz();

            $table->index('category');
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->nullable()->constrained('organizations')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('slug', 64);
            $table->text('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestampsTz();

            $table->index(['organization_id', 'slug']);
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->foreignUuid('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('permission_id', 64);
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->timestampsTz();

            $table->primary(['role_id', 'permission_id']);
        });

        Schema::table('organization_memberships', function (Blueprint $table) {
            $table->foreignUuid('role_id')->nullable()->after('role')->constrained('roles')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('organization_memberships', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
        });

        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
    }
};
