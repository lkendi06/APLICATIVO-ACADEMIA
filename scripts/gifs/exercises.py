"""Definição das animações de cada exercício (keyframes + equipamentos)."""

from __future__ import annotations

import math

from rig import (EQUIP, EQUIP_DARK, EQUIP_LIGHT, L, Canvas, Exercise, add, bench, dumbbell,
                 inclined_pad, plate, sub, vec)

# ---------------------------------------------------------------------------
# Cinemática inversa de 2 segmentos (para posicionar mãos e pés em alvos)
# ---------------------------------------------------------------------------


def ik2(base, target, a, b, bend):
    dx, dy = target[0] - base[0], target[1] - base[1]
    d = max(1e-6, min(math.hypot(dx, dy), a + b - 1e-3))
    theta = math.atan2(dy, dx)
    cos_alpha = (a * a + d * d - b * b) / (2 * a * d)
    alpha = math.acos(max(-1.0, min(1.0, cos_alpha)))
    best = None
    for sign in (1, -1):
        a1 = theta + sign * alpha
        joint = (base[0] + math.cos(a1) * a, base[1] + math.sin(a1) * a)
        score = {
            "forward": joint[0],
            "back": -joint[0],
            "up": joint[1],
            "down": -joint[1],
        }[bend]
        if best is None or score > best[0]:
            a2 = math.atan2(target[1] - joint[1], target[0] - joint[0])
            best = (score, math.degrees(a1), math.degrees(a2))
    return best[1], best[2]


def shoulder_of(pose):
    return add(pose["root"], vec(pose.get("t", 90), L["t"]))


def legs_to(pose, ankle, bend="forward", far_ankle=None, far_bend=None):
    th, sh = ik2(pose["root"], ankle, L["th"], L["sh"], bend)
    pose["th"], pose["sh"] = th, sh
    if far_ankle is not None:
        th2, sh2 = ik2(pose["root"], far_ankle, L["th"], L["sh"], far_bend or bend)
        pose["th2"], pose["sh2"] = th2, sh2
    return pose


def arms_to(pose, hand, bend="down", far_hand=None, far_bend=None):
    s = shoulder_of(pose)
    ua, fa = ik2(s, hand, L["ua"], L["fa"], bend)
    pose["ua"], pose["fa"] = ua, fa
    if far_hand is not None:
        ua2, fa2 = ik2(s, far_hand, L["ua"], L["fa"], far_bend or bend)
        pose["ua2"], pose["fa2"] = ua2, fa2
    return pose


def P(**kw):
    return dict(kw)


# ---------------------------------------------------------------------------
# Equipamentos reutilizáveis
# ---------------------------------------------------------------------------


def eq_barbell(cv, j):
    plate(cv, j.hand)


def eq_dumbbells(cv, j):
    dumbbell(cv, j.hand2)


def fg_dumbbell(cv, j):
    dumbbell(cv, j.hand)


def eq_dumbbells_both(cv, j):
    dumbbell(cv, j.hand2)


def flat_bench(x0, x1, top=95):
    def f(cv):
        bench(cv, x0, x1, top)

    return f


def mat(x0, x1):
    def f(cv):
        cv.rect(x0, 0, x1, 4, EQUIP_DARK, radius=2)

    return f


def cable_from(pulley):
    def f(cv, j):
        cv.line(j.hand, pulley, EQUIP_LIGHT, 2.2)
        cv.circle(pulley, 9, EQUIP, outline=EQUIP_LIGHT, width=2)

    return f


# ---------------------------------------------------------------------------
# Exercícios
# ---------------------------------------------------------------------------
EXERCISES: list[Exercise] = []


def add_ex(ex: Exercise):
    EXERCISES.append(ex)
    return ex


# ---- Peito -----------------------------------------------------------------
def _bench_press():
    base = dict(root=(250, 113), t=180, n=182)
    up = legs_to(P(**base), (318, 10), "up")
    up = arms_to(up, (162, 230), "down")
    down = legs_to(P(**base), (318, 10), "up")
    down = arms_to(down, (176, 146), "down")
    return Exercise("supino-reto", "chest", "chest", [up, down], equipment=None,
                    foreground=eq_barbell, background_props=flat_bench(100, 290))


add_ex(_bench_press())


