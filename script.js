/* ==========================================================
   Логика сайта: открытие сюрприза, печатная машинка,
   переворачивающиеся полароиды, прогресс и финал.
   Чистый JavaScript, ООП-подход.
   ========================================================== */

/** Небольшие общие утилиты. */
class Utils {
  /** Пауза в миллисекундах. */
  static wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Случайное число в диапазоне [min, max]. */
  static rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** Включено ли в системе «уменьшить движение». */
  static get reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

/** Эффект «печатной машинки» — выводит текст посимвольно. */
class Typewriter {
  /**
   * @param {HTMLElement} element — куда печатать
   * @param {string} text — полный текст
   * @param {number} speed — задержка между символами, мс
   */
  constructor(element, text, speed = 55) {
    this.element = element;
    this.text = text;
    this.speed = speed;
  }

  /** Запускает печать; промис завершается, когда текст выведен полностью. */
  start() {
    return new Promise((resolve) => {
      let i = 0;
      this.element.classList.add('is-typing');

      const tick = () => {
        this.element.textContent = this.text.slice(0, ++i);

        if (i >= this.text.length) {
          this.element.classList.remove('is-typing');
          resolve();
          return;
        }

        // Небольшая пауза после знаков препинания — выглядит живее
        const ch = this.text[i - 1];
        const pause = ',.…'.includes(ch) ? this.speed * 7 : this.speed;
        setTimeout(tick, pause);
      };

      tick();
    });
  }
}

/** Летящие сердечки: маленький взрыв из точки и дождь сверху. */
class HeartBurst {
  static COLORS = ['#e98aa0', '#f4a8b8', '#ffb3a7', '#f6c1a5', '#f08aa0'];

  constructor(layer) {
    this.layer = layer;
  }

  /** Создаёт одно сердечко с заданными CSS-переменными. */
  spawn(x, y, vars, extraClass = '') {
    const el = document.createElement('span');
    el.className = `burst-heart ${extraClass}`.trim();
    el.textContent = '♥';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = HeartBurst.COLORS[Math.floor(Math.random() * HeartBurst.COLORS.length)];
    Object.entries(vars).forEach(([key, value]) => el.style.setProperty(key, value));
    el.addEventListener('animationend', () => el.remove());
    this.layer.appendChild(el);
  }

  /** Взрыв сердечек из точки (x, y) — при открытии карточки. */
  burst(x, y, count = 14) {
    if (Utils.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      this.spawn(x, y, {
        '--dx': `${Utils.rand(-110, 110)}px`,
        '--dy': `${-Utils.rand(70, 200)}px`,
        '--rot-end': `${Utils.rand(-60, 60)}deg`,
        '--size': `${Utils.rand(12, 26)}px`,
      });
    }
  }

  /** Дождь из сердечек на весь экран — в финале. */
  rain(durationMs = 5000) {
    if (Utils.reducedMotion) return;
    const timer = setInterval(() => {
      this.spawn(Utils.rand(0, window.innerWidth), -30, {
        '--sway': `${Utils.rand(-60, 60)}px`,
        '--rot-end': `${Utils.rand(-90, 90)}deg`,
        '--size': `${Utils.rand(14, 28)}px`,
        '--dur': `${Utils.rand(4, 6.5)}s`,
      }, 'burst-heart--rain');
    }, 140);
    setTimeout(() => clearInterval(timer), durationMs);
  }
}

/** Одна карточка-полароид: перевёрнута подписью вверх, по клику открывается навсегда. */
class PolaroidCard {
  /**
   * @param {HTMLElement} element — <figure class="polaroid">
   * @param {Function} onOpen — вызывается один раз, когда карточка открыта
   */
  constructor(element, onOpen) {
    this.element = element;
    this.onOpen = onOpen;
    this.isOpen = false;
    this.caption = element.dataset.caption || '';

    this.build();
  }

  /** Собирает двустороннюю карточку вокруг уже имеющегося <img>. */
  build() {
    const img = this.element.querySelector('img');

    const inner = document.createElement('div');
    inner.className = 'polaroid__inner';

    // Лицевая сторона: фото и подпись на нижней белой полосе
    const front = document.createElement('div');
    front.className = 'polaroid__face polaroid__front';
    front.appendChild(img);
    const figcaption = document.createElement('figcaption');
    figcaption.className = 'polaroid__caption';
    figcaption.textContent = this.caption;
    front.appendChild(figcaption);

    // Обратная сторона: подпись и подсказка
    const back = document.createElement('div');
    back.className = 'polaroid__face polaroid__back';
    back.innerHTML =
      '<div class="polaroid__frame">' +
      '<span class="polaroid__mark">♡</span>' +
      '<p class="polaroid__text"></p>' +
      '<span class="polaroid__tip">нажми, чтобы перевернуть</span>' +
      '</div>';
    back.querySelector('.polaroid__text').textContent = this.caption;

    inner.append(front, back);
    this.element.appendChild(inner);

    // Доступность: карточка — это кнопка, работает и с клавиатуры
    this.element.tabIndex = 0;
    this.element.setAttribute('role', 'button');
    this.element.setAttribute('aria-label', `Перевернуть карточку: ${this.caption}`);
  }

  /** Переворачивает карточку лицом вверх (необратимо). */
  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.element.classList.add('is-open');
    this.element.setAttribute('aria-label', this.caption);
    this.onOpen(this);
  }

