// Giovanna Baby — interações da página

// Número no formato internacional, só dígitos, e a mensagem que já aparece escrita na conversa
// (o envio fica a critério do cliente). Com o número vazio, os links levam à seção de contato.
const WHATSAPP_NUMBER = '5511968737371';
const WHATSAPP_MESSAGE = 'Olá Geovana, quero fazer um pedido de produto.';

// Destinos ainda não definidos (elementos com data-link). Preencha com a URL oficial ou a página
// quando existir; enquanto estiver vazio, o link fica desativado em vez de levar a lugar nenhum.
const PENDING_LINKS = {
  'skin-care': '',     // categoria Skin Care (ainda não há produtos nem seção no site)
  maquiagem: '',       // categoria Maquiagem (idem)
  sobre: '',           // página institucional "Sobre nós"
  trocas: '',          // página de trocas e devoluções
  privacidade: '',     // página de política de privacidade
  instagram: 'https://www.instagram.com/_geovanab.sz?psln=MWVjNWhodDZwYXE5aQ==', // perfil oficial no Instagram (header e rodapé)
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;

/* ---------- Entrada dos produtos ---------- */

function revealHero(hero) {
  const images = [...hero.querySelectorAll('.hero__product img, .hero__flower img')];
  const ready = () => hero.classList.add('is-ready');
  const loaded = images.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve()));

  // Não segura a página caso uma imagem demore demais.
  Promise.race([Promise.all(loaded), new Promise((resolve) => setTimeout(resolve, 2000))]).then(ready);
}

/* ---------- Nome da hero em peças de quebra-cabeça ---------- */

// Para cada letra de "Geovana": altura do corte (% da caixa da letra), inclinação do corte (%)
// e o vetor final das peças de cima e de baixo — [dx, dy] em em e rotação em graus.
// As letras à esquerda do centro se afastam para a esquerda e as da direita para a direita,
// sempre para cima/baixo, longe do frasco que está à frente.
const PUZZLE = [
  { cut: 56, slope: 5, top: [-0.17, -0.1, -7], bottom: [-0.11, 0.08, 5] },
  { cut: 64, slope: -5, top: [-0.11, -0.16, 5], bottom: [-0.14, 0.07, -4] },
  { cut: 63, slope: 5, top: [-0.06, -0.14, -4], bottom: [-0.04, 0.13, 6] },
  { cut: 62, slope: -5, top: [0, -0.19, 3], bottom: [0, 0.12, -3] },
  { cut: 64, slope: 5, top: [0.06, -0.14, 6], bottom: [0.04, 0.14, -5] },
  { cut: 63, slope: -5, top: [0.12, -0.1, -5], bottom: [0.13, 0.1, 4] },
  { cut: 64, slope: 5, top: [0.18, -0.13, 7], bottom: [0.11, 0.07, -6] },
];

// Monta as peças a partir do texto do elemento (sem JS, o nome aparece inteiro).
function setupPuzzle(word) {
  if (!word) return;
  const letters = [...word.textContent.trim()];
  const center = (letters.length - 1) / 2;
  word.textContent = '';
  letters.forEach((char, i) => {
    const shape = PUZZLE[i % PUZZLE.length];
    const letter = document.createElement('span');
    letter.className = 'hero__letter';
    letter.style.setProperty('--cut', `${shape.cut}%`);
    letter.style.setProperty('--slope', `${shape.slope}%`);
    for (const part of ['top', 'bottom']) {
      const [dx, dy, r] = shape[part];
      const piece = document.createElement('span');
      piece.className = `hero__piece hero__piece--${part}`;
      piece.textContent = char;
      piece.style.cssText = `--dx: ${dx}; --dy: ${dy}; --r: ${r}; --d: ${(0.05 * (center - Math.abs(i - center)) + (part === 'top' ? 0 : 0.03)).toFixed(3)}`;
      letter.append(piece);
    }
    word.append(letter);
  });
}

/* ---------- Coreografia da hero guiada pela rolagem ---------- */

// Afastamento final das flores (fração da largura da hero), rotação (graus) e escala extra.
// Em telas pequenas, o movimento é reduzido.
const FLOWERS = {
  rose: { shift: -0.12, lift: 0.35, angle: -14, grow: 0.06 },
  lily: { shift: 0.12, lift: -0.25, angle: 16, grow: 0.05 },
};
const compact = window.matchMedia('(max-width: 760px)');

