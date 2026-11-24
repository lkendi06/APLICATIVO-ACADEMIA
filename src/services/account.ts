import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

import { clearOutbox } from './offline/outbox';
import { activeWorkout } from './activeWorkout';

/** Foto de perfil (bucket privado "avatars", pasta do próprio usuário). */
export const avatarService = {
  async upload(userId: string, uri: string, mimeType = 'image/jpeg'): Promise<string> {
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const body = await (await fetch(uri)).arrayBuffer();
    const { error } = await supabase.storage.from('avatars').upload(path, body, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw error;
    return path;
  },
  async signedUrl(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
    if (error) return null;
    return data.signedUrl;
  },
  async removeAll(userId: string) {
    const { data } = await supabase.storage.from('avatars').list(userId);
    if (data?.length) {
      await supabase.storage.from('avatars').remove(data.map((f) => `${userId}/${f.name}`));
    }
  },
};

const EXPORT_TABLES = [
  'profiles',
  'user_preferences',
  'workout_plans',
  'workout_plan_exercises',
  'workout_sessions',
  'workout_session_exercises',
  'workout_sets',
  'body_metrics',
  'user_goals',
  'exercise_favorites',
] as const;

export const accountService = {
  /** Gera um JSON com todos os dados do usuário e abre o compartilhamento do sistema. */
  async exportData(): Promise<{ fileUri: string | null; json: string }> {
    const result: Record<string, unknown> = {
      app: 'FitTrack',
      exported_at: new Date().toISOString(),
    };
    for (const table of EXPORT_TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      result[table] = data;
    }
    const json = JSON.stringify(result, null, 2);
    if (Platform.OS === 'web') return { fileUri: null, json };
    const file = new File(Paths.cache, `fittrack-dados-${new Date().toISOString().slice(0, 10)}.json`);
    if (file.exists) file.delete();
    file.create();
    file.write(json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exportar meus dados' });
    }
    return { fileUri: file.uri, json };
  },

  /** Exclui a conta e todos os dados (irreversível). */
  async deleteAccount(userId: string) {
    await avatarService.removeAll(userId).catch(() => undefined);
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await clearOutbox();
    activeWorkout.reset();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  },
};
