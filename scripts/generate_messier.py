"""
Generate data/messier.json from d3-celestial Messier catalog.
Run once: python3 scripts/generate_messier.py
"""
import urllib.request, json
from pathlib import Path

URL = "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/messier.json"

# NASA PIA thumbnail IDs for famous objects (confirmed working)
NASA_PIA = {
    "M1":   "PIA17563",  # Crab Nebula
    "M8":   "PIA11778",  # Lagoon Nebula
    "M13":  "PIA17046",  # Hercules Cluster
    "M16":  "PIA19821",  # Eagle Nebula / Pillars of Creation
    "M20":  "PIA23129",  # Trifid Nebula
    "M27":  "PIA07902",  # Dumbbell Nebula
    "M31":  "PIA15416",  # Andromeda Galaxy
    "M42":  "PIA17005",  # Orion Nebula
    "M45":  "PIA12232",  # Pleiades
    "M51":  "PIA16615",  # Whirlpool Galaxy
    "M57":  "PIA09218",  # Ring Nebula
    "M87":  "PIA23122",  # Virgo A / M87 jet
    "M101": "PIA10932",  # Pinwheel Galaxy
    "M104": "PIA04824",  # Sombrero Galaxy
}

# Type code → human-readable label
# Note: in d3-celestial, 'e' = elliptical galaxy, 'sfr' = emission/star-forming nebula
TYPE_LABELS = {
    "s":   "Spiral Galaxy",
    "e":   "Elliptical Galaxy",
    "i":   "Irregular Galaxy",
    "sfr": "Emission Nebula",
    "rn":  "Reflection Nebula",
    "snr": "Supernova Remnant",
    "pn":  "Planetary Nebula",
    "gc":  "Globular Cluster",
    "oc":  "Open Cluster",
    "pos": "Object",
}

# Angular FOV for DSS2 image (degrees)
TYPE_FOV = {
    "s":   0.4,
    "e":   0.3,
    "i":   0.5,
    "sfr": 0.8,
    "rn":  0.4,
    "snr": 0.4,
    "pn":  0.15,
    "gc":  0.3,
    "oc":  0.5,
    "pos": 0.25,
}

