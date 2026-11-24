import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AvatarImage } from '@/components/AvatarImage';
import {
  Card,
  ErrorView,
  Icon,
  ListRow,
  ListSkeleton,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/constants/muscles';
import { FITNESS_GOAL_LABEL } from '@/constants/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useFeedback } from '@/contexts/FeedbackContext';
import { usePreferences, useProfile, useSessionStats, useUpdateProfile } from '@/hooks/queries';
import { avatarService } from '@/services/account';
import { authService } from '@/services/auth';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/tokens';
import { friendlyError } from '@/utils/errors';
import { formatDate, formatNumber } from '@/utils/format';

const THEME_LABEL = { dark: 'Escuro', light: 'Claro', system: 'Sistema' } as const;

export default function ProfileTab() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const profile = useProfile();
  const prefs = usePreferences();
  const sessions = useSessionStats();
  const update = useUpdateProfile();
  const { toast, confirm } = useFeedback();
  const [uploading, setUploading] = useState(false);

  const totalSessions = sessions.data?.length ?? 0;
  const totalVolume = (sessions.data ?? []).reduce((acc, s) => acc + (s.total_volume_kg ?? 0), 0);

  async function changePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Permita o acesso às fotos nas configurações do aparelho.', 'error');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0] || !user) return;
    const asset = res.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      toast('A imagem deve ter no máximo 5 MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const old = profile.data?.avatar_path;
      const path = await avatarService.upload(user.id, asset.uri, asset.mimeType ?? 'image/jpeg');
      await update.mutateAsync({ avatar_path: path });
      if (old && old !== path) avatarService.remove(old).catch(() => undefined);
      toast('Foto atualizada!');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function logout() {
    const ok = await confirm({
      title: 'Sair da conta?',
      message: 'Você precisará entrar novamente neste aparelho.',
      confirmLabel: 'Sair',
    });
    if (!ok) return;
    try {
      await authService.signOut();
    } catch (e) {
      toast(friendlyError(e), 'error');
    }
  }

  return (
    <Screen
      title="Perfil"
      largeTitle
      tabBarSpace
      refreshing={profile.isRefetching}
      onRefresh={profile.refetch}>
      {profile.isLoading ? (
        <ListSkeleton rows={3} height={90} />
      ) : profile.error || !profile.data ? (
        <ErrorView error={profile.error} onRetry={profile.refetch} />
      ) : (
        <>
          <Card style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alterar foto de perfil"
              onPress={changePhoto}
              disabled={uploading}
              testID="profile-photo">
              <AvatarImage
                path={profile.data.avatar_path}
                name={profile.data.full_name}
                size={84}
              />
              <View
                style={[
                  styles.cam,
                  { backgroundColor: colors.primary, borderColor: colors.surface },
                ]}>
                {uploading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Icon name="camera" size={14} color="onPrimary" />
                )}
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="h3" numberOfLines={1}>
                {profile.data.full_name || 'Sem nome'}
              </Text>
              <Text variant="bodySm" color="textMuted" numberOfLines={1}>
                {user?.email}
              </Text>
              <Text variant="caption" color="textSubtle">
                {profile.data.fitness_goal
                  ? FITNESS_GOAL_LABEL[profile.data.fitness_goal]
                  : 'Objetivo não definido'}
                {profile.data.experience_level
                  ? ` · ${DIFFICULTY_LABEL[profile.data.experience_level]}`
                  : ''}
              </Text>
            </View>
          </Card>

          <View style={styles.grid}>
            <StatTile
              label="Treinos"
              icon="barbell-outline"
              value={String(totalSessions)}
              hint="concluídos"
            />
            <StatTile
              label="Volume total"
              icon="trending-up-outline"
              value={`${formatNumber(totalVolume / 1000, 1)} t`}
              hint="levantadas"
            />
            <StatTile
              label="Meta semanal"
              icon="calendar-outline"
              value={`${profile.data.weekly_workout_goal}x`}
              hint="por semana"
            />
            <StatTile
              label="Membro desde"
              icon="time-outline"
              value={formatDate(profile.data.created_at, { month: 'short', year: 'numeric' })}
            />
          </View>

          <SectionHeader title="Conta" />
          <Card padded={false}>
            <ListRow
              icon="person-outline"
              title="Editar perfil"
              subtitle="Nome, nascimento, objetivo e nível"
              onPress={() => router.push('/profile/edit')}
              testID="profile-edit"
            />
            <ListRow
              icon="trophy-outline"
              title="Objetivos"
              subtitle="Metas de peso, treinos e cargas"
              onPress={() => router.push('/goals')}
            />
            <ListRow
              icon="shield-checkmark-outline"
              title="Segurança e dados"
              subtitle="E-mail, senha, exportação e exclusão"
              onPress={() => router.push('/profile/account')}
            />
          </Card>

          <SectionHeader title="Preferências" />
          <Card padded={false}>
            <ListRow
              icon="settings-outline"
              title="Configurações"
              subtitle="Tema, unidades, notificações e descanso"
              value={
                prefs.data
                  ? `${THEME_LABEL[prefs.data.theme]} · ${prefs.data.weight_unit}`
                  : undefined
              }
              onPress={() => router.push('/profile/settings')}
              testID="profile-settings"
            />
            <ListRow
              icon="stats-chart-outline"
              title="Histórico e evolução"
              onPress={() => router.push('/history')}
            />
          </Card>

          <SectionHeader title="Sobre" />
          <Card padded={false}>
            <ListRow
              icon="document-text-outline"
              title="Termos de uso"
              onPress={() => router.push('/legal?doc=terms')}
            />
            <ListRow
              icon="lock-closed-outline"
              title="Política de privacidade"
              onPress={() => router.push('/legal?doc=privacy')}
            />
          </Card>

          <Card padded={false}>
            <ListRow
              icon="log-out-outline"
              title="Sair da conta"
              destructive
              onPress={logout}
              testID="profile-logout"
            />
          </Card>
          <Text variant="caption" color="textSubtle" style={{ textAlign: 'center' }}>
            FitTrack 0.1.0
          </Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cam: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
