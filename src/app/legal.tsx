import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { LEGAL_DOCS } from '@/constants/legal';
import { spacing } from '@/theme/tokens';

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const content = LEGAL_DOCS[doc === 'privacy' ? 'privacy' : 'terms'];
  return (
    <Screen title={content.title} back>
      <Text variant="caption" color="textSubtle">
        Última atualização: {content.updatedAt}
      </Text>
      {content.sections.map((s) => (
        <View key={s.heading} style={{ gap: spacing.xs }}>
          <Text variant="h3">{s.heading}</Text>
          <Text color="textMuted">{s.body}</Text>
        </View>
      ))}
    </Screen>
  );
}