# Short descriptions for all 110 objects
DESCRIPTIONS = {
    "M1":  "The Crab Nebula — remnant of a supernova observed by Chinese astronomers in 1054 AD. A pulsar at its heart spins 30 times per second.",
    "M2":  "One of the richest and most compact globular clusters, containing ~150,000 stars at 37,000 light-years.",
    "M3":  "A spectacular globular cluster with ~500,000 stars. One of the finest in the northern sky.",
    "M4":  "One of the closest globular clusters at ~7,200 light-years, containing ancient white dwarf stars.",
    "M5":  "A brilliant globular cluster, one of the oldest known at ~13 billion years old.",
    "M6":  "The Butterfly Cluster — a young open cluster whose brightest star is an orange supergiant.",
    "M7":  "Ptolemy's Cluster — visible to the naked eye, one of the most prominent open clusters in Scorpius.",
    "M8":  "The Lagoon Nebula — a giant interstellar cloud where new stars are actively forming.",
    "M9":  "A globular cluster near the galactic core, heavily obscured by interstellar dust.",
    "M10": "A bright globular cluster at ~14,300 light-years, relatively close with a loose core.",
    "M11": "The Wild Duck Cluster — one of the richest and most compact open clusters known.",
    "M12": "A loose globular cluster that may have lost many of its small stars to the Milky Way's gravity.",
    "M13": "The Great Hercules Cluster — the finest globular cluster in the northern sky with ~300,000 stars.",
    "M14": "A large globular cluster that hosted a nova in 1938, discovered on old photographic plates.",
    "M15": "One of the most densely packed globulars, possibly containing a central black hole.",
    "M16": "The Eagle Nebula — home to the famous 'Pillars of Creation' star-forming columns photographed by Hubble.",
    "M17": "The Omega (Swan) Nebula — a bright emission nebula and active star-forming region.",
    "M18": "A young, sparse open cluster embedded in the Milky Way, about 4,900 light-years away.",
    "M19": "A slightly oblate globular cluster — one of the most oblate known, flattened by tidal forces.",
    "M20": "The Trifid Nebula — a rare combination of emission, reflection, and dark nebulae divided into three lobes.",
    "M21": "A young open cluster near the Trifid Nebula, just 4 million years old.",
    "M22": "A brilliant globular cluster near the galactic core, one of the nearest at ~10,400 light-years.",
    "M23": "A rich open cluster about 2,150 light-years away in Sagittarius.",
    "M24": "The Sagittarius Star Cloud — not a true cluster but a dense window through the Milky Way dust.",
    "M25": "A large, bright open cluster visible to the naked eye in a rich Milky Way field.",
    "M26": "A compact open cluster about 5,000 light-years away in Scutum.",
    "M27": "The Dumbbell Nebula — the first planetary nebula ever discovered (1764), with a striking hourglass shape.",
    "M28": "A compact globular cluster near M22 that was the first to be shown to contain a millisecond pulsar.",
    "M29": "A small, young open cluster near Sadr in Cygnus, embedded in bright nebulosity.",
    "M30": "A compact globular with a dense, concentrated core; shows evidence of core collapse.",
    "M31": "The Andromeda Galaxy — our nearest large galactic neighbor at 2.5 million light-years, on a collision course with the Milky Way.",
    "M32": "A compact elliptical satellite galaxy of Andromeda, one of the closest ellipticals to Earth.",
    "M33": "The Triangulum Galaxy — the third-largest Local Group member, barely visible to the naked eye under dark skies.",
    "M34": "A bright open cluster of ~100 stars easily resolved in binoculars.",
    "M35": "A rich open cluster with a fainter, more distant cluster (NGC 2158) visible in the same field.",
    "M36": "One of three young open clusters (with M36, M37, M38) embedded in the Auriga Milky Way.",
    "M37": "The richest of the three Auriga open clusters, containing over 500 stars.",
    "M38": "An open cluster containing ~100 stars in a cross-like shape within Auriga.",
    "M39": "A large, scattered open cluster of about 30 bright stars, relatively close at ~825 light-years.",
    "M40": "Winnecke 4 — a visual double star included in Messier's catalog by mistake; not a true nebula.",
    "M41": "A large open cluster just 4° south of Sirius, visible to the naked eye.",
    "M42": "The Orion Nebula — the most spectacular and studied stellar nursery, 1,344 light-years away.",
    "M43": "De Mairan's Nebula — a comma-shaped nebula separated from the Orion Nebula by a dark lane.",
    "M44": "The Beehive Cluster (Praesepe) — one of the nearest open clusters, visible to the naked eye.",
    "M45": "The Pleiades — the famous Seven Sisters open cluster, 440 light-years away, wrapped in blue reflection nebulosity.",
    "M46": "A rich open cluster containing ~500 stars plus a foreground planetary nebula (NGC 2438).",
    "M47": "A young, bright open cluster of ~50 stars, just 1,600 light-years away.",
    "M48": "A large open cluster of ~80 stars missed by Messier due to a position error, later identified.",
    "M49": "The brightest member of the Virgo Cluster of galaxies, an elliptical at ~56 million light-years.",
    "M50": "An open cluster in Monoceros with about 200 stars, one reddish giant prominent at its center.",
    "M51": "The Whirlpool Galaxy — a grand-design spiral galaxy interacting with its companion NGC 5195, 23 million light-years away.",
    "M52": "A rich open cluster of ~200 stars embedded in the Milky Way in Cassiopeia.",
    "M53": "A remote globular cluster at ~58,000 light-years, one of the most distant Messier globulars.",
    "M54": "A globular cluster that belongs not to the Milky Way but to the Sagittarius Dwarf Galaxy.",
    "M55": "A large, loose globular cluster with very little central concentration.",
    "M56": "A loose globular cluster in Lyra, between M57 and Albireo.",
    "M57": "The Ring Nebula — a classic planetary nebula, the glowing shell ejected by a dying star.",
    "M58": "One of the brightest galaxies in the Virgo Cluster, a barred spiral at 62 million light-years.",
    "M59": "An elliptical galaxy in Virgo, one of the larger ellipticals in the Virgo Cluster.",
    "M60": "One of the largest elliptical galaxies known, interacting with spiral NGC 4647.",
    "M61": "A face-on spiral galaxy in Virgo, one of the largest members of the Virgo Cluster.",
    "M62": "One of the most asymmetric globular clusters, deformed by the galactic bulge's tidal forces.",
    "M63": "The Sunflower Galaxy — a flocculent spiral with a pattern of disconnected spiral arms.",
    "M64": "The Black Eye Galaxy — a spiral galaxy with a dark dust lane absorbing light in front of its nucleus.",
    "M65": "A spiral galaxy in Leo, one of the Leo Triplet along with M66 and NGC 3628.",
    "M66": "The largest of the Leo Triplet, a spiral galaxy with an asymmetric shape from tidal interactions.",
    "M67": "One of the oldest known open clusters at ~4 billion years, still coherent despite its age.",
    "M68": "A globular cluster in Hydra approaching the Milky Way at high velocity.",
    "M69": "A compact globular cluster near the galactic center in Sagittarius.",
    "M70": "A compact globular with a collapsed core, similar to M69 in the same Sagittarius field.",
    "M71": "An unusual object debated between globular and open cluster; now classified globular.",
    "M72": "A distant, relatively faint globular cluster in Aquarius, ~53,000 light-years away.",
    "M73": "An asterism of four unrelated stars included by Messier; not a true cluster.",
    "M74": "A face-on grand-design spiral galaxy with very low surface brightness, challenging to observe.",
    "M75": "One of the most remote and concentrated globular clusters in the Messier catalog.",
    "M76": "The Little Dumbbell Nebula — a complex bipolar planetary nebula in Perseus.",
    "M77": "A barred spiral Seyfert galaxy with an active nucleus, one of the largest Messier galaxies.",
    "M78": "The brightest diffuse reflection nebula in the sky, illuminated by two hot stars.",
    "M79": "An unusual globular cluster in Lepus, possibly captured from the Canis Major Dwarf Galaxy.",
    "M80": "A dense globular cluster that hosted a bright nova (T Sco) in 1860.",
    "M81": "Bode's Galaxy — a grand-design spiral and brightest Messier galaxy visible from mid-northern latitudes.",
    "M82": "The Cigar Galaxy — a starburst galaxy with a superwind of ionized gas exploding from its center.",
    "M83": "The Southern Pinwheel — one of the nearest and brightest spiral galaxies, hosting several historic supernovae.",
    "M84": "An elliptical (or lenticular) galaxy in the core of the Virgo Cluster.",
    "M85": "The northernmost Virgo Cluster galaxy in Messier's catalog, an interacting lenticular.",
    "M86": "A giant elliptical near M84 moving toward us at 244 km/s — an infalling Virgo Cluster member.",
    "M87": "Virgo A — a giant elliptical galaxy famous for its jet and the first black hole ever imaged (Event Horizon Telescope, 2019).",
    "M88": "A multi-arm spiral galaxy in the Virgo Cluster showing a slight asymmetry.",
    "M89": "A nearly perfectly spherical elliptical galaxy in the Virgo Cluster.",
    "M90": "The only Messier galaxy with a blueshift — it is approaching us within the Virgo Cluster.",
    "M91": "A barred spiral galaxy in Coma Berenices, missing from catalogs for nearly 200 years.",
    "M92": "A bright globular cluster often overlooked near its famous neighbor M13 in Hercules.",
    "M93": "A bright open cluster of ~80 stars in Puppis, about 3,600 light-years away.",
    "M94": "A spiral galaxy with two ring structures, the inner one a powerful starburst zone.",
    "M95": "A barred spiral galaxy in Leo with a prominent circular bar and ring structure.",
    "M96": "The brightest galaxy in the M96 Group, an asymmetric spiral with an off-center nucleus.",
    "M97": "The Owl Nebula — a planetary nebula with two dark eye-like patches, 2,030 light-years away.",
    "M98": "A nearly edge-on spiral galaxy moving toward us — one of the few blueshifted Messier galaxies.",
    "M99": "A near-perfect face-on spiral galaxy in Coma Berenices, rotating rapidly and somewhat isolated.",
    "M100": "A grand-design spiral in the Virgo Cluster, one of the brightest members at 55 million light-years.",
    "M101": "The Pinwheel Galaxy — a face-on spiral with striking asymmetry and many prominent HII regions.",
    "M102": "Disputed identity; likely a re-observation of M101 or NGC 5866 (Spindle Galaxy).",
    "M103": "A young open cluster near the Double Cluster, one of the most distant Messier clusters at ~8,500 ly.",
    "M104": "The Sombrero Galaxy — an edge-on spiral with a dramatic dust lane and large central bulge.",
    "M105": "An elliptical galaxy in Leo, one of the first galaxies known to harbor a central supermassive black hole.",
    "M106": "A spiral galaxy with two anomalous spiral arms composed of hot gas rather than stars.",
    "M107": "A loose, sparse globular cluster in Ophiuchus, the last Messier object discovered in his lifetime.",
    "M108": "An edge-on barred spiral in Ursa Major, near M97 in the same field.",
    "M109": "A barred spiral galaxy in Ursa Major with a classic theta (θ) bar-and-ring morphology.",
    "M110": "The outermost Messier satellite of the Andromeda Galaxy, a dwarf elliptical showing subtle dust lanes.",
}

