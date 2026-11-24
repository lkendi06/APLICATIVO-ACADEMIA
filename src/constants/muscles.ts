import type { Difficulty, MuscleGroup } from '@/types/database';

export const MUSCLE_GROUPS: { key: MuscleGroup; label: string; region: 'upper' | 'lower' | 'core' }[] = [
  { key: 'chest', label: 'Peito', region: 'upper' },
  { key: 'back', label: 'Costas', region: 'upper' },
  { key: 'shoulders', label: 'Ombros', region: 'upper' },
  { key: 'biceps', label: 'Bíceps', region: 'upper' },
  { key: 'triceps', label: 'Tríceps', region: 'upper' },
  { key: 'forearms', label: 'Antebraço', region: 'upper' },
  { key: 'quadriceps', label: 'Quadríceps', region: 'lower' },
  { key: 'hamstrings', label: 'Posterior de coxa', region: 'lower' },
  { key: 'glutes', label: 'Glúteos', region: 'lower' },
  { key: 'calves', label: 'Panturrilhas', region: 'lower' },
  { key: 'abs', label: 'Abdômen', region: 'core' },
];

export const MUSCLE_LABEL: Record<MuscleGroup, string> = Object.fromEntries(
  MUSCLE_GROUPS.map((m) => [m.key, m.label]),
) as Record<MuscleGroup, string>;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const PLAN_COLORS = ['#C6F432', '#8B7CFF', '#38BDF8', '#FBBF24', '#F87171', '#34D399'];
