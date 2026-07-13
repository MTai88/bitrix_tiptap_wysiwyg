import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { ImageUploadNode } from './image-upload-node.js';

console.log('[my-tiptap-bundle] main.js executed');

// Используем window.MTiptap вместо window.Tiptap, потому что
// Bitrix24 (BX) переопределяет window.Tiptap своим значением.
window.MTiptap = {
    Editor,
    StarterKit,
    Underline,
    Link,
    Image,
    TextAlign,
    Placeholder,
    ImageUploadNode,
};

console.log('[my-tiptap-bundle] window.MTiptap set, keys:', Object.keys(window.MTiptap).join(','));

window.dispatchEvent(new CustomEvent('my-tiptap:ready'));

// Пробрасываем в parent/top
try {
    if (window.parent && window.parent !== window) {
        window.parent.MTiptap = window.MTiptap;
    }
} catch (e) {}
try {
    if (window.top && window.top !== window) {
        window.top.MTiptap = window.MTiptap;
    }
} catch (e) {}

console.log('[my-tiptap-bundle] propagated to parent/top, keys:', Object.keys(window.MTiptap).join(','));
