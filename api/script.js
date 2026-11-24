/**
 * Pokédex Explorer Full Interactive Cyber Controller
 * Real-time PokéAPI client with comparison dock, favorites, audio synthesizer, dynamic gradient transitions, and responsive controls.
 */

// Dynamic Gradients mapped by elemental type
const TYPE_THEME_GRADIENTS = {
  fire: 'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)',
  water: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  grass: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  electric: 'linear-gradient(135deg, #ffe259 0%, #ffa751 100%)',
  psychic: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
  ice: 'linear-gradient(135deg, #70e1f5 0%, #ffd194 100%)',
  dragon: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)',
  ghost: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  fairy: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  fighting: 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)',
  poison: 'linear-gradient(135deg, #b06ab3 0%, #4568dc 100%)',
  ground: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  flying: 'linear-gradient(135deg, #4ca1af 0%, #c4e0e5 100%)',
  bug: 'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)',
  rock: 'linear-gradient(135deg, #ba8b02 0%, #181818 100%)',
  steel: 'linear-gradient(135deg, #757f9a 0%, #d7dde8 100%)',
  dark: 'linear-gradient(135deg, #232526 0%, #414345 100%)',
  normal: 'linear-gradient(135deg, #8a2387 0%, #e94057 50%, #f27121 100%)'
};

let currentPokemon = null;
let currentId = 1;
let compareSlot1 = null;
let compareSlot2 = null;

// Audio synth instance
const pokedexAudio = window.AudioContext || window.webkitAudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;
let pokedexSoundActive = false;

function triggerSynthSound(freq = 440, duration = 0.15) {
  if (!pokedexSoundActive || !pokedexAudio) return;
  try {
    if (pokedexAudio.state === 'suspended') pokedexAudio.resume();
    const osc = pokedexAudio.createOscillator();
    const gain = pokedexAudio.createGain();
    osc.frequency.setValueAtTime(freq, pokedexAudio.currentTime);
    gain.gain.setValueAtTime(0.08, pokedexAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, pokedexAudio.currentTime + duration);
    osc.connect(gain);
    gain.connect(pokedexAudio.destination);
    osc.start();
    osc.stop(pokedexAudio.currentTime + duration);
  } catch (e) {
    console.warn('Synth sound error:', e);
  }
}

