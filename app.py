import json
import urllib.request
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response

app = FastAPI()

STARS_PATH        = Path(__file__).parent / "data" / "stars.json"
PLANETS_PATH      = Path(__file__).parent / "data" / "planets.json"
APOD_PATH         = Path(__file__).parent / "data" / "apod.json"
BRIGHT_STARS_PATH = Path(__file__).parent / "data" / "bright_stars.json"
CONST_PATH        = Path(__file__).parent / "data" / "constellations.json"
MESSIER_PATH      = Path(__file__).parent / "data" / "messier.json"
EVENTS_PATH       = Path(__file__).parent / "data" / "events.json"

with open(STARS_PATH) as f:
    STARS = json.load(f)
with open(PLANETS_PATH) as f:
    PLANETS = json.load(f)
with open(BRIGHT_STARS_PATH) as f:
    BRIGHT_STARS = json.load(f)
with open(CONST_PATH) as f:
    CONSTELLATIONS = json.load(f)
with open(MESSIER_PATH) as f:
    MESSIER = json.load(f)
with open(EVENTS_PATH) as f:
    EVENTS = json.load(f)


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


@app.get("/api/messier")
def get_messier():
    return MESSIER


@app.get("/api/events")
def get_events():
    return EVENTS


@app.get("/api/sky-image")
def get_sky_image(ra: float, dec: float, fov: float = 0.25):
    """
    Proxy for STScI Digitized Sky Survey 2 (DSS2 Red).
    fov = field of view in degrees; converted to arcminutes for the API.
    Official source: Space Telescope Science Institute (STScI / NASA)
    """
    arcmin = round(min(max(fov * 60, 5), 30), 1)   # clamp 5–30 arcmin
    url = (
        f"https://archive.stsci.edu/cgi-bin/dss_search"
        f"?v=2r&r={ra}&d={dec}&e=J2000"
        f"&h={arcmin}&w={arcmin}&f=gif&c=none"
    )
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "StarlightTimeMachine/1.0"}
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read()
        return Response(
            content=data,
            media_type="image/gif",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def root():
    with open("static/index.html") as f:
        return HTMLResponse(f.read())
