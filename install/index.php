<?
use Bitrix\Main\Localization\Loc;
use Bitrix\Main\EventManager;
use Bitrix\Main\ModuleManager;

Loc::loadMessages(__FILE__);

/**
 * Модуль замены штатного визуального редактора Битрикса на Tiptap.
 *
 * Регистрирует JS-инжектор для страниц админки, который заменяет
 * визуальный редактор у полей DETAIL_TEXT / PREVIEW_TEXT / UF-HTML
 * на редактор Tiptap. Загрузка изображений — через собственный
 * PHP-контроллер /local/modules/my.tiptap/ajax/upload.php.
 */
class my_tiptap extends CModule
{
    public $MODULE_ID = 'my.tiptap';
    public $MODULE_VERSION;
    public $MODULE_VERSION_DATE;
    public $MODULE_NAME;
    public $MODULE_DESCRIPTION;
    public $PARTNER_NAME = 'my';
    public $PARTNER_URI = '';

    public function __construct()
    {
        $arModuleVersion = [];
        include __DIR__ . '/version.php';

        $this->MODULE_VERSION = $arModuleVersion['VERSION'];
        $this->MODULE_VERSION_DATE = $arModuleVersion['VERSION_DATE'];
        $this->MODULE_NAME = Loc::getMessage('MY_TIPTAP_MODULE_NAME');
        $this->MODULE_DESCRIPTION = Loc::getMessage('MY_TIPTAP_MODULE_DESCRIPTION');
    }

    public function DoInstall()
    {
        $this->registerEvents();
        ModuleManager::registerModule($this->MODULE_ID);
        return true;
    }

    public function DoUninstall()
    {
        $this->unRegisterEvents();
        ModuleManager::unRegisterModule($this->MODULE_ID);
        return true;
    }

    private function registerEvents(): void
    {
        $em = EventManager::getInstance();
        $em->registerEventHandler(
            'main',
            'OnAdminPageInit',
            $this->MODULE_ID,
            'My\\Tiptap\\Event\\TiptapInjector',
            'onAdminPageInit'
        );
    }

    private function unRegisterEvents(): void
    {
        $em = EventManager::getInstance();
        $em->unRegisterEventHandler(
            'main',
            'OnAdminPageInit',
            $this->MODULE_ID,
            'My\\Tiptap\\Event\\TiptapInjector',
            'onAdminPageInit'
        );
    }
}