// Fetch Pokémon Data
async function loadPokemon(query) {
  const cleanQuery = String(query).trim().toLowerCase();
  if (!cleanQuery) return;

  const nameEl = document.getElementById('active-pokemon-name');
  if (nameEl) nameEl.textContent = 'SCANNING...';

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${cleanQuery}`);
    if (!res.ok) throw new Error(`Specimen "${query}" not found.`);
    const data = await res.json();
    currentPokemon = data;
    currentId = data.id;

    displayPokemon(data);
    addToHistory(data);
    triggerSynthSound(600, 0.1);
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast(err.message, '⚠️');
    }
    if (nameEl) nameEl.textContent = 'SPECIMEN NOT FOUND';
  }
}

// Display Pokémon into Cyber Pokédex Layout
function displayPokemon(data) {
  // Specimen Header & Basic Data
  const idEl = document.getElementById('active-pokemon-id');
  const nameEl = document.getElementById('active-pokemon-name');
  const imgEl = document.getElementById('active-pokemon-img');
  const heightEl = document.getElementById('active-pokemon-height');
  const weightEl = document.getElementById('active-pokemon-weight');
  const expEl = document.getElementById('active-pokemon-exp');
  const typesRack = document.getElementById('active-pokemon-types');
  const auraDisc = document.getElementById('aura-disc');
  const bstCounter = document.getElementById('bst-counter');

  const formattedId = '#' + String(data.id).padStart(4, '0');
  if (idEl) idEl.textContent = formattedId;
  if (nameEl) nameEl.textContent = data.name.toUpperCase();

  const artwork = 
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.other?.home?.front_default ||
    data.sprites?.front_default ||
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

  if (imgEl) {
    imgEl.src = artwork;
    imgEl.alt = data.name;
  }

  if (heightEl) heightEl.textContent = `${(data.height / 10).toFixed(1)} m`;
  if (weightEl) weightEl.textContent = `${(data.weight / 10).toFixed(1)} kg`;
  if (expEl) expEl.textContent = `${data.base_experience || '---'} XP`;

  // Render Types and update Dynamic Gradient Aura
  if (typesRack) {
    typesRack.innerHTML = '';
    const primaryType = data.types[0]?.type?.name || 'normal';
    const typeGradient = TYPE_THEME_GRADIENTS[primaryType] || TYPE_THEME_GRADIENTS.normal;
    document.documentElement.style.setProperty('--type-gradient-current', typeGradient);

    data.types.forEach(t => {
      const pill = document.createElement('span');
      pill.className = 'type-badge-large';
      pill.textContent = t.type.name;
      pill.style.background = TYPE_THEME_GRADIENTS[t.type.name] || '#444';
      typesRack.appendChild(pill);
    });
  }

  // Update Favorite Button State
  updateFavoriteButtonState();

  // Update Stats Progress Bars & BST
  const statMap = {
    'hp': { val: 'val-hp', bar: 'bar-hp' },
    'attack': { val: 'val-attack', bar: 'bar-attack' },
    'defense': { val: 'val-defense', bar: 'bar-defense' },
    'special-attack': { val: 'val-special-attack', bar: 'bar-special-attack' },
    'special-defense': { val: 'val-special-defense', bar: 'bar-special-defense' },
    'speed': { val: 'val-speed', bar: 'bar-speed' }
  };

  let bst = 0;
  data.stats.forEach(s => {
    const statName = s.stat.name;
    const statVal = s.base_stat;
    bst += statVal;

    const map = statMap[statName];
    if (map) {
      const valEl = document.getElementById(map.val);
      const barEl = document.getElementById(map.bar);
      if (valEl) valEl.textContent = statVal;
      if (barEl) {
        barEl.style.width = '0%';
        const percent = Math.min(100, Math.round((statVal / 255) * 100));
        setTimeout(() => {
          barEl.style.width = `${percent}%`;
        }, 50);
      }
    }
  });

  if (bstCounter) bstCounter.textContent = `BST: ${bst}`;

  // Render Abilities
  const abilitiesContainer = document.getElementById('abilities-container');
  if (abilitiesContainer) {
    abilitiesContainer.innerHTML = '';
    data.abilities.forEach(a => {
      const card = document.createElement('div');
      card.className = 'ability-pill';
      card.innerHTML = `
        <h4>
          <span>${a.ability.name.replace(/-/g, ' ')}</span>
          ${a.is_hidden ? '<span class="card-badge" style="background: var(--grad-pink-purple);">HIDDEN</span>' : ''}
        </h4>
        <p>Genetic ability registered under regional battle database.</p>
      `;
      abilitiesContainer.appendChild(card);
    });
  }
}

// Favorite Management in Pokédex
function updateFavoriteButtonState() {
  const favIcon = document.getElementById('fav-icon');
  const favLabel = document.getElementById('fav-label');
  if (!favIcon || !favLabel || !currentPokemon) return;

  const favs = getFavorites();
  const isFav = favs.some(f => f.id === currentPokemon.id);
  favIcon.textContent = isFav ? '❤️' : '🤍';
  favLabel.textContent = isFav ? 'In Collection' : 'Add Favorite';
}

function toggleCurrentFavorite() {
  if (!currentPokemon) return;
  const favs = getFavorites();
  const index = favs.findIndex(f => f.id === currentPokemon.id);

  const artwork = 
    currentPokemon.sprites?.other?.['official-artwork']?.front_default ||
    currentPokemon.sprites?.front_default || '';

  if (index >= 0) {
    favs.splice(index, 1);
    localStorage.setItem('prism_pokedex_favorites', JSON.stringify(favs));
    showToast(`Removed ${currentPokemon.name.toUpperCase()} from Collection!`, '💔');
  } else {
    favs.push({ name: currentPokemon.name, id: currentPokemon.id, artwork });
    localStorage.setItem('prism_pokedex_favorites', JSON.stringify(favs));
    showToast(`Saved ${currentPokemon.name.toUpperCase()} to Collection!`, '❤️');
  }
  updateFavoriteButtonState();
}

// Recently Viewed History
function addToHistory(pokemon) {
  try {
    let hist = JSON.parse(localStorage.getItem('prism_pokedex_history') || '[]');
    hist = hist.filter(h => h.id !== pokemon.id);
    const artwork = 
      pokemon.sprites?.other?.['official-artwork']?.front_default ||
      pokemon.sprites?.front_default || '';
    hist.unshift({ name: pokemon.name, id: pokemon.id, artwork });
    if (hist.length > 20) hist.pop();
    localStorage.setItem('prism_pokedex_history', JSON.stringify(hist));
  } catch (e) {
    console.warn(e);
  }
}

function renderHistoryModal() {
  const container = document.getElementById('recent-list-container');
  if (!container) return;
  try {
    const hist = JSON.parse(localStorage.getItem('prism_pokedex_history') || '[]');
    if (hist.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No recently scanned specimens.</p>';
      return;
    }
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 1rem;">
        ${hist.map(h => `
          <div style="background: rgba(255,255,255,0.06); border: 1px solid var(--glass-border); border-radius: 16px; padding: 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
            <img src="${h.artwork}" alt="${h.name}" style="width: 70px; height: 70px; object-fit: contain;">
            <strong style="text-transform: capitalize; margin: 0.5rem 0; font-size: 0.85rem;">${h.name}</strong>
            <button type="button" class="btn-rainbow-sm" style="width: 100%; justify-content: center; font-size: 0.75rem;" onclick="loadPokemon(${h.id}); closeModal('modal-recent');">Load</button>
          </div>
        `).join('')}
      </div>
    `;
  } catch {
    container.innerHTML = '<p>Could not load history.</p>';
  }
}