def _incline_db():
    def props(cv):
        cv.rect(200, 0, 212, 80, EQUIP_DARK, radius=1)
        cv.rect(190, 68, 285, 82, EQUIP)
        inclined_pad(cv, (212, 80), 145, 120, thickness=-14)

    base = dict(root=(238, 98), t=145, n=150)
    s = shoulder_of(base)
    up = arms_to(legs_to(P(**base), (305, 10), "up"), (s[0] + 14, s[1] + 112), "down")
    down = arms_to(legs_to(P(**base), (305, 10), "up"), (s[0] + 22, s[1] + 18), "down")
    return Exercise("supino-inclinado-halteres", "chest", "chest", [up, down],
                    equipment=eq_dumbbells, foreground=fg_dumbbell, background_props=props)


add_ex(_incline_db())


def _push_up():
    ankle = (70, 12)

    def pose(angle):
        pelvis = add(ankle, vec(angle, L["th"] + L["sh"]))
        p = P(root=pelvis, t=angle, n=angle + 5, ft=-65)
        p["th"] = p["sh"] = angle + 180
        return arms_to(p, (312, 9), "up")

    return Exercise("flexao-de-braco", "chest", "chest", [pose(25.5), pose(9)],
                    background_props=mat(40, 360))


add_ex(_push_up())

# ---- Costas ----------------------------------------------------------------


def _lat_pulldown():
    def props(cv):
        cv.rect(150, 0, 160, 88, EQUIP_DARK, radius=1)
        cv.rect(125, 88, 225, 100, EQUIP)
        cv.circle((276, 128), 11, EQUIP, outline=EQUIP_LIGHT, width=2)
        cv.rect(268, 0, 276, 128, EQUIP_DARK, radius=1)

    base = dict(root=(185, 110), t=100, n=95)
    top = arms_to(legs_to(P(**base), (282, 10), "up"), (185, 318), "down")
    s = shoulder_of(base)
    down = arms_to(legs_to(P(**base), (282, 10), "up"), (s[0] + 12, s[1] + 6), "down")

    def eq(cv, j):
        cable_from((j.hand[0], 345))(cv, j)
        cv.circle(j.hand, 6, EQUIP_LIGHT)

    return Exercise("puxada-frontal", "back", "back", [top, down], equipment=eq,
                    background_props=props, scene_w=440, floor_y=375)


add_ex(_lat_pulldown())


def _barbell_row():
    base = dict(root=(162, 150), t=22, n=30)
    hang_shoulder = shoulder_of(base)
    down = arms_to(legs_to(P(**base), (210, 10), "forward"),
                   (hang_shoulder[0] + 4, hang_shoulder[1] - 112), "back")
    up = arms_to(legs_to(P(**base), (210, 10), "forward"),
                 (hang_shoulder[0] - 50, hang_shoulder[1] - 40), "up")
    return Exercise("remada-curvada", "back", "back", [down, up], foreground=eq_barbell)


add_ex(_barbell_row())


def _deadlift():
    bottom = P(root=(146, 98), t=38, n=48)
    bottom = arms_to(legs_to(bottom, (196, 10), "forward"), (218, 34), "back")
    top = P(root=(194, 172), t=91, n=92)
    top = arms_to(legs_to(top, (196, 10), "forward"), (200, 151), "back")
    return Exercise("levantamento-terra", "back", "back", [bottom, top], foreground=eq_barbell,
                    frames_per_move=16)


add_ex(_deadlift())


def _pull_up():
    bar = (200, 420)

    def props(cv):
        cv.rect(80, bar[1] - 4, 320, bar[1] + 4, EQUIP, radius=4)
        cv.rect(300, 0, 310, bar[1], EQUIP_DARK, radius=1)

    hang = P(root=(198, 214), t=90, n=92, th=-96, sh=-104, ft=-20)
    hang = arms_to(hang, bar, "forward")
    top = P(root=(194, 290), t=86, n=95, th=-80, sh=-112, ft=-20)
    top = arms_to(top, bar, "forward")
    return Exercise("barra-fixa", "back", "back", [hang, top], background_props=props,
                    scene_w=470, floor_y=455, frames_per_move=16)


add_ex(_pull_up())

# ---- Ombros ----------------------------------------------------------------


def _seat(cv):
    bench(cv, 130, 245, 95)


