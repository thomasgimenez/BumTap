// === Estado de la app ===
let sounds = [];
let currentAudio = null;
let currentBtnEl = null;
let activeFilter = 'all';
let searchQuery = '';

// === Elementos del DOM ===
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const filterBtns = document.querySelectorAll('.filter-btn');

// === Inicialización ===
async function init() {
  try {
    const res = await fetch('sounds.json');
    sounds = await res.json();
    render();
    preloadAudio();
  } catch (err) {
    console.error('Error cargando sounds.json:', err);
    grid.innerHTML = '<div class="empty-state">Error cargando sonidos</div>';
  }
}

// === Pre-carga de audio ===
const audioCache = {};

function preloadAudio() {
  for (const sound of sounds) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = sound.file;
    audioCache[sound.id] = audio;
  }
}

// === Reproducción ===
function playSound(sound, btnEl) {
  // Si el mismo botón se toca de nuevo, reiniciar
  if (currentAudio && currentBtnEl === btnEl) {
    currentAudio.currentTime = 0;
    currentAudio.play();
    return;
  }

  // Detener sonido anterior
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentBtnEl?.classList.remove('playing');
  }

  const audio = audioCache[sound.id] || new Audio(sound.file);
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Ignorar errores de reproducción (archivo no encontrado en dev)
  });

  currentAudio = audio;
  currentBtnEl = btnEl;
  btnEl.classList.add('playing');

  audio.onended = () => {
    btnEl.classList.remove('playing');
    if (currentBtnEl === btnEl) {
      currentAudio = null;
      currentBtnEl = null;
    }
  };
}

// === Filtrado ===
function getFilteredSounds() {
  return sounds.filter((s) => {
    const matchesCategory = activeFilter === 'all' || s.category === activeFilter;
    const matchesSearch = s.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

// === Renderizado ===
function render() {
  const filtered = getFilteredSounds();
  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">No se encontraron sonidos</div>';
    return;
  }

  const gruvColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019'];

  filtered.forEach((sound, i) => {
    const btn = document.createElement('button');
    btn.className = 'sound-btn';
    btn.textContent = sound.label;
    btn.dataset.initial = sound.label.replace(/[^\w]/g, '').charAt(0);
    btn.style.setProperty('--initial-color', gruvColors[i % gruvColors.length]);
    btn.addEventListener('click', () => playSound(sound, btn));
    grid.appendChild(btn);
  });
}

// === Event Listeners ===
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  render();
});

const filterToggle = document.getElementById('filter-toggle');
const filterPopup = document.getElementById('filter-popup');

filterToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = !filterPopup.hidden;
  filterPopup.hidden = isOpen;
  filterToggle.classList.toggle('active', !isOpen);
});

document.addEventListener('click', (e) => {
  if (!filterPopup.hidden && !filterPopup.contains(e.target)) {
    filterPopup.hidden = true;
    filterToggle.classList.remove('active');
  }
});

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    render();
    filterPopup.hidden = true;
    filterToggle.classList.remove('active');
  });
});

// === Layout ===
const layoutModes = ['grid', 'grid-sm', 'list'];
const layoutToggle = document.getElementById('layout-toggle');
const layoutIcons = layoutToggle.querySelectorAll('.icon-layout');

function getLayout() {
  return localStorage.getItem('layout') || 'grid';
}

function applyLayout(mode) {
  grid.className = 'grid layout-' + mode;
  layoutIcons.forEach((icon) => {
    icon.classList.toggle('active', icon.dataset.layout === mode);
  });
  localStorage.setItem('layout', mode);
}

applyLayout(getLayout());

layoutToggle.addEventListener('click', () => {
  const current = getLayout();
  const next = layoutModes[(layoutModes.indexOf(current) + 1) % layoutModes.length];
  applyLayout(next);
});

// === Tema claro/oscuro ===
const themeToggle = document.getElementById('theme-toggle');
const themeColors = { light: '#F5F1EB', dark: '#1C1B19' };

function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) return saved;
  return 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColors[theme]);
  localStorage.setItem('theme', theme);
}

applyTheme(getPreferredTheme());

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// === Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => {
    console.warn('SW registro falló:', err);
  });
}

// === Arranque ===
init();
