/**
 * Deep Work & Pomodoro Timer Module (Enhanced)
 * Features:
 * - Dynamic customizable durations (Focus, Short Break, Long Break)
 * - Auto-start breaks right after focus (tickbox)
 * - Auto-start focus right after breaks (tickbox)
 * - Web Audio API synthesized notification chime
 * - Task linkage & sessions counter
 */

class PomodoroTimer {
  constructor(config = {}) {
    this.durations = {
      focus: (config.focusMinutes ?? 25) * 60,
      shortBreak: (config.shortBreakMinutes ?? 5) * 60,
      longBreak: (config.longBreakMinutes ?? 15) * 60
    };
    this.longBreakInterval = config.longBreakInterval ?? 4;
    this.autoStartBreaks = config.autoStartBreaks ?? true;
    this.autoStartFocus = config.autoStartFocus ?? false;

    this.mode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
    this.timeLeft = this.durations.focus;
    this.isRunning = false;
    this.timerId = null;
    this.sessionsCompleted = 0;
    this.linkedTask = null; // { id, text }
    this.onTick = null;
    this.onComplete = null;
  }

  updateConfig(config = {}) {
    if (config.focusMinutes !== undefined) this.durations.focus = config.focusMinutes * 60;
    if (config.shortBreakMinutes !== undefined) this.durations.shortBreak = config.shortBreakMinutes * 60;
    if (config.longBreakMinutes !== undefined) this.durations.longBreak = config.longBreakMinutes * 60;
    if (config.longBreakInterval !== undefined) this.longBreakInterval = config.longBreakInterval;
    if (config.autoStartBreaks !== undefined) this.autoStartBreaks = config.autoStartBreaks;
    if (config.autoStartFocus !== undefined) this.autoStartFocus = config.autoStartFocus;

    if (!this.isRunning) {
      this.timeLeft = this.durations[this.mode];
    }
    if (this.onTick) this.onTick(this.getState());
  }

  setMode(mode) {
    if (this.isRunning) this.pause();
    this.mode = mode;
    this.timeLeft = this.durations[mode] || this.durations.focus;
    if (this.onTick) this.onTick(this.getState());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        if (this.onTick) this.onTick(this.getState());
      } else {
        this.finishSession();
      }
    }, 1000);
    if (this.onTick) this.onTick(this.getState());
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.timerId);
    this.timerId = null;
    if (this.onTick) this.onTick(this.getState());
  }

  toggle() {
    if (this.isRunning) this.pause();
    else this.start();
  }

  reset() {
    this.pause();
    this.timeLeft = this.durations[this.mode];
    if (this.onTick) this.onTick(this.getState());
  }

  linkTask(task) {
    this.linkedTask = task;
    if (this.onTick) this.onTick(this.getState());
  }

  unlinkTask() {
    this.linkedTask = null;
    if (this.onTick) this.onTick(this.getState());
  }

  finishSession() {
    this.pause();
    this.playChime();

    const wasFocus = (this.mode === 'focus');

    if (wasFocus) {
      this.sessionsCompleted++;
      if (this.linkedTask && window.appTaskManager) {
        window.appTaskManager.incrementPomodoro(this.linkedTask.id);
      }
      if (this.sessionsCompleted % this.longBreakInterval === 0) {
        this.setMode('longBreak');
      } else {
        this.setMode('shortBreak');
      }

      // Check auto-start breaks tickbox
      if (this.autoStartBreaks) {
        this.start();
      }
    } else {
      this.setMode('focus');

      // Check auto-start focus tickbox
      if (this.autoStartFocus) {
        this.start();
      }
    }

    if (this.onComplete) this.onComplete(this.getState());
  }

  // Pure Web Audio API Chime (Zero external audio files needed)
  playChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 Harmonic chime
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.12 + 0.85);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * 0.12);
        osc.stop(ctx.currentTime + index * 0.12 + 0.9);
      });
    } catch (e) {
      console.warn('Audio chime failed', e);
    }
  }

  getState() {
    const total = this.durations[this.mode] || 1;
    const progress = (total - this.timeLeft) / total;
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return {
      mode: this.mode,
      timeLeft: this.timeLeft,
      timeFormatted,
      progress,
      isRunning: this.isRunning,
      sessionsCompleted: this.sessionsCompleted,
      linkedTask: this.linkedTask,
      focusMinutes: Math.round(this.durations.focus / 60),
      shortBreakMinutes: Math.round(this.durations.shortBreak / 60),
      longBreakMinutes: Math.round(this.durations.longBreak / 60),
      autoStartBreaks: this.autoStartBreaks,
      autoStartFocus: this.autoStartFocus
    };
  }
}

window.PomodoroTimer = PomodoroTimer;
