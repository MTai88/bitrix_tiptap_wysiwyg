<?
namespace My\Tiptap;

use Bitrix\Main\Config\Option;

/**
 * Работа с настройками модуля.
 *
 * Опции:
 *  - replace_detail_text    — заменять ли DETAIL_TEXT у элементов инфоблоков (Y/N)
 *  - replace_preview_text   — заменять ли PREVIEW_TEXT (Y/N)
 *  - replace_uf_html        — заменять ли UF-поля типа html / html_editor (Y/N)
 *  - extra_selectors        — дополнительные CSS-селекторы textarea, через запятую
 *  - max_upload_size        — максимальный размер загружаемого изображения (байт)
 *  - upload_dir             — подкаталог в /upload/ для сохранения файлов
 */
final class Config
{
    public const MODULE_ID = 'my.tiptap';

    public const OPT_REPLACE_DETAIL = 'replace_detail_text';
    public const OPT_REPLACE_PREVIEW = 'replace_preview_text';
    public const OPT_REPLACE_UF = 'replace_uf_html';
    public const OPT_EXTRA_SELECTORS = 'extra_selectors';
    public const OPT_MAX_UPLOAD_SIZE = 'max_upload_size';
    public const OPT_UPLOAD_DIR = 'upload_dir';

    public static function replaceDetailText(): bool
    {
        return Option::get(self::MODULE_ID, self::OPT_REPLACE_DETAIL, 'Y') === 'Y';
    }

    public static function replacePreviewText(): bool
    {
        return Option::get(self::MODULE_ID, self::OPT_REPLACE_PREVIEW, 'Y') === 'Y';
    }

    public static function replaceUfHtml(): bool
    {
        return Option::get(self::MODULE_ID, self::OPT_REPLACE_UF, 'Y') === 'Y';
    }

    public static function extraSelectors(): string
    {
        return (string) Option::get(self::MODULE_ID, self::OPT_EXTRA_SELECTORS, '');
    }

    public static function maxUploadSize(): int
    {
        return (int) Option::get(self::MODULE_ID, self::OPT_MAX_UPLOAD_SIZE, 10 * 1024 * 1024);
    }

    public static function uploadDir(): string
    {
        $dir = (string) Option::get(self::MODULE_ID, self::OPT_UPLOAD_DIR, 'my_tiptap');
        // Защита: только латиница, цифры, _, -
        return preg_replace('/[^a-zA-Z0-9_\-]/', '', $dir) ?: 'my_tiptap';
    }

    /**
     * Возвращает итоговый список CSS-селекторов textarea, которые
     * нужно заменить, в виде массива.
     */
    public static function getTextareaSelectors(): array
    {
        $selectors = [];

        if (self::replaceDetailText()) {
            $selectors[] = 'textarea[name="DETAIL_TEXT"]';
        }
        if (self::replacePreviewText()) {
            $selectors[] = 'textarea[name="PREVIEW_TEXT"]';
        }
        if (self::replaceUfHtml()) {
            // UF-свойства инфоблоков с типом HTML / HTML_EDITOR / TEXT.
            // Атрибут name у таких полей: PROPERTY[<ID>][VALUE] или PROPERTY[<CODE>][VALUE]
            $selectors[] = 'textarea[name$="[VALUE]"]';
        }

        $extra = self::extraSelectors();
        if ($extra !== '') {
            foreach (explode(',', $extra) as $sel) {
                $sel = trim($sel);
                if ($sel !== '') {
                    $selectors[] = $sel;
                }
            }
        }

        return $selectors;
    }
}
