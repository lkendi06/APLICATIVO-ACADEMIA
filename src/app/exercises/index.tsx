import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseRow } from '@/components/exercise/ExerciseRow';
import {
  Button,
  Chip,
  EmptyState,
  ErrorView,
  IconButton,
  ListSkeleton,
  Text,
  TextField,
} from '@/components/ui';
import { MUSCLE_GROUPS } from '@/constants/muscles';
import { useExercises, useFavorites } from '@/hooks/queries';
import { exercisePicker } from '@/services/exercisePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import type { Exercise, MuscleGroup } from '@/types/database';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function ExerciseLibrary() {
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const picking = pick === '1' && exercisePicker.isActive();
  const multiple = exercisePicker.isMultiple();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const exercises = useExercises();
  const favorites = useFavorites();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all' | 'fav'>('all');
  const [selected, setSelected] = useState<Exercise[]>([]);

  useEffect(() => () => exercisePicker.cancel(), []);

  const favSet = useMemo(() => new Set(favorites.data ?? []), [favorites.data]);
  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return (exercises.data ?? [])
      .filter((e) => {
        if (group === 'fav' && !favSet.has(e.id)) return false;
        if (
          group !== 'all' &&
          group !== 'fav' &&
          e.primary_muscle !== group &&
          !e.secondary_muscles.includes(group)
        )
          return false;
        if (q && !normalize(`${e.name} ${e.equipment}`).includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // No filtro por grupo, o músculo principal vem primeiro.
        if (group !== 'all' && group !== 'fav') {
          const pa = a.primary_muscle === group ? 0 : 1;
          const pb = b.primary_muscle === group ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [exercises.data, query, group, favSet]);

  const onPress = (e: Exercise) => {
    if (!picking) return router.push(`/exercises/${e.id}`);
    if (!multiple) {
      exercisePicker.submit([e]);
      return router.back();
    }
    setSelected((s) => (s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]));
  };

  const confirm = () => {
    exercisePicker.submit(selected);
    router.back();
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <View style={styles.header}>
        <IconButton
          icon={picking ? 'close' : 'chevron-back'}
          label={picking ? 'Cancelar' : 'Voltar'}
          onPress={() => router.back()}
        />
        <Text variant="h3" style={{ flex: 1, textAlign: 'center' }}>
          {picking ? 'Escolher exercícios' : 'Biblioteca de exercícios'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        <TextField
          label="Buscar"
          icon="search-outline"
          placeholder="Nome ou equipamento"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
          testID="exercise-search"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.chips}>
        <Chip label="Todos" selected={group === 'all'} onPress={() => setGroup('all')} />
        <Chip
          label="Favoritos"
          icon="heart"
          selected={group === 'fav'}
          onPress={() => setGroup('fav')}
        />
        {MUSCLE_GROUPS.map((m) => (
          <Chip
            key={m.key}
            label={m.label}
            selected={group === m.key}
            onPress={() => setGroup(m.key)}
            testID={`chip-${m.key}`}
          />
        ))}
      </ScrollView>
      {exercises.isLoading ? (
        <View style={{ padding: spacing.lg }}>
          <ListSkeleton rows={6} height={80} />
        </View>
      ) : exercises.error ? (
        <ErrorView error={exercises.error} onRetry={exercises.refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.sm,
            paddingBottom: insets.bottom + (picking ? 110 : 40),
          }}
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={
            <Text variant="caption" color="textSubtle">
              {filtered.length} exercício(s)
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              compact
              icon="search-outline"
              title="Nada encontrado"
              message={
                group === 'fav'
                  ? 'Toque no coração na página de um exercício para favoritá-lo.'
                  : 'Tente outro termo ou grupo muscular.'
              }
            />
          }
          renderItem={({ item }) => (
            <ExerciseRow
              exercise={item}
              favorite={favSet.has(item.id)}
              selected={selected.some((s) => s.id === item.id)}
              onPress={() => onPress(item)}
            />
          )}
        />
      )}
      {picking && multiple ? (
        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + spacing.md,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}>
          <Button
            title={
              selected.length ? `Adicionar ${selected.length} exercício(s)` : 'Selecione exercícios'
            }
            size="lg"
            disabled={!selected.length}
            onPress={confirm}
            testID="picker-confirm"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
