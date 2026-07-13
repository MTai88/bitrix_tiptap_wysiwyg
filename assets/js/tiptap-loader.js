/**
 * Fallback-загрузчик Tiptap через importmap + esm.sh.
 *
 * Используется, когда локальный бандл tiptap.bundle.js не собран
 * (или отсутствует). Динамически добавляет <script type="importmap">,
 * затем <script type="module">, который импортирует Tiptap и выставляет
 * его в window.Tiptap.
 *
 * Версии пакетов зафиксированы. Если обновляешь — обнови и здесь.
 */
(function () {
    'use strict';

    if (window.Tiptap && window.Tiptap.Editor) {
        return; // уже загружен
    }

    const TIPTAP_VERSION = '2.10.3';
    const PM_VERSION = '2.10.3';
    const ESM_HOST = 'https://esm.sh';

    const imports = {
        '@tiptap/core': ESM_HOST + '/@tiptap/core@' + TIPTAP_VERSION,
        '@tiptap/pm/state': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/state',
        '@tiptap/pm/view': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/view',
        '@tiptap/pm/model': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/model',
        '@tiptap/pm/transform': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/transform',
        '@tiptap/pm/commands': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/commands',
        '@tiptap/pm/keymap': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/keymap',
        '@tiptap/pm/inputrules': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/inputrules',
        '@tiptap/pm/dropcursor': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/dropcursor',
        '@tiptap/pm/gapcursor': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/gapcursor',
        '@tiptap/pm/history': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/history',
        '@tiptap/pm/schema-list': ESM_HOST + '/@tiptap/pm@' + PM_VERSION + '/schema-list',
        '@tiptap/starter-kit': ESM_HOST + '/@tiptap/starter-kit@' + TIPTAP_VERSION,
        '@tiptap/extension-underline': ESM_HOST + '/@tiptap/extension-underline@' + TIPTAP_VERSION,
        '@tiptap/extension-link': ESM_HOST + '/@tiptap/extension-link@' + TIPTAP_VERSION,
        '@tiptap/extension-image': ESM_HOST + '/@tiptap/extension-image@' + TIPTAP_VERSION,
        '@tiptap/extension-text-align': ESM_HOST + '/@tiptap/extension-text-align@' + TIPTAP_VERSION,
        '@tiptap/extension-placeholder': ESM_HOST + '/@tiptap/extension-placeholder@' + TIPTAP_VERSION,
    };

    // 1. importmap
    const mapScript = document.createElement('script');
    mapScript.type = 'importmap';
    mapScript.textContent = JSON.stringify({ imports });
    document.head.appendChild(mapScript);

    // 2. модуль, который импортирует и выставляет Tiptap в window
    const moduleScript = document.createElement('script');
    moduleScript.type = 'module';
    moduleScript.textContent = `
        import { Editor } from '@tiptap/core';
        import { StarterKit } from '@tiptap/starter-kit';
        import { Underline } from '@tiptap/extension-underline';
        import { Link } from '@tiptap/extension-link';
        import { Image } from '@tiptap/extension-image';
        import { TextAlign } from '@tiptap/extension-text-align';
        import { Placeholder } from '@tiptap/extension-placeholder';
        window.Tiptap = { Editor, StarterKit, Underline, Link, Image, TextAlign, Placeholder };
        window.dispatchEvent(new CustomEvent('my-tiptap:ready'));
    `;
    document.head.appendChild(moduleScript);
})();
