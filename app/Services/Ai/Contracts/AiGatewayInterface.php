<?php

namespace App\Services\Ai\Contracts;

use App\Services\Ai\Dto\AiRequest;
use App\Services\Ai\Dto\AiResponse;

interface AiGatewayInterface
{
    /**
     * Execute an AI capability request through the internal gateway pipeline.
     */
    public function execute(AiRequest $request): AiResponse;
}
