"""Kaizen Clips lighting presets: one word sets sun, sky, fill, haze and exposure, so the same set can be a bright
historical morning, a golden comedy afternoon or a cold horror night. Each Short picks the light that fits its story.

  night_moon   cold blue moonlight, near-black sky with faint stars (the Hidebehind mood)
  dawn         grey-blue first light, soft and colourless
  morning      clean low sun, cool shadows, fresh
  noon         high hard sun, short shadows, bright sky (deserts, battles, summer)
  golden       warm low sun, long shadows, glowing sky (nostalgia, comedy, endings)
  dusk         orange horizon into blue, windows start to glow
  overcast     soft shadowless grey light (sad, rainy, documentary)
  storm        dark slate sky, cold flat light, wind (tension, disaster)
  candle       interior at night lit by warm practical lights you place (fires, lamps, candles)
  interior_day daylight through windows: a soft key from one side, warm bounce
"""
import math

import bpy  # noqa: I001
from mathutils import Vector

from . import core

# sun: elevation, azimuth (deg, light travels toward this heading), energy, colour, angle (softness)
# sky: zenith colour, horizon colour, strength; fill: area light energy/colour from above; haze: world volume density
PRESETS = {
    "night_moon": dict(sun=(48, 145, 3.0, (0.52, 0.66, 1.0), 1.0), sky=((0.0015, 0.0025, 0.006), (0.003, 0.0045, 0.009), 1.0), stars=True,
                       fill=(260, (0.4, 0.5, 0.85)), haze=0.01, exposure=1.3),
    "dawn": dict(sun=(8, 60, 1.6, (0.8, 0.84, 0.92), 6.0), sky=((0.035, 0.042, 0.055), (0.12, 0.12, 0.13), 1.0),
                 fill=(1800, (0.62, 0.68, 0.78)), haze=0.012, exposure=0.6),
    "morning": dict(sun=(22, 120, 4.0, (1.0, 0.9, 0.78), 2.0), sky=((0.12, 0.25, 0.55), (0.55, 0.62, 0.7), 1.0),
                    fill=(400, (0.6, 0.72, 1.0)), haze=0.004, exposure=0.0),
    "noon": dict(sun=(68, 160, 5.5, (1.0, 0.97, 0.92), 1.5), sky=((0.1, 0.24, 0.6), (0.5, 0.6, 0.72), 1.1),
                 fill=(500, (0.6, 0.72, 1.0)), haze=0.002, exposure=-0.3),
    "golden": dict(sun=(14, 300, 4.2, (1.0, 0.66, 0.36), 2.5), sky=((0.14, 0.2, 0.4), (0.95, 0.62, 0.36), 1.0),
                   fill=(300, (0.55, 0.6, 0.9)), haze=0.006, exposure=0.1),
    "dusk": dict(sun=(3, 100, 2.5, (1.0, 0.45, 0.2), 4.0), sky=((0.03, 0.05, 0.13), (0.7, 0.3, 0.14), 0.8),
                 fill=(500, (0.35, 0.42, 0.75)), haze=0.008, exposure=0.6, windows=True),
    "overcast": dict(sun=(50, 140, 0.6, (0.85, 0.88, 0.92), 30.0), sky=((0.3, 0.32, 0.35), (0.42, 0.43, 0.45), 1.0),
                     fill=(1500, (0.8, 0.84, 0.9)), haze=0.008, exposure=0.2),
    "storm": dict(sun=(40, 150, 0.8, (0.7, 0.76, 0.85), 20.0), sky=((0.04, 0.05, 0.06), (0.1, 0.11, 0.12), 1.0),
                  fill=(900, (0.5, 0.58, 0.7)), haze=0.015, exposure=0.6),
    "candle": dict(sun=None, sky=((0.002, 0.002, 0.003), (0.003, 0.003, 0.004), 1.0), fill=(25, (0.4, 0.45, 0.7)), haze=0.0,
                   exposure=1.0, windows=True),
    "interior_day": dict(sun=(30, 90, 3.0, (1.0, 0.93, 0.82), 3.0), sky=((0.3, 0.38, 0.5), (0.5, 0.52, 0.55), 0.8),
                         fill=(120, (1.0, 0.85, 0.7)), haze=0.0, exposure=0.2),
}