// Comparison Tray Controller
function addToComparison() {
  if (!currentPokemon) return;
  const artwork = currentPokemon.sprites?.other?.['official-artwork']?.front_default || currentPokemon.sprites?.front_default || '';

  if (!compareSlot1) {
    compareSlot1 = { ...currentPokemon, artwork };
    showToast(`Slot 1 filled with ${currentPokemon.name.toUpperCase()}!`, '⚖️');
  } else if (!compareSlot2) {
    compareSlot2 = { ...currentPokemon, artwork };
    showToast(`Slot 2 filled with ${currentPokemon.name.toUpperCase()}!`, '⚖️');
  } else {
    compareSlot1 = { ...currentPokemon, artwork };
    showToast(`Replaced Slot 1 with ${currentPokemon.name.toUpperCase()}!`, '⚖️');
  }

  updateComparisonTray();
  document.getElementById('comparison-tray')?.classList.add('visible');
}

function updateComparisonTray() {
  const slot1El = document.getElementById('slot-1');
  const slot2El = document.getElementById('slot-2');

  if (slot1El) {
    if (compareSlot1) {
      slot1El.className = 'compare-slot filled';
      slot1El.innerHTML = `<img src="${compareSlot1.artwork}" style="width: 32px; height: 32px;"> <span>${compareSlot1.name.toUpperCase()}</span>`;
    } else {
      slot1El.className = 'compare-slot';
      slot1El.textContent = 'Slot 1 Empty';
    }
  }

  if (slot2El) {
    if (compareSlot2) {
      slot2El.className = 'compare-slot filled';
      slot2El.innerHTML = `<img src="${compareSlot2.artwork}" style="width: 32px; height: 32px;"> <span>${compareSlot2.name.toUpperCase()}</span>`;
    } else {
      slot2El.className = 'compare-slot';
      slot2El.textContent = 'Slot 2 Empty';
    }
  }
}

