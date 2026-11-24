/**
 * Prism Hub Interactive Controller
 * Manages all interactive buttons, modals, audio synth, and live PokéAPI integrations on the Home view.
 */

// Trivia database
const TRIVIA_LIST = [
  "Pikachu and Meowth have reversed Pokédex numbers (#25 and #52), symbolizing the eternal rivalry between mouse and cat!",
  "Rhydon was the very first Pokémon designed by Game Freak's Ken Sugimori.",
  "Poliwag's swirl resembles the visible spiral intestines of real-world tadpoles.",
  "Ditto and Mew share the exact same weight (8.8 lbs), base stats across the board, and shiny color scheme (light blue).",
  "Wobbuffet's main body is actually a decoy; its mysterious black tail with two eyes is believed to be the true sentient creature!",
  "Slowbro is the only Pokémon known that can devolve if the Shellder bites off its tail.",
  "Magikarp is inspired by the Asian carp legend that dragons are born when a carp successfully leaps over the Dragon Gate waterfall.",
  "Gengar is thought by many fans to be the ghost / shadow counterpart of Clefable.",
  "Spinda has over 4 billion unique spot combinations, making each individual specimen practically one-of-a-kind."
];

let triviaIndex = 0;
let soundEnabled = false;

// Audio Synthesizer using Web Audio API
const audioCtx = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

function playTone(freq, type = 'sine', duration = 0.15) {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio tone error:', e);
  }
}

// Toast Notifications
function showToast(message, icon = '✨') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  playTone(587.33, 'triangle', 0.12); // D5 chime

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Modals controller
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    playTone(440, 'sine', 0.15); // A4
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    playTone(329.63, 'sine', 0.15); // E4
  }
}

// Close on background click and Escape
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal-overlay').classList.remove('active');
  });
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// Specimen Fetcher for Modal
async function inspectPokemonModal(identifier) {
  openModal('modal-specimen');
  const titleEl = document.getElementById('modal-specimen-title');
  const contentEl = document.getElementById('modal-specimen-content');

  titleEl.textContent = 'Scanning Specimen...';
  contentEl.innerHTML = `
    <div style="font-size: 2.5rem; margin-bottom: 1rem; animation: spinSlow 2s linear infinite;">🌀</div>
    <p style="color: var(--text-muted);">Retrieving biometric telemetry from PokéAPI...</p>
  `;

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${identifier}`);
    if (!res.ok) throw new Error('Specimen lookup failed.');
    const p = await res.json();

    const artwork = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const formattedId = '#' + String(p.id).padStart(4, '0');

    titleEl.innerHTML = `${formattedId} <span class="text-gradient-rainbow">${p.name.toUpperCase()}</span>`;
    contentEl.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <img src="${artwork}" alt="${p.name}" style="max-width: 180px; max-height: 180px; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));">
        <div style="display: flex; gap: 0.5rem;">
          ${p.types.map(t => `<span class="card-badge" style="background: var(--grad-rainbow); color: #000; font-weight: 800;">${t.type.name.toUpperCase()}</span>`).join('')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; margin-top: 1rem; text-align: left; background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 16px;">
          <div><strong>Height:</strong> ${(p.height / 10).toFixed(1)} m</div>
          <div><strong>Weight:</strong> ${(p.weight / 10).toFixed(1)} kg</div>
          <div><strong>Base EXP:</strong> ${p.base_experience || '---'} XP</div>
          <div><strong>Base Total:</strong> ${p.stats.reduce((a, b) => a + b.base_stat, 0)} BST</div>
        </div>
        <div style="display: flex; gap: 0.75rem; margin-top: 1rem; width: 100%;">
          <button type="button" class="action-btn btn-grad-1" style="flex: 1;" onclick="saveToFavorites('${p.name}', ${p.id}, '${artwork}')">
            ❤️ Save to Collection
          </button>
          <a href="../api/index.html?pokemon=${encodeURIComponent(p.name)}" class="action-btn btn-grad-3" style="flex: 1; text-align: center;">
            ⚡ Inspect in Pokédex
          </a>
        </div>
      </div>
    `;
    showToast(`Loaded ${p.name.toUpperCase()} telemetry!`, '⚡');
  } catch (err) {
    titleEl.textContent = 'Connection Anomaly';
    contentEl.innerHTML = `
      <p style="color: #ff4e50;">Could not establish communication with PokéAPI neural node.</p>
      <button type="button" class="action-btn btn-grad-2" style="margin-top: 1rem;" onclick="inspectPokemonModal(${Math.floor(Math.random() * 1025) + 1})">Try Another Specimen</button>
    `;
  }
}

// Favorites Collection Management
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('prism_pokedex_favorites') || '[]');
  } catch {
    return [];
  }
}

