import type { BottomTabBarProps } from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useActiveWorkout } from '@/hooks/useActiveWorkout';
import { useTheme } from '@/theme/ThemeProvider';
import { radii, shadows, spacing } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Início', icon: 'home-outline', iconActive: 'home' },
  workouts: { label: 'Treinos', icon: 'barbell-outline', iconActive: 'barbell' },
  log: { label: 'Registrar', icon: 'add', iconActive: 'add' },
  metrics: { label: 'Métricas', icon: 'analytics-outline', iconActive: 'analytics' },
  profile: { label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
};

export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const active = useActiveWorkout();

  return (
    <View
      style={[
        styles.bar,
        shadows.card,
        {
          backgroundColor: colors.tabBar,
          borderColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
      accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const meta = TABS[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const onPress = () => {
          if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
          if (!focused) navigateToTab(route.key);
        };
        if (route.name === 'log') {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={active ? 'Registrar: treino em andamento' : 'Registrar treino'}
              onPress={onPress}
              style={styles.centerWrap}
              testID="tab-log">
              <View style={[styles.centerBtn, { backgroundColor: colors.primary }]}>
                <Icon name={active ? 'pulse' : 'add'} size={28} color={colors.onPrimary} />
              </View>
              {active ? (
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: colors.danger, borderColor: colors.tabBar },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        }
        return (
          <TabItem
            key={route.key}
            label={meta.label}
            icon={focused ? meta.iconActive : meta.icon}
            focused={focused}
            onPress={onPress}
            testID={`tab-${route.name}`}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  testID,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const indicator = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.3) }],
  }));
  return (
    <Pressable
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.item}>
      <Animated.View style={[styles.indicator, { backgroundColor: colors.primary }, indicator]} />
      <Icon name={icon} size={22} color={focused ? colors.text : colors.textSubtle} />
      <Text
        variant="caption"
        style={{ color: focused ? colors.text : colors.textSubtle, fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  item: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  indicator: { position: 'absolute', top: -spacing.sm, width: 24, height: 3, borderRadius: 2 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  liveDot: {
    position: 'absolute',
    top: -20,
    right: '30%',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
