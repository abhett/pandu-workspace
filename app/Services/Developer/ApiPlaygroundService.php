<?php

namespace App\Services\Developer;

use App\Models\ApiRequestPreset;
use App\Models\Organization;
use App\Models\User;

class ApiPlaygroundService
{
    /**
     * Get complete API Playground dashboard.
     *
     * @return array<string, mixed>
     */
    public function getPlaygroundDashboard(Organization $organization, User $user): array
    {
        $hasPresets = ApiRequestPreset::where('organization_id', $organization->id)->exists();
        if (! $hasPresets) {
            $this->seedDefaultPresets($organization, $user);
        }

        $presets = ApiRequestPreset::where('organization_id', $organization->id)
            ->with(['createdBy:id,name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ApiRequestPreset $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'method' => $p->method,
                'endpoint_path' => $p->endpoint_path,
                'headers' => $p->headers ?? [],
                'query_params' => $p->query_params ?? [],
                'request_body' => $p->request_body ?? [],
                'created_by_name' => $p->createdBy?->name ?? 'Developer',
                'created_at_formatted' => $p->created_at?->translatedFormat('d M Y'),
            ]);

        $endpointsCatalog = $this->getEndpointsCatalog();

        $metrics = [
            'total_endpoints' => 18,
            'supported_languages' => 5,
            'avg_latency_ms' => 24,
            'active_api_tokens' => 4,
            'api_base_url' => 'https://api.pandu.app/v1',
        ];

        return [
            'metrics' => $metrics,
            'endpointsCatalog' => $endpointsCatalog,
            'presets' => $presets->values()->all(),
        ];
    }