function setupParallax(hero) {
  const bg = hero.querySelector('.hero__bg');
  const word = hero.querySelector('[data-puzzle]');
  const layers = {
    product: hero.querySelector('[data-parallax="product"]'),
    rose: hero.querySelector('[data-parallax="rose"]'),
    lily: hero.querySelector('[data-parallax="lily"]'),
    intro: hero.querySelector('[data-parallax="intro"]'),
    note: hero.querySelector('[data-parallax="note"]'),
  };

  let visible = true;
  let frame = 0;

  function render() {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    // 0 com a hero no topo; 1 quando ela termina de sair da tela.
    const progress = clamp(-rect.top / rect.height, 0, 1);
    const range = Math.min(rect.height * 0.12, 110);
    const amount = compact.matches ? 0.65 : 1;
    // Flores e peças completam o movimento quando ainda resta ~¼ da hero na tela.
    const drift = easeInOut(clamp(progress / 0.75, 0, 1));

    bg.style.translate = `0 ${(progress * range * 0.8).toFixed(2)}px`;
    word?.style.setProperty('--t', easeInOut(clamp(progress / 0.8, 0, 1)).toFixed(4));

    // O frasco sobe junto com a página e recua muito pouco: continua sendo o destaque.
    layers.product.style.translate = `0 ${(-progress * range * 0.9).toFixed(2)}px`;
    layers.product.style.scale = (1 - drift * 0.04).toFixed(4);

    for (const name of ['rose', 'lily']) {
      const { shift, lift, angle, grow } = FLOWERS[name];
      const el = layers[name];
      el.style.translate = `${(drift * shift * rect.width * amount).toFixed(2)}px ${(drift * lift * range).toFixed(2)}px`;
      el.style.rotate = `${(drift * angle * amount).toFixed(3)}deg`;
      el.style.scale = (1 + drift * grow).toFixed(4);
    }

    const fade = clamp(1 - progress * 1.6, 0, 1).toFixed(3);
    for (const el of [layers.intro, layers.note]) {
      el.style.translate = `0 ${(-progress * range * 0.45).toFixed(2)}px`;
      el.style.opacity = fade;
    }
  }

  function request() {
    if (visible && !frame) frame = requestAnimationFrame(render);
  }

  function reset() {
    word?.style.removeProperty('--t');
    for (const el of [bg, ...Object.values(layers)]) {
      el.style.translate = '';
      el.style.rotate = '';
      el.style.scale = '';
      el.style.opacity = '';
    }
  }

  // Só calcula enquanto a hero está na tela; fora dela, os elementos ficam parados.
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) request();
  });

  const enable = () => {
    observer.observe(hero);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    request();
  };
  const disable = () => {
    observer.disconnect();
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', request);
    cancelAnimationFrame(frame);
    frame = 0;
    reset();
  };

  if (!reduceMotion.matches) enable();
  reduceMotion.addEventListener('change', (event) => (event.matches ? disable() : enable()));
}

/* ---------- Entrada dos destaques (uma única vez) ---------- */

// Conta de 0 até o valor de data-count, no formato brasileiro (ex.: 4,8).
function countUp(root) {
  const counters = [...root.querySelectorAll('[data-count]')].map((el, i) => {
    const decimals = Number(el.dataset.decimals || 0);
    const format = (value) => value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    // Reserva a largura do valor final para que prefixos e sufixos não se desloquem.
    el.style.minWidth = `${el.getBoundingClientRect().width}px`;
    el.textContent = format(0);
    return { el, format, target: Number(el.dataset.count), final: format(Number(el.dataset.count)), delay: i * 140 };
  });
  if (!counters.length) return;

  const duration = 1700;
  const start = performance.now();
  const tick = (now) => {
    let running = false;
    for (const c of counters) {
      const t = clamp((now - start - c.delay) / duration, 0, 1);
      if (t < 1) {
        c.el.textContent = c.format(c.target * easeOut(t));
        running = true;
      } else if (c.el.style.minWidth) {
        c.el.textContent = c.final;
        c.el.style.minWidth = ''; // libera a largura reservada (o tamanho acompanha a tela)
      }
    }
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupReveal() {
  const groups = [...document.querySelectorAll('[data-reveal]')];
  const show = (el) => el.classList.add('is-visible');

  if (reduceMotion.matches || !('IntersectionObserver' in window)) return groups.forEach(show);

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      countUp(entry.target);
      observer.unobserve(entry.target);
    }
    if (groups.every((el) => el.classList.contains('is-visible'))) observer.disconnect();
  }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });

  // O nome do rodapé é baixo no celular e fica colado ao fim da página: com a margem de -8%
  // ele nunca atingia 35% visível. Aqui basta metade dele aparecer, sem margem.
  const end = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      show(entry.target);
      end.unobserve(entry.target);
    }
  }, { threshold: 0.5 });

  groups.forEach((el) => (el.matches('.footer__word') ? end : observer).observe(el));
}

