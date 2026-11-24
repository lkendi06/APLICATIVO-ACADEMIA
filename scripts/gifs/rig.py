"""
Rig 2D (vista lateral) usado para gerar as animações originais dos exercícios do FitTrack.

Todas as figuras são desenhadas por código: não há nenhuma imagem de terceiros envolvida,
então os GIFs gerados são 100% originais do projeto.

Convenções
----------
* Coordenadas em "unidades de cena", com o eixo Y para cima e o chão em y = 0.
* Ângulos absolutos em graus no padrão matemático: 0 = para a direita (frente da figura),
  90 = para cima, -90 = para baixo.
* Uma pose é um dicionário com:
    root   -> (x, y) do ponto âncora
    anchor -> 'pelvis' (padrão), 'ankle' (tornozelo fixo) ou 'hand' (mão fixa)
    t      -> tronco (pelve -> ombro)
    n      -> pescoço/cabeça
    ua/fa  -> braço/antebraço (lado próximo); ua2/fa2 lado distante (opcional)
    th/sh  -> coxa/canela (lado próximo); th2/sh2 lado distante (opcional)
    ft     -> pé; ft2 opcional
    hd     -> mão (opcional, usado na rosca de punho)
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable

from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Identidade visual (mesmos tokens do tema do app)
# ---------------------------------------------------------------------------
BG = (17, 20, 25)
BG_GLOW = (27, 32, 40)
FLOOR = (44, 50, 60)
BODY = (226, 230, 236)
BODY_FAR = (122, 130, 142)
ACCENT = (198, 244, 50)
ACCENT_FAR = (112, 140, 38)
EQUIP = (88, 100, 116)
EQUIP_DARK = (52, 60, 72)
EQUIP_LIGHT = (140, 152, 168)
PLATE = (64, 74, 88)

SIZE = 360  # tamanho final do GIF (px)
SS = 3  # super-sampling para anti-aliasing
SCENE_W = 400.0  # largura da cena em unidades
FLOOR_SCREEN_Y = 330.0  # posição do chão na cena (em unidades de tela)

# Comprimentos dos segmentos (unidades de cena)
L = {
    "t": 92.0,
    "n": 14.0,
    "ua": 60.0,
    "fa": 54.0,
    "th": 84.0,
    "sh": 80.0,
    "ft": 24.0,
    "hd": 14.0,
}
HEAD_R = 17.0
W = {  # espessuras
    "t": 34.0,
    "ua": 15.0,
    "fa": 13.0,
    "th": 22.0,
    "sh": 17.0,
    "ft": 10.0,
    "hd": 10.0,
}


def vec(angle_deg: float, length: float) -> tuple[float, float]:
    a = math.radians(angle_deg)
    return (math.cos(a) * length, math.sin(a) * length)


def add(p, q):
    return (p[0] + q[0], p[1] + q[1])


def sub(p, q):
    return (p[0] - q[0], p[1] - q[1])


def lerp(a, b, t):
    return a + (b - a) * t


def ease(t: float) -> float:
    """Suavização senoidal (ease-in-out)."""
    return 0.5 - 0.5 * math.cos(math.pi * t)


@dataclass
class Joints:
    pelvis: tuple
    shoulder: tuple
    head: tuple
    elbow: tuple
    hand: tuple
    knee: tuple
    ankle: tuple
    toe: tuple
    elbow2: tuple
    hand2: tuple
    knee2: tuple
    ankle2: tuple
    toe2: tuple
    hand_tip: tuple | None = None
    pose: dict = field(default_factory=dict)


def solve(pose: dict) -> Joints:
    g = lambda k, d=None: pose.get(k, d)  # noqa: E731
    t, n = g("t", 90), g("n", g("t", 90))
    ua, fa = g("ua", -90), g("fa", g("ua", -90))
    ua2, fa2 = g("ua2", ua), g("fa2", fa)
    th, sh = g("th", -90), g("sh", g("th", -90))
    th2, sh2 = g("th2", th), g("sh2", sh)
    ft, ft2 = g("ft", 0), g("ft2", g("ft", 0))
    anchor = g("anchor", "pelvis")
    root = g("root")

    if anchor == "pelvis":
        pelvis = root
    elif anchor == "ankle":
        knee = sub(root, vec(sh, L["sh"]))
        pelvis = sub(knee, vec(th, L["th"]))
    elif anchor == "hand":
        elbow = sub(root, vec(fa, L["fa"]))
        shoulder = sub(elbow, vec(ua, L["ua"]))
        pelvis = sub(shoulder, vec(t, L["t"]))
    else:
        raise ValueError(anchor)

    shoulder = add(pelvis, vec(t, L["t"]))
    head = add(shoulder, vec(n, L["n"] + HEAD_R))
    elbow = add(shoulder, vec(ua, L["ua"]))
    hand = add(elbow, vec(fa, L["fa"]))
    elbow2 = add(shoulder, vec(ua2, L["ua"]))
    hand2 = add(elbow2, vec(fa2, L["fa"]))
    knee = add(pelvis, vec(th, L["th"]))
    ankle = add(knee, vec(sh, L["sh"]))
    toe = add(ankle, vec(ft, L["ft"]))
    knee2 = add(pelvis, vec(th2, L["th"]))
    ankle2 = add(knee2, vec(sh2, L["sh"]))
    toe2 = add(ankle2, vec(ft2, L["ft"]))
    hand_tip = add(hand, vec(pose["hd"], L["hd"])) if "hd" in pose else None
    return Joints(pelvis, shoulder, head, elbow, hand, knee, ankle, toe, elbow2, hand2, knee2,
                  ankle2, toe2, hand_tip, pose)


def interp_pose(a: dict, b: dict, t: float) -> dict:
    out = {}
    for k in set(a) | set(b):
        va, vb = a.get(k, b.get(k)), b.get(k, a.get(k))
        if k == "anchor":
            out[k] = va
        elif k == "root":
            out[k] = (lerp(va[0], vb[0], t), lerp(va[1], vb[1], t))
        else:
            out[k] = lerp(va, vb, t)
    return out


# ---------------------------------------------------------------------------
# Desenho
# ---------------------------------------------------------------------------
class Canvas:
    def __init__(self, scene_w: float = SCENE_W, floor_y: float = FLOOR_SCREEN_Y,
                 offset_x: float = 0.0):
        self.px = SIZE * SS
        self.scene_w = scene_w
        self.floor_y = floor_y
        self.scale = self.px / scene_w
        self.ox = offset_x + (scene_w - SCENE_W) / 2
        self.img = Image.new("RGB", (self.px, self.px), BG)
        self.d = ImageDraw.Draw(self.img)

    def to_px(self, p):
        x = (p[0] + self.ox) * self.scale
        y = (self.floor_y - p[1]) * self.scale
        return (x, y)

    def capsule(self, p, q, width, color):
        a, b = self.to_px(p), self.to_px(q)
        w = width * self.scale
        self.d.line([a, b], fill=color, width=int(round(w)))
        r = w / 2
        for c in (a, b):
            self.d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=color)

    def circle(self, c, r, fill, outline=None, width=0):
        x, y = self.to_px(c)
        rr = r * self.scale
        self.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill, outline=outline,
                       width=int(width * self.scale))

    def rect(self, x0, y0, x1, y1, fill, radius=3):
        a = self.to_px((x0, y1))
        b = self.to_px((x1, y0))
        self.d.rounded_rectangle([a, b], radius=radius * self.scale, fill=fill)

    def poly(self, pts, fill):
        self.d.polygon([self.to_px(p) for p in pts], fill=fill)

    def line(self, p, q, color, width):
        self.d.line([self.to_px(p), self.to_px(q)], fill=color, width=int(round(width * self.scale)))

    def finish(self) -> Image.Image:
        return self.img.resize((SIZE, SIZE), Image.LANCZOS)


def background(cv: Canvas, show_floor: bool = True):
    # brilho radial sutil atrás da figura
    glow = Image.new("RGB", (cv.px, cv.px), BG)
    gd = ImageDraw.Draw(glow)
    r = cv.px * 0.42
    cx, cy = cv.px / 2, cv.px * 0.5
    gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BG_GLOW)
    glow = glow.filter(ImageFilter.GaussianBlur(cv.px * 0.12))
    cv.img.paste(glow)
    if not show_floor:
        return
    # chão
    y = cv.floor_y * cv.scale
    cv.d.rounded_rectangle([cv.px * 0.06, y, cv.px * 0.94, y + 3 * cv.scale], radius=2 * cv.scale,
                           fill=FLOOR)


# segmentos destacados por grupo muscular
HIGHLIGHT_SEGMENTS = {
    "chest": ["chest"],
    "back": ["back"],
    "shoulders": ["delt"],
    "biceps": ["ua"],
    "triceps": ["ua"],
    "forearms": ["fa"],
    "quadriceps": ["th"],
    "hamstrings": ["th"],
    "glutes": ["glute"],
    "calves": ["sh"],
    "abs": ["abs"],
}


def draw_figure(cv: Canvas, j: Joints, highlight: str):
    hl = set(HIGHLIGHT_SEGMENTS.get(highlight, []))

    def c(seg, near=True):
        if seg in hl:
            return ACCENT if near else ACCENT_FAR
        return BODY if near else BODY_FAR

    # lado distante
    cv.capsule(j.pelvis, j.knee2, W["th"], c("th", False))
    cv.capsule(j.knee2, j.ankle2, W["sh"], c("sh", False))
    cv.capsule(j.ankle2, j.toe2, W["ft"], BODY_FAR)
    cv.capsule(j.shoulder, j.elbow2, W["ua"], c("ua", False))
    cv.capsule(j.elbow2, j.hand2, W["fa"], c("fa", False))

    # tronco
    cv.capsule(j.pelvis, j.shoulder, W["t"], BODY)
    t_ang = j.pose.get("t", 90)
    front = vec(t_ang - 90, 1)  # perpendicular para a frente do corpo
    if "chest" in hl or "abs" in hl or "back" in hl:
        def along(f):
            return add(j.pelvis, vec(t_ang, L["t"] * f))
        if "chest" in hl:
            p, q = along(0.62), along(0.9)
            off = (front[0] * 8, front[1] * 8)
            cv.capsule(add(p, off), add(q, off), 16, ACCENT)
        if "abs" in hl:
            p, q = along(0.18), along(0.55)
            off = (front[0] * 9, front[1] * 9)
            cv.capsule(add(p, off), add(q, off), 13, ACCENT)
        if "back" in hl:
            p, q = along(0.3), along(0.88)
            off = (-front[0] * 8, -front[1] * 8)
            cv.capsule(add(p, off), add(q, off), 16, ACCENT)
    if "glute" in hl:
        back = (-front[0] * 6, -front[1] * 6)
        cv.circle(add(j.pelvis, back), 15, ACCENT)

    # cabeça
    cv.capsule(j.shoulder, add(j.shoulder, vec(j.pose.get("n", t_ang), L["n"])), 12, BODY)
    cv.circle(j.head, HEAD_R, BODY)

    # lado próximo
    cv.capsule(j.pelvis, j.knee, W["th"], c("th"))
    cv.capsule(j.knee, j.ankle, W["sh"], c("sh"))
    cv.capsule(j.ankle, j.toe, W["ft"], BODY)
    cv.capsule(j.shoulder, j.elbow, W["ua"], c("ua"))
    if "delt" in hl:
        cv.circle(add(j.shoulder, vec(j.pose.get("ua", -90), 7)), 11, ACCENT)
    cv.capsule(j.elbow, j.hand, W["fa"], c("fa"))
    if j.hand_tip is not None:
        cv.capsule(j.hand, j.hand_tip, W["hd"], c("fa"))
    else:
        cv.circle(j.hand, 7.5, BODY)


# ---------------------------------------------------------------------------
# Equipamentos
# ---------------------------------------------------------------------------
def plate(cv: Canvas, c, r=30):
    cv.circle(c, r, PLATE, outline=EQUIP_LIGHT, width=2.2)
    cv.circle(c, r * 0.42, EQUIP_DARK)
    cv.circle(c, 4, EQUIP_LIGHT)


def dumbbell(cv: Canvas, c, r=12):
    cv.circle(c, r, PLATE, outline=EQUIP_LIGHT, width=2)
    cv.circle(c, 3, EQUIP_LIGHT)


def bench(cv: Canvas, x0, x1, top, legs=True):
    cv.rect(x0, top - 12, x1, top, EQUIP)
    if legs:
        cv.rect(x0 + 10, 0, x0 + 18, top - 12, EQUIP_DARK, radius=1)
        cv.rect(x1 - 18, 0, x1 - 10, top - 12, EQUIP_DARK, radius=1)


def inclined_pad(cv: Canvas, base, angle, length, thickness=12, color=EQUIP):
    d = vec(angle, length)
    n = vec(angle - 90, thickness)
    p0 = base
    p1 = add(base, d)
    cv.poly([p0, p1, add(p1, n), add(p0, n)], color)


@dataclass
class Exercise:
    slug: str
    muscle: str  # grupo destacado
    folder: str  # pasta em assets/exercises
    keyframes: list[dict]
    equipment: Callable[[Canvas, Joints], None] | None = None
    foreground: Callable[[Canvas, Joints], None] | None = None
    background_props: Callable[[Canvas], None] | None = None
    frames_per_move: int = 14
    hold_frames: int = 3
    frame_ms: int = 70
    scene_w: float = SCENE_W
    floor_y: float = FLOOR_SCREEN_Y
    offset_x: float = 0.0
    show_floor: bool = True


def build_frames(ex: Exercise) -> list[Image.Image]:
    frames: list[Image.Image] = []
    kfs = ex.keyframes + [ex.keyframes[0]]
    poses: list[dict] = []
    for i in range(len(kfs) - 1):
        a, b = kfs[i], kfs[i + 1]
        poses.extend([a] * ex.hold_frames)
        for f in range(ex.frames_per_move):
            poses.append(interp_pose(a, b, ease(f / ex.frames_per_move)))
    for pose in poses:
        cv = Canvas(ex.scene_w, ex.floor_y, ex.offset_x)
        background(cv, ex.show_floor)
        if ex.background_props:
            ex.background_props(cv)
        j = solve(pose)
        if ex.equipment:
            ex.equipment(cv, j)
        draw_figure(cv, j, ex.muscle)
        if ex.foreground:
            ex.foreground(cv, j)
        frames.append(cv.finish())
    return frames
