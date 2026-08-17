<?php

namespace App\Services\Ai\Redaction;

class RedactionService
{
    /**
     * Redact sensitive information (PII, Secrets, API Keys) and sanitize prompt injection threats.
     */
    public function redact(string $text): string
    {
        // 1. Redact API Keys / Bearer tokens / Secrets
        $text = preg_replace(
            '/(?:sk-[a-zA-Z0-9]{20,}|whsec_[a-zA-Z0-9]{20,}|bearer\s+[a-zA-Z0-9\._-]{20,})/i',
            '[SECRET_REDACTED]',
            $text
        );

        // 2. Redact Email addresses
        $text = preg_replace(
            '/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i',
            '[EMAIL_REDACTED]',
            $text
        );

        // 3. Redact Phone numbers (Indonesian & International formats)
        $text = preg_replace(
            '/(?:\+?62|08)[0-9]{8,12}/',
            '[PHONE_REDACTED]',
            $text
        );

        // 4. Redact Credit card patterns
        $text = preg_replace(
            '/\b(?:\d{4}[ -]?){3}\d{4}\b/',
            '[CREDIT_CARD_REDACTED]',
            $text
        );

        // 5. Neutralize known Prompt Injection & Jailbreak attack patterns
        $injectionPatterns = [
            '/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i',
            '/(?:system\s+prompt\s+override|developer\s+mode\s+enabled|dan\s+mode)/i',
            '/(?:reveal|output|print|display)\s+(?:the\s+)?(?:system\s+prompt|secret\s+key|api\s+key)/i',
            '/(?:you\s+are\s+now\s+an\s+unrestricted\s+ai)/i',
        ];

        foreach ($injectionPatterns as $pattern) {
            $text = preg_replace($pattern, '[INJECTION_ATTEMPT_FILTERED]', $text);
        }

        return $text;
    }
}
