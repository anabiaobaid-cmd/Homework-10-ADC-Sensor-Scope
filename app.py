import os
import requests
from flask import Flask, send_from_directory, redirect, jsonify, abort

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

# Root / Homepage — redirect to /home/ so relative paths (style.css, script.js) resolve correctly
@app.route("/")
def index():
    return redirect("/home/", code=302)

@app.route("/home/")
def home_index():
    return send_from_directory(os.path.join(BASE_DIR, "home"), "index.html")

@app.route("/home/<path:filename>")
def home_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, "home"), filename)

# Homework 6: Virtual Pet Game
@app.route("/game")
def game_redirect():
    return redirect("/game/", code=302)

@app.route("/game/")
def game_index():
    return send_from_directory(os.path.join(BASE_DIR, "game"), "index.html")

@app.route("/game/<path:filename>")
def game_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, "game"), filename)

# Homework 8: Creative Desk Portfolio
@app.route("/portfolio")
def portfolio_redirect():
    return redirect("/portfolio/", code=302)

@app.route("/portfolio/")
def portfolio_index():
    return send_from_directory(os.path.join(BASE_DIR, "portfolio"), "index.html")

@app.route("/portfolio/<path:filename>")
def portfolio_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, "portfolio"), filename)

# Pokédex Explorer API UI
@app.route("/api")
def api_redirect():
    return redirect("/api/", code=302)

@app.route("/api/")
def api_index():
    return send_from_directory(os.path.join(BASE_DIR, "api"), "index.html")

@app.route("/api/<path:filename>")
def api_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, "api"), filename)

# Optional Backend Proxy for PokeAPI (with fallback client-side support)
@app.route("/api/pokemon/<identifier>")
def get_pokemon_proxy(identifier):
    clean_id = identifier.strip().lower()
    url = f"https://pokeapi.co/api/v2/pokemon/{clean_id}"
    headers = {"User-Agent": "PokedexExplorer/1.0 (Mozilla/5.0)"}
    try:
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code == 404:
            return jsonify({"error": f'Specimen "{identifier}" not found in database.'}), 404
        if not resp.ok:
            return jsonify({"error": "Failed to fetch specimen data from PokeAPI."}), resp.status_code
        return jsonify(resp.json()), 200
    except requests.RequestException as e:
        return jsonify({"error": "Connection timeout or network failure reaching PokeAPI."}), 502

# Embedded Sensor Scope routes
@app.route("/embedded")
def embedded_redirect():
    return redirect("/embedded/", code=302)

@app.route("/embedded/")
def embedded_index():
    return send_from_directory(os.path.join(BASE_DIR, "embedded"), "index.html")

@app.route("/embedded/<path:filename>")
def embedded_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, "embedded"), filename)

# Custom 404 Error Handler
@app.errorhandler(404)
def page_not_found(e):
    return send_from_directory(os.path.join(BASE_DIR, "home"), "404.html"), 404

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