def _shoulder_press():
    base = dict(root=(185, 108), t=90, n=90)
    s = shoulder_of(base)
    up = arms_to(legs_to(P(**base), (272, 10), "up"), (s[0] + 6, s[1] + 113), "down")
    down = arms_to(legs_to(P(**base), (272, 10), "up"), (s[0] + 16, s[1] + 22), "down")
    return Exercise("desenvolvimento-halteres", "shoulders", "shoulders", [down, up],
                    equipment=eq_dumbbells, foreground=fg_dumbbell, background_props=_seat,
                    scene_w=430, floor_y=372)


add_ex(_shoulder_press())


def _front_raise():
    base = dict(root=(196, 9), anchor="ankle", t=90, n=90, th=-90, sh=-90)
    down = P(**base, ua=-86, fa=-84)
    up = P(**base, ua=0, fa=2)
    return Exercise("elevacao-frontal", "shoulders", "shoulders", [down, up],
                    equipment=eq_dumbbells, foreground=fg_dumbbell)


add_ex(_front_raise())

# ---- Bíceps ----------------------------------------------------------------


def _curl():
    base = dict(root=(196, 9), anchor="ankle", t=90, n=90, th=-90, sh=-90)
    down = P(**base, ua=-88, fa=-80)
    up = P(**base, ua=-82, fa=112)
    return Exercise("rosca-direta", "biceps", "arms", [down, up], foreground=eq_barbell)


add_ex(_curl())


def _hammer_curl():
    base = dict(root=(196, 9), anchor="ankle", t=90, n=90, th=-90, sh=-90)
    down = P(**base, ua=-88, fa=-82, ua2=-88, fa2=-82)
    near_up = P(**base, ua=-82, fa=105, ua2=-88, fa2=-82)
    far_up = P(**base, ua=-88, fa=-82, ua2=-82, fa2=105)
    return Exercise("rosca-martelo", "biceps", "arms", [down, near_up, down, far_up],
                    equipment=eq_dumbbells, foreground=fg_dumbbell, frames_per_move=12)


add_ex(_hammer_curl())

# ---- Tríceps ---------------------------------------------------------------


def _pushdown():
    def props(cv):
        cv.rect(268, 0, 282, 360, EQUIP_DARK, radius=2)

    base = dict(root=(190, 9), anchor="ankle", t=84, n=80, th=-92, sh=-88)
    up = P(**base, ua=-100, fa=38)
    down = P(**base, ua=-98, fa=-84)
    return Exercise("triceps-polia", "triceps", "arms", [up, down],
                    equipment=cable_from((262, 352)), background_props=props,
                    scene_w=420, floor_y=360)


add_ex(_pushdown())


def _overhead_ext():
    base = dict(root=(185, 108), t=92, n=92)
    up = legs_to(P(**base, ua=96, fa=92), (272, 10), "up")
    down = legs_to(P(**base, ua=100, fa=-118), (272, 10), "up")
    return Exercise("triceps-frances", "triceps", "arms", [up, down], foreground=fg_dumbbell,
                    background_props=_seat, scene_w=430, floor_y=372)


add_ex(_overhead_ext())


def _bench_dip():
    hand = (150, 96)

    def props(cv):
        bench(cv, 40, 150, 92)

    up = arms_to(legs_to(P(root=(160, 118), t=96, n=96, ft=70), (282, 10), "up"), hand, "back")
    down = arms_to(legs_to(P(root=(162, 70), t=99, n=96, ft=70), (282, 10), "up"), hand, "back")
    return Exercise("mergulho-banco", "triceps", "arms", [up, down], background_props=props)


add_ex(_bench_dip())

# ---- Antebraço -------------------------------------------------------------


def _wrist_curl():
    base = dict(root=(175, 108), t=62, n=50, ua=-80, fa=-4)
    down = legs_to(P(**base, hd=-70), (268, 10), "up")
    up = legs_to(P(**base, hd=45), (268, 10), "up")

    def fg(cv, j):
        dumbbell(cv, j.hand_tip, 11)

    return Exercise("rosca-punho", "forearms", "arms", [down, up], foreground=fg,
                    background_props=_seat)


add_ex(_wrist_curl())

# ---- Quadríceps ------------------------------------------------------------


