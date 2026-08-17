<?php

$lines = file(__DIR__ . '/implementationplan_dump.txt');
foreach ($lines as $i => $l) {
    if (preg_match('/(attachments|webhook|sanctum|idempotency|rate limit|files and api|Sprint 6|Phase 6|Chapter 6)/i', $l)) {
        echo ($i + 1) . ': ' . trim($l) . "\n";
    }
}
