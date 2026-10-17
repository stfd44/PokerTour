declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type ReadyListener = (ready: boolean) => void;

const READY_EVENTS: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'keydown'];
const readyListeners = new Set<ReadyListener>();

let audioContext: AudioContext | null = null;
let audioUnlockInitialized = false;
let timerAlarmReady = false;
let lastPlaybackAt = 0;

const notifyReadyListeners = () => {
  readyListeners.forEach((listener) => listener(timerAlarmReady));
};

const setTimerAlarmReady = (nextReady: boolean) => {
  if (timerAlarmReady === nextReady) {
    return;
  }

  timerAlarmReady = nextReady;
  notifyReadyListeners();
};

const getAudioContextClass = (): typeof AudioContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext ?? window.webkitAudioContext ?? null;
};

const getAudioContext = (): AudioContext | null => {
  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
    audioContext.addEventListener('statechange', () => {
      setTimerAlarmReady(audioContext?.state === 'running');
    });
  }

  return audioContext;
};

const primeAudioContext = (context: AudioContext) => {
  const buffer = context.createBuffer(1, 1, context.sampleRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
  source.stop(0);
};

const scheduleTone = (
  context: AudioContext,
  startTime: number,
  frequency: number,
  duration: number,
  peakGain: number
) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.035);
  gainNode.gain.exponentialRampToValueAtTime(peakGain * 0.3, startTime + 0.25);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
};

export const isTimerAlarmSupported = (): boolean => getAudioContextClass() !== null;

export const isTimerAlarmReady = (): boolean => timerAlarmReady;

export const subscribeToTimerAlarmReady = (listener: ReadyListener) => {
  readyListeners.add(listener);
  listener(timerAlarmReady);

  return () => {
    readyListeners.delete(listener);
  };
};

export const unlockTimerAudio = async (): Promise<boolean> => {
  const context = getAudioContext();

  if (!context) {
    return false;
  }

  try {
    if (context.state !== 'running') {
      await context.resume();
    }

    if (context.state === 'running') {
      primeAudioContext(context);
      setTimerAlarmReady(true);
      return true;
    }
  } catch (error) {
    console.warn('Unable to unlock timer audio yet.', error);
  }

  setTimerAlarmReady(context.state === 'running');
  return timerAlarmReady;
};

const handleUnlockInteraction = () => {
  void unlockTimerAudio();
};

export const initializeTimerAlarmUnlock = () => {
  if (typeof window === 'undefined' || audioUnlockInitialized || !isTimerAlarmSupported()) {
    return;
  }

  audioUnlockInitialized = true;

  READY_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, handleUnlockInteraction, {
      capture: true,
      passive: true,
    });
  });
};

export const playTimerCompleteAlarm = async (): Promise<boolean> => {
  const context = getAudioContext();

  if (!context) {
    return false;
  }

  const unlocked = await unlockTimerAudio();
  if (!unlocked) {
    return false;
  }

  const now = Date.now();
  if (now - lastPlaybackAt < 2200) {
    return false;
  }

  lastPlaybackAt = now;

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([250, 120, 250, 120, 400]);
  }

  const startTime = context.currentTime + 0.02;
  // A single C-major chime: warm fundamentals with a quiet octave shimmer.
  // Overlapping tails avoid the abrupt, repeated beeps of the previous alarm.
  const tones = [
    { frequency: 523.25, offset: 0, duration: 1.25, gain: 0.13 },
    { frequency: 659.25, offset: 0.28, duration: 1.3, gain: 0.11 },
    { frequency: 783.99, offset: 0.56, duration: 1.5, gain: 0.1 },
  ];
  tones.forEach(({ frequency, offset, duration, gain }) => {
    scheduleTone(context, startTime + offset, frequency, duration, gain);
    scheduleTone(context, startTime + offset, frequency * 2, duration * 0.65, gain * 0.12);
  });

  return true;
};