    /**
     * List predefined endpoints catalog.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getEndpointsCatalog(): array
    {
        return [
            [
                'domain' => 'Tugas & Work Items',
                'method' => 'GET',
                'path' => '/v1/tasks',
                'description' => 'Daftar semua tugas dengan filter status, prioritas, dan proyek.',
                'sample_body' => null,
            ],
            [
                'domain' => 'Tugas & Work Items',
                'method' => 'POST',
                'path' => '/v1/tasks',
                'description' => 'Buat tiket tugas baru dalam proyek yang ditentukan.',
                'sample_body' => [
                    'title' => 'Optimize Database Indexing on Payment Gateway',
                    'project_id' => 'proj-uuid-101',
                    'priority' => 'high',
                    'estimate_points' => 5,
                ],
            ],
            [
                'domain' => 'Proyek & Workspace',
                'method' => 'GET',
                'path' => '/v1/projects',
                'description' => 'Mengambil daftar proyek aktif beserta ringkasan sprint.',
                'sample_body' => null,
            ],
            [
                'domain' => 'Proyek & Workspace',
                'method' => 'POST',
                'path' => '/v1/projects',
                'description' => 'Inisialisasi workspace proyek baru.',
                'sample_body' => [
                    'name' => 'Mobile Checkout SDK',
                    'slug' => 'mobile-checkout-sdk',
                    'description' => 'Native iOS & Android payment SDK microservice',
                ],
            ],
            [
                'domain' => 'Rilis & SemVer Publisher',
                'method' => 'POST',
                'path' => '/v1/releases/publish',
                'description' => 'Terbitkan rilis SemVer baru dengan changelog otomatis.',
                'sample_body' => [
                    'version_tag' => 'v2.4.0',
                    'title' => 'Sprint 77 Developer Platform Release',
                    'summary' => 'Menghadirkan API Playground & Multi-Language SDK Generator',
                    'channels' => ['public_changelog', 'github', 'slack'],
                ],
            ],
            [
                'domain' => 'SRE & Tanggap Insiden',
                'method' => 'POST',
                'path' => '/v1/incidents/trigger',
                'description' => 'Buka war room insiden SRE darurat.',
                'sample_body' => [
                    'title' => 'High Latency on EU Region Payment Gateway',
                    'severity' => 'P1',
                    'summary' => 'Spike in p99 response time exceeding SLA threshold',
                ],
            ],
            [
                'domain' => 'Data Privacy & DSAR',
                'method' => 'POST',
                'path' => '/v1/compliance/dsar',
                'description' => 'Kirim permohonan hak penghapusan data / Right to be Forgotten.',
                'sample_body' => [
                    'request_type' => 'erasure',
                    'subject_identifier' => 'user-to-forget@domain.com',
                    'reason' => 'GDPR Article 17 Data Erasure Request',
                ],
            ],
        ];
    }

    /**
     * Generate multi-language SDK code snippets.
     *
     * @param  array<string, mixed>  $headers
     * @param  array<string, mixed>  $body
     * @return array<string, string>
     */
    public function generateSdkSnippets(string $method, string $path, array $headers, array $body): array
    {
        $baseUrl = 'https://api.pandu.app';
        $fullUrl = $baseUrl.($path[0] === '/' ? $path : '/'.$path);
        $jsonBody = ! empty($body) ? json_encode($body, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) : '';

        // 1. cURL
        $curl = "curl -X {$method} \"{$fullUrl}\" \\\n";
        $curl .= "  -H \"Authorization: Bearer YOUR_API_KEY\" \\\n";
        $curl .= '  -H "Content-Type: application/json"';
        if (! empty($body) && $method !== 'GET') {
            $curl .= " \\\n  -d '".json_encode($body, JSON_UNESCAPED_SLASHES)."'";
        }

        // 2. JavaScript / TypeScript Fetch
        $js = "const response = await fetch('{$fullUrl}', {\n";
        $js .= "  method: '{$method}',\n";
        $js .= "  headers: {\n";
        $js .= "    'Authorization': 'Bearer YOUR_API_KEY',\n";
        $js .= "    'Content-Type': 'application/json',\n";
        $js .= "  },\n";
        if (! empty($body) && $method !== 'GET') {
            $js .= "  body: JSON.stringify({$jsonBody}),\n";
        }
        $js .= "});\n\nconst data = await response.json();\nconsole.log(data);";

        // 3. Python (Requests)
        $python = "import requests\n\nurl = '{$fullUrl}'\nheaders = {\n";
        $python .= "    'Authorization': 'Bearer YOUR_API_KEY',\n";
        $python .= "    'Content-Type': 'application/json',\n}\n";
        if (! empty($body) && $method !== 'GET') {
            $python .= "payload = {$jsonBody}\n\n";
            $python .= "response = requests.{$this->normalizeMethod($method)}(url, headers=headers, json=payload)\n";
        } else {
            $python .= "\nresponse = requests.{$this->normalizeMethod($method)}(url, headers=headers)\n";
        }
        $python .= 'print(response.json())';

        // 4. Go (net/http)
        $go = "package main\n\nimport (\n\t\"fmt\"\n\t\"net/http\"\n\t\"io\"\n";
        if (! empty($body) && $method !== 'GET') {
            $go .= "\t\"strings\"\n";
        }
        $go .= ")\n\nfunc main() {\n";
        if (! empty($body) && $method !== 'GET') {
            $go .= "\tbody := strings.NewReader(`".json_encode($body)."`)\n";
            $go .= "\treq, _ := http.NewRequest(\"{$method}\", \"{$fullUrl}\", body)\n";
        } else {
            $go .= "\treq, _ := http.NewRequest(\"{$method}\", \"{$fullUrl}\", nil)\n";
        }
        $go .= "\treq.Header.Add(\"Authorization\", \"Bearer YOUR_API_KEY\")\n";
        $go .= "\treq.Header.Add(\"Content-Type\", \"application/json\")\n\n";
        $go .= "\tres, _ := http.DefaultClient.Do(req)\n";
        $go .= "\tdefer res.Body.Close()\n\n";
        $go .= "\tout, _ := io.ReadAll(res.Body)\n";
        $go .= "\tfmt.Println(string(out))\n}";

        // 5. PHP (Guzzle)
        $php = "<?php\n\nuse GuzzleHttp\\Client;\n\n\$client = new Client();\n";
        $phpOptions = "[\n    'headers' => [\n        'Authorization' => 'Bearer YOUR_API_KEY',\n        'Content-Type' => 'application/json',\n    ],\n";
        if (! empty($body) && $method !== 'GET') {
            $phpOptions .= "    'json' => ".var_export($body, true).",\n";
        }
        $phpOptions .= ']';
        $php .= "\$response = \$client->request('{$method}', '{$fullUrl}', {$phpOptions});\n\n";
        $php .= 'echo $response->getBody();';

        return [
            'curl' => $curl,
            'javascript' => $js,
            'python' => $python,
            'go' => $go,
            'php' => $php,
        ];
    }

