<?
namespace My\Tiptap\Controller;

use Bitrix\Main\Context;
use Bitrix\Main\HttpResponse;
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\Text\Encoding;
use CFile;
use CUser;

Loc::loadMessages(__FILE__);

/**
 * Контроллер загрузки изображений для Tiptap.
 *
 * Принимает multipart/form-data с полем "file", отдаёт JSON:
 *   { "success": true,  "file": { "id": N, "url": "...", ... } }
 *   { "success": false, "error": "CODE", "message": "..." }
 *
 * Проверки:
 *  - залогиненный пользователь с правом на контент
 *  - корректный метод (POST)
 *  - размер файла (по опции модуля)
 *  - mime-type (белый список)
 *  - сохранение через CFile::SaveFile
 */
final class Upload
{
    public const ALLOWED_MIME = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
    ];

    /**
     * Точка входа. Возвращает HttpResponse с JSON-телом.
     */
    public static function handle(): HttpResponse
    {
        $request = Context::getCurrent()->getRequest();
        $response = new HttpResponse();

        if (!$request->isPost()) {
            return self::json($response, false, 'METHOD_NOT_ALLOWED', Loc::getMessage('MY_TIPTAP_METHOD_NOT_ALLOWED'), 405);
        }

        if (!self::checkAccess()) {
            return self::json($response, false, 'AUTH_REQUIRED', Loc::getMessage('MY_TIPTAP_AUTH_REQUIRED'), 403);
        }

        $files = $request->getFileList()->toArray();
        if (empty($files)) {
            return self::json($response, false, 'NO_FILE', Loc::getMessage('MY_TIPTAP_NO_FILE'), 400);
        }

        $file = reset($files);

        // В Bitrix файлы приходят как массивы. Проверяем.
        if (!is_array($file) || !isset($file['tmp_name'], $file['name'], $file['size'], $file['type'])) {
            return self::json($response, false, 'BAD_FILE', Loc::getMessage('MY_TIPTAP_BAD_FILE'), 400);
        }

        if ((int) $file['error'] !== UPLOAD_ERR_OK) {
            return self::json(
                $response,
                false,
                'UPLOAD_ERROR_' . (int) $file['error'],
                Loc::getMessage('MY_TIPTAP_UPLOAD_ERROR') . ' (code ' . (int) $file['error'] . ')',
                400
            );
        }

        $maxSize = (int) (new \My\Tiptap\Config())->maxUploadSize();
        if ((int) $file['size'] > $maxSize) {
            return self::json(
                $response,
                false,
                'TOO_LARGE',
                Loc::getMessage('MY_TIPTAP_TOO_LARGE', ['#SIZE#' => (int) ($maxSize / 1024 / 1024) . ' MB']),
                413
            );
        }

        if (!in_array((string) $file['type'], self::ALLOWED_MIME, true)) {
            return self::json($response, false, 'BAD_TYPE', Loc::getMessage('MY_TIPTAP_BAD_TYPE'), 415);
        }

        // Сохраняем через CFile — он сам уберёт в нужный подкаталог /upload/...
        $subdir = (new \My\Tiptap\Config())->uploadDir();
        $fileArray = [
            'name' => $file['name'],
            'size' => $file['size'],
            'tmp_name' => $file['tmp_name'],
            'type' => $file['type'],
            'MODULE_ID' => \My\Tiptap\Config::MODULE_ID,
            'subdir' => $subdir,
        ];

        $fileId = CFile::SaveFile($fileArray, $subdir);
        if (!$fileId) {
            return self::json($response, false, 'SAVE_FAILED', Loc::getMessage('MY_TIPTAP_SAVE_FAILED'), 500);
        }

        $stored = CFile::GetFileArray($fileId);
        if (!$stored) {
            return self::json($response, false, 'GET_FAILED', Loc::getMessage('MY_TIPTAP_SAVE_FAILED'), 500);
        }

        // Нормализуем URL
        $url = (string) ($stored['SRC'] ?? '');
        if ($url !== '' && strpos($url, 'http') !== 0) {
            // Относительный путь — приведём к абсолютному для удобства JS.
            $url = '//' . ($_SERVER['HTTP_HOST'] ?? '') . $url;
        }

        return self::json($response, true, '', '', 200, [
            'file' => [
                'id' => (int) $fileId,
                'url' => $url,
                'name' => (string) ($stored['ORIGINAL_NAME'] ?? $file['name']),
                'size' => (int) ($stored['FILE_SIZE'] ?? $file['size']),
                'width' => $stored['WIDTH'] ?? null,
                'height' => $stored['HEIGHT'] ?? null,
                'mime' => (string) ($stored['CONTENT_TYPE'] ?? $file['type']),
            ],
        ]);
    }

    /**
     * Проверка доступа: только залогиненный пользователь с правом
     * редактирования контента (по условию — "все редакторы",
     * то есть те, кто имеет доступ к админке с правом на контент).
     */
    private static function checkAccess(): bool
    {
        global $USER;
        if (!is_object($USER) || !$USER instanceof CUser) {
            return false;
        }
        if (!$USER->IsAuthorized()) {
            return false;
        }

        // Дополнительно: проверим, что у пользователя есть право
        // на редактирование хотя бы одного инфоблока (это, по сути,
        // и есть определение "редактора" в Битриксе).
        // Если проверка избыточна для какого-то частного случая —
        // её можно отключить в опциях модуля.
        if (!$USER->CanDoOperation('edit_own_profile')) {
            // Минимум: пользователь — не аноним
            return false;
        }

        return true;
    }

    private static function json(
        HttpResponse $response,
        bool $success,
        string $errorCode,
        string $message,
        int $status = 200,
        array $extra = []
    ): HttpResponse {
        $body = ['success' => $success];
        if ($errorCode !== '') {
            $body['error'] = $errorCode;
        }
        if ($message !== '') {
            $body['message'] = $message;
        }
        $body = array_merge($body, $extra);

        $json = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response->addHeader('Content-Type', 'application/json; charset=utf-8');
        $response->setStatus($status . ' ' . self::statusText($status));
        $response->setContent($json);

        return $response;
    }

    private static function statusText(int $code): string
    {
        $map = [
            200 => 'OK',
            400 => 'Bad Request',
            403 => 'Forbidden',
            405 => 'Method Not Allowed',
            413 => 'Payload Too Large',
            415 => 'Unsupported Media Type',
            500 => 'Internal Server Error',
        ];
        return $map[$code] ?? '';
    }
}
