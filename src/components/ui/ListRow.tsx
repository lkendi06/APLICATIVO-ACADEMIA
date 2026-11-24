import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon?: IconName;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  switchValue?: boolean;
  onSwitch?: (v: boolean) => void;
  testID?: string;
};

export function ListRow({
  icon,
  title,
  subtitle,
  value,
  onPress,
  destructive,
  switchValue,
  onSwitch,
  testID,
}: Props) {
  const { colors } = useTheme();
  const isSwitch = onSwitch !== undefined;
  const content = (
    <>
      {icon ? (
        <View
          style={[
            styles.icon,
            { backgroundColor: destructive ? colors.dangerSoft : colors.surfaceAlt },
          ]}>
          <Icon name={icon} size={18} color={destructive ? 'danger' : 'text'} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodySm" color="textMuted">
          {value}
        </Text>
      ) : null}
      {isSwitch ? (
        <Switch
          accessibilityLabel={title}
          value={!!switchValue}
          onValueChange={onSwitch}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor="#FFFFFF"
        />
      ) : onPress ? (
        <Icon name="chevron-forward" size={18} color="textSubtle" />
      ) : null}
    </>
  );
  if (onPress && !isSwitch) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
