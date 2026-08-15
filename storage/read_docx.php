<?php
$zip = new ZipArchive();
if ($zip->open(__DIR__ . '/../docs/implementationplan.docx') === true) {
    $xml = $zip->getFromName('word/document.xml');
    $zip->close();
    // replace </w:p> with newline
    $text = str_replace('</w:p>', "\n", $xml);
    $text = strip_tags($text);
    file_put_contents(__DIR__ . '/plan_dump.txt', $text);
    echo "Extracted " . strlen($text) . " bytes\n";
} else {
    echo "Failed to open docx\n";
}
