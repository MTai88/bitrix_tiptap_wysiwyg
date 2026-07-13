/**
 * Инициализация Tiptap-редактора вместо штатного WYSIWYG Битрикса.
 *
 * Ищет textarea по селекторам из window.MY_TIPTAP_CONFIG.selectors,
 * прячет их, рендерит рядом Tiptap, и синхронизирует HTML обратно
 * в textarea на каждом изменении.
 *
 * Загрузка изображений:
 *  - drag&drop в зону редактора → POST на uploadUrl
 *  - кнопка в тулбаре → file picker → POST на uploadUrl
 *
 * Переживает динамические вкладки Битрикса (MutationObserver).
 */
(function () {
    'use strict';

    console.log('[my.tiptap] init script loaded');

    const CONFIG = window.MY_TIPTAP_CONFIG || {};
    const SELECTORS = CONFIG.selectors || ['textarea[name="DETAIL_TEXT"]', 'textarea[name="PREVIEW_TEXT"]'];
    const UPLOAD_URL = CONFIG.uploadUrl || '/local/modules/my.tiptap/ajax/upload.php';
    const MAX_SIZE = CONFIG.maxUploadSize || 10 * 1024 * 1024;

    console.log('[my.tiptap] config:', CONFIG);

    if (!window.Tiptap || !window.Tiptap.Editor) {
        console.error('[my.tiptap] Tiptap not loaded. Build local bundle or ensure tiptap-loader.js works.');
        return;
    }

    console.log('[my.tiptap] Tiptap ready:', Object.keys(window.Tiptap).join(','));

    const T = window.Tiptap;

    /** @type {WeakMap<HTMLTextAreaElement, Tiptap.Editor>} */
    const editorMap = new WeakMap();

    /* ---------- Утилиты ---------- */

    function notify(message, type) {
        // Лёгкий тост — без зависимостей.
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText =
            'position:fixed;bottom:24px;right:24px;z-index:99999;padding:10px 16px;border-radius:4px;' +
            'background:' + (type === 'error' ? '#d9534f' : '#5cb85c') + ';color:#fff;' +
            'box-shadow:0 4px 12px rgba(0,0,0,.2);font:13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;';
        document.body.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity .3s'; }, 2500);
        setTimeout(() => { div.remove(); }, 3000);
    }

    function uploadFile(file) {
        if (!file) return Promise.reject(new Error('No file'));
        if (file.size > MAX_SIZE) {
            return Promise.reject(new Error('Файл больше ' + Math.round(MAX_SIZE / 1024 / 1024) + ' MB'));
        }
        if (!/^image\/(jpeg|png|gif|webp|svg\+xml)$/.test(file.type)) {
            return Promise.reject(new Error('Недопустимый тип файла'));
        }

        const formData = new FormData();
        formData.append('file', file);

        return fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData,
            credentials: 'same-origin',
        }).then((r) => r.json()).then((data) => {
            if (!data || !data.success || !data.file) {
                throw new Error((data && data.message) || 'Upload failed');
            }
            return data.file;
        });
    }

    /* ---------- Тулбар ---------- */

    /**
     * Строит простой тулбар над редактором.
     * Все кнопки возвращают цепочку editor.chain().focus()....
     */
    function buildToolbar(editor) {
        const bar = document.createElement('div');
        bar.className = 'my-tt-toolbar';

        const Btn = (label, title, action, isActive) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.title = title;
            b.className = 'my-tt-btn' + (isActive && isActive() ? ' is-active' : '');
            b.addEventListener('click', (e) => { e.preventDefault(); action(); });
            if (isActive) {
                editor.on('selectionUpdate', () => {
                    b.classList.toggle('is-active', !!isActive());
                });
            }
            return b;
        };

        const buttons = [
            Btn('B', 'Жирный (Ctrl+B)', () => editor.chain().focus().toggleBold().run(), () => editor.isActive('bold')),
            Btn('I', 'Курсив (Ctrl+I)', () => editor.chain().focus().toggleItalic().run(), () => editor.isActive('italic')),
            Btn('U', 'Подчёркнутый', () => editor.chain().focus().toggleUnderline().run(), () => editor.isActive('underline')),
            Btn('S', 'Зачёркнутый', () => editor.chain().focus().toggleStrike().run(), () => editor.isActive('strike')),
            sep(),
            Btn('H2', 'Заголовок 2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), () => editor.isActive('heading', { level: 2 })),
            Btn('H3', 'Заголовок 3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), () => editor.isActive('heading', { level: 3 })),
            Btn('P', 'Параграф', () => editor.chain().focus().setParagraph().run()),
            sep(),
            Btn('•', 'Маркированный список', () => editor.chain().focus().toggleBulletList().run(), () => editor.isActive('bulletList')),
            Btn('1.', 'Нумерованный список', () => editor.chain().focus().toggleOrderedList().run(), () => editor.isActive('orderedList')),
            Btn('"', 'Цитата', () => editor.chain().focus().toggleBlockquote().run(), () => editor.isActive('blockquote')),
            Btn('</>', 'Код', () => editor.chain().focus().toggleCodeBlock().run(), () => editor.isActive('codeBlock')),
            sep(),
            Btn('⇤', 'По левому краю', () => editor.chain().focus().setTextAlign('left').run(), () => editor.isActive({ textAlign: 'left' })),
            Btn('⇔', 'По центру', () => editor.chain().focus().setTextAlign('center').run(), () => editor.isActive({ textAlign: 'center' })),
            Btn('⇥', 'По правому краю', () => editor.chain().focus().setTextAlign('right').run(), () => editor.isActive({ textAlign: 'right' })),
            sep(),
            Btn('🔗', 'Ссылка', () => {
                const prev = editor.getAttributes('link').href;
                const url = window.prompt('URL ссылки:', prev || 'https://');
                if (url === null) return;
                if (url === '') {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    return;
                }
                editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }, () => editor.isActive('link')),
            imageButton(editor),
            Btn('HR', 'Горизонтальная линия', () => editor.chain().focus().setHorizontalRule().run()),
            Btn('⌫', 'Отменить', () => editor.chain().focus().undo().run()),
            Btn('⌫↻', 'Повторить', () => editor.chain().focus().redo().run()),
        ];

        buttons.forEach((b) => bar.appendChild(b));
        return bar;
    }

    function sep() {
        const s = document.createElement('span');
        s.className = 'my-tt-sep';
        return s;
    }

    function imageButton(editor) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'my-tt-btn';
        btn.textContent = '🖼';
        btn.title = 'Загрузить изображение';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.addEventListener('change', (ev) => {
                const file = ev.target.files && ev.target.files[0];
                if (!file) return;
                uploadFile(file).then((res) => {
                    editor.chain().focus().setImage({ src: res.url, alt: res.name || '' }).run();
                    notify('Загружено: ' + res.name);
                }).catch((err) => notify('Ошибка: ' + err.message, 'error'));
            });
            input.click();
        });
        return btn;
    }

    /* ---------- Создание экземпляра ---------- */

    function makeEditor(textarea) {
        if (textarea.dataset.tiptapMounted === '1' || editorMap.has(textarea)) {
            return;
        }
        textarea.dataset.tiptapMounted = '1';

        const initialHtml = textarea.value || '';

        const wrap = document.createElement('div');
        wrap.className = 'my-tt-wrap';
        textarea.parentNode.insertBefore(wrap, textarea);

        const toolbar = buildToolbar(null); // без active — обновим после создания
        wrap.appendChild(toolbar);

        const editorEl = document.createElement('div');
        editorEl.className = 'my-tt-editor';
        wrap.appendChild(editorEl);

        // Прячем textarea
        textarea.style.display = 'none';

        const editor = new T.Editor({
            element: editorEl,
            extensions: [
                T.StarterKit.configure({
                    // Если не нужен — отключаем, чтобы сэкономить место
                    codeBlock: { HTMLAttributes: { class: 'my-tt-code' } },
                }),
                T.Underline,
                T.Link.configure({
                    openOnClick: false,
                    autolink: true,
                    HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
                }),
                T.Image.configure({
                    inline: false,
                    allowBase64: false,
                    HTMLAttributes: { class: 'my-tt-img' },
                }),
                T.TextAlign.configure({ types: ['heading', 'paragraph'] }),
                T.Placeholder.configure({ placeholder: 'Введите текст...' }),
            ],
            content: initialHtml,
            onUpdate: ({ editor }) => {
                textarea.value = editor.getHTML();
            },
            onCreate: ({ editor }) => {
                // Подвязываем тулбар к редактору (нужен для active-обновлений)
                rebuildToolbarActive(toolbar, editor);
            },
            editorProps: {
                handleDrop: (view, event) => {
                    const files = event.dataTransfer && event.dataTransfer.files;
                    if (!files || files.length === 0) return false;
                    const file = files[0];
                    if (!/^image\//.test(file.type)) return false;
                    event.preventDefault();
                    uploadFile(file).then((res) => {
                        const { schema } = view.state;
                        const coordinates = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        });
                        if (!coordinates) return;
                        const node = schema.nodes.image.create({ src: res.url, alt: res.name || '' });
                        const tr = view.state.tr.insert(coordinates.pos, node);
                        view.dispatch(tr);
                        notify('Загружено: ' + res.name);
                    }).catch((err) => notify('Ошибка: ' + err.message, 'error'));
                    return true;
                },
                handlePaste: (view, event) => {
                    const items = event.clipboardData && event.clipboardData.items;
                    if (!items) return false;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].kind === 'file' && /^image\//.test(items[i].type)) {
                            const file = items[i].getAsFile();
                            if (!file) continue;
                            event.preventDefault();
                            uploadFile(file).then((res) => {
                                editor.chain().focus().setImage({ src: res.url, alt: res.name || '' }).run();
                                notify('Загружено: ' + res.name);
                            }).catch((err) => notify('Ошибка: ' + err.message, 'error'));
                            return true;
                        }
                    }
                    return false;
                },
            },
        });

        // При первом создании проставляем textarea.value
        textarea.value = editor.getHTML();

        // Прокидываем ссылку на разрушение, чтобы при уходе со страницы
        // не было warning'ов
        textarea.addEventListener('my-tt:destroy', () => {
            try { editor.destroy(); } catch (e) { /* noop */ }
        });

        editorMap.set(textarea, editor);
    }

    function rebuildToolbarActive(toolbar, editor) {
        // Пересоздаём тулбар с active-логикой, привязанной к редактору
        const newBar = buildToolbar(editor);
        toolbar.replaceWith(newBar);
    }

    /* ---------- Инициализация по DOM ---------- */

    function initAll() {
        const found = document.querySelectorAll(SELECTORS.join(','));
        found.forEach(makeEditor);
    }

    function boot() {
        initAll();

        // Битрикс любит перерисовывать вкладки — слушаем DOM.
        const observer = new MutationObserver(() => {
            // throttle через rAF
            if (boot._scheduled) return;
            boot._scheduled = true;
            requestAnimationFrame(() => {
                boot._scheduled = false;
                initAll();
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // На сабмите формы — заставим редакторы обновить textarea
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (!(form instanceof HTMLFormElement)) return;
            form.querySelectorAll('textarea[data-tiptap-mounted="1"]').forEach((ta) => {
                const editor = editorMap.get(ta);
                if (editor) ta.value = editor.getHTML();
            });
        }, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
