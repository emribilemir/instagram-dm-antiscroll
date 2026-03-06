// ==UserScript==
// @name         Instagram DM Anti-Scroll (Reply Mode)
// @namespace    https://github.com/emribilemir/instagram-dm-antiscroll
// @version      1.0.0
// @description  Instagram DM'de eski bir mesaja yanıt verirken sohbetin otomatik olarak en alta kaymasını engeller.
// @author       emribilemir
// @license      MIT
// @match        https://www.instagram.com/*
// @inject-into  page
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var CFG = { LOCK_DURATION: 2000, DEBUG: false };
    var state = {
        isReplyMode: false,
        scrollLocked: false,
        savedScrollTop: 0,
        scrollContainer: null,
        rafId: null,
        replyBarElement: null,
    };

    function log() {
        if (!CFG.DEBUG) return;
        var args = ['%c[AntiScroll]', 'color:#0095F6;font-weight:bold'];
        for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
        console.log.apply(console, args);
    }

    // ── Reply bar text matching ──
    var REPLY_PATTERNS = [
        /yan[ıi]t veriyorsun/i,
        /replying to/i,
    ];

    function textMatchesReplyBar(text) {
        if (!text) return false;
        for (var i = 0; i < REPLY_PATTERNS.length; i++) {
            if (REPLY_PATTERNS[i].test(text)) return true;
        }
        return false;
    }

    // ── Find scroll container ──
    function findScrollContainer() {
        var grid = document.querySelector('[role="grid"]');
        if (grid) {
            var el = grid.parentElement;
            while (el && el !== document.body) {
                var s = window.getComputedStyle(el);
                if ((s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflowY === 'hidden') &&
                    el.scrollHeight > el.clientHeight) {
                    log('Scroll container bulundu (grid ancestor)');
                    return el;
                }
                el = el.parentElement;
            }
            if (grid.scrollHeight > grid.clientHeight) return grid;
        }
        var best = null, bestH = 0;
        var divs = document.querySelectorAll('div');
        for (var i = 0; i < divs.length; i++) {
            var d = divs[i], cs = window.getComputedStyle(d);
            if (cs.overflowY === 'visible' || cs.overflowY === '') continue;
            var sh = d.scrollHeight - d.clientHeight;
            if (sh > 100 && d.clientHeight > 200 && sh > bestH) { bestH = sh; best = d; }
        }
        if (best) log('Scroll container bulundu (brute force)');
        return best;
    }

    function findInputArea() {
        return document.querySelector('[role="textbox"][contenteditable="true"]') ||
            document.querySelector('[contenteditable="true"]');
    }

    // ── Reply mode ──
    function enterReplyMode(el) {
        if (state.isReplyMode) return;
        state.isReplyMode = true;
        state.replyBarElement = el;
        log('YANIT MODU AKTIF');
    }

    function exitReplyMode() {
        if (!state.isReplyMode) return;
        state.isReplyMode = false;
        state.replyBarElement = null;
        log('YANIT MODU KAPANDI');
    }

    // ── Reply bar observer ──
    function setupReplyBarObserver() {
        new MutationObserver(function (mutations) {
            for (var mi = 0; mi < mutations.length; mi++) {
                var m = mutations[mi];
                for (var ni = 0; ni < m.addedNodes.length; ni++) {
                    var node = m.addedNodes[ni];
                    if (node.nodeType === 1 && textMatchesReplyBar(node.textContent)) {
                        enterReplyMode(node); return;
                    }
                    if (node.nodeType === 3 && textMatchesReplyBar(node.textContent)) {
                        enterReplyMode(node.parentElement); return;
                    }
                }
                if (state.isReplyMode && m.removedNodes.length > 0) {
                    if (state.replyBarElement && !document.contains(state.replyBarElement)) {
                        exitReplyMode(); return;
                    }
                }
            }
        }).observe(document.body, { childList: true, subtree: true });
        log('Reply bar observer kuruldu');

        // Initial scan
        var spans = document.querySelectorAll('span');
        for (var i = 0; i < spans.length; i++) {
            if (textMatchesReplyBar(spans[i].textContent)) { enterReplyMode(spans[i]); break; }
        }
    }

    // ── Scroll lock (RAF brute force) ──
    function lockScroll() {
        if (!state.scrollContainer) state.scrollContainer = findScrollContainer();
        if (!state.scrollContainer) { log('Scroll container yok!'); return; }

        var container = state.scrollContainer;
        state.savedScrollTop = container.scrollTop;
        var savedScrollHeight = container.scrollHeight;
        state.scrollLocked = true;
        log('SCROLL KILITLENDI! scrollTop:', state.savedScrollTop, 'scrollHeight:', savedScrollHeight);

        if (state.rafId) cancelAnimationFrame(state.rafId);
        var start = performance.now();
        var stableFrames = 0;
        (function enforce() {
            if (!state.scrollLocked) return;
            if (performance.now() - start > CFG.LOCK_DURATION) {
                state.scrollLocked = false;
                log('Scroll kilidi acildi (timeout)');
                return;
            }
            // Compensate for scrollHeight changes (column-reverse container)
            var heightDiff = container.scrollHeight - savedScrollHeight;
            var adjustedTarget = state.savedScrollTop - heightDiff;

            if (Math.abs(container.scrollTop - adjustedTarget) > 1) {
                container.scrollTop = adjustedTarget;
                stableFrames = 0;
            } else {
                stableFrames++;
            }
            // Stable for 15 frames (~250ms) and at least 400ms passed → release
            if (stableFrames >= 15 && performance.now() - start > 400) {
                state.scrollLocked = false;
                log('Scroll kilidi acildi (stabil)');
                return;
            }
            state.rafId = requestAnimationFrame(enforce);
        })();
    }

    // ── Event listeners ──
    function setupEventListeners() {
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey && state.isReplyMode) {
                var input = findInputArea();
                if (input && (e.target === input || input.contains(e.target))) {
                    log('Enter basildi - yanit modunda!');
                    lockScroll();
                }
            }
        }, true);

        document.addEventListener('click', function (e) {
            if (!state.isReplyMode) return;
            var btn = e.target.closest ? e.target.closest('[role="button"]') : null;
            if (btn) {
                var t = btn.textContent.trim().toLowerCase();
                var a = (btn.getAttribute('aria-label') || '').toLowerCase();
                if (t === 'g\u00f6nder' || t === 'send' || a === 'g\u00f6nder' || a === 'send') {
                    log('Gonder butonuna tiklandi!');
                    lockScroll();
                }
            }
        }, true);
        log('Event listenerlar kuruldu');
    }

    // ── Navigation watcher ──
    function setupNavigationWatcher() {
        var lastUrl = location.href;
        new MutationObserver(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                state.isReplyMode = false;
                state.replyBarElement = null;
                state.scrollContainer = null;
                setTimeout(function () { state.scrollContainer = findScrollContainer(); }, 2000);
            }
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ── Init ──
    function init() {
        log('Instagram DM Anti-Scroll v1.0.0 baslatiliyor...');
        setupEventListeners();
        setupReplyBarObserver();
        setupNavigationWatcher();
        var att = 0;
        var si = setInterval(function () {
            att++;
            state.scrollContainer = findScrollContainer();
            if (state.scrollContainer) { clearInterval(si); log('Hazir! deneme:', att); }
            else if (att > 30) { clearInterval(si); }
        }, 1000);
    }

    if (document.body) init();
    else document.addEventListener('DOMContentLoaded', init);
})();