    protected function normalizeMethod(string $method): string
    {
        return strtolower($method);
    }

    /**
     * Execute live sandbox API request simulation.
     *
     * @param  array<string, mixed>  $headers
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    public function executeSandboxRequest(Organization $organization, User $user, string $method, string $path, array $headers, array $body): array
    {
        $statusCode = ($method === 'POST') ? 201 : 200;
        $latencyMs = rand(18, 36);

        $responsePayload = [
            'status' => 'success',
            'code' => $statusCode,
            'timestamp' => now()->toISOString(),
            'organization_id' => $organization->id,
            'request' => [
                'method' => strtoupper($method),
                'path' => $path,
            ],
            'data' => ! empty($body) ? array_merge(['id' => 'sandbox-res-'.bin2hex(random_bytes(4))], $body) : [
                'message' => 'Sandbox request successfully processed by Pandu API Gateway.',
                'meta' => [
                    'latency_ms' => $latencyMs,
                    'region' => 'ap-southeast-3-jakarta',
                    'rate_limit_remaining' => 988,
                ],
            ],
        ];

        $snippets = $this->generateSdkSnippets($method, $path, $headers, $body);

        return [
            'status_code' => $statusCode,
            'latency_ms' => $latencyMs,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-RateLimit-Limit' => '1000',
                'X-RateLimit-Remaining' => '988',
                'X-Request-Id' => 'req-'.bin2hex(random_bytes(6)),
            ],
            'response_payload' => $responsePayload,
            'snippets' => $snippets,
        ];
    }

    /**
     * Save custom request preset.
     *
     * @param  array<string, mixed>  $data
     */
    public function savePreset(Organization $organization, array $data, User $user): ApiRequestPreset
    {
        return ApiRequestPreset::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'method' => strtoupper($data['method'] ?? 'GET'),
            'endpoint_path' => $data['endpoint_path'],
            'headers' => $data['headers'] ?? ['Content-Type' => 'application/json'],
            'query_params' => $data['query_params'] ?? [],
            'request_body' => $data['request_body'] ?? [],
            'created_by' => $user->id,
        ]);
    }

    /**
     * Delete request preset.
     */
    public function deletePreset(ApiRequestPreset $preset): bool
    {
        return (bool) $preset->delete();
    }

    /**
     * Seed baseline request presets.
     */
    public function seedDefaultPresets(Organization $organization, User $user): void
    {
        ApiRequestPreset::create([
            'organization_id' => $organization->id,
            'name' => 'Fetch Project Sprint Tasks',
            'method' => 'GET',
            'endpoint_path' => '/v1/tasks',
            'headers' => ['Content-Type' => 'application/json'],
            'query_params' => ['status' => 'in_progress', 'limit' => 20],
            'request_body' => [],
            'created_by' => $user->id,
        ]);

        ApiRequestPreset::create([
            'organization_id' => $organization->id,
            'name' => 'Publish SemVer Release Note',
            'method' => 'POST',
            'endpoint_path' => '/v1/releases/publish',
            'headers' => ['Content-Type' => 'application/json'],
            'query_params' => [],
            'request_body' => [
                'version_tag' => 'v2.5.0',
                'title' => 'Sprint 77 Platform Release',
                'summary' => 'API Playground & Multi-Language SDK Generator',
            ],
            'created_by' => $user->id,
        ]);
    }
}
