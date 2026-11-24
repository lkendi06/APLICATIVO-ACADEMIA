import { Platform, View } from 'react-native';

import {
  Card,
  Chip,
  ErrorView,
  ListRow,
  ListSkeleton,
  Screen,
  SectionHeader,
  Segmented,
  Stepper,
  Text,
  TextField,
} from '@/components/ui';
import { useFeedback } from '@/contexts/FeedbackContext';
import { usePreferences, useUpdatePreferences } from '@/hooks/queries';
import { useSyncedState } from '@/hooks/useSyncedState';
import { notificationService } from '@/services/notifications';
import { useTheme, type ThemePreference } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { WEEKDAY_SHORT } from '@/utils/dates';
import { friendlyError } from '@/utils/errors';
import type { UserPreferences } from '@/types/database';

const THEME_OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'dark', label: 'Escuro' },
  { key: 'light', label: 'Claro' },
  { key: 'system', label: 'Sistema' },
];

const isValidTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

export default function Settings() {
  const prefs = usePreferences();
  const update = useUpdatePreferences();
  const { setPreference } = useTheme();
  const { toast } = useFeedback();
  const [time, setTime] = useSyncedState(prefs.data?.reminder_time?.slice(0, 5) ?? '18:00');

  async function save(patch: Partial<UserPreferences>) {
    try {
      return await update.mutateAsync(patch);
    } catch (e) {
      toast(friendlyError(e), 'error');
      return null;
    }
  }

  async function applyReminders(
    next: Pick<UserPreferences, 'notifications_enabled' | 'reminder_weekdays'> & { time: string },
  ) {
    if (
      !next.notifications_enabled ||
      next.reminder_weekdays.length === 0 ||
      !isValidTime(next.time)
    ) {
      await notificationService.cancelReminders();
      return;
    }
    const n = await notificationService.scheduleReminders(next.reminder_weekdays, next.time);
    if (n === 0 && Platform.OS !== 'web')
      toast('Permita notificações nas configurações do aparelho.', 'error');
  }

  if (prefs.isLoading) {
    return (
      <Screen title="Configurações" back>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (prefs.error || !prefs.data) {
    return (
      <Screen title="Configurações" back>
        <ErrorView error={prefs.error} onRetry={prefs.refetch} />
      </Screen>
    );
  }
  const p = prefs.data;

  return (
    <Screen title="Configurações" back>
      <SectionHeader title="Aparência" />
      <Segmented
        options={THEME_OPTIONS}
        value={p.theme}
        onChange={(theme) => {
          setPreference(theme);
          save({ theme });
        }}
      />

      <SectionHeader title="Unidades" />
      <Card style={{ gap: spacing.md }}>
        <Text variant="label" color="textMuted">
          Peso e cargas
        </Text>
        <Segmented
          options={[
            { key: 'kg', label: 'Quilogramas (kg)' },
            { key: 'lb', label: 'Libras (lb)' },
          ]}
          value={p.weight_unit}
          onChange={(weight_unit) => save({ weight_unit })}
        />
        <Text variant="label" color="textMuted">
          Medidas e altura
        </Text>
        <Segmented
          options={[
            { key: 'cm', label: 'Centímetros (cm)' },
            { key: 'in', label: 'Polegadas (in)' },
          ]}
          value={p.length_unit}
          onChange={(length_unit) => save({ length_unit })}
        />
        <Text variant="caption" color="textSubtle">
          Os dados são sempre guardados em kg e cm. A unidade muda só a exibição.
        </Text>
      </Card>

      <SectionHeader title="Treino" />
      <Stepper
        label="Descanso padrão entre séries"
        value={p.default_rest_seconds}
        step={15}
        min={0}
        max={600}
        suffix="s"
        onChange={(default_rest_seconds) => save({ default_rest_seconds })}
      />

      <SectionHeader title="Notificações" />
      <Card padded={false}>
        <ListRow
          icon="notifications-outline"
          title="Lembretes de treino"
          subtitle={
            Platform.OS === 'web'
              ? 'Disponível no aplicativo para celular'
              : 'Avisos nos dias escolhidos'
          }
          switchValue={p.notifications_enabled}
          onSwitch={async (v) => {
            if (v && !(await notificationService.requestPermission()) && Platform.OS !== 'web') {
              toast('Permita notificações nas configurações do aparelho.', 'error');
              return;
            }
            const saved = await save({
              notifications_enabled: v,
              reminder_time: p.reminder_time ?? `${time}:00`,
            });
            if (saved)
              await applyReminders({
                notifications_enabled: v,
                reminder_weekdays: saved.reminder_weekdays,
                time,
              });
          }}
          testID="settings-reminders"
        />
      </Card>
      {p.notifications_enabled ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="label" color="textMuted">
            Dias da semana
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {WEEKDAY_SHORT.map((label, i) => {
              const on = p.reminder_weekdays.includes(i);
              return (
                <Chip
                  key={label}
                  label={label}
                  selected={on}
                  onPress={async () => {
                    const days = on
                      ? p.reminder_weekdays.filter((d) => d !== i)
                      : [...p.reminder_weekdays, i].sort();
                    const saved = await save({ reminder_weekdays: days });
                    if (saved)
                      await applyReminders({
                        notifications_enabled: true,
                        reminder_weekdays: days,
                        time,
                      });
                  }}
                />
              );
            })}
          </View>
          <TextField
            label="Horário"
            placeholder="HH:MM"
            keyboardType="number-pad"
            value={time}
            maxLength={5}
            onChangeText={(t) => {
              const d = t.replace(/\D/g, '').slice(0, 4);
              setTime(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d);
            }}
            onBlur={async () => {
              if (!isValidTime(time)) {
                toast('Horário inválido. Use HH:MM.', 'error');
                return;
              }
              const saved = await save({ reminder_time: `${time}:00` });
              if (saved)
                await applyReminders({
                  notifications_enabled: true,
                  reminder_weekdays: saved.reminder_weekdays,
                  time,
                });
            }}
            error={
              time.length === 5 && !isValidTime(time)
                ? 'Use um horário entre 00:00 e 23:59.'
                : undefined
            }
          />
        </Card>
      ) : null}
      <Text variant="caption" color="textSubtle">
        O aviso de fim de descanso aparece durante o treino quando as notificações estão permitidas.
      </Text>
    </Screen>
  );
}
