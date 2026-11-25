import { loadNotificationsAdapter } from '@/features/notifications';
import { shortDateLabel } from '@/features/widget/model';
import type { KeyholderPayload } from './model';

/** Remind the keyholder at 9 am on reveal day to send the key back. */
export async function scheduleRevealReminder(p: KeyholderPayload): Promise<boolean> {
  try {
    const adapter = await loadNotificationsAdapter();
    if (!adapter.scheduleOnce || !(await adapter.requestPermissions())) return false;
    const [y, m, d] = p.reveal.split('-').map(Number);
    const at = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 9, 0, 0);
    if (at.getTime() <= Date.now()) return false;
    const who = p.from || 'Your friend';
    await adapter.scheduleOnce({
      id: `keyholder-${p.run}`,
      title: `${who}'s verdict unlocks today`,
      body: `You're holding the key to their ${p.supplement} test. Tap to send it (${shortDateLabel(p.reveal)}).`,
      at,
    });
    return true;
  } catch {
    return false;
  }
}
