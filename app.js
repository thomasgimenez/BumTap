// === Estado de la app ===
let sounds = [];
let currentAudio = null;
let currentBtnEl = null;
let activeFilter = 'all';
let searchQuery = '';
let favorites = [];
let customCategories = [];
let longPressTriggered = false;

// === Elementos del DOM ===
const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');

// === Datos: Favoritos ===
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('favorites')) || [];
  } catch { return []; }
}

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function toggleFavorite(soundId) {
  const idx = favorites.indexOf(soundId);
  if (idx === -1) {
    favorites.push(soundId);
  } else {
    favorites.splice(idx, 1);
  }
  saveFavorites();
}

function isFavorite(soundId) {
  return favorites.includes(soundId);
}

// === Datos: Categorías personalizadas ===
function getCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem('customCategories')) || [];
  } catch { return []; }
}

function saveCustomCategories() {
  localStorage.setItem('customCategories', JSON.stringify(customCategories));
}

function createCategory(name) {
  const cat = {
    id: 'cat_' + Date.now(),
    name: name.trim(),
    soundIds: []
  };
  customCategories.push(cat);
  saveCustomCategories();
  return cat;
}

function deleteCategory(catId) {
  customCategories = customCategories.filter((c) => c.id !== catId);
  saveCustomCategories();
  if (activeFilter === catId) {
    activeFilter = 'all';
  }
}

function toggleSoundInCategory(catId, soundId) {
  const cat = customCategories.find((c) => c.id === catId);
  if (!cat) return;
  const idx = cat.soundIds.indexOf(soundId);
  if (idx === -1) {
    cat.soundIds.push(soundId);
  } else {
    cat.soundIds.splice(idx, 1);
  }
  saveCustomCategories();
}

// === Inicialización ===
async function init() {
  favorites = getFavorites();
  customCategories = getCustomCategories();

  try {
    const res = await fetch('sounds.json');
    sounds = await res.json();
    sounds.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    render();
    renderFilterPopup();
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
    let matchesCategory;
    if (activeFilter === 'all') {
      matchesCategory = true;
    } else if (activeFilter === 'favorites') {
      matchesCategory = isFavorite(s.id);
    } else if (activeFilter.startsWith('cat_')) {
      const cat = customCategories.find((c) => c.id === activeFilter);
      matchesCategory = cat ? cat.soundIds.includes(s.id) : false;
    } else {
      matchesCategory = s.category === activeFilter;
    }
    const matchesSearch = s.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

// === Renderizado ===
function render() {
  const filtered = getFilteredSounds();
  grid.innerHTML = '';

  if (filtered.length === 0) {
    let msg = 'No se encontraron sonidos';
    if (activeFilter === 'favorites') msg = 'No tenés favoritos todavía';
    else if (activeFilter.startsWith('cat_')) msg = 'Esta categoría está vacía';
    grid.innerHTML = '<div class="empty-state">' + msg + '</div>';
    return;
  }

  const gruvColors = ['#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#fe8019'];

  filtered.forEach((sound, i) => {
    const btn = document.createElement('button');
    btn.className = 'sound-btn';
    btn.dataset.initial = sound.label.replace(/[^\w]/g, '').charAt(0);
    btn.style.setProperty('--initial-color', gruvColors[i % gruvColors.length]);

    // Texto del label
    const labelSpan = document.createElement('span');
    labelSpan.className = 'sound-label';
    labelSpan.textContent = sound.label;
    btn.appendChild(labelSpan);

    // Estrella de favorito
    if (isFavorite(sound.id)) {
      const star = document.createElement('span');
      star.className = 'fav-star';
      star.textContent = '\u2605';
      btn.appendChild(star);
    }

    // Click para reproducir
    btn.addEventListener('click', () => {
      if (longPressTriggered) return;
      playSound(sound, btn);
    });

    // Long-press para bottom sheet
    let pressTimer = null;
    const startPress = (e) => {
      longPressTriggered = false;
      pressTimer = setTimeout(() => {
        longPressTriggered = true;
        openBottomSheet(sound);
      }, 500);
    };
    const cancelPress = () => {
      clearTimeout(pressTimer);
    };

    btn.addEventListener('pointerdown', startPress);
    btn.addEventListener('pointerup', cancelPress);
    btn.addEventListener('pointerleave', cancelPress);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());

    grid.appendChild(btn);
  });
}

// === Popup de Filtros (dinámico) ===
function renderFilterPopup() {
  const popup = filterPopup;
  popup.innerHTML = '';

  // Filtros fijos
  const fixed = [
    { filter: 'all', label: 'Todos' },
    { filter: 'meme', label: 'Memes' },
    { filter: 'sfx', label: 'SFX' },
    { filter: 'favorites', label: '\u2605 Favoritos' }
  ];

  fixed.forEach(({ filter, label }) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (activeFilter === filter ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => setFilter(filter));
    popup.appendChild(btn);
  });

  // Separador y categorías custom (si hay)
  if (customCategories.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'filter-divider';
    popup.appendChild(divider);

    customCategories.forEach((cat) => {
      const item = document.createElement('div');
      item.className = 'filter-cat-item';

      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (activeFilter === cat.id ? ' active' : '');
      btn.textContent = cat.name;
      btn.addEventListener('click', () => setFilter(cat.id));
      item.appendChild(btn);

      const del = document.createElement('button');
      del.className = 'filter-cat-delete';
      del.textContent = '\u00D7';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Eliminar categoría "' + cat.name + '"?')) {
          deleteCategory(cat.id);
          renderFilterPopup();
          render();
        }
      });
      item.appendChild(del);

      popup.appendChild(item);
    });
  }

  // Separador + botón nueva categoría
  const divider2 = document.createElement('div');
  divider2.className = 'filter-divider';
  popup.appendChild(divider2);

  const addBtn = document.createElement('button');
  addBtn.className = 'filter-add-cat';
  addBtn.textContent = '+ Nueva categoría';
  addBtn.addEventListener('click', () => {
    const name = prompt('Nombre de la categoría:');
    if (name && name.trim()) {
      createCategory(name);
      renderFilterPopup();
    }
  });
  popup.appendChild(addBtn);
}