def _squat():
    top = P(root=(196, 9), anchor="ankle", t=90, n=90, th=-90, sh=-90, ua=-150, fa=40)
    bottom = P(root=(196, 9), anchor="ankle", t=52, n=62, th=-12, sh=-114, ua=-172, fa=22)
    return Exercise("agachamento-livre", "quadriceps", "legs", [top, bottom],
                    foreground=eq_barbell, frames_per_move=16)


add_ex(_squat())


def _leg_press():
    rail = 36

    def props(cv):
        cv.rect(40, 0, 330, 10, EQUIP_DARK, radius=2)
        cv.rect(110, 10, 122, 60, EQUIP_DARK, radius=1)
        inclined_pad(cv, (95, 60), 0, 80, thickness=-12)
        inclined_pad(cv, (95, 60), 132, 90, thickness=14)
        p0 = (190, 80)
        cv.line(p0, add(p0, vec(rail, 210)), EQUIP, 6)

    def fg(cv, j):
        c = add(j.ankle, vec(rail, 10))
        d = vec(rail + 90, 40)
        cv.line(sub(c, d), add(c, d), EQUIP_LIGHT, 9)

    base = dict(root=(140, 82), t=132, n=118, ua=-55, fa=-20)
    ext = legs_to(P(**base, ft=rail + 90), add((140, 82), vec(rail, 162)), "up")
    bent = legs_to(P(**base, ft=rail + 90), add((140, 82), vec(rail, 98)), "up")
    return Exercise("leg-press", "quadriceps", "legs", [bent, ext], foreground=fg,
                    background_props=props)


add_ex(_leg_press())


def _leg_extension():
    def props(cv):
        cv.rect(150, 0, 162, 86, EQUIP_DARK, radius=1)
        cv.rect(110, 86, 262, 98, EQUIP)
        inclined_pad(cv, (124, 98), 100, 110, thickness=14)

    def fg(cv, j):
        cv.circle(add(j.ankle, vec(j.pose["sh"] + 90, 12)), 11, EQUIP, outline=EQUIP_LIGHT,
                  width=2)

    base = dict(root=(175, 114), t=100, n=95, th=-2, ua=-75, fa=-40)
    bent = P(**base, sh=-92, ft=-5)
    ext = P(**base, sh=-4, ft=80)
    return Exercise("cadeira-extensora", "quadriceps", "legs", [bent, ext], foreground=fg,
                    background_props=props)


add_ex(_leg_extension())


def _lunge():
    front, back = (248, 10), (140, 14)
    top = P(root=(196, 168), t=92, n=92, ft=0, ft2=-55, ua=-90, fa=-90, ua2=-90, fa2=-90)
    top = legs_to(top, front, "forward", back, "forward")
    bottom = P(root=(194, 96), t=94, n=92, ft=0, ft2=-35, ua=-90, fa=-90, ua2=-90, fa2=-90)
    bottom = legs_to(bottom, front, "forward", back, "down")
    return Exercise("afundo", "quadriceps", "legs", [top, bottom], equipment=eq_dumbbells,
                    foreground=fg_dumbbell, frames_per_move=16)


add_ex(_lunge())

# ---- Posterior de coxa -----------------------------------------------------


def _rdl():
    top = P(root=(198, 9), anchor="ankle", t=90, n=90, th=-92, sh=-88, ua=-90, fa=-90)
    bottom = P(root=(198, 9), anchor="ankle", t=18, n=20, th=-104, sh=-80, ua=-88, fa=-88)
    return Exercise("stiff", "hamstrings", "legs", [top, bottom], foreground=eq_barbell,
                    frames_per_move=16)


add_ex(_rdl())


def _leg_curl():
    def props(cv):
        bench(cv, 80, 330, 95)

    def fg(cv, j):
        cv.circle(add(j.ankle, vec(j.pose["sh"] - 90, 11)), 11, EQUIP, outline=EQUIP_LIGHT,
                  width=2)

    base = dict(root=(214, 113), t=2, n=12, ua=-95, fa=-60, th=180)
    straight = P(**base, sh=180, ft=-90)
    curled = P(**base, sh=72, ft=-18)
    return Exercise("mesa-flexora", "hamstrings", "legs", [straight, curled], foreground=fg,
                    background_props=props)


add_ex(_leg_curl())

# ---- Glúteos ---------------------------------------------------------------