function runComparisonModal() {
  if (!compareSlot1 || !compareSlot2) {
    showToast('Please add TWO Pokémon to the comparison dock first!', '⚠️');
    return;
  }

  const modalBody = document.getElementById('comparison-results-body');
  if (!modalBody) return;

  const bst1 = compareSlot1.stats.reduce((a, b) => a + b.base_stat, 0);
  const bst2 = compareSlot2.stats.reduce((a, b) => a + b.base_stat, 0);

  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; text-align: center;">
      <!-- Specimen 1 -->
      <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 20px;">
        <img src="${compareSlot1.artwork}" style="max-width: 140px; max-height: 140px;">
        <h3 class="text-gradient-rainbow" style="margin-top: 0.5rem;">${compareSlot1.name.toUpperCase()}</h3>
        <p style="color: var(--text-muted);">#${String(compareSlot1.id).padStart(4, '0')}</p>
        <div style="margin-top: 1rem; font-weight: 800; font-size: 1.2rem;">BST: ${bst1}</div>
      </div>

      <!-- Specimen 2 -->
      <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 20px;">
        <img src="${compareSlot2.artwork}" style="max-width: 140px; max-height: 140px;">
        <h3 class="text-gradient-cyan" style="margin-top: 0.5rem;">${compareSlot2.name.toUpperCase()}</h3>
        <p style="color: var(--text-muted);">#${String(compareSlot2.id).padStart(4, '0')}</p>
        <div style="margin-top: 1rem; font-weight: 800; font-size: 1.2rem;">BST: ${bst2}</div>
      </div>
    </div>

    <!-- Comparative Stats Rows -->
    <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 0.75rem;">
      ${compareSlot1.stats.map((s, idx) => {
        const s2Val = compareSlot2.stats[idx]?.base_stat || 0;
        const s1Val = s.base_stat;
        const winner = s1Val > s2Val ? '1' : s1Val < s2Val ? '2' : 'tie';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.04); padding: 0.75rem 1.25rem; border-radius: 12px; font-weight: 800;">
            <span style="color: ${winner === '1' ? '#76ff03' : '#fff'}; width: 60px;">${s1Val}</span>
            <span style="color: var(--text-muted); text-transform: uppercase;">${s.stat.name}</span>
            <span style="color: ${winner === '2' ? '#76ff03' : '#fff'}; width: 60px; text-align: right;">${s2Val}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  openModal('modal-comparison');
}

// Event Bindings
document.addEventListener('DOMContentLoaded', () => {
  // Search Form
  const searchForm = document.getElementById('pokedex-search-form');
  const searchInput = document.getElementById('pokedex-input');
  const clearBtn = document.getElementById('clear-search-btn');

  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loadPokemon(searchInput.value);
    });

    searchInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
      });
    }
  }

  // Random Buttons
  document.getElementById('btn-random-pokemon')?.addEventListener('click', () => {
    loadPokemon(Math.floor(Math.random() * 1025) + 1);
  });

  document.getElementById('btn-surprise-me')?.addEventListener('click', () => {
    const surprises = [150, 249, 384, 487, 493, 643, 716, 792, 888, 1000];
    const pick = surprises[Math.floor(Math.random() * surprises.length)];
    loadPokemon(pick);
    showToast('Summoned Legendary Specimen!', '✨');
  });

  document.getElementById('btn-daily-pick')?.addEventListener('click', () => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const dailyId = (seed % 1025) + 1;
    loadPokemon(dailyId);
    showToast('Loaded Universal Daily Pick!', '⭐');
  });

  // Previous and Next
  document.getElementById('btn-prev-specimen')?.addEventListener('click', () => {
    loadPokemon(currentId > 1 ? currentId - 1 : 1025);
  });

  document.getElementById('btn-next-specimen')?.addEventListener('click', () => {
    loadPokemon(currentId < 1025 ? currentId + 1 : 1);
  });

  // Presets scroller buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      loadPokemon(btn.getAttribute('data-id'));
    });
  });

  // Left panel actions
  document.getElementById('btn-toggle-favorite')?.addEventListener('click', toggleCurrentFavorite);
  document.getElementById('btn-add-compare')?.addEventListener('click', addToComparison);

  document.getElementById('btn-share-specimen')?.addEventListener('click', () => {
    if (!currentPokemon) return;
    const shareText = `Pokémon #${currentPokemon.id} ${currentPokemon.name.toUpperCase()} (BST: ${currentPokemon.stats.reduce((a, b) => a + b.base_stat, 0)})`;
    navigator.clipboard.writeText(shareText)
      .then(() => showToast('Specimen data copied to clipboard!', '📋'))
      .catch(() => showToast('Could not copy data.', '⚠️'));
  });

  document.getElementById('btn-spin-again')?.addEventListener('click', () => {
    loadPokemon(Math.floor(Math.random() * 1025) + 1);
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById(target)?.classList.add('active');
      triggerSynthSound(500, 0.08);
    });
  });

  // Cry and sound synthesis buttons
  document.getElementById('btn-play-cry')?.addEventListener('click', () => {
    if (!currentPokemon) return;
    const cryUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${currentPokemon.id}.ogg`;
    const audio = new Audio(cryUrl);
    audio.play()
      .then(() => showToast(`Playing ${currentPokemon.name.toUpperCase()} sonic cry!`, '🔊'))
      .catch(() => {
        // Fallback tone
        triggerSynthSound(440, 0.4);
        showToast('Sonic telemetry generated via local synthesizer!', '⚡');
      });
  });

  document.getElementById('btn-synth-sweep')?.addEventListener('click', () => {
    if (!pokedexAudio) return;
    if (pokedexAudio.state === 'suspended') pokedexAudio.resume();
    const osc = pokedexAudio.createOscillator();
    const gain = pokedexAudio.createGain();
    osc.frequency.setValueAtTime(200, pokedexAudio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, pokedexAudio.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, pokedexAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, pokedexAudio.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(pokedexAudio.destination);
    osc.start();
    osc.stop(pokedexAudio.currentTime + 0.5);
    showToast('Triggered frequency sweep!', '⚡');
  });

  // Top Nav Tool Buttons
  document.getElementById('api-sound-btn')?.addEventListener('click', () => {
    pokedexSoundActive = !pokedexSoundActive;
    const btn = document.getElementById('api-sound-btn');
    if (btn) btn.textContent = pokedexSoundActive ? '🔊' : '🔇';
    showToast(pokedexSoundActive ? 'Sound synthesizer enabled!' : 'Sound muted.', pokedexSoundActive ? '🎵' : '🔇');
    if (pokedexSoundActive) triggerSynthSound(523.25, 0.2);
  });

  document.getElementById('api-fav-btn')?.addEventListener('click', () => {
    if (typeof renderCollection === 'function') renderCollection();
    openModal('modal-collection');
  });

  document.getElementById('api-compare-toggle-btn')?.addEventListener('click', () => {
    const tray = document.getElementById('comparison-tray');
    tray?.classList.toggle('visible');
  });

  document.getElementById('api-history-btn')?.addEventListener('click', () => {
    renderHistoryModal();
    openModal('modal-recent');
  });

  document.getElementById('btn-clear-recent')?.addEventListener('click', () => {
    localStorage.removeItem('prism_pokedex_history');
    renderHistoryModal();
    showToast('History cleared.', '🧹');
  });

  // Comparison tray actions
  document.getElementById('btn-run-comparison')?.addEventListener('click', runComparisonModal);
  document.getElementById('btn-clear-tray')?.addEventListener('click', () => {
    compareSlot1 = null;
    compareSlot2 = null;
    updateComparisonTray();
    showToast('Comparison dock cleared.', '🧹');
  });
  document.getElementById('btn-close-tray')?.addEventListener('click', () => {
    document.getElementById('comparison-tray')?.classList.remove('visible');
  });

  // Type Grid buttons inside Pokédex
  document.querySelectorAll('#api-types-grid .type-pill-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-type');
      showToast(`Finding specimens with ${type.toUpperCase()} typing...`, '🔥');
      try {
        const res = await fetch(`https://pokeapi.co/api/v2/type/${type}`);
        const data = await res.json();
        const pick = data.pokemon[Math.floor(Math.random() * Math.min(20, data.pokemon.length))];
        if (pick) loadPokemon(pick.pokemon.name);
      } catch {
        showToast('Could not query type roster.', '⚠️');
      }
    });
  });

  // Keyboard Navigation: Arrow Left/Right
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key === 'ArrowLeft') document.getElementById('btn-prev-specimen')?.click();
    if (e.key === 'ArrowRight') document.getElementById('btn-next-specimen')?.click();
  });

  // Check URL parameters for specific pokemon (e.g. ?pokemon=pikachu)
  const urlParams = new URLSearchParams(window.location.search);
  const requestedPokemon = urlParams.get('pokemon');
  if (requestedPokemon) {
    loadPokemon(requestedPokemon);
  } else {
    // Initial Load: Bulbasaur (#1)
    loadPokemon(1);
  }
});
