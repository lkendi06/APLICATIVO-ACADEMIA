import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notificações locais (não exigem servidor):
 * - fim do descanso entre séries;
 * - lembretes de treino nos dias/horário escolhidos.
 */

let configured = false;

function configure() {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Treinos',
      importance: Notifications.AndroidImportance.HIGH,
    }).catch(() => undefined);
  }
}

export const notificationService = {
  async hasPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    configure();
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    configure();
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleRestEnd(seconds: number, exerciseName: string): Promise<string | null> {
    if (!(await notificationService.hasPermission())) return null;
    return Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso concluído', body: `Hora da próxima série de ${exerciseName}! 💪` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, seconds) },
    });
  },

  async cancel(id: string | null | undefined) {
    if (!id || Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  },

  /**
   * Agenda lembretes semanais. weekdays: 0 = segunda … 6 = domingo (padrão do app).
   * time: "HH:MM".
   */
  async scheduleReminders(weekdays: number[], time: string): Promise<number> {
    if (Platform.OS === 'web') return 0;
    await notificationService.cancelReminders();
    if (!(await notificationService.requestPermission())) return 0;
    const [hour, minute] = time.split(':').map(Number);
    for (const d of weekdays) {
      await Notifications.scheduleNotificationAsync({
        identifier: `reminder-${d}`,
        content: { title: 'Hora do treino! 🏋️', body: 'Seu treino de hoje está esperando no FitTrack.' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // expo: 1 = domingo … 7 = sábado
          weekday: ((d + 1) % 7) + 1,
          hour,
          minute,
        },
      });
    }
    return weekdays.length;
  },

  async cancelReminders() {
    if (Platform.OS === 'web') return;
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all.filter((n) => n.identifier.startsWith('reminder-')).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  },
};