  /** Включает/выключает «увеличенный» режим (для тапа на телефоне). */
  setActive(active) {
    this.element.classList.toggle('is-active', active);
  }

  get isActive() {
    return this.element.classList.contains('is-active');
  }
}

/** Галерея: управляет карточками, прогрессом и финалом. */
class Gallery {
  /**
   * @param {object} refs — DOM-элементы блока воспоминаний
   * @param {HeartBurst} hearts — эффект сердечек
   * @param {Function} onComplete — вызывается, когда открыты все карточки
   */
  constructor(refs, hearts, onComplete) {
    this.section = refs.section;
    this.countEl = refs.countEl;
    this.heartsEl = refs.heartsEl;
    this.hearts = hearts;
    this.onComplete = onComplete;
    this.openedCount = 0;

    this.cards = [...refs.grid.querySelectorAll('.polaroid')]
      .map((el) => new PolaroidCard(el, (card) => this.handleOpened(card)));

    this.buildProgress();
    this.bindEvents();
    this.updateProgress();
  }

  /** Рисует ряд сердечек-индикаторов по числу карточек. */
  buildProgress() {
    this.cards.forEach(() => {
      const heart = document.createElement('span');
      heart.className = 'progress__heart';
      heart.textContent = '♥';
      this.heartsEl.appendChild(heart);
    });
  }

  bindEvents() {
    this.cards.forEach((card) => {
      const activate = (e) => {
        e.stopPropagation();
        this.handleClick(card);
      };
      card.element.addEventListener('click', activate);
      card.element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(e);
        }
      });
    });

    // Тап вне карточки — убираем увеличение
    document.addEventListener('click', () => this.clearActive());
  }

  handleClick(card) {
    if (!card.isOpen) {
      // Первый клик: переворачиваем и сразу показываем крупно
      this.clearActive();
      card.open();
      card.setActive(true);
      return;
    }
    // Уже открытая: переключаем увеличенный режим
    const wasActive = card.isActive;
    this.clearActive();
    card.setActive(!wasActive);
  }

  /** Реакция на открытие карточки: сердечки и прогресс. */
  handleOpened(card) {
    const rect = card.element.getBoundingClientRect();
    this.hearts.burst(rect.left + rect.width / 2, rect.top + rect.height / 2);

    this.openedCount += 1;
    this.updateProgress();

    if (this.openedCount === this.cards.length) {
      // Ждём, пока доиграет анимация переворота
      setTimeout(() => this.onComplete(), 1300);
    }
  }

  updateProgress() {
    this.countEl.textContent = `${this.openedCount} из ${this.cards.length}`;
    [...this.heartsEl.children].forEach((h, i) => {
      h.classList.toggle('is-filled', i < this.openedCount);
    });
  }

  clearActive() {
    this.cards.forEach((c) => c.setActive(false));
  }

  /** Плавное появление блока (fade in + slide up). */
  reveal() {
    this.section.classList.add('is-visible');
  }
}

/** Главный класс приложения: связывает все этапы сюрприза. */
class SurpriseApp {
  static MESSAGE =
    'Любимая, сегодня ровно 2 месяца, как мы вместе. ' +
    'Спасибо тебе за каждый день, за твою улыбку и за то, что ты просто рядом. ' +
    'Это только начало нашей истории...';

  static FINALE =
    'Вот так выглядят наши два месяца. ' +
    'А впереди ещё столько счастливых кадров. Люблю тебя ♡';

  constructor() {
    this.intro = document.getElementById('intro');
    this.heartBtn = document.getElementById('heartBtn');
    this.content = document.getElementById('content');
    this.typedEl = document.getElementById('typed');
    this.finale = document.getElementById('finale');
    this.finaleText = document.getElementById('finaleText');
    this.opened = false;

    this.hearts = new HeartBurst(document.getElementById('burstLayer'));

    this.gallery = new Gallery(
      {
        section: document.getElementById('memories'),
        grid: document.getElementById('gallery'),
        countEl: document.getElementById('progressCount'),
        heartsEl: document.getElementById('progressHearts'),
      },
      this.hearts,
      () => this.playFinale()
    );

    this.heartBtn.addEventListener('click', () => this.open());
  }

  async open() {
    if (this.opened) return;
    this.opened = true;

    // 1. Сердце растворяется
    this.intro.classList.add('is-hidden');
    await Utils.wait(900);

    // 2. Показываем основной контент
    this.content.hidden = false;
    // двойной rAF, чтобы transition сработал после снятия hidden
    requestAnimationFrame(() => requestAnimationFrame(() => this.content.classList.add('is-visible')));
    await Utils.wait(700);

    // 3. Печатаем поздравление
    await new Typewriter(this.typedEl, SurpriseApp.MESSAGE).start();
    await Utils.wait(500);

    // 4. Выплывает галерея
    this.gallery.reveal();

    // Полностью убираем экран приветствия из потока
    this.intro.hidden = true;
  }

  /** Финал: открыты все карточки — печатаем итоговые слова и пускаем сердечки. */
  async playFinale() {
    this.gallery.clearActive();
    this.finale.hidden = false;
    this.finale.scrollIntoView({ behavior: Utils.reducedMotion ? 'auto' : 'smooth', block: 'center' });

    this.hearts.rain();
    await new Typewriter(this.finaleText, SurpriseApp.FINALE, 60).start();
  }
}

document.addEventListener('DOMContentLoaded', () => new SurpriseApp());