def world(sc, zenith, horizon, strength=1.0, stars=False, haze=0.0, haze_col=(0.7, 0.75, 0.85)):
    wo = bpy.data.worlds.new("kz_world")
    wo.use_nodes = True
    nt = wo.node_tree
    nd, ln = nt.nodes, nt.links
    bg = nd["Background"]
    tc = nd.new("ShaderNodeTexCoord")
    sep = nd.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Generated"], sep.inputs[0])
    from .materials import maprange, mix, math_
    up = maprange(nd, ln, sep.outputs[2], 0.0, 0.45)
    c = mix(nd, ln, up.outputs[0], horizon, zenith).outputs[2]
    if stars:
        vo = nd.new("ShaderNodeTexVoronoi")
        vo.inputs["Scale"].default_value = 260.0
        ln.new(tc.outputs["Generated"], vo.inputs["Vector"])
        st = maprange(nd, ln, vo.outputs["Distance"], 0.06, 0.0)
        st = math_(nd, ln, "MULTIPLY", st.outputs[0], up.outputs[0])
        st = math_(nd, ln, "MULTIPLY", st.outputs[0], 0.12, clamp=False)
        a = mix(nd, ln, 1.0, c, (0, 0, 0), "ADD")
        ln.new(st.outputs[0], a.inputs[7])
        c = a.outputs[2]
    ln.new(c, bg.inputs[0])
    bg.inputs[1].default_value = strength
    if haze and core.flag("--volume-haze"):
        # an infinite world volume turns the sky black in EEVEE (Hidebehind lesson): off by default. Atmospheric haze
        # is added in 2D from the depth plate instead (cheaper, and adjustable without re-rendering).
        vol = nd.new("ShaderNodeVolumePrincipled")
        vol.inputs["Density"].default_value = haze
        vol.inputs["Anisotropy"].default_value = 0.5
        vol.inputs["Color"].default_value = (*haze_col, 1)
        ln.new(vol.outputs[0], nd["World Output"].inputs["Volume"])
    sc.world = wo
    return wo


def sun(elev, azim, energy, col, angle):
    s = bpy.data.lights.new("sun", "SUN")
    s.energy, s.color, s.angle = energy, col, math.radians(angle)
    o = core.link(bpy.data.objects.new("sun", s))
    # light travels downward at `elev` degrees, toward heading `azim` (0 = +y)
    d = Vector((math.sin(math.radians(azim)) * math.cos(math.radians(elev)), math.cos(math.radians(azim)) * math.cos(math.radians(elev)), -math.sin(math.radians(elev))))
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return o


def area(name, loc, energy, col, size=20.0):
    a = bpy.data.lights.new(name, "AREA")
    a.shape, a.size, a.size_y = "RECTANGLE", size, size
    a.energy, a.color = energy, col
    a.volume_factor = 0.0
    o = core.link(bpy.data.objects.new(name, a))
    o.location = loc
    return o


def point(name, loc, energy, col=(1.0, 0.55, 0.22), radius=0.05, cutoff=None, shadow=True, volume=0.0):
    """a practical light: fire, candle, lamp, lantern. Returns the light DATA (for hi/lo flicker variants)."""
    p = bpy.data.lights.new(name, "POINT")
    p.energy, p.color, p.shadow_soft_size, p.use_shadow = energy, col, radius, shadow
    p.volume_factor = volume
    if cutoff:
        p.use_custom_distance, p.cutoff_distance = True, cutoff
    if hasattr(p, "use_soft_falloff"):
        p.use_soft_falloff = True
    o = core.link(bpy.data.objects.new(name, p))
    o.location = loc
    return p


def apply(sc, name, center=(0, 0, 0), azimuth=None, haze=None, exposure=None):
    """set up sky, sun, fill and haze for preset `name`; azimuth rotates the sun around the set (deg)"""
    P = PRESETS[name]
    z, h, s = P["sky"]
    world(sc, z, h, s, stars=P.get("stars", False), haze=P["haze"] if haze is None else haze,
          haze_col=tuple(min(1.0, v * 3 + 0.3) for v in h))
    sun_o = None
    if P["sun"]:
        el, az, en, col, ang = P["sun"]
        sun_o = sun(el, az if azimuth is None else azimuth, en, col, ang)
    fe, fc = P["fill"]
    area("fill", (center[0], center[1], center[2] + 14), fe, fc, 30.0)
    sc.view_settings.exposure = P["exposure"] if exposure is None else exposure
    return dict(sun=sun_o, windows=P.get("windows", False), preset=name)
