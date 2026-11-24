import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  footer?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  /** Espaço extra no fim para a barra de abas. */
  tabBarSpace?: boolean;
  largeTitle?: boolean;
};

export function Screen({
  title,
  subtitle,
  back,
  right,
  children,
  scroll = true,
  footer,
  refreshing,
  onRefresh,
  contentStyle,
  tabBarSpace,
  largeTitle,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const header =
    title || back || right ? (
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerRow}>
          {back ? (
            <IconButton
              icon="chevron-back"
              label="Voltar"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ) : null}
          {!largeTitle && title ? (
            <Text variant="h3" style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {right ?? (back ? <View style={{ width: 40 }} /> : null)}
        </View>
        {largeTitle && title ? (
          <View style={{ marginTop: back ? spacing.md : 0 }}>
            <Text variant="h1" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="bodySm" color="textMuted" style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  const bottomPad = (tabBarSpace ? 110 : spacing.xxxl) + (footer ? 0 : insets.bottom);
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1, paddingBottom: footer ? 0 : bottomPad }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