function saveToFavorites(name, id, artwork) {
  const favs = getFavorites();
  if (favs.some(f => f.id === id)) {
    showToast(`${name.toUpperCase()} is already in your collection!`, '⭐');
    return;
  }
  favs.push({ name, id, artwork });
  localStorage.setItem('prism_pokedex_favorites', JSON.stringify(favs));
  showToast(`Added ${name.toUpperCase()} to your saved collection!`, '❤️');
  renderCollection();
}

function removeFavorite(id) {
  let favs = getFavorites();
  favs = favs.filter(f => f.id !== id);
  localStorage.setItem('prism_pokedex_favorites', JSON.stringify(favs));
  showToast('Removed Pokémon from collection.', '🗑️');
  renderCollection();
}

function clearFavorites() {
  if (confirm('Clear your entire saved collection?')) {
    localStorage.removeItem('prism_pokedex_favorites');
    showToast('Collection cleared.', '🧹');
    renderCollection();
  }
}

function renderCollection() {
  const container = document.getElementById('collection-list-container');
  if (!container) return;
  const favs = getFavorites();

  if (favs.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No Pokémon saved yet. Discover Pokémon and click "Save to Collection"!</p>';
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem;">
      ${favs.map(f => `
        <div style="background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
          <img src="${f.artwork}" alt="${f.name}" style="width: 70px; height: 70px; object-fit: contain;">
          <strong style="text-transform: capitalize; margin: 0.5rem 0; font-size: 0.85rem;">${f.name}</strong>
          <div style="display: flex; gap: 0.35rem; width: 100%;">
            <button type="button" class="btn-rainbow-sm" style="flex: 1; padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="inspectPokemonModal('${f.name}')">View</button>
            <button type="button" class="icon-btn" style="width: 28px; height: 28px; font-size: 0.7rem; border-radius: 6px;" onclick="removeFavorite(${f.id})" title="Remove">✕</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// DOM Setup & Action Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Sound toggle button
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
      soundBtn.title = soundEnabled ? 'Sound Enabled' : 'Sound Muted';
      showToast(soundEnabled ? 'Synthesizer Audio Enabled!' : 'Audio Muted', soundEnabled ? '🎵' : '🔇');
      if (soundEnabled) playTone(523.25, 'sine', 0.2);
    });
  }

  // Palette Shuffle
  const paletteBtn = document.getElementById('palette-shuffle-btn');
  if (paletteBtn) {
    paletteBtn.addEventListener('click', () => {
      const hues = [0, 45, 90, 140, 200, 260, 310];
      const randomHue = hues[Math.floor(Math.random() * hues.length)];
      document.body.style.filter = `hue-rotate(${randomHue}deg)`;
      showToast(`Applied Prism Shift (+${randomHue}°)!`, '🎨');
      playTone(659.25, 'triangle', 0.15);
    });
  }

  // Quick Discover Button
  const quickDiscoverBtn = document.getElementById('btn-quick-discover');
  if (quickDiscoverBtn) {
    quickDiscoverBtn.addEventListener('click', () => {
      const randomId = Math.floor(Math.random() * 1025) + 1;
      inspectPokemonModal(randomId);
    });
  }

  // Daily Discovery Button
  const dailyBtn = document.getElementById('btn-daily-discovery');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', () => {
      // Seed of day based on date
      const today = new Date();
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
      const dailyId = (seed % 1025) + 1;
      showToast('Computing Daily Astral Specimen...', '⭐');
      inspectPokemonModal(dailyId);
    });
  }

  // Explore Types Button (scrolls to matrix)
  const exploreTypesBtn = document.getElementById('btn-explore-types');
  if (exploreTypesBtn) {
    exploreTypesBtn.addEventListener('click', () => {
      document.getElementById('section-type-explorer')?.scrollIntoView({ behavior: 'smooth' });
      showToast('Navigated to Elemental Matrix!', '🔥');
    });
  }

  // My Collection Button
  const collectionBtn = document.getElementById('btn-open-collection');
  if (collectionBtn) {
    collectionBtn.addEventListener('click', () => {
      renderCollection();
      openModal('modal-collection');
    });
  }

  const clearColBtn = document.getElementById('btn-clear-collection');
  if (clearColBtn) {
    clearColBtn.addEventListener('click', clearFavorites);
  }

  // Fun Facts Button
  const funFactsBtn = document.getElementById('btn-fun-facts');
  if (funFactsBtn) {
    funFactsBtn.addEventListener('click', () => {
      document.getElementById('trivia-text-box')?.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('btn-next-trivia')?.click();
    });
  }

  // About Project Button
  const aboutBtn = document.getElementById('btn-about-project');
  if (aboutBtn) {
    aboutBtn.addEventListener('click', () => {
      openModal('modal-about');
    });
  }
  const footerAboutBtn = document.getElementById('footer-about-btn');
  if (footerAboutBtn) {
    footerAboutBtn.addEventListener('click', () => openModal('modal-about'));
  }

  // Trivia Next Button
  const nextTriviaBtn = document.getElementById('btn-next-trivia');
  const triviaBox = document.getElementById('trivia-text-box');
  if (nextTriviaBtn && triviaBox) {
    nextTriviaBtn.addEventListener('click', () => {
      triviaIndex = (triviaIndex + 1) % TRIVIA_LIST.length;
      triviaBox.style.opacity = '0';
      setTimeout(() => {
        triviaBox.textContent = TRIVIA_LIST[triviaIndex];
        triviaBox.style.opacity = '1';
      }, 150);
      showToast('Generated fresh Pokémon lore!', '💡');
    });
  }

  // Copy Trivia Button
  const copyTriviaBtn = document.getElementById('btn-copy-trivia');
  if (copyTriviaBtn && triviaBox) {
    copyTriviaBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(triviaBox.textContent.trim())
        .then(() => showToast('Fact copied to clipboard!', '📋'))
        .catch(() => showToast('Could not copy fact.', '⚠️'));
    });
  }

  const footerFactBtn = document.getElementById('footer-fact-btn');
  if (footerFactBtn && nextTriviaBtn) {
    footerFactBtn.addEventListener('click', () => nextTriviaBtn.click());
  }

  // Radar Scan Button
  const radarScanBtn = document.getElementById('btn-dock-scan');
  const radarBox = document.getElementById('radar-specimen-box');
  if (radarScanBtn && radarBox) {
    radarScanBtn.addEventListener('click', async () => {
      radarBox.innerHTML = '<em>⚡ Sweeping frequencies with PokéAPI...</em>';
      const randomId = Math.floor(Math.random() * 1025) + 1;
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const p = await res.json();
        radarBox.innerHTML = `
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${p.sprites?.front_default || ''}" alt="${p.name}" style="width: 55px; height: 55px;">
            <div>
              <strong>#${String(p.id).padStart(4, '0')} ${p.name.toUpperCase()}</strong><br>
              <small style="color: var(--text-muted);">Types: ${p.types.map(t => t.type.name).join(', ')} • BST: ${p.stats.reduce((a, b) => a + b.base_stat, 0)}</small>
            </div>
            <button type="button" class="btn-rainbow-sm" style="margin-left: auto;" onclick="inspectPokemonModal(${p.id})">Analyze</button>
          </div>
        `;
        showToast(`Radar picked up ${p.name.toUpperCase()}!`, '📡');
      } catch {
        radarBox.textContent = 'Radar signal lost in the ionosphere. Retry soon!';
      }
    });
  }

  // Random Type Button
  const randomTypeBtn = document.getElementById('btn-random-type');
  if (randomTypeBtn) {
    randomTypeBtn.addEventListener('click', () => {
      const typeBtns = document.querySelectorAll('.type-pill-btn');
      const randomChoice = typeBtns[Math.floor(Math.random() * typeBtns.length)];
      if (randomChoice) randomChoice.click();
    });
  }

  // Type matrix pill clicks -> queries PokéAPI for that type!
  document.querySelectorAll('.type-pill-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const typeName = btn.getAttribute('data-type');
      showToast(`Querying ${typeName.toUpperCase()} type database...`, '🔥');
      openModal('modal-specimen');

      const titleEl = document.getElementById('modal-specimen-title');
      const contentEl = document.getElementById('modal-specimen-content');
      titleEl.innerHTML = `Elemental Class: <span class="text-gradient-rainbow">${typeName.toUpperCase()}</span>`;
      contentEl.innerHTML = '<p>Retrieving specimen roster...</p>';

      try {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${typeName}`);
        const typeData = await res.json();
        const pokemonList = typeData.pokemon.slice(0, 12); // take first 12

        contentEl.innerHTML = `
          <p style="color: var(--text-muted); margin-bottom: 1.25rem;">Found ${typeData.pokemon.length} Pokémon belonging to the <strong>${typeName}</strong> classification. Click any specimen to inspect:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.75rem;">
            ${pokemonList.map(item => `
              <button type="button" class="btn-rainbow-sm" style="padding: 0.6rem 0.4rem; text-align: center; text-transform: capitalize; justify-content: center; font-size: 0.78rem;" onclick="inspectPokemonModal('${item.pokemon.name}')">
                ${item.pokemon.name}
              </button>
            `).join('')}
          </div>
          <div style="margin-top: 1.5rem; text-align: center;">
            <a href="../api/index.html" class="action-btn btn-grad-3">Open Full Pokédex Search</a>
          </div>
        `;
      } catch (e) {
        contentEl.innerHTML = '<p style="color: #ff4e50;">Could not retrieve type list from PokéAPI.</p>';
      }
    });
  });

  // FAB Random Trigger
  const fabBtn = document.getElementById('fab-random-trigger');
  if (fabBtn) {
    fabBtn.addEventListener('click', () => {
      const randomId = Math.floor(Math.random() * 1025) + 1;
      inspectPokemonModal(randomId);
    });
  }
});
