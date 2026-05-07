import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app = FastAPI()

STARS_PATH        = Path(__file__).parent / "data" / "stars.json"
PLANETS_PATH      = Path(__file__).parent / "data" / "planets.json"
APOD_PATH         = Path(__file__).parent / "data" / "apod.json"
BRIGHT_STARS_PATH = Path(__file__).parent / "data" / "bright_stars.json"
CONST_PATH        = Path(__file__).parent / "data" / "constellations.json"

with open(STARS_PATH) as f:
    STARS = json.load(f)
with open(PLANETS_PATH) as f:
    PLANETS = json.load(f)
with open(BRIGHT_STARS_PATH) as f:
    BRIGHT_STARS = json.load(f)
with open(CONST_PATH) as f:
    CONSTELLATIONS = json.load(f)


@app.get("/api/stars")
def get_stars():
    return STARS


@app.get("/api/planets")
def get_planets():
    return PLANETS


@app.get("/api/apod")
def get_apod():
    with open(APOD_PATH) as f:
        return json.load(f)


@app.get("/api/bright-stars")
def get_bright_stars():
    return BRIGHT_STARS


@app.get("/api/constellations")
def get_constellations():
    return CONSTELLATIONS


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    with open("static/index.html") as f:
        return HTMLResponse(f.read())
