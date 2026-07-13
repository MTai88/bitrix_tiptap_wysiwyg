<?
use Bitrix\Main\Loader;

if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) {
    die();
}

Loader::registerAutoLoadClasses('my.tiptap', [
    'My\\Tiptap\\Event\\TiptapInjector' => 'lib/Event/TiptapInjector.php',
    'My\\Tiptap\\Controller\\Upload' => 'lib/Controller/Upload.php',
    'My\\Tiptap\\Config' => 'lib/Config.php',
]);