/* ---------- Fragrâncias: troca guiada pela rolagem ---------- */

// Fração do percurso usada para a vitrine crescer até a tela cheia.
const SCENTS_GROW = 0.22;
// Margem lateral da vitrine compacta — mesmo cálculo de --safe no CSS: clamp(14px, 3vw, 48px).
const scentsSafe = () => clamp(window.innerWidth * 0.03, 14, 48);

function setupScents() {
  const section = document.querySelector('.scents__track');
  if (!section) return;
  const frame = section.querySelector('.scents__frame');

  const items = [...section.querySelectorAll('.scent')];
  let active = -1;
  let raf = 0;

  const setActive = (index) => {
    if (index === active) return;
    active = index;
    items.forEach((el, i) => {
      el.classList.toggle('is-active', i === index);
      el.classList.toggle('is-past', i < index);
    });
  };

  // A seção é mais alta que a tela e o palco fica fixo (sticky) durante o percurso:
  // primeiro a vitrine cresce; o restante é dividido igualmente entre as fragrâncias.
  const render = () => {
    raf = 0;
    const rect = section.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? clamp(-rect.top / travel, 0, 0.999) : 0;
    const still = reduceMotion.matches;
    const grow = still ? 1 : easeInOut(clamp(progress / SCENTS_GROW, 0, 1));
    const start = 1 - (2 * scentsSafe()) / window.innerWidth;

    frame.style.setProperty('--grow', grow.toFixed(4));
    frame.style.setProperty('--frame', (start + (1 - start) * grow).toFixed(4));
    frame.style.setProperty('--p', still ? '0' : progress.toFixed(4));
    setActive(clamp(Math.floor(((progress - SCENTS_GROW) / (1 - SCENTS_GROW)) * items.length), 0, items.length - 1));
  };
  const request = () => {
    if (!raf) raf = requestAnimationFrame(render);
  };

  render();
  const observer = new IntersectionObserver(([entry]) => {
    const method = entry.isIntersecting ? 'addEventListener' : 'removeEventListener';
    window[method]('scroll', request, { passive: true });
    window[method]('resize', request);
    if (entry.isIntersecting) request();
  });
  observer.observe(section);
}

/* ---------- Novidades: filtros e favoritos ---------- */

/* ---------- Campanha: expansão automática ao entrar na tela ---------- */

function setupCampaign() {
  const section = document.querySelector('.campaign');
  if (!section || reduceMotion.matches || !('IntersectionObserver' in window)) return;

  section.classList.add('is-armed');
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    // Um quadro com o estado inicial pintado garante que a transição de 3s aconteça.
    requestAnimationFrame(() => requestAnimationFrame(() => section.classList.add('is-open')));
  }, { threshold: 0.45 });
  observer.observe(section);
}

const FAVORITES_KEY = 'giovanna-baby:favoritos';

