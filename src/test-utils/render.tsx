import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FeedbackProvider } from '@/contexts/FeedbackContext';
import { ThemeProvider } from '@/theme/ThemeProvider';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export async function renderWithProviders(ui: ReactElement) {
  return await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <FeedbackProvider>{ui}</FeedbackProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}
