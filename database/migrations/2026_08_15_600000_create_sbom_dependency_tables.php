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
        Schema::create('sbom_packages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('ecosystem', 30); // composer, npm, pypi, docker
            $table->string('name', 150);
            $table->string('version', 50);
            $table->string('license', 50);
            $table->string('license_risk', 30)->default('low_risk'); // low_risk, moderate_risk, high_risk
            $table->boolean('has_vulnerabilities')->default(false);
            $table->integer('vulnerabilities_count')->default(0);
            $table->string('highest_severity', 30)->nullable(); // critical, high, medium, low
            $table->string('latest_safe_version', 50)->nullable();
            $table->boolean('is_direct_dependency')->default(true);
            $table->timestampsTz();

            $table->index(['organization_id', 'ecosystem', 'license_risk']);
            $table->index(['organization_id', 'has_vulnerabilities']);
        });

        Schema::create('sbom_vulnerabilities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('package_id')->constrained('sbom_packages')->cascadeOnDelete();
            $table->string('cve_id', 50);
            $table->string('title', 200);
            $table->text('description');
            $table->string('severity', 30); // critical, high, medium, low
            $table->float('cvss_score')->default(0.0);
            $table->string('patched_version', 50);
            $table->text('remediation_advice');
            $table->string('status', 30)->default('open'); // open, mitigated, false_positive, ignored
            $table->timestampsTz();

            $table->index(['package_id', 'severity']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sbom_vulnerabilities');
        Schema::dropIfExists('sbom_packages');
    }
};