function setupNews() {
  const section = document.querySelector('.news');
  if (!section) return;
  const grid = section.querySelector('.news__grid');
  const chips = [...section.querySelectorAll('.chip')];
  const cards = [...grid.querySelectorAll('.pcard')];
  const empty = section.querySelector('.news__empty');
  const matches = (card, filter) => filter === 'todos' || card.dataset.category.split(' ').includes(filter);

  for (const chip of chips) {
    const total = cards.filter((card) => matches(card, chip.dataset.filter)).length;
    chip.querySelector('.chip__count').textContent = String(total).padStart(2, '0');
  }

  // Alterna a altura das colunas pares entre os cards visíveis.
  let columns = 0;
  const stagger = (force) => {
    const count = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    if (count === columns && !force) return;
    columns = count;
    cards.filter((card) => !card.hidden).forEach((card, i) => card.classList.toggle('is-low', (i % count) % 2 === 1));
  };

  // Cortina: cada card é revelado de baixo para cima quando entra na tela, uma única vez.
  let curtain = null;
  const showAll = () => {
    cards.forEach((card) => card.classList.add('is-shown'));
    curtain?.disconnect();
    curtain = null;
  };
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    grid.classList.add('is-curtain');
    curtain = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
      entering.forEach((card, i) => {
        card.style.setProperty('--delay', `${i * 0.16}s`);
        card.classList.add('is-shown');
        curtain.unobserve(card);
      });
      if (cards.every((card) => card.classList.contains('is-shown'))) showAll();
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    cards.forEach((card) => curtain.observe(card));
  }

  // Filtro por categoria e, opcionalmente, busca por texto (usada pela lupa do header e pelo rodapé).
  const emptyText = empty.textContent;
  const apply = (filter, query = '') => {
    if (curtain) showAll(); // usar um filtro encerra a cortina; a troca usa a entrada própria
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(!terms.length && chip.dataset.filter === filter));
    for (const card of cards) {
      const text = normalize(card.textContent);
      const show = matches(card, filter) && terms.every((term) => text.includes(term));
      card.hidden = !show;
      card.classList.remove('is-entering');
      if (show) visible += 1;
    }
    empty.hidden = visible > 0;
    empty.textContent = terms.length ? `Nenhum produto encontrado para “${query.trim()}”.` : emptyText;
    stagger(true);
    if (!reduceMotion.matches) {
      void grid.offsetWidth; // reinicia a animação de entrada
      cards.forEach((card) => !card.hidden && card.classList.add('is-entering'));
    }
  };

  chips.forEach((chip) => chip.addEventListener('click', () => apply(chip.dataset.filter)));
  grid.addEventListener('animationend', (event) => event.target.classList.remove('is-entering'));

  let frame = 0;
  window.addEventListener('resize', () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; stagger(false); });
  });
  stagger(true);

  // Favoritos ficam salvos neste navegador.
  let favorites = new Set();
  try { favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []); } catch {}
  for (const button of section.querySelectorAll('.pcard__fav')) {
    const id = button.dataset.fav;
    const name = button.getAttribute('aria-label').replace(/^Favoritar /, '');
    const render = () => {
      const on = favorites.has(id);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', `${on ? 'Remover dos favoritos' : 'Favoritar'} ${name}`);
    };
    button.addEventListener('click', () => {
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      render();
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch {}
    });
    render();
  }

  // Links de outras áreas que abrem a vitrine já filtrada (data-news-filter / data-news-search).
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-news-filter], [data-news-search]');
    if (link) apply(link.dataset.newsFilter || 'todos', link.dataset.newsSearch || '');
  });

  return { apply };
}

/* ---------- Menu (celular) ---------- */

function setupMenu() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Fechar' : 'Menu';
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

// Ignora acentos e maiúsculas ao filtrar a vitrine de novidades.
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/* ---------- Navegação ativa e WhatsApp ---------- */

function setupActiveNav() {
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const targets = links.map((link) => document.querySelector(link.getAttribute('href')));

  // Ativa a última seção cujo topo já passou de 45% da tela (ou a última, no fim da página).
  const update = () => {
    const line = window.innerHeight * 0.45;
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    let current = 0;
    targets.forEach((target, i) => {
      if (target && target.getBoundingClientRect().top <= line) current = i;
    });
    if (atEnd) current = targets.length - 1;
    links.forEach((link, i) => {
      if (i === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  };

  let frame = 0;
  const request = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); });
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

function setupPendingLinks() {
  for (const link of document.querySelectorAll('[data-link]')) {
    const url = PENDING_LINKS[link.dataset.link];
    if (url) {
      link.href = url;
      link.removeAttribute('aria-disabled');
      if (/^https?:/.test(url)) {
        link.target = '_blank';
        link.rel = 'noopener';
      }
    } else {
      link.setAttribute('role', 'link');
      link.setAttribute('aria-disabled', 'true');
    }
  }
}

function setupWhatsApp() {
  if (!WHATSAPP_NUMBER) return;
  for (const link of document.querySelectorAll('[data-whatsapp]')) {
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    link.target = '_blank';
    link.rel = 'noopener';
  }
}

/* ---------- Início ---------- */

const hero = document.querySelector('.hero');
setupPuzzle(hero.querySelector('[data-puzzle]'));
revealHero(hero);
setupParallax(hero);
setupReveal();
setupScents();
const news = setupNews();
setupCampaign();
setupMenu();
setupActiveNav();
setupWhatsApp();
setupPendingLinks();
