/* eslint-env jest */
// Mocks nativos usados nos testes (rodam em Node, sem aparelho).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
    AFTER_FIRST_UNLOCK: 0,
  };
});

jest.mock('expo-crypto', () => {
  let n = 0;
  return {
    randomUUID: () => {
      n += 1;
      const hex = n.toString(16).padStart(12, '0');
      return `00000000-0000-4000-8000-${hex}`;
    },
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-0123456789abcdef';

// Reanimated 4 depende da thread de UI nativa (Worklets), que não existe no Node.
// Nos testes, as animações viram componentes estáticos.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const chain = () => {
    const anim = {};
    [
      'duration',
      'delay',
      'springify',
      'damping',
      'stiffness',
      'easing',
      'withInitialValues',
    ].forEach((m) => (anim[m] = () => anim));
    return anim;
  };
  const layout = new Proxy({}, { get: () => chain() });
  const Animated = {
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    FlatList: RN.FlatList,
    createAnimatedComponent: (c) => c,
  };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (v) => {
      const sv = { value: v };
      sv.get = () => sv.value;
      sv.set = (n) => {
        sv.value = typeof n === 'function' ? n(sv.value) : n;
      };
      return sv;
    },
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    useReducedMotion: () => false,
    withSpring: (v) => v,
    withTiming: (v) => v,
    withRepeat: (v) => v,
    withSequence: (...v) => v[v.length - 1],
    withDelay: (_d, v) => v,
    interpolate: (_v, _i, o) => o[0],
    interpolateColor: (_v, _i, o) => o[0],
    Easing: new Proxy({}, { get: () => () => (t) => t }),
    runOnJS: (fn) => fn,
    cancelAnimation: () => undefined,
    FadeIn: layout.FadeIn,
    FadeOut: layout.FadeOut,
    FadeInDown: layout.FadeInDown,
    FadeInUp: layout.FadeInUp,
    FadeOutUp: layout.FadeOutUp,
    FadeOutDown: layout.FadeOutDown,
    ZoomIn: layout.ZoomIn,
    ZoomOut: layout.ZoomOut,
    SlideInRight: layout.SlideInRight,
    SlideInDown: layout.SlideInDown,
    SlideOutDown: layout.SlideOutDown,
    SlideOutLeft: layout.SlideOutLeft,
    LinearTransition: layout.LinearTransition,
    Layout: layout.Layout,
  };
});
