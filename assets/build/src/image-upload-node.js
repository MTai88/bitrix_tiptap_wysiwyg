/**
 * ImageUploadNode — vanilla JS Node extension для Tiptap 2.x
 */
import { Node } from '@tiptap/core';

const ICON_DOC = '<svg viewBox="0 0 40 48" width="40" height="48" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 8a6 6 0 0 1 6-6h14l4 4h6a6 6 0 0 1 6 6v30a4 4 0 0 1-4 4H8a6 6 0 0 1-6-6V8z" fill="#e1e5eb"/><path d="M4 12a4 4 0 0 1 4-4h12l3 3h9a4 4 0 0 1 4 4v26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V12z" fill="#fff"/></svg>';

const ICON_UPLOAD = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

const ICON_FILE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

export const ImageUploadNode = Node.create({
    name: 'imageUpload',
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addOptions() {
        return {
            accept: 'image/*',
            maxSize: 10 * 1024 * 1024,
            upload: null,
        };
    },

    addNodeView() {
        return ({ node, getPos, editor }) => {
            const accept = node.attrs.accept || this.options.accept;
            const maxSize = node.attrs.maxSize || this.options.maxSize;
            const upload = this.options.upload;

            const dom = document.createElement('div');
            dom.className = 'my-tt-image-upload';
            dom.setAttribute('contenteditable', 'false');

            dom.innerHTML = `
                <div class="my-tt-image-upload-drag-area">
                    <input type="file" accept="${accept}" multiple>
                    <div class="my-tt-image-upload-content">
                        <div class="my-tt-image-upload-dropzone">
                            <div class="my-tt-image-upload-dropzone-rect-primary">${ICON_DOC}</div>
                            <div class="my-tt-image-upload-dropzone-rect-secondary">${ICON_DOC}</div>
                            <div class="my-tt-image-upload-icon-container">${ICON_UPLOAD}</div>
                        </div>
                        <div class="my-tt-image-upload-text">
                            <em>Click to upload</em> or drag and drop
                        </div>
                        <div class="my-tt-image-upload-subtext">
                            Maximum 3 files, 5MB each
                        </div>
                    </div>
                    <div class="my-tt-image-upload-previews" style="display:none"></div>
                </div>
            `;

            const dragArea = dom.querySelector('.my-tt-image-upload-drag-area');
            const fileInput = dom.querySelector('input[type="file"]');
            const previews = dom.querySelector('.my-tt-image-upload-previews');

            const openPicker = () => fileInput.click();
            dragArea.addEventListener('click', (e) => {
                if (e.target.closest('.my-tt-image-upload-previews')) return;
                openPicker();
            });

            let dragCounter = 0;
            dom.addEventListener('dragenter', (e) => {
                e.preventDefault();
                dragCounter++;
                dragArea.classList.add('is-drag-over');
            });
            dom.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dragCounter--;
                if (dragCounter <= 0) {
                    dragCounter = 0;
                    dragArea.classList.remove('is-drag-over');
                }
            });
            dom.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            dom.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dragCounter = 0;
                dragArea.classList.remove('is-drag-over');
                const files = e.dataTransfer && e.dataTransfer.files;
                if (files && files.length > 0) handleFiles(files);
            });

            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (files && files.length > 0) handleFiles(files);
                e.target.value = '';
            });

            function handleFiles(files) {
                if (!upload) {
                    console.warn('[ImageUploadNode] No upload function provided');
                    return;
                }
                if (typeof getPos !== 'function') return;

                const arr = Array.from(files).slice(0, 3);
                arr.forEach((file) => {
                    if (file.size > maxSize) {
                        addPreview(previews, file, 'error', 'Файл больше 5 MB');
                        return;
                    }
                    if (!/^image\//.test(file.type)) {
                        addPreview(previews, file, 'error', 'Только изображения');
                        return;
                    }

                    const item = addPreview(previews, file, 'uploading', '0%');
                    upload(file)
                        .then((res) => {
                            const url = (res && res.url) || (typeof res === 'string' ? res : null);
                            if (!url) {
                                updatePreviewStatus(item, 'error', 'Нет URL');
                                return;
                            }
                            updatePreviewStatus(item, 'success', 'Готово');
                            const pos = getPos();
                            if (typeof pos !== 'number') return;
                            editor
                                .chain()
                                .setNodeSelection(pos)
                                .deleteRange({ from: pos, to: pos + node.nodeSize })
                                .insertContentAt(pos, {
                                    type: 'image',
                                    attrs: { src: url, alt: file.name },
                                })
                                .run();
                        })
                        .catch((err) => {
                            updatePreviewStatus(item, 'error', err.message || 'Ошибка');
                        });
                });
            }

            return { dom, contentDOM: null, ignoreMutation: () => true };
        };
    },

    addCommands() {
        return {
            setImageUploadNode: (options = {}) => ({ commands }) => {
                return commands.insertContent({ type: this.name, attrs: options });
            },
        };
    },
});

function addPreview(container, file, status, text) {
    const item = document.createElement('div');
    item.className = 'my-tt-image-upload-preview';
    item.innerHTML = `
        <div class="my-tt-image-upload-file-info">
            <div class="my-tt-image-upload-file-icon">${ICON_FILE}</div>
            <div class="my-tt-image-upload-details">
                <div class="my-tt-image-upload-text" style="font-size:13px">${escapeHtml(file.name)}</div>
                <div class="my-tt-image-upload-subtext">${formatSize(file.size)}</div>
            </div>
        </div>
        <div class="my-tt-image-upload-actions">
            <span class="my-tt-image-upload-progress-text">${escapeHtml(text)}</span>
        </div>
        <div class="my-tt-image-upload-progress" style="width:0%"></div>
    `;
    container.appendChild(item);
    container.style.display = 'block';
    return item;
}

function updatePreviewStatus(item, status, text) {
    const textEl = item.querySelector('.my-tt-image-upload-progress-text');
    if (textEl) {
        textEl.textContent = text;
        if (status === 'error') textEl.style.color = '#d9534f';
        else if (status === 'success') textEl.style.color = '#5cb85c';
        else textEl.style.color = '#4a87e6';
    }
    if (status === 'success' || status === 'error') {
        setTimeout(() => {
            item.style.transition = 'opacity 0.3s, height 0.3s, margin 0.3s';
            item.style.opacity = '0';
            item.style.height = '0';
            item.style.margin = '0';
            item.style.padding = '0';
            item.style.overflow = 'hidden';
            setTimeout(() => item.remove(), 300);
        }, 1500);
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / 1024 / 1024 * 10) / 10 + ' MB';
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

if (typeof window !== 'undefined') {
    Object.defineProperty(window, '__myTiptapImageUploadNodeLoaded', { value: true });
}