req = urllib.request.Request(URL, headers={"User-Agent": "StarlightTimeMachine/1.0"})
with urllib.request.urlopen(req, timeout=20) as r:
    raw = json.loads(r.read())

out = []
for f in raw["features"]:
    p = f["properties"]
    coords = f["geometry"]["coordinates"]
    name = p.get("name", "")
    t = p.get("type", "pos")

    # Normalize RA from -180..180 to 0..360
    ra_deg = coords[0]
    if ra_deg < 0:
        ra_deg += 360.0
    dec_deg = coords[1]

    # Approximate angular size from dim field (e.g. "6x4" or "16")
    dim_str = str(p.get("dim", ""))
    try:
        dim_val = float(dim_str.split("x")[0])
    except ValueError:
        dim_val = 5.0
    fov = max(TYPE_FOV.get(t, 0.25), dim_val / 60.0 * 1.8)  # arcmin → deg, with padding

    entry = {
        "name":    name,
        "alt":     p.get("alt", ""),
        "type":    t,
        "typeLabel": TYPE_LABELS.get(t, "Object"),
        "mag":     p.get("mag"),
        "ra":      round(ra_deg, 4),
        "dec":     round(dec_deg, 4),
        "fov":     round(min(fov, 1.5), 3),
        "desc":    DESCRIPTIONS.get(name, f"{TYPE_LABELS.get(t,'Object')} at RA {ra_deg:.1f}° Dec {dec_deg:.1f}°"),
    }
    if name in NASA_PIA:
        entry["pia"] = NASA_PIA[name]
    out.append(entry)

out_path = Path(__file__).parent.parent / "data" / "messier.json"
with open(out_path, "w") as f:
    json.dump(out, f, indent=2)

print(f"Wrote {len(out)} objects to {out_path}")
