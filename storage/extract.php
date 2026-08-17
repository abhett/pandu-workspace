<?php

$zip = new ZipArchive();
if ($zip->open(__DIR__ . '/../docs/implementationplan.docx') === true) {
    $xml = $zip->getFromName('word/document.xml');
    $text = preg_replace('/<w:p[^>]*>/', "\n", $xml);
    $text = strip_tags($text);
    file_put_contents(__DIR__ . '/implementationplan_dump.txt', $text);
    echo "Extracted implementationplan: " . strlen($text) . " chars\n";
    $zip->close();
} else {
    echo "Could not open implementationplan.docx\n";
}
