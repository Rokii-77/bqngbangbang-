// ==UserScript==
// @name         V我50😋
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  快捷键或悬浮按钮触发；🦴 全局监听粘贴并清洗文本（默认开启）
// @author       Roki
// @match        http://10.38.178.17/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

// ================== 第一部分：劫持 wavesurfer 实例 ==================
(function () {
    'use strict';
    window.__myWavesurfer = null;

    function hook() {
        if (window.WaveSurfer && window.WaveSurfer.create && !window.WaveSurfer.__myHooked) {
            var orig = window.WaveSurfer.create;
            window.WaveSurfer.create = function () {
                var ws = orig.apply(this, arguments);
                window.__myWavesurfer = ws;
                console.log('✅ 已捕获 wavesurfer 实例');
                return ws;
            };
            window.WaveSurfer.__myHooked = true;
            console.log('✅ 已劫持 WaveSurfer.create');
            return true;
        }
        return false;
    }

    if (!hook()) {
        var timer = setInterval(function () {
            if (hook()) clearInterval(timer);
        }, 30);
        setTimeout(function () { clearInterval(timer); }, 15000);
    }
})();

// ================== 第二部分：主要功能 ==================
(function () {
    'use strict';

    // ================================================================
    //  ★★★★★  快捷键设置区  ★★★★★
    // ================================================================
    var HOTKEYS = ['F8', ''];   // ← ← ← 改这一行！
    // ================================================================

    // 🦴 全局监听状态：默认开启
    var boneListening = false;


    function clickNext() {
        var submitBtn = document.getElementById('nextBtn');
        var passBtn = document.getElementById('passBtn');
        if (submitBtn) {
            submitBtn.click();
        } else if (passBtn) {
            passBtn.click();
        } else {
            console.log('没有找到 nextBtn 或 passBtn');
        }
    }

    function setSelectValue(id, value) {
        var sel = document.getElementById(id);
        if (!sel) { console.log('找不到下拉框：' + id); return; }
        sel.value = value;
        if (window.jQuery) {
            window.jQuery(sel).val(value).trigger('change');
        } else {
            sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
        console.log(id + ' 已设为：' + value);
    }

    function toggleSelectValue(id) {
        var sel = document.getElementById(id);
        if (!sel) { console.log('找不到下拉框：' + id); return; }
        var next = (sel.value === '是') ? '否' : '是';
        setSelectValue(id, next);
    }

    function clearLabelInput() {
        var input = document.getElementById('labelNode1');
        if (!input) { console.log('没有找到 labelNode1'); return; }
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
    }

    function toggleInvalid() {
        var sel = document.getElementById('labelNode0');
        if (!sel) { console.log('找不到下拉框：labelNode0'); return; }

        if (sel.value === '是') {
            clearLabelInput();
            setSelectValue('labelNode0', '否');
            console.log('✅ 已标记为无效（清空内容 + 选否）');
        } else {
            setSelectValue('labelNode0', '是');
            console.log('✅ 已恢复为有效（只选是，不动文本框）');
        }
    }

    // ================================================================
    //  🦴 文本清洗规则
    // ================================================================
    function processClipboardText(text) {
        if (!text) return '';

        text = text.replace(/[\r\n]+/g, ' ').toUpperCase();
        text = text.replace(/标注内容/g, '').replace(/识别文本/g, '');
        text = text.replace(/[哈嘿]{2,}/g, '');
        text = text.replace(/[^A-Z0-9\u4e00-\u9fff'\s]/g, ' ');
        text = text.replace(/ +/g, ' ').trim();

        var chars = text.split('');
        var result = [];
        var i = 0, n = chars.length;
        function isEng(c) { return c && /[A-Za-z]/.test(c); }
        while (i < n) {
            var c = chars[i];
            if (c === ' ') {
                var prev = result.length ? result[result.length - 1] : '';
                var j = i + 1;
                while (j < n && chars[j] === ' ') j++;
                var next = j < n ? chars[j] : '';
                if (isEng(prev) && isEng(next)) result.push(' ');
                i = j;
            } else {
                result.push(c);
                i++;
            }
        }
        return result.join('');
    }

    // ================================================================
    //  🦴 全局粘贴监听
    // ================================================================
    function setupGlobalPasteListener() {
        document.addEventListener('paste', function (e) {
            if (!boneListening) return;

            var text = '';
            try {
                text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
            } catch (err) {
                return;
            }
            if (!text) return;

            e.preventDefault();
            e.stopPropagation();

            var processed = processClipboardText(text);

            var input = document.getElementById('labelNode1');
            if (!input) {
                console.log('❌ 找不到 labelNode1');
                return;
            }
            input.value = processed;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('✅ 已处理并填入：' + processed);
        }, true);
    }


    function findWavesurfer() {
        if (window.__myWavesurfer && typeof window.__myWavesurfer.getDuration === 'function') {
            return window.__myWavesurfer;
        }
        var names = ['wavesurfer0', 'wavesurfer', 'ws', 'waveSurfer', 'waveSurfer0'];
        for (var i = 0; i < names.length; i++) {
            try {
                var v = window[names[i]];
                if (v && typeof v.addRegion === 'function' && typeof v.getDuration === 'function') return v;
            } catch (e) {}
        }
        var container = document.getElementById('waveform0');
        if (container) {
            if (container.wavesurfer && typeof container.wavesurfer.addRegion === 'function') return container.wavesurfer;
            if (window.jQuery) {
                try {
                    var d = window.jQuery(container).data('wavesurfer');
                    if (d && typeof d.addRegion === 'function') return d;
                } catch (e) {}
            }
        }
        for (var k in window) {
            try {
                var v2 = window[k];
                if (v2 && typeof v2 === 'object'
                    && typeof v2.addRegion === 'function'
                    && typeof v2.getDuration === 'function') return v2;
            } catch (e) {}
        }
        return null;
    }

    function selectAllWaveform() {
        console.log('--- 开始全选 ---');
        var ws = findWavesurfer();
        if (ws) {
            console.log('✅ 找到 wavesurfer 实例');
            try {
                var duration = ws.getDuration();
                if (!duration || duration <= 0) {
                    console.log('⚠️ 音频还没加载完，稍后再试');
                    return;
                }
                if (ws.regions && typeof ws.regions.clearRegions === 'function') {
                    ws.regions.clearRegions();
                } else if (typeof ws.clearRegions === 'function') {
                    ws.clearRegions();
                }
                var opts = { start: 0, end: duration, color: 'rgba(0, 0, 255, 0.1)' };
                if (typeof ws.addRegion === 'function') {
                    ws.addRegion(opts);
                } else if (ws.regions && typeof ws.regions.add === 'function') {
                    ws.regions.add(opts);
                }
                console.log('✅ 已全选，时长 ' + duration.toFixed(2) + ' 秒');
                return;
            } catch (e) {
                console.log('❌ 实例 API 全选失败：', e);
            }
        } else {
            console.log('❌ 未找到 wavesurfer 实例');
        }

        var waveEl = document.querySelector('#waveform0 wave');
        if (!waveEl) { console.log('❌ 找不到 #waveform0 wave'); return; }
        var region = waveEl.querySelector('region.wavesurfer-region');
        if (!region) { console.log('❌ 波形里没有 region 元素'); return; }
        region.style.left = '0px';
        region.style.width = '100%';
        console.log('⚠️ 已改 DOM 实现视觉全选');
    }

    document.addEventListener('keydown', function (e) {
        if (!e.key) return;
        for (var i = 0; i < HOTKEYS.length; i++) {
            var k = HOTKEYS[i];
            if (k && k === e.key) {
                e.preventDefault();
                clickNext();
                return;
            }
        }
    });


    // ================================================================
    //  悬浮按钮组
    // ================================================================
    function addButtons() {
        if (document.getElementById('my-float-wrapper')) return;
        if (!document.body) { setTimeout(addButtons, 300); return; }

        var GREEN  = '#28a745';
        var RED    = '#dc3545';
        var YELLOW = '#FFC107';
        var BLUE   = '#1E90FF';

        var wrapper = document.createElement('div');
        wrapper.id = 'my-float-wrapper';
        var wst = wrapper.style;
        wst.position = 'fixed';
        wst.right = '0';
        wst.bottom = '0';
        wst.width = '0';
        wst.height = '0';
        wst.zIndex = '2147483647';
        wst.pointerEvents = 'none';
        document.body.appendChild(wrapper);

        function mk(id, text, r, b, size, bg, fs) {
            var btn = document.createElement('button');
            btn.id = id;
            btn.textContent = text;
            var s = btn.style;
            s.position = 'absolute';
            s.right = r + 'px';
            s.bottom = b + 'px';
            s.width = size + 'px';
            s.height = size + 'px';
            s.borderRadius = '50%';
            s.background = bg;
            s.color = '#ffffff';
            s.fontSize = fs + 'px';
            s.fontWeight = 'bold';
            s.border = 'none';
            s.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
            s.cursor = 'pointer';
            s.opacity = '0.9';
            s.padding = '0';
            s.lineHeight = '1';
            s.pointerEvents = 'auto';
            btn.addEventListener('mouseenter', function () { btn.style.opacity = '1'; });
            btn.addEventListener('mouseleave', function () { btn.style.opacity = '0.9'; });
            wrapper.appendChild(btn);
            return btn;
        }

        var mainBtn      = mk('my-float-btn',      '⏭️',   30, 80,  90, GREEN,  28);
        var frameBtn     = mk('my-btn-frame',      '🎵',    52, 180, 45, RED,    12);
        var multiBtn     = mk('my-btn-multi',      '🙍',    52, 235, 45, RED,    12);
        var invalidBtn   = mk('my-btn-invalid',    '无效',   52, 290, 45, RED,    12);
        var selectAllBtn = mk('my-btn-selectall',  '全选',   52, 345, 45, RED,    12);
        var boneBtn      = mk('my-btn-bone',       '🦴',    -20, 102, 45, YELLOW,   18);


        // ---------- 文字 + 颜色跟随 select 值 ----------
        function syncAll() {
            var sel0 = document.getElementById('labelNode0');
            if (sel0 && invalidBtn) {
                if (sel0.value === '是') {
                    invalidBtn.textContent = '😆';
                    invalidBtn.style.background = GREEN;
                } else {
                    invalidBtn.textContent = '无效';
                    invalidBtn.style.background = RED;
                }
            }

            var sel5 = document.getElementById('labelNode5');
            if (sel5 && multiBtn) {
                if (sel5.value === '是') {
                    multiBtn.textContent = '👭🏻';
                    multiBtn.style.background = GREEN;
                } else {
                    multiBtn.textContent = '🙍';
                    multiBtn.style.background = RED;
                }
            }

            var sel10 = document.getElementById('labelNode10');
            if (sel10 && frameBtn) {
                if (sel10.value === '是') {
                    frameBtn.textContent = '🎵';
                    frameBtn.style.background = GREEN;
                } else {
                    frameBtn.textContent = '🔇';
                    frameBtn.style.background = RED;
                }
            }
        }
        syncAll();
        setInterval(syncAll, 300);


        // ---------- 按钮点击 ----------
        frameBtn.addEventListener('click',     function (e) { e.stopPropagation(); toggleSelectValue('labelNode10'); });
        multiBtn.addEventListener('click',     function (e) { e.stopPropagation(); toggleSelectValue('labelNode5');  });
        invalidBtn.addEventListener('click',   function (e) { e.stopPropagation(); toggleInvalid(); });
        selectAllBtn.addEventListener('click', function (e) { e.stopPropagation(); selectAllWaveform(); });

        boneBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            boneListening = !boneListening;
            if (boneListening) {
                boneBtn.style.background = BLUE;
                console.log('🦴 全局监听：已开启（按 Ctrl+V 即可）');
            } else {
                boneBtn.style.background = YELLOW;
                console.log('🦴 全局监听：已关闭');
            }
        });


        // ---------- 长按拖动 ----------
        var longPressTimer = null;
        var mouseIsDown = false;
        var isDragging = false;
        var justDragged = false;
        var startX = 0, startY = 0;
        var offsetX = 0, offsetY = 0;

        mainBtn.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            mouseIsDown = true;
            startX = e.clientX;
            startY = e.clientY;
            longPressTimer = setTimeout(function () {
                isDragging = true;
                mainBtn.style.cursor = 'grabbing';
                mainBtn.style.opacity = '1';
            }, 250);
        });

        document.addEventListener('mousemove', function (e) {
            if (!mouseIsDown) return;
            if (!isDragging) {
                var ddx = Math.abs(e.clientX - startX);
                var ddy = Math.abs(e.clientY - startY);
                if (ddx > 8 || ddy > 8) {
                    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
                }
                return;
            }
            e.preventDefault();
            var dx = e.clientX - startX;
            var dy = e.clientY - startY;
            wrapper.style.transform = 'translate(' + (offsetX + dx) + 'px, ' + (offsetY + dy) + 'px)';
        });

        document.addEventListener('mouseup', function (e) {
            if (!mouseIsDown) return;
            mouseIsDown = false;
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            if (isDragging) {
                offsetX += e.clientX - startX;
                offsetY += e.clientY - startY;
                isDragging = false;
                justDragged = true;
                mainBtn.style.cursor = 'pointer';
                mainBtn.style.opacity = '0.9';
                setTimeout(function () { justDragged = false; }, 150);
            }
        });

        mainBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (justDragged) return;
            clickNext();
        });

        setupGlobalPasteListener();

        console.log('✅ V我50😋 v5.1 已加载（🦴 默认开启）');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButtons);
    } else {
        addButtons();
    }
})();
