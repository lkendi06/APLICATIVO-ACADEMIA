import { router } from 'expo-router';
import { View } from 'react-native';

import { BmiScale } from '@/components/body/BmiScale';
import { LineChart } from '@/components/charts/LineChart';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingView,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useMetrics, useProfile } from '@/hooks/queries';
import { useBodyStats } from '@/hooks/useBodyStats';
import { spacing } from '@/theme/tokens';
import { BMI_CATEGORIES, healthyWeightRange } from '@/utils/bmi';
import { formatDateTime, formatFixed, formatNumber } from '@/utils/format';

export default function BmiScreen() {
  const metrics = useMetrics();
  const profile = useProfile();
  const s = useBodyStats(metrics.data, profile.data?.birth_date);

  if (metrics.isLoading) return <LoadingView />;

  const range = s.height ? healthyWeightRange(s.height) : null;

  return (
    <Screen back title="IMC">
      {s.bmi == null ? (
        <EmptyState
          icon="calculator-outline"
          title="Faltam dados"
          message={
            !s.weight
              ? 'Registre seu peso para calcular o IMC.'
              : 'Registre sua altura para calcular o IMC.'
          }
          actionLabel="Adicionar medição"
          onAction={() => router.push('/metrics/new')}
        />
      ) : (
        <>
          <Card style={{ gap: spacing.md }}>
            <Text variant="overline" color="textMuted">
              Seu IMC atual
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
              <Text variant="display" tabular testID="bmi-value">
                {formatFixed(s.bmi, 2)}
              </Text>
              {s.category ? (
                <View style={{ paddingBottom: 6 }}>
                  <Badge label={s.category.label} tone={s.category.tone} />
                </View>
              ) : null}
            </View>
            <Text variant="caption" color="textMuted">
              {formatNumber(s.weight, 1)} kg ÷ ({formatFixed(s.height! / 100, 2)} m)² · atualizado
              em {formatDateTime(s.lastUpdate)}
            </Text>
            {s.adult ? <BmiScale bmi={s.bmi} /> : null}
          </Card>

          {!s.adult ? (
            <Card tone="alt" style={{ flexDirection: 'row', gap: spacing.md }}>
              <Icon name="warning-outline" size={20} color="warning" />
              <Text variant="bodySm" style={{ flex: 1 }}>
                Pela data de nascimento informada, você tem menos de 18 anos. As faixas de IMC para
                adultos não se aplicam: para crianças e adolescentes são usadas curvas por idade e
                sexo, avaliadas por um profissional de saúde.
              </Text>
            </Card>
          ) : null}

          {range && s.adult ? (
            <Card tone="primary">
              <Text variant="bodySm">
                Para sua altura, a faixa de IMC “peso adequado” (18,5 a 24,9) corresponde a
                aproximadamente{' '}
                <Text variant="label">
                  {formatNumber(range[0], 1)} a {formatNumber(range[1], 1)} kg
                </Text>
                .
              </Text>
            </Card>
          ) : null}

          {s.series.length > 1 ? (
            <>
              <SectionHeader title="Evolução do IMC" />
              <Card>
                <LineChart
                  data={s.series.map((p) => ({ x: p.date, y: p.bmi }))}
                  decimals={2}
                  accessibilityLabel="Evolução histórica do IMC"
                />
              </Card>
            </>
          ) : null}

          {s.adult ? (
            <>
              <SectionHeader title="Classificação para adultos (OMS)" />
              <Card style={{ gap: spacing.sm }}>
                {BMI_CATEGORIES.map((c) => (
                  <View
                    key={c.key}
                    style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text
                      variant="bodySm"
                      color={s.category?.key === c.key ? 'text' : 'textMuted'}
                      style={{
                        fontFamily: s.category?.key === c.key ? 'Inter_700Bold' : undefined,
                      }}>
                      {c.label}
                    </Text>
                    <Text variant="bodySm" color="textMuted" tabular>
                      {c.min === 0
                        ? `abaixo de ${formatFixed(c.max, 1)}`
                        : c.max === Infinity
                          ? `${formatFixed(c.min, 1)} ou mais`
                          : `${formatFixed(c.min, 1)} a ${formatFixed(c.max - 0.1, 1)}`}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}

      <SectionHeader title="O que é o IMC?" />
      <Card style={{ gap: spacing.sm }}>
        <Text variant="bodySm">
          O Índice de Massa Corporal relaciona peso e altura: IMC = peso (kg) ÷ altura² (m).
          Exemplo: 80 kg e 1,80 m → 80 ÷ 3,24 = 24,69.
        </Text>
        <Text variant="bodySm" color="textMuted">
          É um indicador geral, útil para acompanhar tendências, mas não mede a composição corporal:
          não distingue músculo de gordura nem mostra onde a gordura está distribuída.
        </Text>
      </Card>
      <Card tone="alt" style={{ gap: spacing.sm }}>
        <Text variant="label">Limitações importantes</Text>
        <Text variant="bodySm" color="textMuted">
          • Pessoas com muita massa muscular (ex.: atletas) podem ter IMC alto sem excesso de
          gordura.{'\n'}• Na gravidez o IMC não deve ser usado para classificação.{'\n'}• Idosos,
          crianças e adolescentes têm referências diferentes.{'\n'}• Para avaliação de saúde,
          consulte um médico ou nutricionista.
        </Text>
      </Card>
      <Button
        title="Nova medição"
        variant="secondary"
        icon="add"
        onPress={() => router.push('/metrics/new')}
      />
    </Screen>
  );
}
