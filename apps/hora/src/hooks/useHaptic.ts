/**
 * useHaptic — thin wrapper over @capacitor/haptics.
 *
 * On Capacitor-native platforms (iOS, Android) it fires actual haptics.
 * On web / desktop it no-ops silently. Callers just `tap('light')` etc.
 * without thinking about the platform.
 *
 * Per docs/VISUAL_DIRECTION.md §6 (Animation language): haptics are
 * not optional on Hora — every meaningful interaction should fire one.
 */

export type HapticKind =
  | 'light'    // small tap (buttons, hover-confirm)
  | 'medium'   // standard tap (collect, normal action)
  | 'heavy'    // big moment (level-up, raid result)
  | 'success'  // chord — positive outcome
  | 'warning'  // attention required
  | 'error';   // negative outcome

// Use the real Capacitor types when available. Cached as an opaque
// object — we don't need strict typing here, the runtime guard does
// the work.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached: any = undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getHaptics(): Promise<any> {
  if (cached !== undefined) return cached;
  try {
    const mod = await import('@capacitor/haptics');
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

export async function fireHaptic(kind: HapticKind): Promise<void> {
  const mod = await getHaptics();
  if (!mod) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = mod;
    switch (kind) {
      case 'light':   await Haptics.impact({ style: ImpactStyle.Light }); break;
      case 'medium':  await Haptics.impact({ style: ImpactStyle.Medium }); break;
      case 'heavy':   await Haptics.impact({ style: ImpactStyle.Heavy }); break;
      case 'success': await Haptics.notification({ type: NotificationType.Success }); break;
      case 'warning': await Haptics.notification({ type: NotificationType.Warning }); break;
      case 'error':   await Haptics.notification({ type: NotificationType.Error });   break;
    }
  } catch {
    // Native plugin not registered (web fallback) — silent
  }
}

/** Hook variant for components that want a stable callable. */
export function useHaptic() {
  return fireHaptic;
}
