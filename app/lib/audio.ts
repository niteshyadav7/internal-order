// Web Audio API Order Notification Sound Synthesizer
// Generates a pleasant two-tone chime sound ("Ding-Dong!") natively without external audio files.

let audioCtx: AudioContext | null = null;

// Initialize or resume AudioContext safely
export function initAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // Silently catch autoplay restriction until user gesture
      });
    }
  } catch (e) {
    // Ignore audio context init warnings
  }
  return audioCtx;
}

// Enable audio explicitly on user interaction
export function enableAudio() {
  const ctx = initAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

// Play pleasant two-tone order notification chime sound
export function playOrderChime() {
  try {
    const ctx = initAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        triggerChimeTones(ctx);
      }).catch(() => {
        // Autoplay blocked by browser policy
      });
    } else {
      triggerChimeTones(ctx);
    }
  } catch (err) {
    // Ignore audio play errors
  }
}

function triggerChimeTones(ctx: AudioContext) {
  try {
    const now = ctx.currentTime;

    // Tone 1: High Bell ("Ding" - 880 Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tone 2: Warm Bell ("Dong" - 659.25 Hz / E5) after 150ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15);

    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.5, now + 0.17);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.start(now + 0.15);
    osc2.stop(now + 0.9);
  } catch (e) {
    // Ignore tone trigger errors
  }
}
