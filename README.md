# CS CRP — Homework 9: Maximalist Rainbow Multiverse & Pokédex Explorer

An extremely colourful, visually rich, gradient-heavy full-stack Python Flask web application integrating previous coursework projects with an interactive Pokédex Explorer powered by PokéAPI.

---

## 🌈 Visual Redesign Highlights

- **Maximalist Rainbow Palette**: Extensive use of multi-stop rainbow gradients, pink-to-purple, orange-to-pink, cyan-to-blue, yellow-to-orange, and mint-to-lime gradients.
- **Dynamic Mesh Gradients & Floating Blobs**: Animated blur backgrounds creating a living, shifting aura on every page.
- **Dynamic Type-Themed Gradient Backgrounds**: The Pokédex stage changes its visual gradient aura in real-time according to the active Pokémon's elemental type (e.g. Fire, Water, Grass, Dragon).
- **Animated Gradient Meters**: Combat stats (HP, Attack, Defense, Sp. Atk, Sp. Def, Speed) dynamically fill with glowing, animated progress bars.
- **Gradient Borders & Text**: Rainbow borders, glowing buttons, and gradient typography across all headings and cards.

---

## 📁 Project Structure

```
Homework_9/
├── index.html            # Root launcher file — directly opens the hub on double-click
├── app.py                # Python Flask backend server and routing
├── requirements.txt      # Production dependencies (Flask, Gunicorn, Requests)
├── .gitignore            # Git exclusion rules
├── README.md             # Comprehensive documentation & interactive button dictionary
├── test_app.py           # Automated unit test suite verifying endpoints and static assets
├── home/                 # Main landing hub & error views
│   ├── index.html        # Maximalist rainbow hub with interactive action bar & type matrix
│   ├── style.css         # Rainbow gradients, mesh backgrounds, glassmorphism, responsive styles
│   ├── script.js         # Interactive action controller, audio synth, trivia, modals, localStorage
│   └── 404.html          # Custom styled 404 error page
├── game/                 # Homework 6: Mochi's Virtual Pet Simulator
│   ├── index.html        # Game HTML layout & Canvas container
│   ├── style.css         # Pixel-art visual theme & responsive styling
│   └── script.js         # Game loop, state decay, sound synthesis, mini-games
├── portfolio/            # Homework 8: The Creative Desk
│   ├── index.html        # Spatial desk portfolio with modal popups
│   ├── style.css         # Desk object styling & animations
│   ├── script.js         # Interactive object inspection logic
│   └── assets/           # Portfolio media assets (profile.jpg)
└── api/                  # Pokédex Explorer (PokéAPI integration)
    ├── index.html        # Dual-panel cyber Pokédex layout, tabs, comparison dock
    ├── style.css         # Futuristic cyber styling, dynamic type glows, meter bars
    └── script.js         # Real-time PokéAPI querying, comparison engine, sound synthesis, history
```

---

## 🎮 Interactive Controls & Button Dictionary

Every button and control across the application triggers a meaningful action:

### 🏠 Home Hub
| Button / Control | Meaningful Action Triggered |
|---|---|
| **Explore Pokédex** | Navigates directly to the Pokédex Explorer page. |
| **Discover a Pokémon** | Queries PokéAPI for a random ID and launches a specimen modal. |
| **Daily Discovery** | Computes a deterministic date seed to generate and display the "Astral Specimen of the Day". |
| **Explore Types** | Smoothly scrolls to the 18-element type matrix. |
| **My Collection** | Opens the Saved Collection modal displaying saved Pokémon from `localStorage`. |
| **Fun Facts** | Smoothly scrolls to the lore generator and advances to a new Pokémon trivia entry. |
| **About Project** | Opens the comprehensive project overview modal with course information. |
| **Pick Random Type** | Automatically selects a random elemental energy and queries matching specimens. |
| **Elemental Type Pills (18 Buttons)** | Queries PokéAPI for specimens of that specific type and displays a selectable roster. |
| **Next Fun Fact** | Cycles to the next entry in the Pokémon lore database. |
| **Copy Fact** | Copies the currently displayed Pokémon trivia to the system clipboard. |
| **Scan Radar** | Queries a random specimen and renders an inline radar preview card. |
| **Sound Toggle (🔇/🔊)** | Activates/deactivates the real-time Web Audio API synthesizer. |
| **Palette Shuffle (🎨)** | Applies an animated CSS hue-rotation prism shift across the interface. |
| **Floating Action Button (🎲)** | Instantly generates a surprise specimen popup from anywhere on the page. |
| **Launch Game Simulator** | Launches Homework 6 Mochi's Virtual Pet. |
| **Explore Desk Portfolio** | Launches Homework 8 The Creative Desk. |

### ⚡ Pokédex Explorer
| Button / Control | Meaningful Action Triggered |
|---|---|
| **SCAN (Search Form)** | Searches for any Pokémon by name or ID (e.g. `pikachu`, `25`, `lucario`). |
| **Random Discovery** | Fetches a random Pokémon between #1 and #1025. |
| **Surprise Me** | Summons a legendary or mythic specimen with special fanfare. |
| **Pokémon of the Day** | Loads the universal daily featured specimen. |
| **PREV / NEXT (◄ / ►)** | Increments or decrements the Pokédex ID (with Left/Right keyboard arrow support). |
| **Preset Chips (10 Buttons)** | Fast-jumps to popular Pokémon (Bulbasaur, Charmander, Squirtle, Pikachu, etc.). |
| **Add Favorite (🤍/❤️)** | Toggles the active Pokémon in `localStorage` Saved Collection. |
| **Compare Specimen (⚖️)** | Adds the active specimen to the persistent comparison dock. |
| **Copy Specimen Data** | Copies structured specimen stats and ID to the clipboard. |
| **Spin Again** | Re-rolls another random specimen. |
| **Tab: Base Stats** | Displays animated gradient meters for HP, Attack, Defense, Sp. Atk, Sp. Def, and Speed. |
| **Tab: Abilities** | Displays registered genetic traits and hidden ability badges. |
| **Tab: Type Matrix** | Displays the 18 elemental buttons to filter Pokémon by typing directly in the Pokédex. |
| **Tab: Cry & Sounds** | Opens the sonic telemetry and sound synthesis tool. |
| **Play Specimen Cry** | Plays the official audio cry from PokéAPI's cry archives. |
| **Synthesizer Sweep** | Generates a live audio frequency sweep via Web Audio API. |
| **Compare Now** | Opens the side-by-side head-to-head comparison modal with highlighted winning stats. |
| **Clear Dock** | Resets the comparison slots. |
| **Recently Viewed (🕒)** | Opens the history modal of previously scanned Pokémon. |

---

## 🚀 How to Run Locally

### Option A: Double-Click Launcher (Offline / Static Mode)
Simply double-click `index.html` in the `Homework_9` directory to open the portal directly in your default browser.

### Option B: Flask Server Mode
1. Ensure Python 3.10+ is installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
   ```
   *(Or `py app.py` on Windows)*
4. Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## ☁️ Render Deployment Settings

- **Service Type**: Web Service
- **Environment**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app`
- **Port**: Handled dynamically via `os.environ.get("PORT", 5000)` and bound to `0.0.0.0`.
