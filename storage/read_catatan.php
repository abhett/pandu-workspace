<?php
$zip = new ZipArchive();
if ($zip->open(__DIR__ . '/../docs/catatan.docx') === true) {
    $xml = $zip->getFromName('word/document.xml');
    $zip->close();
    $text = str_replace('</w:p>', "\n", $xml);
    $text = strip_tags($text);
    file_put_contents(__DIR__ . '/catatan_dump.txt', $text);
    echo "Extracted catatan " . strlen($text) . " bytes\n";
}
