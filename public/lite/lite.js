/*
 * Облегчённая версия (App\Lite\Lite) — поведение страниц. Только ES5 и то,
 * что есть в Safari 10: без сборки, модулей, fetch, Promise-цепочек и
 * IntersectionObserver. Страницы работают и без этого файла — он добавляет
 * удобство: ленивые картинки, меню, витрину, подгрузку сетки, живой поиск,
 * вход по коду без перезагрузки.
 */
(function () {
    'use strict';

    var SCROLL_KEY = 'jellyfin-web:lite:scroll';

    // ---------- Утилиты ----------

    function each(list, fn) {
        for (var i = 0; i < list.length; i++) fn(list[i], i);
    }

    function all(selector, root) {
        return (root || document).querySelectorAll(selector);
    }

    function closest(el, selector) {
        while (el && el.nodeType === 1) {
            if (matches(el, selector)) return el;
            el = el.parentNode;
        }
        return null;
    }

    function matches(el, selector) {
        var fn = el.matches || el.webkitMatchesSelector || el.msMatchesSelector;
        return fn.call(el, selector);
    }

    function throttle(fn, ms) {
        var timer = 0;
        return function () {
            if (timer) return;
            timer = setTimeout(function () {
                timer = 0;
                fn();
            }, ms);
        };
    }

    function cookie(name) {
        var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    /**
     * HTML той же страницы (подгрузка сетки, поиск, проверка кода). Без
     * X-Requested-With: иначе Laravel решит, что нужен JSON.
     */
    function fetchPage(method, url, done) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Accept', 'text/html');
        if (method !== 'GET') xhr.setRequestHeader('X-XSRF-TOKEN', cookie('XSRF-TOKEN'));
        xhr.onload = function () {
            if (xhr.status < 200 || xhr.status >= 300) return done(new Error(String(xhr.status)));
            var doc = new DOMParser().parseFromString(xhr.responseText, 'text/html');
            done(null, doc, xhr.responseURL || url);
        };
        xhr.onerror = function () {
            done(new Error('network'));
        };
        xhr.send();
        return xhr;
    }

    function storage() {
        try {
            return window.sessionStorage;
        } catch (e) {
            return null;
        }
    }

    // ---------- Кнопки-флексы (Safari до 11) ----------

    // Старый WebKit не делает <button> флекс-контейнером: display: flex на
    // кнопке не действует, иконка и подпись прижимаются влево. Содержимое
    // таких кнопок переносим в <span class="btn-flex">, который берёт
    // раскладку кнопки (lite.css). Кнопки плеера появляются позже — их
    // ловит MutationObserver.
    function buttonFlexBroken() {
        var button = document.createElement('button');
        button.style.cssText = 'display:flex;justify-content:center;width:100px;padding:0;border:0';
        button.innerHTML = '<span style="width:10px"></span>';
        document.body.appendChild(button);
        var offset = button.firstChild.getBoundingClientRect().left - button.getBoundingClientRect().left;
        document.body.removeChild(button);
        return offset < 1;
    }

    function isFlex(button) {
        var hidden = button.hasAttribute('hidden');
        if (hidden) button.removeAttribute('hidden');
        var display = getComputedStyle(button).display;
        if (hidden) button.setAttribute('hidden', '');
        // Только flex: -webkit-box (раскрываемое описание с line-clamp)
        // в старом WebKit работает и на кнопке, а обёртка ломает обрезку строк.
        return display.indexOf('flex') !== -1;
    }

    function wrapButton(button) {
        var first = button.firstChild;
        if (first && first === button.lastChild && first.className === 'btn-flex') return;
        if (!first || !isFlex(button)) return;
        var inner = document.createElement('span');
        inner.className = 'btn-flex';
        while (button.firstChild) inner.appendChild(button.firstChild);
        button.appendChild(inner);
    }

    function wrapButtons(node) {
        if (node.nodeType !== 1) return;
        if (node.tagName === 'BUTTON') wrapButton(node);
        else each(all('button', node), wrapButton);
    }

    if (buttonFlexBroken()) {
        wrapButtons(document.body);
        if (window.MutationObserver) {
            new MutationObserver(function (mutations) {
                each(mutations, function (mutation) {
                    // Содержимое кнопки заменили целиком — обернуть заново.
                    var button = closest(mutation.target, 'button');
                    if (button) wrapButton(button);
                    each(mutation.addedNodes, wrapButtons);
                });
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    // ---------- Ленивые картинки ----------
    // Сетка медиатеки — сотни постеров; старому iPad их не удержать разом.

    var pending = [];

    function collectImages(root) {
        each(all('img[data-src]', root), function (img) {
            pending.push(img);
            img.onload = function () {
                img.className += ' art__img--loaded';
            };
            img.onerror = function () {
                if (img.parentNode) img.parentNode.removeChild(img);
            };
        });
        loadVisible();
    }

    function loadVisible() {
        var height = window.innerHeight;
        var width = window.innerWidth;
        var rest = [];
        each(pending, function (img) {
            if (!img.getAttribute('data-src')) return;
            var rect = img.getBoundingClientRect();
            var visible =
                (rect.width > 0 || rect.height > 0) &&
                rect.top < height * 2 &&
                rect.bottom > -height &&
                rect.left < width * 1.6 &&
                rect.right > -width * 0.6;
            if (visible) {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            } else {
                rest.push(img);
            }
        });
        pending = rest;
    }

    // Прокрутка полок тоже: событие scroll не всплывает, ловим на погружении.
    document.addEventListener('scroll', throttle(loadVisible, 120), true);
    window.addEventListener('resize', throttle(loadVisible, 200));
    window.addEventListener('orientationchange', function () {
        setTimeout(loadVisible, 300);
    });

    // ---------- Меню и боковая панель ----------

    function closeDropdowns(except) {
        each(all('.dropdown--open'), function (el) {
            if (el !== except) el.className = el.className.replace(/\s*dropdown--open/g, '');
        });
    }

    document.addEventListener('click', function (event) {
        var toggle = closest(event.target, '[data-dropdown-toggle]');
        if (toggle) {
            event.preventDefault();
            var dropdown = closest(toggle, '[data-dropdown]');
            var open = /dropdown--open/.test(dropdown.className);
            closeDropdowns(dropdown);
            dropdown.className = open
                ? dropdown.className.replace(/\s*dropdown--open/g, '')
                : dropdown.className + ' dropdown--open';
            if (!open) keepInside(dropdown.querySelector('.dropdown__menu'));
            return;
        }
        if (!closest(event.target, '.dropdown__menu')) closeDropdowns(null);

        var drawer = document.querySelector('[data-drawer]');
        if (closest(event.target, '[data-drawer-open]') && drawer) {
            drawer.className += ' drawer--open';
        } else if (closest(event.target, '[data-drawer-close]') && drawer) {
            drawer.className = drawer.className.replace(/\s*drawer--open/g, '');
        }

        var expand = closest(event.target, '[data-expand]');
        if (expand) expand.className = /clamp-4/.test(expand.className)
            ? expand.className.replace(/\s*clamp-4/g, '')
            : expand.className + ' clamp-4';
    });

    // Меню у правого края экрана (кнопка «⋯» у фильма) уходило за край —
    // тогда выравниваем его по правому краю кнопки.
    function keepInside(menu) {
        if (!menu || /dropdown__menu--right/.test(menu.className)) return;
        if (menu.getBoundingClientRect().right > window.innerWidth - 8) menu.className += ' dropdown__menu--right';
    }

    // На iOS касание пустого места не даёт click — закрываем меню по касанию.
    document.addEventListener('touchstart', function (event) {
        if (!closest(event.target, '[data-dropdown]')) closeDropdowns(null);
    });

    // ---------- Разделы в шапке ----------

    // Разделов больше, чем влезает, — текущий может оказаться за краем.
    each(all('.nav'), function (nav) {
        var active = nav.querySelector('.nav__link--active');
        if (!active) return;
        var overflow = active.getBoundingClientRect().right + 32 - nav.getBoundingClientRect().right;
        if (overflow > 0) nav.scrollLeft += overflow;
    });

    // ---------- Шапка поверх фона ----------

    var header = document.querySelector('[data-overlay-header]');
    if (header) {
        var updateHeader = function () {
            var solid = (window.pageYOffset || document.documentElement.scrollTop) > 24;
            header.className = 'header ' + (solid ? 'header--solid' : 'header--overlay');
        };
        window.addEventListener('scroll', throttle(updateHeader, 80));
        updateHeader();
    }

    // ---------- Витрина на главной ----------

    var hero = document.querySelector('[data-hero]');
    if (hero) initHero(hero);

    function initHero(root) {
        var ROTATE_MS = 9000;
        var slides = all('[data-hero-slide]', root);
        var dots = all('[data-hero-dot]', root);
        var counter = root.querySelector('[data-hero-index]');
        var index = 0;
        var timer = 0;
        var touchX = null;
        if (slides.length < 2) return;

        function pad(n) {
            return (n < 10 ? '0' : '') + n;
        }

        function load(position) {
            var img = slides[position].querySelector('[data-hero-src]');
            if (img) {
                img.src = img.getAttribute('data-hero-src');
                img.removeAttribute('data-hero-src');
            }
        }

        function go(target) {
            var next = (target + slides.length) % slides.length;
            load(next);
            load((next + 1) % slides.length);
            each(slides, function (slide, i) {
                slide.className = 'hero__slide' + (i === next ? ' hero__slide--active' : '');
            });
            each(dots, function (dot, i) {
                // Перезапуск анимации полосы — новым элементом.
                var fill = dot.querySelector('.hero__dot-fill');
                var fresh = fill.cloneNode(false);
                dot.replaceChild(fresh, fill);
                dot.className = 'hero__dot' + (i < next ? ' hero__dot--done' : '') + (i === next ? ' hero__dot--active' : '');
            });
            if (counter) counter.textContent = pad(next + 1);
            index = next;
            clearTimeout(timer);
            timer = setTimeout(function () {
                go(index + 1);
            }, ROTATE_MS);
        }

        root.addEventListener('click', function (event) {
            if (closest(event.target, '[data-hero-prev]')) go(index - 1);
            else if (closest(event.target, '[data-hero-next]')) go(index + 1);
            else {
                var dot = closest(event.target, '[data-hero-dot]');
                if (dot) go(Number(dot.getAttribute('data-hero-dot')));
            }
        });
        root.addEventListener('touchstart', function (event) {
            touchX = event.touches[0].clientX;
        });
        root.addEventListener('touchend', function (event) {
            if (touchX === null) return;
            var dx = event.changedTouches[0].clientX - touchX;
            touchX = null;
            if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        });
        load(1);
        timer = setTimeout(function () {
            go(1);
        }, ROTATE_MS);
    }

    // ---------- Фильтры: выбор в списке сразу применяется ----------

    each(all('form[data-autosubmit] select'), function (select) {
        select.addEventListener('change', function () {
            select.form.submit();
        });
    });

    // ---------- Сетка: следующая страница при прокрутке ----------

    var grid = document.querySelector('[data-scroll-grid]');
    if (grid) initScroll(grid);

    function initScroll(grid) {
        var loading = false;

        function more() {
            return document.querySelector('[data-scroll-more]');
        }

        function check() {
            var box = more();
            if (loading || !box) return;
            if (box.getBoundingClientRect().top > window.innerHeight + 1200) return;
            var link = box.querySelector('[data-scroll-next]');
            loading = true;
            link.textContent = 'Загружаем…';
            fetchPage('GET', link.href, function (error, doc) {
                loading = false;
                if (error) {
                    link.textContent = 'Показать ещё';
                    return;
                }
                var cells = doc.querySelectorAll('[data-scroll-grid] > .grid__cell');
                var fragment = document.createDocumentFragment();
                each(cells, function (cell) {
                    fragment.appendChild(document.importNode(cell, true));
                });
                grid.appendChild(fragment);
                var nextBox = doc.querySelector('[data-scroll-more]');
                if (nextBox) box.parentNode.replaceChild(document.importNode(nextBox, true), box);
                else box.parentNode.removeChild(box);
                collectImages(grid);
                check();
            });
        }

        document.addEventListener('click', function (event) {
            if (!closest(event.target, '[data-scroll-next]')) return;
            event.preventDefault();
            check();
        });
        window.addEventListener('scroll', throttle(check, 150));
        check();
    }

    // ---------- Поиск по мере набора ----------

    var searchForm = document.querySelector('[data-live-search]');
    if (searchForm) initSearch(searchForm);

    function initSearch(form) {
        var input = form.querySelector('input[name="q"]');
        var results = document.querySelector('[data-search-results]');
        var timer = 0;
        var xhr = null;
        var last = input.value;

        function run() {
            var q = input.value.replace(/^\s+|\s+$/g, '');
            if (q === last) return;
            last = q;
            var url = form.action + (q ? '?q=' + encodeURIComponent(q) : '');
            if (xhr) xhr.abort();
            xhr = fetchPage('GET', url, function (error, doc) {
                xhr = null;
                if (error) return;
                var fresh = doc.querySelector('[data-search-results]');
                if (!fresh) return;
                results.innerHTML = fresh.innerHTML;
                document.title = doc.title;
                if (window.history.replaceState) window.history.replaceState(null, '', url);
                collectImages(results);
            });
        }

        input.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(run, 400);
        });
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            clearTimeout(timer);
            input.blur();
            run();
        });
    }

    // ---------- Вход по коду: ждём подтверждения ----------

    var quickConnect = document.querySelector('[data-quick-connect]');
    if (quickConnect) initQuickConnect(quickConnect);

    function initQuickConnect(box) {
        var url = box.getAttribute('data-quick-connect');

        function poll() {
            fetchPage('POST', url, function (error, doc, finalUrl) {
                if (error) return setTimeout(poll, 3000);
                // Вход подтвердили — сервер увёл со страницы входа.
                if (!/\/login(\?|$)/.test(finalUrl.replace(/#.*$/, ''))) {
                    window.location.replace(finalUrl);
                    return;
                }
                if (doc.querySelector('[data-quick-connect]')) return setTimeout(poll, 3000);
                // Код устарел: карточку и сообщение — из ответа.
                var card = document.querySelector('[data-swap="login"]');
                var fresh = doc.querySelector('[data-swap="login"]');
                if (card && fresh) card.parentNode.replaceChild(document.importNode(fresh, true), card);
                each(doc.querySelectorAll('[data-toast]'), function (toast) {
                    showToast(document.importNode(toast, true));
                });
            });
        }

        setTimeout(poll, 3000);
    }

    // ---------- Всплывашки ----------

    function showToast(toast) {
        document.querySelector('[data-toasts]').appendChild(toast);
        hideLater(toast);
    }

    function hideLater(toast) {
        setTimeout(function () {
            toast.className += ' toast--hiding';
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400);
        }, 5000);
    }

    each(all('[data-toast]'), hideLater);

    // ---------- Прокрутка не сбрасывается после отметок ----------
    // Отметки — обычные формы: после них сервер возвращает на ту же страницу.

    document.addEventListener('submit', function (event) {
        var form = event.target;
        var store = storage();
        if (!store || (form.getAttribute('method') || '').toLowerCase() !== 'post') return;
        try {
            store.setItem(SCROLL_KEY, JSON.stringify({
                path: location.pathname + location.search,
                y: window.pageYOffset,
                at: Date.now(),
            }));
        } catch (e) {
            // без памяти — просто наверх
        }
    });

    (function restoreScroll() {
        var store = storage();
        if (!store) return;
        try {
            var saved = JSON.parse(store.getItem(SCROLL_KEY) || 'null');
            store.removeItem(SCROLL_KEY);
            if (saved && saved.path === location.pathname + location.search && Date.now() - saved.at < 30000) {
                window.scrollTo(0, saved.y);
            }
        } catch (e) {
            // ничего
        }
    })();

    // ---------- Сезоны: без новой записи в истории ----------

    document.addEventListener('click', function (event) {
        var link = closest(event.target, 'a[data-replace]');
        if (!link || event.defaultPrevented) return;
        event.preventDefault();
        window.location.replace(link.href);
    });

    // ---------- С экрана «Домой»: ссылки не уводят в Safari ----------

    if (window.navigator.standalone) {
        document.addEventListener('click', function (event) {
            var link = closest(event.target, 'a[href]');
            if (!link || event.defaultPrevented || link.target === '_blank') return;
            if (link.host !== location.host) return;
            event.preventDefault();
            window.location.href = link.href;
        });
    }

    collectImages(document);
})();
