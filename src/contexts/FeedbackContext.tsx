import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadows, spacing } from '@/theme/tokens';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type FeedbackValue = {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const counter = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setDialog(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const toneColor = { success: colors.success, error: colors.danger, info: colors.info };
  const toneIcon = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' } as const;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.toastHost, { top: insets.top + spacing.sm }]}>
        {toasts.map((t) => (
          <Animated.View
            key={t.id}
            entering={FadeInUp.springify().damping(18)}
            exiting={FadeOutUp.duration(180)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[
              styles.toast,
              shadows.card,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}>
            <Icon name={toneIcon[t.tone]} size={20} color={toneColor[t.tone]} />
            <Text variant="bodySm" style={{ flex: 1 }}>
              {t.message}
            </Text>
          </Animated.View>
        ))}
      </View>
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => close(false)}>
          <Pressable
            accessibilityViewIsModal
            style={[styles.dialog, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
            onPress={() => undefined}>
            <Text variant="h3">{dialog?.title}</Text>
            <Text variant="bodySm" color="textMuted">
              {dialog?.message}
            </Text>
            <View style={styles.actions}>
              <Button
                title={dialog?.cancelLabel ?? 'Cancelar'}
                variant="secondary"
                onPress={() => close(false)}
                style={{ flex: 1 }}
              />
              <Button
                testID="confirm-dialog-ok"
                title={dialog?.confirmLabel ?? 'Confirmar'}
                variant={dialog?.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback precisa estar dentro de FeedbackProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toastHost: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
