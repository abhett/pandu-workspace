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
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique()->after('id');
            $table->string('status', 24)->default('active')->after('password');
            $table->string('locale', 16)->default('en')->after('status');
            $table->string('timezone', 64)->default('UTC')->after('locale');
            $table->timestampTz('last_login_at')->nullable()->after('timezone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['uuid', 'status', 'locale', 'timezone', 'last_login_at']);
        });
    }
};
