<?
namespace My\Tiptap\Event;

use Bitrix\Main\Page\Asset;
use My\Tiptap\Config;

/**
 * Подключает JS+CSS Tiptap'а в админке.
 *
 * Хук срабатывает на OnAdminPageInit — гарантированно работает в админке,
 * после загрузки ядра Битрикса, до отрисовки страницы.
 *
 * ВАЖНО: в этом контексте Bitrix\Main\Page\Asset::addJs/addCss/addString
 * НЕ РАБОТАЕТ (Asset-Mode не инициализирован для админки). Используем
 * процедурный API ядра — $APPLICATION->AddHeadScript() и SetAdditionalCSS().
 */
final class TiptapInjector
{
    public static function onAdminPageInit(): void
    {
        error_log('[my.tiptap] onAdminPageInit CALLED, SCRIPT_NAME=' . ($_SERVER['SCRIPT_NAME'] ?? 'null') . ', ADMIN_SECTION=' . (defined('ADMIN_SECTION') ? '1' : '0'));
        global $APPLICATION;

        if (!self::shouldInject()) {
            error_log('[my.tiptap] shouldInject returned FALSE, exiting');
            return;
        }

        $selectors = Config::getTextareaSelectors();
        if (empty($selectors)) {
            // Ничего заменять не нужно — выходим
            return;
        }

        $assets = self::getAssetsPath();

        // CSS — через SetAdditionalCSS
        $APPLICATION->SetAdditionalCSS($assets . '/css/tiptap.css');

        // JS-конфиг (inline) — через AddHeadString
        $jsConfig = [
            'uploadUrl' => $assets . '/ajax/upload.php',
            'lang' => LANGUAGE_ID,
            'selectors' => $selectors,
            'maxUploadSize' => Config::maxUploadSize(),
            'debug' => false,
        ];
        $APPLICATION->AddHeadString(
            '<script>window.MY_TIPTAP_CONFIG = ' . json_encode($jsConfig, JSON_UNESCAPED_UNICODE) . ';</script>',
            true
        );

        // Tiptap-бандл: пробуем сначала локальный, иначе — CDN.
        $localBundle = $_SERVER['DOCUMENT_ROOT'] . $assets . '/js/tiptap.bundle.js';
        if (is_file($localBundle) && filesize($localBundle) > 1024) {
            $APPLICATION->AddHeadScript($assets . '/js/tiptap.bundle.js');
        } else {
            $APPLICATION->AddHeadScript($assets . '/js/tiptap-loader.js');
        }

        // Наш инициализатор
        $APPLICATION->AddHeadScript($assets . '/js/tiptap-init.js');
        error_log('[my.tiptap] assets enqueued, CWD=' . $assets);
    }

    /**
     * Подключаем только там, где это уместно: админка + страницы
     * редактирования контента. Из публичной части — никак.
     */
    private static function shouldInject(): bool
    {
        if (!defined('ADMIN_SECTION') || ADMIN_SECTION !== true) {
            return false;
        }

        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

        // Список страниц, где есть смысл заменять редактор.
        $allowed = [
            '/bitrix/admin/iblock_element_edit.php',
            '/bitrix/admin/iblock_section_edit.php',
            '/bitrix/admin/iblock_edit.php',
            '/bitrix/admin/user_edit.php',
            '/bitrix/admin/userfield_edit.php',
            '/bitrix/admin/fileman_edit.php',
            '/bitrix/admin/landing_edit.php',
        ];

        foreach ($allowed as $page) {
            if (strpos($scriptName, $page) !== false) {
                return true;
            }
        }

        // Универсальный fallback: подключаем на любой странице админки,
        // где есть нужные textarea.
        return strpos($scriptName, '/bitrix/admin/') === 0;
    }

    private static function getAssetsPath(): string
    {
        return '/local/modules/' . Config::MODULE_ID . '/assets';
    }
}