function setFilter(filter) {
  activeFilter = filter;
  render();
  renderFilterPopup();
  filterPopup.hidden = true;
  filterToggle.classList.remove('active');
}

// === Bottom Sheet ===
const bsOverlay = document.getElementById('bs-overlay');
const bottomSheet = document.getElementById('bottom-sheet');
const bsContent = document.getElementById('bs-content');

function openBottomSheet(sound) {
  renderBottomSheet(sound);
  bsOverlay.hidden = false;
  bottomSheet.hidden = false;
  // Forzar reflow para que la transición funcione
  bottomSheet.offsetHeight;
}

function closeBottomSheet() {
  bsOverlay.hidden = true;
  bottomSheet.hidden = true;
}

function renderBottomSheet(sound) {
  bsContent.innerHTML = '';

  const title = document.createElement('div');
  title.className = 'bs-title';
  title.textContent = sound.label;
  bsContent.appendChild(title);

  // Toggle favorito
  const favItem = document.createElement('div');
  favItem.className = 'bs-item';
  const favCheck = document.createElement('div');
  favCheck.className = 'bs-check' + (isFavorite(sound.id) ? ' checked' : '');
  favCheck.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const favLabel = document.createElement('div');
  favLabel.className = 'bs-label';
  favLabel.textContent = '\u2605 Favorito';
  favItem.appendChild(favCheck);
  favItem.appendChild(favLabel);
  favItem.addEventListener('click', () => {
    toggleFavorite(sound.id);
    renderBottomSheet(sound);
    render();
  });
  bsContent.appendChild(favItem);

  // Categorías personalizadas
  customCategories.forEach((cat) => {
    const item = document.createElement('div');
    item.className = 'bs-item';
    const check = document.createElement('div');
    const isIn = cat.soundIds.includes(sound.id);
    check.className = 'bs-check' + (isIn ? ' checked' : '');
    check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    const label = document.createElement('div');
    label.className = 'bs-label';
    label.textContent = cat.name;
    item.appendChild(check);
    item.appendChild(label);
    item.addEventListener('click', () => {
      toggleSoundInCategory(cat.id, sound.id);
      renderBottomSheet(sound);
      render();
    });
    bsContent.appendChild(item);
  });

  // Botón nueva categoría
  const addBtn = document.createElement('button');
  addBtn.className = 'bs-add-cat';
  addBtn.textContent = '+ Nueva categoría';
  addBtn.addEventListener('click', () => {
    const name = prompt('Nombre de la categoría:');
    if (name && name.trim()) {
      const cat = createCategory(name);
      toggleSoundInCategory(cat.id, sound.id);
      renderBottomSheet(sound);
      renderFilterPopup();
      render();
    }
  });
  bsContent.appendChild(addBtn);
}

bsOverlay.addEventListener('click', closeBottomSheet);

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
  if (!isOpen) renderFilterPopup();
});

document.addEventListener('click', (e) => {
  if (!filterPopup.hidden && !filterPopup.contains(e.target)) {
    filterPopup.hidden = true;
    filterToggle.classList.remove('active');
  }
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

// === Tip banner ===
const tipBanner = document.getElementById('tip-banner');
const tipClose = document.getElementById('tip-close');

if (!localStorage.getItem('tipDismissed')) {
  tipBanner.hidden = false;
}

tipClose.addEventListener('click', () => {
  tipBanner.hidden = true;
  localStorage.setItem('tipDismissed', '1');
});

// === Service Worker ===
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newSW = reg.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'activated') {
          window.location.reload();
        }
      });
    });
  }).catch((err) => {
    console.warn('SW registro falló:', err);
  });
}

// === Arranque ===
init();
