<?php
$data = json_decode(file_get_contents(__DIR__ . '/phpstan_clean.json'), true);
if (!$data || !isset($data['error_details'])) {
    echo "No details found\n";
    exit;
}

echo "Total error files: " . count($data['error_details']) . "\n";
foreach ($data['error_details'] as $file => $errors) {
    $relFile = str_replace('C:\\laragon\\www\\pandu\\pandu-management\\', '', $file);
    echo "- {$relFile} (" . count($errors) . " errors)\n";
}