def _hip_thrust():
    def props(cv):
        bench(cv, 30, 128, 92)

    def make(pelvis, t):
        p = P(root=pelvis, t=t, n=t - 8)
        legs_to(p, (292, 10), "up")
        return arms_to(p, add(pelvis, (6, 26)), "up")

    down = make((194, 50), 141)
    top = make((216, 108), 179)

    def fg(cv, j):
        plate(cv, add(j.pelvis, (6, 32)), 28)

    return Exercise("elevacao-pelvica", "glutes", "legs", [down, top], foreground=fg,
                    background_props=props)


add_ex(_hip_thrust())


def _glute_bridge():
    def make(pelvis, t):
        p = P(root=pelvis, t=t, n=t, ua=-2, fa=0)
        p = legs_to(p, (292, 12), "up")
        s = shoulder_of(p)
        p["ua"], p["fa"] = -math.degrees(math.atan2(s[1] - 10, 120)) * 0.6, 0
        return p

    down = make((212, 22), 180)
    up = make((198, 70), 212)
    return Exercise("ponte-de-gluteo", "glutes", "legs", [down, up], background_props=mat(50, 350))


add_ex(_glute_bridge())

# ---- Panturrilhas ----------------------------------------------------------


def _standing_calf():
    toe = (238, 42)

    def props(cv):
        cv.rect(222, 0, 330, 34, EQUIP)

    def pose(ft):
        ankle = sub(toe, vec(ft, L["ft"]))
        return P(root=ankle, anchor="ankle", t=90, n=90, th=-90, sh=-90, ft=ft, ua=-90, fa=-90)

    return Exercise("panturrilha-em-pe", "calves", "legs", [pose(22), pose(-48)],
                    equipment=eq_dumbbells, foreground=fg_dumbbell, background_props=props,
                    scene_w=430, floor_y=368)


add_ex(_standing_calf())


def _seated_calf():
    toe = (268, 36)

    def props(cv):
        bench(cv, 110, 215, 95)
        cv.rect(254, 0, 330, 28, EQUIP)

    def make(ft):
        ankle = sub(toe, vec(ft, L["ft"]))
        p = P(root=(165, 108), t=94, n=90, ft=ft)
        legs_to(p, ankle, "up")
        knee = add(p["root"], vec(p["th"], L["th"]))
        p["_knee"] = knee
        return p

    lo, hi = make(24), make(-38)
    for p in (lo, hi):
        knee = p.pop("_knee")
        arms_to(p, add(knee, (0, 26)), "down")

    def fg(cv, j):
        cv.rect(j.knee[0] - 26, j.knee[1] + 12, j.knee[0] + 20, j.knee[1] + 24, EQUIP)

    return Exercise("panturrilha-sentado", "calves", "legs", [lo, hi], foreground=fg,
                    background_props=props)


add_ex(_seated_calf())

# ---- Abdômen ---------------------------------------------------------------


def _crunch():
    def make(t):
        p = P(root=(228, 20), t=t, n=t - 14)
        legs_to(p, (318, 12), "up")
        s = shoulder_of(p)
        mid = add(p["root"], vec(t, 58))
        return arms_to(p, add(mid, vec(t - 90, -16)), "up") if s else p

    return Exercise("abdominal-supra", "abs", "abs", [make(180), make(146)],
                    background_props=mat(50, 350))


add_ex(_crunch())


def _plank():
    ankle = (62, 12)

    def make(lift):
        angle = 12.8 + lift
        pelvis = add(ankle, vec(angle, L["th"] + L["sh"]))
        p = P(root=pelvis, t=angle - lift * 1.5, n=angle + 4, ft=-65, ua=-90, fa=0)
        p["th"] = p["sh"] = angle + 180
        return p

    return Exercise("prancha", "abs", "abs", [make(0), make(0.8)],
                    background_props=mat(30, 370), frames_per_move=20, hold_frames=8,
                    frame_ms=80)


add_ex(_plank())


def _leg_raise():
    def make(a):
        return P(root=(200, 20), t=180, n=182, ua=-2, fa=0, th=a, sh=a, ft=a + 90)

    return Exercise("elevacao-de-pernas", "abs", "abs", [make(8), make(86)],
                    background_props=mat(40, 360), frames_per_move=16)


add_ex(_leg_raise())
