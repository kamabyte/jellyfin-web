/*
 * Плеер облегчённой версии — ES5-перевод resources/js/components/player.tsx
 * для Safari 10 (iPad на iOS 10). Порядок тот же: поток просим у сервера
 * из браузера с тем, что он умеет (POST /watch/{id}/playback), играем файл
 * как есть или HLS — Safari открывает HLS сам, hls.js ему не нужен. Отчёты о
 * просмотре, дорожки звука и субтитров, превью кадров, пропуск заставки,
 * следующая серия, панель «Серии».
 *
 * Разметка — resources/views/lite/pages/watch.blade.php, данные —
 * window.LITE_PLAYER.
 */
(function () {
    'use strict';

    var config = window.LITE_PLAYER;
    var root = document.querySelector('[data-player]');
    if (!config || !root) return;

    var COUNTDOWN = 10;
    var HIDE_CONTROLS_MS = 3000;
    var DOUBLE_TAP_MS = 300;
    var SEEK_STEP = 10;
    var PROGRESS_EVERY_MS = 10000;
    var PREFS_KEY = 'jellyfin-web:player:v1';
    var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    // Старые iPad декодируют не больше 1080p: иначе сервер отдал бы 4K как есть.
    var MAX_WIDTH = 1920;

    var SEGMENT_LABELS = {
        Intro: 'Пропустить заставку',
        Recap: 'Пропустить пересказ',
        Preview: 'Пропустить анонс',
        Outro: 'Пропустить титры',
    };

    var REASONS = {
        ContainerNotSupported: 'контейнер',
        VideoCodecNotSupported: 'видеокодек',
        AudioCodecNotSupported: 'аудиокодек',
        AudioChannelsNotSupported: 'число каналов звука',
        SubtitleCodecNotSupported: 'вшитые субтитры',
        VideoRangeTypeNotSupported: 'HDR / Dolby Vision',
        VideoBitDepthNotSupported: 'глубина цвета',
        VideoResolutionNotSupported: 'разрешение',
        DirectPlayError: 'ошибка прямого воспроизведения',
        SecondaryAudioNotSupported: 'выбранная дорожка',
    };

    // iPad 4 на iOS 10 на AC-3 и E-AC-3 отвечает canPlayType «да», а
    // декодировать не может (MEDIA_ERR_DECODE, проверено и в файле, и в HLS).
    // Не сообщаем их — сервер перепакует с AAC, видео так и копируется.
    var UNDECODABLE = ['ac3', 'eac3'];

    var PROBES = {
        h264: ['video/mp4; codecs="avc1.640029"', 'video/mp4; codecs="avc1.42E01E"'],
        hevc: ['video/mp4; codecs="hvc1.2.4.L153.B0"', 'video/mp4; codecs="hev1.2.4.L153.B0"'],
        av1: ['video/mp4; codecs="av01.0.08M.10"'],
        vp9: ['video/webm; codecs="vp09.00.10.08"', 'video/mp4; codecs="vp09.00.10.08"'],
        vp8: ['video/webm; codecs="vp8"'],
        aac: ['audio/mp4; codecs="mp4a.40.2"'],
        mp3: ['audio/mpeg', 'audio/mp4; codecs="mp4a.6B"'],
        ac3: ['audio/mp4; codecs="ac-3"'],
        eac3: ['audio/mp4; codecs="ec-3"'],
        opus: ['audio/mp4; codecs="opus"', 'audio/webm; codecs="opus"'],
        flac: ['audio/mp4; codecs="flac"'],
        vorbis: ['audio/webm; codecs="vorbis"'],
        alac: ['audio/mp4; codecs="alac"'],
    };

    var video = root.querySelector('video');
    var el = {
        snapshot: q('[data-snapshot]'),
        switching: q('[data-switching]'),
        switchingText: q('[data-switching-text]'),
        cue: q('[data-cue]'),
        cueText: q('[data-cue-text]'),
        bezel: q('[data-bezel]'),
        bezelIcon: q('[data-bezel-icon]'),
        bezelText: q('[data-bezel-text]'),
        loading: q('[data-loading]'),
        transcodeNote: q('[data-transcode-note]'),
        blocked: q('[data-blocked]'),
        method: q('[data-method]'),
        resumed: q('[data-resumed]'),
        resumedAt: q('[data-resumed-at]'),
        offer: q('[data-offer]'),
        skip: q('[data-action="skip"]'),
        skipText: q('[data-skip-text]'),
        offerNext: q('[data-offer] [data-action="next"]'),
        progress: q('[data-progress]'),
        buffered: q('[data-buffered]'),
        segments: q('[data-segments]'),
        played: q('[data-played]'),
        thumb: q('[data-thumb]'),
        tip: q('[data-tip]'),
        frame: q('[data-frame]'),
        tipTime: q('[data-tip-time]'),
        iconPlay: q('[data-icon-play]'),
        iconPause: q('[data-icon-pause]'),
        iconReplay: q('[data-icon-replay]'),
        iconVolume: q('[data-icon-volume]'),
        iconMuted: q('[data-icon-muted]'),
        current: q('[data-current]'),
        duration: q('[data-duration]'),
        subtitles: q('[data-action="subtitles"]'),
        settingsButton: q('[data-action="settings"]'),
        pip: q('[data-action="pip"]'),
        airplay: q('[data-action="airplay"]'),
        settings: q('[data-settings]'),
        episodes: q('[data-episodes-panel]'),
        seasonTabs: q('[data-season-tabs]'),
        episodeList: q('[data-episode-list]'),
        error: q('[data-error]'),
        errorText: q('[data-error-text]'),
        countdown: q('[data-countdown]'),
        countdownValue: q('[data-countdown-value]'),
    };

    var item = config.item;
    var next = config.next;
    var segments = config.segments || [];
    var trickplay = config.trickplay;

    var state = {
        request: { startAt: config.startAt, mediaSourceId: config.mediaSourceId || null, audio: null, burn: null, directPlay: true },
        requestId: 0,
        source: null,
        nativeAudio: null,
        subtitle: null,
        subtitleChosen: false,
        lastTextSubtitle: null,
        cues: [],
        cueText: '',
        paused: true,
        ended: false,
        started: false,
        blocked: false,
        waiting: false,
        error: null,
        switching: null,
        wantPlay: true,
        pendingSeek: config.startAt,
        attached: false,
        currentTime: config.startAt,
        duration: item.runtime || 0,
        active: true,
        settingsOpen: false,
        settingsPage: 'main',
        episodesOpen: false,
        scrub: null,
        hover: null,
        countdown: null,
        resumedAt: config.startAt > 0 ? config.startAt : null,
        airplay: false,
    };

    var timers = { hide: 0, bezel: 0, countdown: 0, resumed: 0 };
    var lastTouch = 0;
    var lastTap = null;

    // ---------- Утилиты ----------

    function q(selector) {
        return root.querySelector(selector);
    }

    function show(node, visible) {
        if (!node) return;
        if (visible) node.removeAttribute('hidden');
        else node.setAttribute('hidden', '');
    }

    function toggleClass(node, name, on) {
        if (!node) return;
        var has = (' ' + node.className + ' ').indexOf(' ' + name + ' ') !== -1;
        if (on && !has) node.className += ' ' + name;
        if (!on && has) node.className = (' ' + node.className + ' ').replace(' ' + name + ' ', ' ').replace(/^\s+|\s+$/g, '');
    }

    function find(list, fn) {
        for (var i = 0; i < list.length; i++) if (fn(list[i])) return list[i];
        return null;
    }

    function icon(name) {
        var template = root.querySelector('[data-icon-template="' + name + '"] svg');
        return template ? template.cloneNode(true) : document.createElement('span');
    }

    function make(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    }

    function pad(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatDuration(seconds) {
        var total = Math.max(0, Math.round(seconds || 0));
        var h = Math.floor(total / 3600);
        var m = Math.floor((total % 3600) / 60);
        var s = total % 60;
        return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }

    function formatRuntime(seconds) {
        if (!seconds) return '';
        var minutes = Math.round(seconds / 60);
        var h = Math.floor(minutes / 60);
        var m = minutes % 60;
        if (h === 0) return m + ' мин';
        return m === 0 ? h + ' ч' : h + ' ч ' + m + ' мин';
    }

    function cookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function extend(target, source) {
        for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
        return target;
    }

    /** JSON-запрос к Laravel. CSRF — из куки XSRF-TOKEN, как у основного клиента. */
    function api(method, url, body, done, sync) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, !sync);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('X-XSRF-TOKEN', cookie('XSRF-TOKEN'));
        if (body !== null) xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function () {
            if (xhr.status === 401) {
                // Сессия Jellyfin истекла — на страницу входа.
                window.location.reload();
                return;
            }
            var data = null;
            try {
                data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch (e) {
                data = null;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                done && done(new Error((data && data.message) || 'Ошибка сервера'));
                return;
            }
            done && done(null, data);
        };
        xhr.onerror = function () {
            done && done(new Error('Нет связи с сервером.'));
        };
        try {
            xhr.send(body === null ? null : JSON.stringify(body));
        } catch (e) {
            done && done(e);
        }
        return xhr;
    }

    function readPrefs() {
        var prefs = { volume: 1, muted: false, rate: 1 };
        try {
            extend(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
        } catch (e) {
            // по умолчанию
        }
        return prefs;
    }

    function writePrefs(patch) {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(extend(readPrefs(), patch)));
        } catch (e) {
            // только на эту сессию
        }
    }

    /** Что этот браузер умеет — из этого сервер строит профиль устройства. */
    function capabilities() {
        var probe = document.createElement('video');
        var mse = window.MediaSource || window.ManagedMediaSource || window.WebKitMediaSource;
        function can(type) {
            var viaMse = false;
            try {
                viaMse = !!(mse && mse.isTypeSupported && mse.isTypeSupported(type));
            } catch (e) {
                viaMse = false;
            }
            if (viaMse) return true;
            var answer = probe.canPlayType(type);
            // Safari 10 на любой кодек отвечает «maybe», даже на выдуманный:
            // с параметром codecs верим только «probably», иначе iPad 4
            // получает AV1 или Opus как есть и не может их проиграть.
            return type.indexOf('codecs=') === -1 ? answer !== '' : answer === 'probably';
        }
        var codecs = [];
        for (var codec in PROBES) {
            if (UNDECODABLE.indexOf(codec) === -1 && find(PROBES[codec], can)) codecs.push(codec);
        }
        var containers = ['mp4'];
        if (probe.canPlayType('video/webm') !== '') containers.push('webm');
        if (probe.canPlayType('video/x-matroska') !== '') containers.push('mkv');
        return {
            codecs: codecs,
            containers: containers,
            dolbyVision: can('video/mp4; codecs="dvh1.05.06"'),
            audioTrackSwitching: 'audioTracks' in video,
            maxWidth: MAX_WIDTH,
            // Файл со многими дорожками звука — перепаковкой с одной: индекс
            // такого файла старый iPad скачивает и разбирает секунды.
            singleAudio: true,
        };
    }

    // ---------- Поток ----------

    function requestStream() {
        var request = state.request;
        var id = ++state.requestId;
        state.error = null;
        render();
        api(
            'POST',
            config.urls.playback,
            extend(capabilities(), {
                startAt: request.startAt,
                mediaSourceId: request.mediaSourceId,
                audioStreamIndex: request.audio,
                burnSubtitleIndex: request.burn,
                directPlay: request.directPlay,
            }),
            function (error, source) {
                if (id !== state.requestId) return;
                if (error) {
                    setSwitching(null);
                    state.error = error.message || 'Не удалось получить поток.';
                    render();
                    return;
                }
                state.pendingSeek = request.startAt;
                if (!state.subtitleChosen) state.subtitle = source.subtitleIndex;
                setSource(source);
            }
        );
    }

    function setSource(source) {
        detach();
        state.source = source;
        state.nativeAudio = null;
        reportBegin();
        attach();
        loadSubtitles();
        render();
    }

    function attach() {
        var source = state.source;
        var seek = state.pendingSeek;
        state.attached = true;
        // Начало — фрагментом #t=: браузер сам откроет файл с этого места.
        video.src = seek > 0 ? source.url + '#t=' + seek : source.url;
        video.load();
        if (state.wantPlay) play();
    }

    function detach() {
        if (!state.attached) return;
        reportStop(false);
        state.attached = false;
        video.removeAttribute('src');
        try {
            video.load();
        } catch (e) {
            // уже пусто
        }
    }

    function play() {
        var result;
        try {
            result = video.play();
        } catch (e) {
            result = null;
        }
        if (result && result.catch) {
            result.catch(function (reason) {
                // iOS не запускает видео со звуком без касания — ждём его.
                if (reason && reason.name === 'NotAllowedError') {
                    state.blocked = true;
                    render();
                }
            });
        }
    }

    /**
     * Новый поток с текущего места: другая дорожка или вшитые субтитры.
     * Кадр застывает (снимок на холсте поверх <video>), пауза — как была.
     */
    function reload(patch, label) {
        if (video.videoWidth > 0) {
            try {
                el.snapshot.width = video.videoWidth;
                el.snapshot.height = video.videoHeight;
                el.snapshot.getContext('2d').drawImage(video, 0, 0);
                setSwitching(label);
            } catch (e) {
                setSwitching(label);
            }
        } else {
            setSwitching(label);
        }
        state.wantPlay = !video.paused || !state.started;
        state.request = extend(extend({}, state.request), patch);
        state.request.startAt = state.attached ? video.currentTime || state.currentTime : state.currentTime;
        state.request.mediaSourceId = state.source ? state.source.mediaSourceId : state.request.mediaSourceId;
        requestStream();
    }

    function setSwitching(label) {
        state.switching = label;
        toggleClass(el.snapshot, 'player__snapshot--shown', !!label);
        show(el.switching, !!label);
        if (label) el.switchingText.textContent = label;
    }

    /**
     * Переключить звук прямо в файле, без нового потока (Safari). Номер
     * Jellyfin переводим в порядковый среди дорожек файла.
     */
    function switchNativeAudio(index) {
        var tracks = video.audioTracks;
        var source = state.source;
        if (!tracks || !source) return false;
        var position = -1;
        for (var i = 0; i < source.audioTracks.length; i++) {
            if (source.audioTracks[i].index === index) position = i;
        }
        if (position === -1 || tracks.length !== source.audioTracks.length) return false;
        for (var j = 0; j < tracks.length; j++) tracks[j].enabled = j === position;
        return true;
    }

    function currentAudio() {
        if (state.nativeAudio !== null) return state.nativeAudio;
        return state.source ? state.source.audioIndex : null;
    }

    function selectAudio(index) {
        var source = state.source;
        if (!source || index === currentAudio()) return;
        if (source.method === 'DirectPlay' && switchNativeAudio(index)) {
            state.nativeAudio = index;
            render();
            return;
        }
        reload({ audio: index }, 'Переключаем звук…');
    }

    function selectSubtitle(index) {
        var source = state.source;
        var track = source ? find(source.subtitleTracks, function (t) {
            return t.index === index;
        }) : null;
        state.subtitleChosen = true;
        state.subtitle = index;
        if (track && !track.url) reload({ burn: index }, 'Включаем субтитры…');
        else if (state.request.burn !== null) reload({ burn: null }, 'Переключаем субтитры…');
        loadSubtitles();
        render();
    }

    function textSubtitles() {
        return state.source ? state.source.subtitleTracks.filter(function (t) {
            return !!t.url;
        }) : [];
    }

    function toggleSubtitles() {
        var texts = textSubtitles();
        if (texts.length === 0) return;
        var enable = state.subtitle === null;
        selectSubtitle(enable ? (state.lastTextSubtitle !== null ? state.lastTextSubtitle : texts[0].index) : null);
        flash('captions', enable ? 'Вкл.' : 'Выкл.');
    }

    // ---------- Субтитры: VTT с сервера, реплики рисуем сами ----------

    var subtitleXhr = null;
    var subtitleUrl = null;

    function loadSubtitles() {
        var source = state.source;
        var track = source ? find(source.subtitleTracks, function (t) {
            return t.index === state.subtitle;
        }) : null;
        var url = track && track.url ? track.url : null;
        if (url === subtitleUrl) return;
        subtitleUrl = url;
        state.cues = [];
        setCue('');
        if (subtitleXhr) subtitleXhr.abort();
        if (!url) return;
        state.lastTextSubtitle = state.subtitle;
        var xhr = new XMLHttpRequest();
        subtitleXhr = xhr;
        xhr.open('GET', url, true);
        xhr.onload = function () {
            subtitleXhr = null;
            if (xhr.status >= 200 && xhr.status < 300 && url === subtitleUrl) {
                state.cues = parseVtt(xhr.responseText);
                updateCue();
            }
        };
        xhr.send();
    }

    function parseTimestamp(value) {
        var parts = value.split(':');
        var total = 0;
        for (var i = 0; i < parts.length; i++) total = total * 60 + Number(parts[i].replace(',', '.'));
        return total;
    }

    function parseVtt(text) {
        var cues = [];
        var blocks = text.replace(/\r/g, '').split(/\n{2,}/);
        for (var i = 0; i < blocks.length; i++) {
            var lines = blocks[i].split('\n');
            var at = -1;
            for (var j = 0; j < lines.length; j++) {
                if (lines[j].indexOf('-->') !== -1) {
                    at = j;
                    break;
                }
            }
            if (at === -1) continue;
            var times = lines[at].split('-->');
            var start = parseTimestamp(times[0].replace(/^\s+|\s+$/g, '').split(/\s+/)[0]);
            var end = parseTimestamp(times[1].replace(/^\s+|\s+$/g, '').split(/\s+/)[0]);
            var body = lines.slice(at + 1).join('\n').replace(/<[^>]+>/g, '').replace(/^\s+|\s+$/g, '');
            body = body.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
            if (isFinite(start) && isFinite(end) && body) cues.push({ start: start, end: end, text: body });
        }
        return cues;
    }

    function updateCue() {
        var time = video.currentTime;
        var lines = [];
        for (var i = 0; i < state.cues.length; i++) {
            var cue = state.cues[i];
            if (cue.start <= time && time < cue.end) lines.push(cue.text);
        }
        setCue(lines.join('\n'));
    }

    function setCue(text) {
        if (text === state.cueText) return;
        state.cueText = text;
        el.cueText.textContent = text;
        show(el.cue, !!text);
    }

    // ---------- Отчёты о просмотре ----------
    // Начало, позиция раз в 10 секунд и на паузе, остановка: по ним Jellyfin
    // ведёт «Продолжить просмотр» и гасит перекодирование.

    var report = { started: false, stopped: true, last: 0, position: 0 };

    function reportSend(event, sync) {
        var source = state.source;
        if (!source) return;
        api(
            'POST',
            config.urls.report + '/' + event,
            {
                itemId: item.id,
                mediaSourceId: source.mediaSourceId,
                playSessionId: source.playSessionId,
                position: report.position,
                paused: video.paused,
                playMethod: source.method,
                audioStreamIndex: currentAudio(),
                subtitleStreamIndex: state.subtitle,
            },
            null,
            sync
        );
    }

    function reportBegin() {
        report.started = false;
        report.stopped = false;
        report.last = 0;
        report.position = state.pendingSeek;
    }

    function reportProgress() {
        if (!report.started || report.stopped) return;
        if (video.currentTime > 0) report.position = video.currentTime;
        report.last = Date.now();
        reportSend('progress');
    }

    function reportStop(sync) {
        if (!report.started || report.stopped) return;
        report.stopped = true;
        reportSend('stop', sync);
    }

    // ---------- Видео ----------

    video.addEventListener('loadedmetadata', function () {
        updateDuration();
        var source = state.source;
        if (source && source.method === 'DirectPlay' && source.audioIndex !== null) switchNativeAudio(source.audioIndex);
    });
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('timeupdate', function () {
        if (!state.switching) state.currentTime = video.currentTime;
        if (video.currentTime > 0 && state.attached) report.position = video.currentTime;
        if (Date.now() - report.last > PROGRESS_EVERY_MS) reportProgress();
        updateCue();
        renderProgress();
        renderTime();
        renderOffer();
    });
    video.addEventListener('progress', renderProgress);
    video.addEventListener('pause', function () {
        state.paused = true;
        reportProgress();
        render();
    });
    video.addEventListener('play', function () {
        state.paused = false;
        state.ended = false;
        state.blocked = false;
        cancelCountdown();
        poke();
        render();
    });
    video.addEventListener('playing', function () {
        state.started = true;
        state.waiting = false;
        if (!report.started) {
            report.started = true;
            report.last = Date.now();
            reportSend('start');
        } else {
            reportProgress();
        }
        startResumedTimer();
        render();
    });
    video.addEventListener('waiting', function () {
        state.waiting = true;
        render();
    });
    video.addEventListener('canplay', function () {
        state.waiting = false;
        // Новый поток готов показать кадр — убираем застывший.
        if (state.switching) setSwitching(null);
        render();
    });
    video.addEventListener('seeked', function () {
        state.waiting = false;
        reportProgress();
        render();
    });
    video.addEventListener('volumechange', function () {
        writePrefs({ volume: video.volume, muted: video.muted });
        render();
    });
    video.addEventListener('ratechange', function () {
        writePrefs({ rate: video.playbackRate });
    });
    video.addEventListener('ended', function () {
        state.ended = true;
        reportStop(false);
        if (next) startCountdown();
        render();
    });
    video.addEventListener('error', function () {
        var source = state.source;
        if (!state.attached || !source || !video.getAttribute('src')) return;
        // Браузер обещал, что справится с файлом, но не смог — один раз
        // просим у сервера перепаковку.
        if (source.method === 'DirectPlay' && state.request.directPlay) {
            reload({ directPlay: false }, 'Готовим поток…');
            return;
        }
        setSwitching(null);
        state.error = source.hls
            ? 'Поток прервался. Сервер мог не справиться с перекодированием.'
            : 'Браузер не смог воспроизвести видео.';
        render();
    });
    video.addEventListener('webkitplaybacktargetavailabilitychanged', function (event) {
        state.airplay = event.availability === 'available';
        render();
    });

    window.addEventListener('pagehide', function () {
        reportStop(true);
    });

    function updateDuration() {
        if (video.duration && isFinite(video.duration)) {
            state.duration = video.duration;
            renderSegments();
            renderTime();
        }
    }

    // ---------- Действия ----------

    function togglePlay(withBezel) {
        if (video.paused || video.ended) {
            if (video.ended) video.currentTime = 0;
            state.blocked = false;
            play();
            if (withBezel) flash('play');
        } else {
            video.pause();
            if (withBezel) flash('pause');
        }
    }

    function seekBy(delta) {
        var target = Math.max(0, video.currentTime + delta);
        if (state.duration) target = Math.min(state.duration, target);
        video.currentTime = target;
        flash(delta < 0 ? 'rewind' : 'fast-forward', Math.abs(delta) + ' с', delta < 0 ? 'left' : 'right');
    }

    function toggleMute() {
        video.muted = !video.muted;
        flash(video.muted ? 'volume-x' : 'volume-2');
    }

    function setRate(rate) {
        video.defaultPlaybackRate = rate;
        video.playbackRate = rate;
    }

    function stepRate(direction) {
        var index = SPEEDS.indexOf(video.playbackRate);
        var rate = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (index === -1 ? 2 : index) + direction))];
        setRate(rate);
        flash(null, rate + '×');
    }

    function fullscreenElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    }

    function toggleFullscreen() {
        if (fullscreenElement()) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else if (root.requestFullscreen) {
            root.requestFullscreen();
        } else if (root.webkitRequestFullscreen) {
            root.webkitRequestFullscreen();
        } else if (video.webkitEnterFullscreen) {
            // iPad на iOS 10: только родной полноэкранный режим самого видео.
            video.webkitEnterFullscreen();
        }
    }

    function canPip() {
        if (document.pictureInPictureEnabled) return true;
        return !!(video.webkitSupportsPresentationMode && video.webkitSupportsPresentationMode('picture-in-picture'));
    }

    function togglePip() {
        if (video.webkitSetPresentationMode) {
            video.webkitSetPresentationMode(video.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
        } else if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
        } else if (video.requestPictureInPicture) {
            video.requestPictureInPicture();
        }
    }

    function goNext() {
        if (!next) return;
        // Как в основном клиенте: «Назад» из плеера — туда, откуда пришли.
        window.location.replace(config.urls.watch.replace('__ID__', next.id));
    }

    function back() {
        if (window.history.length > 1) window.history.back();
        else window.location.href = config.urls.back;
    }

    function startCountdown() {
        state.countdown = COUNTDOWN;
        tickCountdown();
    }

    function tickCountdown() {
        clearTimeout(timers.countdown);
        if (state.countdown === null) return;
        if (state.countdown <= 0) {
            goNext();
            return;
        }
        render();
        timers.countdown = setTimeout(function () {
            if (state.countdown === null) return;
            state.countdown -= 1;
            tickCountdown();
        }, 1000);
    }

    function cancelCountdown() {
        state.countdown = null;
        clearTimeout(timers.countdown);
    }

    function startResumedTimer() {
        if (state.resumedAt === null || timers.resumed) return;
        timers.resumed = setTimeout(function () {
            state.resumedAt = null;
            render();
        }, 7000);
    }

    /** Показать контролы и спрятать снова, если пользователь затих. */
    function poke() {
        state.active = true;
        clearTimeout(timers.hide);
        timers.hide = setTimeout(function () {
            state.active = false;
            render();
        }, HIDE_CONTROLS_MS);
        render();
    }

    function hideControls() {
        clearTimeout(timers.hide);
        state.active = false;
        render();
    }

    function flash(iconName, text, side) {
        el.bezelIcon.innerHTML = '';
        if (iconName) el.bezelIcon.appendChild(icon(iconName));
        el.bezelText.textContent = text || '';
        el.bezel.className = 'player__bezel player__bezel--' + (side || 'center');
        show(el.bezel, true);
        // Перезапуск анимации.
        void el.bezel.offsetWidth;
        el.bezel.className += ' player__bezel--animate';
        clearTimeout(timers.bezel);
        timers.bezel = setTimeout(function () {
            show(el.bezel, false);
        }, 650);
    }

    // ---------- Касания и клики по видео ----------

    root.addEventListener('touchstart', function () {
        lastTouch = Date.now();
    }, true);

    video.addEventListener('click', function (event) {
        if (state.settingsOpen || state.episodesOpen) {
            closePanels();
            return;
        }
        if (!state.started) return;
        var touch = Date.now() - lastTouch < 800;
        if (!touch) {
            togglePlay(true);
            poke();
            return;
        }
        onTap(event.clientX);
    });

    video.addEventListener('dblclick', function () {
        if (Date.now() - lastTouch > 800) toggleFullscreen();
    });

    root.addEventListener('mousemove', function () {
        if (Date.now() - lastTouch > 800) poke();
    });

    /** Тап: показать/спрятать контролы; двойной тап у края — перемотка. */
    function onTap(clientX) {
        var rect = video.getBoundingClientRect();
        var x = (clientX - rect.left) / rect.width;
        var side = x < 0.35 ? 'left' : x > 0.65 ? 'right' : 'center';
        var now = Date.now();
        var last = lastTap;
        lastTap = { time: now, side: side };
        if (last && now - last.time < DOUBLE_TAP_MS && last.side === side && side !== 'center') {
            seekBy(side === 'left' ? -SEEK_STEP : SEEK_STEP);
            return;
        }
        if (showControls() && !state.paused) hideControls();
        else poke();
    }

    // ---------- Кнопки ----------

    root.addEventListener('click', function (event) {
        var target = event.target;
        while (target && target !== root && !(target.getAttribute && target.getAttribute('data-action'))) target = target.parentNode;
        if (!target || target === root) return;
        var action = target.getAttribute('data-action');
        event.preventDefault();
        event.stopPropagation();
        switch (action) {
            case 'start':
                state.blocked = false;
                togglePlay(false);
                break;
            case 'toggle':
                togglePlay(false);
                break;
            case 'rewind':
                seekBy(-SEEK_STEP);
                break;
            case 'forward':
                seekBy(SEEK_STEP);
                break;
            case 'next':
                goNext();
                break;
            case 'mute':
                toggleMute();
                break;
            case 'subtitles':
                toggleSubtitles();
                break;
            case 'settings':
                state.episodesOpen = false;
                state.settingsOpen = !state.settingsOpen;
                state.settingsPage = 'main';
                renderSettings();
                break;
            case 'episodes':
                state.settingsOpen = false;
                state.episodesOpen = !state.episodesOpen;
                if (state.episodesOpen) openEpisodes();
                break;
            case 'close-episodes':
                state.episodesOpen = false;
                break;
            case 'pip':
                togglePip();
                break;
            case 'airplay':
                if (video.webkitShowPlaybackTargetPicker) video.webkitShowPlaybackTargetPicker();
                break;
            case 'fullscreen':
                toggleFullscreen();
                break;
            case 'back':
                back();
                break;
            case 'restart':
                video.currentTime = 0;
                state.resumedAt = null;
                break;
            case 'skip':
                var segment = currentSegment();
                if (segment && segment.end !== null) video.currentTime = segment.end;
                break;
            case 'retry':
                state.error = null;
                reload({ directPlay: false }, 'Готовим поток…');
                break;
            case 'cancel-next':
                cancelCountdown();
                break;
        }
        poke();
    });

    // Касание мимо меню закрывает его.
    document.addEventListener('touchstart', function (event) {
        if (!state.settingsOpen && !state.episodesOpen) return;
        var node = event.target;
        while (node && node !== document) {
            if (node === el.settings || node === el.episodes) return;
            if (node.getAttribute && (node.hasAttribute('data-settings-toggle') || node.hasAttribute('data-episodes-toggle'))) return;
            node = node.parentNode;
        }
        closePanels();
    });

    function closePanels() {
        state.settingsOpen = false;
        state.episodesOpen = false;
        render();
    }

    // ---------- Клавиатура (iPad с клавиатурой, компьютер) ----------

    document.addEventListener('keydown', function (event) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        var key = event.keyCode;
        if (key === 27) {
            if (state.settingsOpen || state.episodesOpen) closePanels();
            else if (!fullscreenElement()) back();
            return;
        }
        if (key >= 48 && key <= 57 && !event.shiftKey && state.duration > 0) {
            video.currentTime = ((key - 48) / 10) * state.duration;
            poke();
            return;
        }
        switch (key) {
            case 32:
            case 75:
                event.preventDefault();
                togglePlay(true);
                break;
            case 74:
            case 37:
                event.preventDefault();
                seekBy(-SEEK_STEP);
                break;
            case 76:
            case 39:
                event.preventDefault();
                seekBy(SEEK_STEP);
                break;
            case 70:
                toggleFullscreen();
                break;
            case 77:
                toggleMute();
                break;
            case 67:
                toggleSubtitles();
                break;
            case 73:
                togglePip();
                break;
            case 188:
            case 190:
                if (event.shiftKey) stepRate(key === 190 ? 1 : -1);
                break;
            case 78:
                if (event.shiftKey) goNext();
                break;
            default:
                return;
        }
        poke();
    });

    // ---------- Полоса перемотки ----------

    function fractionAt(clientX) {
        var rect = el.progress.getBoundingClientRect();
        return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    }

    function startScrub(clientX) {
        state.scrub = fractionAt(clientX);
        toggleClass(el.progress, 'progress--active', true);
        clearTimeout(timers.hide);
        renderProgress();
    }

    function moveScrub(clientX) {
        if (state.scrub === null) return;
        state.scrub = fractionAt(clientX);
        renderProgress();
    }

    function endScrub() {
        if (state.scrub === null) return;
        // Перематываем, когда отпустили: каждый промежуточный seek при
        // перекодировании заставил бы сервер перезапускать ffmpeg.
        if (state.duration > 0) video.currentTime = state.scrub * state.duration;
        state.scrub = null;
        toggleClass(el.progress, 'progress--active', false);
        poke();
        renderProgress();
    }

    el.progress.addEventListener('touchstart', function (event) {
        event.preventDefault();
        startScrub(event.touches[0].clientX);
    });
    el.progress.addEventListener('touchmove', function (event) {
        event.preventDefault();
        moveScrub(event.touches[0].clientX);
    });
    el.progress.addEventListener('touchend', function (event) {
        event.preventDefault();
        endScrub();
    });
    el.progress.addEventListener('touchcancel', function () {
        state.scrub = null;
        toggleClass(el.progress, 'progress--active', false);
        renderProgress();
    });
    el.progress.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || Date.now() - lastTouch < 800) return;
        startScrub(event.clientX);
    });
    document.addEventListener('mousemove', function (event) {
        if (state.scrub !== null) moveScrub(event.clientX);
    });
    document.addEventListener('mouseup', function () {
        endScrub();
    });
    el.progress.addEventListener('mousemove', function (event) {
        if (Date.now() - lastTouch < 800) return;
        state.hover = fractionAt(event.clientX);
        renderProgress();
    });
    el.progress.addEventListener('mouseleave', function () {
        state.hover = null;
        renderProgress();
    });

    function renderProgress() {
        var duration = state.duration;
        var played = duration > 0 ? state.currentTime / duration : 0;
        var shown = state.scrub !== null ? state.scrub : played;
        el.played.style.width = Math.min(100, shown * 100) + '%';
        el.thumb.style.left = Math.min(100, shown * 100) + '%';

        var ranges = video.buffered;
        var buffered = 0;
        for (var i = 0; i < ranges.length; i++) {
            if (ranges.start(i) <= video.currentTime + 0.5 && video.currentTime <= ranges.end(i)) {
                buffered = duration > 0 ? ranges.end(i) / duration : 0;
                break;
            }
        }
        el.buffered.style.width = Math.min(100, buffered * 100) + '%';

        var tip = state.scrub !== null ? state.scrub : state.hover;
        show(el.tip, tip !== null && duration > 0);
        if (tip === null || duration <= 0) return;
        var width = el.progress.getBoundingClientRect().width;
        var margin = Math.min(width / 2, trickplay ? 104 : 30);
        el.tip.style.left = Math.min(width - margin, Math.max(margin, tip * width)) + 'px';
        el.tipTime.textContent = formatDuration(tip * duration);
        renderFrame(tip * duration);
    }

    /** Кадр из листа превью Jellyfin: лист — сетка columns × rows кадров. */
    function renderFrame(time) {
        if (!trickplay) {
            show(el.frame, false);
            return;
        }
        var perSheet = trickplay.columns * trickplay.rows;
        var index = Math.min(trickplay.count - 1, Math.max(0, Math.floor(time / trickplay.interval)));
        var sheet = Math.floor(index / perSheet);
        var cell = index % perSheet;
        var width = 192;
        var scale = width / trickplay.width;
        var height = trickplay.height * scale;
        var style = el.frame.style;
        style.width = width + 'px';
        style.height = height + 'px';
        style.backgroundImage = 'url(' + trickplay.url.replace('{index}', String(sheet)) + ')';
        style.backgroundSize = trickplay.columns * width + 'px auto';
        style.backgroundPosition = -((cell % trickplay.columns) * width) + 'px ' + -(Math.floor(cell / trickplay.columns) * height) + 'px';
        show(el.frame, true);
    }

    function renderSegments() {
        el.segments.innerHTML = '';
        if (!(state.duration > 0)) return;
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            if (segment.start === null || segment.end === null) continue;
            var mark = make('div', 'progress__segment');
            mark.style.left = (segment.start / state.duration) * 100 + '%';
            mark.style.width = ((segment.end - segment.start) / state.duration) * 100 + '%';
            el.segments.appendChild(mark);
        }
    }

    function renderTime() {
        el.current.textContent = formatDuration(state.currentTime);
        el.duration.textContent = formatDuration(state.duration);
    }

    // ---------- Заставки и следующая серия ----------

    function currentSegment() {
        var time = state.currentTime;
        return find(segments, function (s) {
            return s.start !== null && s.end !== null && time >= s.start && time < s.end - 1;
        });
    }

    function renderOffer() {
        var segment = currentSegment();
        var nearEnd = next !== null && state.duration > 0 && state.duration - state.currentTime < 30 && !state.ended;
        var offerNext = next !== null && ((segment && segment.type === 'Outro') || nearEnd);
        var visible = state.started && !state.error && state.countdown === null && (!!segment || offerNext);
        show(el.offer, visible);
        show(el.offerNext, visible && offerNext);
        show(el.skip, visible && !offerNext && !!segment);
        if (segment) el.skipText.textContent = SEGMENT_LABELS[segment.type] || 'Пропустить';
    }

    // ---------- Меню настроек ----------

    function methodLabel(source) {
        if (source.method === 'DirectPlay') return 'Файл как есть';
        if (source.transcodesVideo) return 'Перекодирование';
        // AC-3/E-AC-3 iPad не декодирует — звук пережимается в AAC, видео копируется.
        return source.reasons.indexOf('AudioCodecNotSupported') !== -1 ? 'Перепаковка, звук в AAC' : 'Перепаковка без пережатия';
    }

    function speedLabel(rate) {
        return rate === 1 ? 'Обычная' : rate + '×';
    }

    function trackLabel(tracks, index) {
        var track = find(tracks, function (t) {
            return t.index === index;
        });
        return track ? track.label : null;
    }

    var settingsKey = '';

    function renderSettings() {
        var menu = el.settings;
        var source = state.source;
        show(menu, state.settingsOpen && !!source);
        toggleClass(el.settingsButton, 'ctrl--rotated', state.settingsOpen);
        if (!state.settingsOpen || !source) {
            settingsKey = '';
            return;
        }
        // Перестраиваем, только когда меню поменялось: иначе пункт под
        // пальцем пропадает из DOM, и касание теряется.
        var key = [state.settingsPage, source.playSessionId, currentAudio(), state.subtitle, video.playbackRate].join('|');
        if (key === settingsKey) return;
        settingsKey = key;
        menu.innerHTML = '';

        function entry(page, iconName, label, value) {
            var row = make('button', 'menu__row');
            row.type = 'button';
            row.appendChild(icon(iconName));
            row.appendChild(make('span', value ? 'menu__label menu__label--fixed' : 'menu__label', label));
            if (value) row.appendChild(make('span', 'menu__value', value));
            row.appendChild(icon('chevron-right'));
            row.addEventListener('click', function (event) {
                event.stopPropagation();
                state.settingsPage = page;
                renderSettings();
            });
            menu.appendChild(row);
        }

        function header(title) {
            var row = make('button', 'menu__row menu__row--back');
            row.type = 'button';
            row.appendChild(icon('chevron-left'));
            row.appendChild(make('span', 'menu__label', title));
            row.addEventListener('click', function (event) {
                event.stopPropagation();
                state.settingsPage = 'main';
                renderSettings();
            });
            menu.appendChild(row);
        }

        function list(choices, current, onPick) {
            var box = make('div', 'menu__list');
            for (var i = 0; i < choices.length; i++) {
                (function (choice) {
                    var row = make('button', 'menu__row');
                    row.type = 'button';
                    var check = icon('check');
                    if (choice.value !== current) check.setAttribute('class', check.getAttribute('class') + ' menu__check--off');
                    row.appendChild(check);
                    var label = make('span', 'menu__label', choice.label);
                    if (choice.hint) label.appendChild(make('span', 'menu__hint', choice.hint));
                    row.appendChild(label);
                    row.addEventListener('click', function (event) {
                        event.stopPropagation();
                        state.settingsOpen = false;
                        onPick(choice.value);
                        render();
                    });
                    box.appendChild(row);
                })(choices[i]);
            }
            menu.appendChild(box);
        }

        var page = state.settingsPage;
        if (page === 'main') {
            if (source.audioTracks.length > 1) entry('audio', 'audio-lines', 'Звук', trackLabel(source.audioTracks, currentAudio()));
            if (source.subtitleTracks.length > 0) entry('subtitles', 'captions', 'Субтитры', trackLabel(source.subtitleTracks, state.subtitle) || 'Выкл.');
            entry('speed', 'gauge', 'Скорость', speedLabel(video.playbackRate));
            entry('info', 'info', 'Воспроизведение', methodLabel(source));
        } else if (page === 'audio') {
            header('Звук');
            list(source.audioTracks.map(function (t) {
                return { value: t.index, label: t.label };
            }), currentAudio(), selectAudio);
        } else if (page === 'subtitles') {
            header('Субтитры');
            list([{ value: null, label: 'Выкл.' }].concat(source.subtitleTracks.map(function (t) {
                return { value: t.index, label: t.label, hint: t.url ? null : 'Картинкой — сервер вшьёт их в видео' };
            })), state.subtitle, selectSubtitle);
        } else if (page === 'speed') {
            header('Скорость');
            list(SPEEDS.map(function (speed) {
                return { value: speed, label: speedLabel(speed) };
            }), video.playbackRate, setRate);
        } else if (page === 'info') {
            header('Воспроизведение');
            var info = make('div', 'menu__info');
            info.appendChild(make('p', '', methodLabel(source)));
            if (source.reasons.length > 0) {
                info.appendChild(make('p', 'menu__muted', 'Браузеру не подошло: ' + source.reasons.map(function (r) {
                    return REASONS[r] || r;
                }).join(', ') + '.'));
            }
            if (source.transcodesVideo) {
                info.appendChild(make('p', 'menu__warn', 'Сервер пережимает видео — на старом устройстве иначе нельзя, но 4K так может не пойти.'));
            }
            menu.appendChild(info);
        }
    }

    el.settings.addEventListener('click', function (event) {
        event.stopPropagation();
    });

    // ---------- Панель «Серии» ----------

    var seasonCache = {};
    var seasons = [];
    var panelSeason = item.seasonId;
    var episodesXhr = null;

    function openEpisodes() {
        renderEpisodes();
        if (panelSeason === null || !seasonCache[panelSeason]) loadSeason(panelSeason);
    }

    function loadSeason(seasonId) {
        if (episodesXhr) episodesXhr.abort();
        el.episodeList.innerHTML = '';
        el.episodeList.appendChild(make('div', 'episodes-panel__message', 'Загружаем серии…'));
        var url = config.urls.episodes + (seasonId ? '?season=' + encodeURIComponent(seasonId) : '');
        episodesXhr = api('GET', url, null, function (error, data) {
            episodesXhr = null;
            if (error) {
                el.episodeList.innerHTML = '';
                var message = make('div', 'episodes-panel__message', 'Не удалось загрузить серии.');
                var retry = make('button', 'btn btn--secondary', 'Ещё раз');
                retry.type = 'button';
                retry.addEventListener('click', function (event) {
                    event.stopPropagation();
                    loadSeason(seasonId);
                });
                message.appendChild(make('br'));
                message.appendChild(retry);
                el.episodeList.appendChild(message);
                return;
            }
            seasons = data.seasons;
            if (data.seasonId !== null) {
                seasonCache[data.seasonId] = data.episodes;
                panelSeason = data.seasonId;
            }
            renderEpisodes();
        });
    }

    var episodesKey = '';

    function renderEpisodes() {
        show(el.episodes, state.episodesOpen);
        if (!el.episodes || !state.episodesOpen) {
            episodesKey = '';
            return;
        }
        // Как и меню: без изменений не трогаем — список держит прокрутку.
        var key = [panelSeason, seasons.length, panelSeason !== null && seasonCache[panelSeason] ? 'loaded' : 'empty'].join('|');
        if (key === episodesKey) return;
        episodesKey = key;

        el.seasonTabs.innerHTML = '';
        show(el.seasonTabs, seasons.length > 1);
        for (var i = 0; i < seasons.length; i++) {
            (function (season) {
                var tab = make('button', 'tab' + (season.id === panelSeason ? ' tab--active' : ''), season.name + (season.played ? ' ✓' : ''));
                tab.type = 'button';
                tab.addEventListener('click', function (event) {
                    event.stopPropagation();
                    panelSeason = season.id;
                    if (seasonCache[season.id]) renderEpisodes();
                    else loadSeason(season.id);
                });
                el.seasonTabs.appendChild(tab);
            })(seasons[i]);
        }

        var episodes = panelSeason !== null ? seasonCache[panelSeason] : null;
        if (!episodes) return;
        el.episodeList.innerHTML = '';
        var current = null;
        for (var j = 0; j < episodes.length; j++) {
            var row = episodeRow(episodes[j]);
            if (episodes[j].id === item.id) current = row;
            el.episodeList.appendChild(row);
        }
        // Текущую серию — в середину списка; другой сезон — с начала.
        if (current) el.episodeList.scrollTop = current.offsetTop - el.episodeList.clientHeight / 2 + current.offsetHeight / 2;
        else el.episodeList.scrollTop = 0;
    }

    function episodeRow(episode) {
        var isCurrent = episode.id === item.id;
        var row = make('button', 'pe' + (isCurrent ? ' pe--current' : ''));
        row.type = 'button';
        var thumb = make('div', 'pe__thumb');
        var image = episode.landscape || episode.poster;
        if (image) {
            var img = document.createElement('img');
            img.src = image;
            img.alt = '';
            thumb.appendChild(img);
        }
        if (isCurrent) {
            var now = make('div', 'pe__now');
            now.appendChild(icon('play'));
            thumb.appendChild(now);
        }
        if (episode.progress !== null) {
            var bar = make('div', 'pe__progress');
            var fill = make('div', 'card__progress-bar');
            fill.style.width = episode.progress + '%';
            bar.appendChild(fill);
            thumb.appendChild(bar);
        }
        row.appendChild(thumb);

        var body = make('div', 'pe__body');
        var title = make('p', 'pe__title');
        if (episode.episode !== null) title.appendChild(make('span', 'pe__num', episode.episode + '.'));
        title.appendChild(document.createTextNode(episode.name));
        body.appendChild(title);
        var info = make('p', 'pe__info', isCurrent ? 'Сейчас' : formatRuntime(episode.runtime));
        if (episode.played) {
            var check = make('span', 'pe__check', ' ✓');
            info.appendChild(check);
        }
        body.appendChild(info);
        row.appendChild(body);

        row.addEventListener('click', function (event) {
            event.stopPropagation();
            if (isCurrent) {
                state.episodesOpen = false;
                render();
            } else {
                window.location.replace(config.urls.watch.replace('__ID__', episode.id));
            }
        });
        return row;
    }

    if (el.episodes) {
        el.episodes.addEventListener('click', function (event) {
            event.stopPropagation();
        });
    }

    // ---------- Отрисовка ----------

    function loading() {
        return !state.started && !state.blocked && !state.error;
    }

    function showControls() {
        return (
            !loading() &&
            (state.active || state.paused || state.settingsOpen || state.episodesOpen || state.scrub !== null)
        );
    }

    function render() {
        var source = state.source;
        var controls = showControls();
        var isLoading = loading();

        toggleClass(root, 'player--hide-top', !(controls || isLoading || state.error));
        toggleClass(root, 'player--hide-bottom', !(controls && state.countdown === null));
        toggleClass(root, 'player--controls', controls && state.countdown === null);

        // При смене дорожки свой индикатор — большой круг поверх него не нужен.
        show(el.loading, !state.switching && (isLoading || (state.waiting && !state.paused)));
        show(el.transcodeNote, isLoading && !!source && source.transcodesVideo);
        show(el.blocked, state.blocked && !state.error);

        show(el.iconReplay, state.ended);
        show(el.iconPlay, !state.ended && state.paused);
        show(el.iconPause, !state.ended && !state.paused);
        show(el.iconVolume, !video.muted);
        show(el.iconMuted, video.muted);

        var texts = textSubtitles();
        show(el.subtitles, texts.length > 0);
        toggleClass(el.subtitles, 'ctrl--on', state.subtitle !== null);
        show(el.settingsButton, !!source);
        show(el.pip, canPip());
        show(el.airplay, state.airplay);

        // Под панелью «Серии» плашка просвечивает рядом с крестиком — прячем.
        var badge = source && state.started && source.method !== 'DirectPlay' && controls && !state.episodesOpen;
        show(el.method, badge);
        if (badge) el.method.textContent = methodLabel(source);

        show(el.resumed, state.resumedAt !== null && state.started);
        if (state.resumedAt !== null) el.resumedAt.textContent = formatDuration(state.resumedAt);

        show(el.error, !!state.error);
        if (state.error) el.errorText.textContent = state.error;

        show(el.countdown, state.countdown !== null);
        toggleClass(root, 'player--countdown', state.countdown !== null);
        if (state.countdown !== null && el.countdownValue) el.countdownValue.textContent = state.countdown;

        renderSettings();
        renderEpisodes();
        renderOffer();
        renderTime();
        renderProgress();
    }

    // ---------- Запуск ----------

    var prefs = readPrefs();
    video.muted = !!prefs.muted;
    try {
        video.volume = prefs.volume;
    } catch (e) {
        // на iOS громкость — только кнопками устройства
    }
    video.defaultPlaybackRate = prefs.rate;
    video.playbackRate = prefs.rate;

    renderSegments();
    render();
    requestStream();
})();
