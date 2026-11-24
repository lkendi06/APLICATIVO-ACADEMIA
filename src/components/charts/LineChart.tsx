import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, spacing } from '@/theme/tokens';
import { formatDate, formatNumber } from '@/utils/format';

export type Point = { x: Date; y: number };

type Props = {
  data: Point[];
  height?: number;
  unit?: string;
  decimals?: number;
  color?: string;
  /** Linha de referência (ex.: meta). */
  reference?: { value: number; label: string };
  accessibilityLabel: string;
};

const PAD = { top: 16, right: 12, bottom: 24, left: 40 };

/** Gráfico de linha leve (SVG), com área preenchida e toque para ver valores. */
export function LineChart({
  data,
  height = 200,
  unit = '',
  decimals = 1,
  color,
  reference,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const stroke = color ?? colors.chart[0];
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const sorted = useMemo(() => [...data].sort((a, b) => a.x.getTime() - b.x.getTime()), [data]);

  const geo = useMemo(() => {
    if (!width || sorted.length === 0) return null;
    const ys = sorted.map((p) => p.y).concat(reference ? [reference.value] : []);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const padY = (max - min) * 0.12;
    min -= padY;
    max += padY;
    const t0 = sorted[0].x.getTime();
    const t1 = sorted[sorted.length - 1].x.getTime();
    const w = width - PAD.left - PAD.right;
    const h = height - PAD.top - PAD.bottom;
    const sx = (t: number) => PAD.left + (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * w);
    const sy = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * h;
    const pts = sorted.map((p) => ({ x: sx(p.x.getTime()), y: sy(p.y), p }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x},${PAD.top + h} L${pts[0].x},${PAD.top + h} Z`;
    const ticks = [0, 0.5, 1].map((f) => min + (max - min) * (1 - f));
    return { pts, line, area, ticks, sy, h, w };
  }, [width, height, sorted, reference]);

  const sel = selected != null && geo ? geo.pts[selected] : null;
  const last = sorted[sorted.length - 1];

  return (
    <View
      accessible
      accessibilityLabel={`${accessibilityLabel}. ${sorted.length} registros. Último: ${last ? `${formatNumber(last.y, decimals)} ${unit}` : 'sem dados'}.`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ height: 22, marginBottom: spacing.xs }}>
        {sel ? (
          <Text variant="caption" color="textMuted">
            {formatDate(sel.p.x)} ·{' '}
            <Text variant="label">
              {formatNumber(sel.p.y, decimals)} {unit}
            </Text>
          </Text>
        ) : (
          <Text variant="caption" color="textSubtle">
            Toque no gráfico para ver os valores
          </Text>
        )}
      </View>
      {geo ? (
        <Pressable
          onPressIn={(e) => {
            const x = e.nativeEvent.locationX;
            let best = 0;
            geo.pts.forEach((p, i) => {
              if (Math.abs(p.x - x) < Math.abs(geo.pts[best].x - x)) best = i;
            });
            setSelected(best);
          }}>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
                <Stop offset="1" stopColor={stroke} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {geo.ticks.map((v, i) => (
              <Line
                key={i}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={geo.sy(v)}
                y2={geo.sy(v)}
                stroke={colors.border}
                strokeDasharray="3 4"
              />
            ))}
            {geo.ticks.map((v, i) => (
              <SvgText
                key={`t${i}`}
                x={PAD.left - 6}
                y={geo.sy(v) + 4}
                fontSize={10}
                fill={colors.textSubtle}
                textAnchor="end"
                fontFamily={fonts.medium}>
                {formatNumber(v, v >= 100 ? 0 : decimals)}
              </SvgText>
            ))}
            {reference ? (
              <>
                <Line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={geo.sy(reference.value)}
                  y2={geo.sy(reference.value)}
                  stroke={colors.accent}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <SvgText
                  x={width - PAD.right}
                  y={geo.sy(reference.value) - 5}
                  fontSize={10}
                  fill={colors.accent}
                  textAnchor="end"
                  fontFamily={fonts.semibold}>
                  {reference.label}
                </SvgText>
              </>
            ) : null}
            {geo.pts.length > 1 ? <Path d={geo.area} fill="url(#area)" /> : null}
            <Path
              d={geo.line}
              stroke={stroke}
              strokeWidth={2.5}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {geo.pts.map((p, i) => (
              <Circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === selected ? 6 : geo.pts.length > 40 ? 0 : 3.5}
                fill={i === selected ? stroke : colors.surface}
                stroke={stroke}
                strokeWidth={2}
              />
            ))}
            {sel ? (
              <Line
                x1={sel.x}
                x2={sel.x}
                y1={PAD.top}
                y2={PAD.top + geo.h}
                stroke={colors.borderStrong}
              />
            ) : null}
            <SvgText
              x={PAD.left}
              y={height - 6}
              fontSize={10}
              fill={colors.textSubtle}
              fontFamily={fonts.medium}>
              {formatDate(sorted[0].x, { day: '2-digit', month: 'short' })}
            </SvgText>
            <SvgText
              x={width - PAD.right}
              y={height - 6}
              fontSize={10}
              fill={colors.textSubtle}
              textAnchor="end"
              fontFamily={fonts.medium}>
              {formatDate(sorted[sorted.length - 1].x, { day: '2-digit', month: 'short' })}
            </SvgText>
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
