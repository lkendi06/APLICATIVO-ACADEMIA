import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/theme/ThemeProvider';
import { fonts } from '@/theme/tokens';
import { formatNumber } from '@/utils/format';

type Bar = { label: string; value: number; highlight?: boolean };

type Props = {
  data: Bar[];
  height?: number;
  accessibilityLabel: string;
  showValues?: boolean;
  decimals?: number;
};

export function BarChart({
  data,
  height = 150,
  accessibilityLabel,
  showValues = true,
  decimals = 0,
}: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelH = 18;
  const valueH = showValues ? 16 : 0;
  const chartH = height - labelH - valueH;
  const slot = data.length ? width / data.length : 0;
  const barW = Math.min(28, slot * 0.56);

  return (
    <View
      accessible
      accessibilityLabel={`${accessibilityLabel}: ${data.map((d) => `${d.label} ${formatNumber(d.value, decimals)}`).join(', ')}`}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(4, (d.value / max) * chartH) : 3;
            const x = i * slot + (slot - barW) / 2;
            const y = valueH + chartH - h;
            const fill =
              d.value > 0 ? (d.highlight ? colors.primary : colors.accent) : colors.surfaceAlt;
            return (
              <G key={i}>
                <Rect x={x} y={y} width={barW} height={h} rx={Math.min(8, barW / 2)} fill={fill} />
                {showValues && d.value > 0 ? (
                  <SvgText
                    x={x + barW / 2}
                    y={y - 4}
                    fontSize={10}
                    fill={colors.textMuted}
                    textAnchor="middle"
                    fontFamily={fonts.semibold}>
                    {formatNumber(d.value, decimals)}
                  </SvgText>
                ) : null}
                <SvgText
                  x={x + barW / 2}
                  y={height - 4}
                  fontSize={11}
                  fill={d.highlight ? colors.text : colors.textSubtle}
                  textAnchor="middle"
                  fontFamily={fonts.medium}>
                  {d.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}
