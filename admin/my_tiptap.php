<?
/**
 * Страница настроек модуля my.tiptap.
 *
 * Доступ: /bitrix/admin/my_tiptap.php
 */

use Bitrix\Main\Config\Option;
use Bitrix\Main\HttpApplication;
use Bitrix\Main\Loader;
use Bitrix\Main\Localization\Loc;
use My\Tiptap\Config;

require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_admin.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog.php';

Loc::loadMessages(__FILE__);
Loc::loadMessages(__DIR__ . '/../install/index.php');

$moduleId = Config::MODULE_ID;
$moduleAccess = $APPLICATION->GetGroupRight($moduleId);

if ($moduleAccess < 'R') {
    $APPLICATION->AuthForm(Loc::getMessage('ACCESS_DENIED'));
}

$request = HttpApplication::getInstance()->getContext()->getRequest();
$save = $request->isPost() && $request->getPost('save') === 'Y';

if ($save && check_bitrix_sessid()) {
    Option::set($moduleId, Config::OPT_REPLACE_DETAIL, $request->getPost(Config::OPT_REPLACE_DETAIL) === 'Y' ? 'Y' : 'N');
    Option::set($moduleId, Config::OPT_REPLACE_PREVIEW, $request->getPost(Config::OPT_REPLACE_PREVIEW) === 'Y' ? 'Y' : 'N');
    Option::set($moduleId, Config::OPT_REPLACE_UF, $request->getPost(Config::OPT_REPLACE_UF) === 'Y' ? 'Y' : 'N');
    Option::set($moduleId, Config::OPT_EXTRA_SELECTORS, trim((string) $request->getPost(Config::OPT_EXTRA_SELECTORS)));
    Option::set($moduleId, Config::OPT_MAX_UPLOAD_SIZE, max(1, (int) $request->getPost(Config::OPT_MAX_UPLOAD_SIZE)) * 1024 * 1024);
    Option::set($moduleId, Config::OPT_UPLOAD_DIR, preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $request->getPost(Config::OPT_UPLOAD_DIR)) ?: 'my_tiptap');

    LocalRedirect($APPLICATION->GetCurPageParam('', ['save']));
}

$opt = static function (string $name, $default = '') {
    return Option::get(Config::MODULE_ID, $name, $default);
};

$replaceDetail = $opt(Config::OPT_REPLACE_DETAIL, 'Y');
$replacePreview = $opt(Config::OPT_REPLACE_PREVIEW, 'Y');
$replaceUf = $opt(Config::OPT_REPLACE_UF, 'Y');
$extraSelectors = $opt(Config::OPT_EXTRA_SELECTORS, '');
$maxSizeMb = (int) ($opt(Config::OPT_MAX_UPLOAD_SIZE, 10 * 1024 * 1024) / 1024 / 1024);
$uploadDir = $opt(Config::OPT_UPLOAD_DIR, 'my_tiptap');

$APPLICATION->SetTitle(Loc::getMessage('MY_TIPTAP_PAGE_TITLE'));

$tabControl = new CAdminTabControl('tabControl', [
    ['TAB' => Loc::getMessage('MY_TIPTAP_TAB_SETTINGS'), 'TITLE' => ''],
    ['TAB' => Loc::getMessage('MY_TIPTAP_TAB_ABOUT'), 'TITLE' => ''],
]);
?>
<form method="post" action="<?= htmlspecialcharsbx($APPLICATION->GetCurPageParam()) ?>">
    <?= bitrix_sessid_post() ?>
    <input type="hidden" name="save" value="Y">
    <?php $tabControl->Begin(); ?>

    <?php $tabControl->BeginNextTab(); ?>
    <tr>
        <td width="40%"><?= Loc::getMessage('MY_TIPTAP_OPT_REPLACE_DETAIL') ?>:</td>
        <td><input type="checkbox" name="<?= Config::OPT_REPLACE_DETAIL ?>" value="Y" <?= $replaceDetail === 'Y' ? 'checked' : '' ?>></td>
    </tr>
    <tr>
        <td><?= Loc::getMessage('MY_TIPTAP_OPT_REPLACE_PREVIEW') ?>:</td>
        <td><input type="checkbox" name="<?= Config::OPT_REPLACE_PREVIEW ?>" value="Y" <?= $replacePreview === 'Y' ? 'checked' : '' ?>></td>
    </tr>
    <tr>
        <td><?= Loc::getMessage('MY_TIPTAP_OPT_REPLACE_UF') ?>:</td>
        <td><input type="checkbox" name="<?= Config::OPT_REPLACE_UF ?>" value="Y" <?= $replaceUf === 'Y' ? 'checked' : '' ?>></td>
    </tr>
    <tr>
        <td><?= Loc::getMessage('MY_TIPTAP_OPT_EXTRA_SELECTORS') ?>:</td>
        <td><input type="text" name="<?= Config::OPT_EXTRA_SELECTORS ?>" value="<?= htmlspecialcharsbx($extraSelectors) ?>" size="50" placeholder="textarea[name=&quot;MY_FIELD&quot;]"></td>
    </tr>
    <tr>
        <td><?= Loc::getMessage('MY_TIPTAP_OPT_MAX_UPLOAD_SIZE') ?>:</td>
        <td><input type="number" name="<?= Config::OPT_MAX_UPLOAD_SIZE ?>" value="<?= $maxSizeMb ?>" min="1" max="100" size="6"> MB</td>
    </tr>
    <tr>
        <td><?= Loc::getMessage('MY_TIPTAP_OPT_UPLOAD_DIR') ?>:</td>
        <td><input type="text" name="<?= Config::OPT_UPLOAD_DIR ?>" value="<?= htmlspecialcharsbx($uploadDir) ?>" size="30"></td>
    </tr>

    <?php $tabControl->BeginNextTab(); ?>
    <tr>
        <td colspan="2">
            <p><?= Loc::getMessage('MY_TIPTAP_ABOUT_TEXT') ?></p>
            <p><strong>Локальный бандл:</strong> <?= is_file($_SERVER['DOCUMENT_ROOT'] . '/local/modules/' . $moduleId . '/assets/js/tiptap.bundle.js') ? 'собран' : '<span style="color:#d9534f;">не собран — используется CDN</span>' ?></p>
        </td>
    </tr>

    <?php $tabControl->Buttons(); ?>
    <input type="submit" value="<?= Loc::getMessage('MY_TIPTAP_SAVE') ?>" class="adm-btn-save">
    <?php $tabControl->End(); ?>
</form>
<?php
require_once $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/epilog_admin.php';
