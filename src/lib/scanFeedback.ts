export type ScanTone = 'success' | 'repeat' | 'error';

const PATTERNS: Record<ScanTone, number[]> = { success: [80], repeat: [60, 60, 60], error: [250] };
const FREQUENCIES: Record<ScanTone, number> = { success: 880, repeat: 520, error: 220 };

/** A short beep and buzz so a volunteer can scan without looking at the screen. Silent where the browser blocks it. */
export function playScanFeedback(tone: ScanTone) {
  try {
    navigator.vibrate?.(PATTERNS[tone]);
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = FREQUENCIES[tone];
    gain.gain.value = 0.15;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (tone === 'error' ? 0.35 : 0.12));
    oscillator.onended = () => void context.close();
  } catch {
    // Feedback is a nicety; never let it break a scan.
  }
}
