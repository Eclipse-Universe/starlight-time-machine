import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

app = FastAPI()

STARS_PATH   = Path(__file__).parent / "data" / "stars.json"
PLANETS_PATH = Path(__file__).parent / "data" / "planets.json"

with open(STARS_PATH) as f:
    STARS = json.load(f)
with open(PLANETS_PATH) as f:
    PLANETS = json.load(f)


@app.get("/api/stars")
def get_stars():
    return STARS


@app.get("/api/planets")
def get_planets():
    return PLANETS


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    with open("static/index.html") as f:
        return HTMLResponse(f.read())
