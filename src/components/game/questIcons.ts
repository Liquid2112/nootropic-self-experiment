import type { IconName } from '@/brand';
import type { Quest } from '@/features/gamification';

/** Icon for each quest and badge, so the UI never renders the engine's emoji. */
export const QUEST_ICON: Record<Quest['id'], IconName> = {
  dose: 'bolt',
  check_in: 'brain',
  reaction: 'bolt',
};

export const BADGE_ICON: Record<string, IconName> = {
  first_checkin: 'flask',
  first_dose: 'bolt',
  perfect_day: 'sparkle',
  streak_3: 'flame',
  streak_7: 'calendar',
  streak_14: 'brain',
  streak_30: 'shield',
  checkins_10: 'chart',
  checkins_25: 'book',
  perfect_7: 'clock',
  quick_first: 'bolt',
  quick_10: 'target',
  quick_250: 'star',
  quick_200: 'crown',
  level_5: 'medal',
  run_complete: 'trophy',
};
