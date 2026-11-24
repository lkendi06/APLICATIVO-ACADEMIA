import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { AvatarStyle } from '@/types/database';

/**
 * Avatar corporal ILUSTRATIVO.
 *
 * A silhueta muda de forma suave conforme o IMC e, se informadas, a relação
 * cintura/quadril. Não é uma previsão do corpo real: o IMC não revela composição
 * corporal nem distribuição de gordura. As proporções são deliberadamente
 * estilizadas e limitadas.
 */

export const SKIN_TONES = ['#F3D3BD', '#E2B48F', '#C98E63', '#A26A43', '#7A4B2C', '#4E301C'];
export const OUTFIT_COLORS = ['#C6F432', '#8B7CFF', '#38BDF8', '#F87171', '#FBBF24', '#E5E7EB'];

export type BodyShapeInput = {
  bmi: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Fator de largura 0..1 a partir do IMC (16 → 0, 40 → 1). */
export function widthFactor(bmi: number | null): number {
  if (bmi == null) return 0.3;
  return clamp((bmi - 16) / 24, 0, 1);
}

export function bodyGeometry(input: BodyShapeInput, base: NonNullable<AvatarStyle['base']>) {
  const f = widthFactor(input.bmi);
  const fem = base === 'feminine' ? 1 : base === 'masculine' ? 0 : 0.5;
  const shoulder = 34 + f * 16 + (1 - fem) * 6;
  let waist = 22 + f * 26 + (1 - fem) * 2 - fem * 2;
  let hip = 29 + f * 22 + fem * 6;
  // Relação cintura/quadril informada pelo usuário ajusta levemente a cintura.
  if (input.waistCm && input.hipCm && input.hipCm > 0) {
    const ratio = clamp(input.waistCm / input.hipCm, 0.6, 1.15);
    waist = clamp(hip * ratio, hip * 0.62, hip * 1.12);
  }
  hip = Math.max(hip, waist * 0.92);
  const limb = 1 + f * 0.75;
  const belly = f > 0.55 ? (f - 0.55) * 22 : 0;
  return { shoulder, waist, hip, limb, belly, fem };
}

type Props = {
  input: BodyShapeInput;
  style?: AvatarStyle;
  size?: number;
  accessibilityLabel?: string;
};

export function BodyAvatar({ input, style, size = 220, accessibilityLabel }: Props) {
  const base = style?.base ?? 'neutral';
  const skin = style?.skin ?? SKIN_TONES[1];
  const outfit = style?.outfit ?? OUTFIT_COLORS[0];
  const g = bodyGeometry(input, base);
  const cx = 100;

  // Tronco: lado direito em curvas cúbicas e o esquerdo espelhado/invertido.
  type Pt = [number, number];
  const start: Pt = [9, 74];
  const segs: [Pt, Pt, Pt][] = [
    [
      [16, 78],
      [g.shoulder - 6, 78],
      [g.shoulder, 88],
    ],
    [
      [g.shoulder + 2, 104],
      [g.waist + 6, 132],
      [g.waist + g.belly * 0.4, 160],
    ],
    [
      [g.waist + g.belly * 0.4, 176],
      [g.hip, 186],
      [g.hip, 204],
    ],
  ];
  const P = (pt: Pt, dir: 1 | -1) => `${cx + dir * pt[0]} ${pt[1]}`;
  const right = segs.map(([c1, c2, e]) => `C ${P(c1, 1)}, ${P(c2, 1)}, ${P(e, 1)}`).join(' ');
  const pts: Pt[] = [start, ...segs.map((sg) => sg[2])];
  const left = segs
    .map((sg, i) => ({ c1: sg[1], c2: sg[0], e: pts[i] }))
    .reverse()
    .map(({ c1, c2, e }) => `C ${P(c1, -1)}, ${P(c2, -1)}, ${P(e, -1)}`)
    .join(' ');
  const torso = `M ${P(start, 1)} ${right} L ${cx} 212 L ${P([g.hip, 204], -1)} ${left} Z`;

  const legW = 13 * g.limb;
  const armW = 8.5 * g.limb;
  const thighGap = Math.max(2, 7 - g.limb * 3);

  const leg = (dir: 1 | -1) => {
    const x = (v: number) => cx + dir * v;
    const outer = g.hip - 2;
    return [
      `M ${x(thighGap)} 206`,
      `L ${x(outer)} 204`,
      `C ${x(outer)} 240, ${x(outer - 6)} 270, ${x(thighGap + legW + 2)} 290`,
      `C ${x(thighGap + legW)} 320, ${x(thighGap + legW * 0.8)} 350, ${x(thighGap + legW * 0.7)} 372`,
      `L ${x(thighGap + 2)} 372`,
      `C ${x(thighGap + 1)} 340, ${x(thighGap)} 300, ${x(thighGap + 1)} 290`,
      `C ${x(thighGap)} 260, ${x(thighGap)} 230, ${x(thighGap)} 206`,
      'Z',
    ].join(' ');
  };

  const arm = (dir: 1 | -1) => {
    const sx = cx + dir * (g.shoulder - 3);
    const ex = cx + dir * (g.shoulder + 4 + g.limb * 3);
    const hx = cx + dir * (g.waist + g.belly * 0.4 + 14 + g.limb * 2);
    return { sx, ex, hx };
  };

  return (
    <Svg
      width={size}
      height={size * 2}
      viewBox="0 0 200 400"
      accessibilityLabel={accessibilityLabel}>
      <Defs>
        <LinearGradient id="floor" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#000" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={cx} cy={382} rx={70} ry={8} fill="url(#floor)" />
      {/* braços */}
      {([1, -1] as const).map((d) => {
        const a = arm(d);
        return (
          <Path
            key={`arm${d}`}
            d={`M ${a.sx} 90 Q ${a.ex} 140 ${a.ex - d * 2} 168 Q ${a.hx - d * 4} 200 ${a.hx - d * 6} 222`}
            stroke={skin}
            strokeWidth={armW * 2}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
      {/* pernas */}
      <Path d={leg(1)} fill={skin} />
      <Path d={leg(-1)} fill={skin} />
      {/* pés */}
      <Rect
        x={cx + thighGap - 2}
        y={368}
        width={legW * 1.6 + 6}
        height={10}
        rx={5}
        fill="#2A2F37"
      />
      <Rect
        x={cx - thighGap - legW * 1.6 - 4}
        y={368}
        width={legW * 1.6 + 6}
        height={10}
        rx={5}
        fill="#2A2F37"
      />
      {/* tronco */}
      <Path d={torso} fill={skin} />
      {/* roupa: top + short */}
      <Path
        d={`M ${cx - g.shoulder + 6} 92 C ${cx - g.waist - 4} 120, ${cx - g.waist - g.belly * 0.4} 140, ${cx - g.waist - g.belly * 0.4 + 1} ${g.fem > 0.6 ? 132 : 160} L ${cx + g.waist + g.belly * 0.4 - 1} ${g.fem > 0.6 ? 132 : 160} C ${cx + g.waist + g.belly * 0.4} 140, ${cx + g.waist + 4} 120, ${cx + g.shoulder - 6} 92 C ${cx + 14} 84, ${cx - 14} 84, ${cx - g.shoulder + 6} 92 Z`}
        fill={outfit}
        opacity={g.fem > 0.25 ? 1 : 0}
      />
      <Path
        d={`M ${cx - g.waist - g.belly * 0.4 - 1} 168 C ${cx - g.hip} 180, ${cx - g.hip - 1} 196, ${cx - g.hip + 1} 236 L ${cx - 4} 238 L ${cx} 222 L ${cx + 4} 238 L ${cx + g.hip - 1} 236 C ${cx + g.hip + 1} 196, ${cx + g.hip} 180, ${cx + g.waist + g.belly * 0.4 + 1} 168 Z`}
        fill={outfit}
        opacity={0.92}
      />
      {/* pescoço e cabeça */}
      <Rect x={cx - 8} y={56} width={16} height={22} rx={6} fill={skin} />
      <Circle cx={cx} cy={42} r={20} fill={skin} />
      <Path
        d={`M ${cx - 20} 40 C ${cx - 20} 16, ${cx + 20} 16, ${cx + 20} 40 C ${cx + 12} 28, ${cx - 12} 28, ${cx - 20} 40 Z`}
        fill="#2A2F37"
      />
    </Svg>
  );
}
