<?
/**
 * AJAX-эндпоинт загрузки изображений для Tiptap.
 *
 * URL: /local/modules/my.tiptap/ajax/upload.php
 *
 * Multipart-формат:
 *   - file: файл изображения
 *
 * Ответ (JSON):
 *   { "success": true,  "file": { "id", "url", "name", "size", ... } }
 *   { "success": false, "error": "CODE", "message": "..." }
 */

use Bitrix\Main\Loader;
use My\Tiptap\Controller\Upload;

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php';

if (!Loader::includeModule('my.tiptap')) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'MODULE_NOT_FOUND']);
    exit;
}

// Битрикс может отдавать тело ответа сам, если в прологе что-то сломалось —
// на этот случай принудительно гасим вывод пролога.
$response = Upload::handle();
$response->send();
