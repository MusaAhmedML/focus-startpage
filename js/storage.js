/**
 * Unified LocalStorage & State Management
 * Handles persistent storage, initial defaults, and JSON export/import.
 */

const STORAGE_KEYS = {
  SETTINGS: 'focus_settings_v1',
  FOCUS_OF_DAY: 'focus_main_goal_v1',
  TASKS: 'focus_tasks_v1',
  BOOKMARKS: 'focus_bookmarks_v1',
  POMODORO: 'focus_pomodoro_v1',
  STATS: 'focus_stats_v1'
};

const DEFAULT_SETTINGS = {
  userName: 'Musa',
  timeFormat: '24h', // '12h' or '24h'
  showSeconds: false,
  city: 'Burnley, UK',
  lat: 53.7893,
  lng: -2.2406,
  asrSchool: 'Hanafi',
  fajrAngle: 18,
  ishaAngle: 17,
  customPrayerEndpoint: '',
  theme: 'void',
  wallpaper: 'mountain_mist', // 'mountain_mist', 'mountain_night', 'mountain_dusk', 'void'
  customWallpaperUrl: '',
  zenMode: false,
  enableSound: true,
  // Deep Work / Pomodoro Settings
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartBreaks: true,
  autoStartFocus: false
};

const DEFAULT_BOOKMARKS = [
  { id: 'b-msh', title: 'MacroStudyHub', url: 'https://macrostudyhub.com', category: 'Core', icon: 'M', color: '#10b981' },
  { id: 'b-camera', title: 'Camera Studio', url: 'http://127.0.0.1:4040/camera', category: 'Core', icon: '📷', color: '#10b981' },
  { id: 'b-gmail', title: 'Gmail', url: 'https://mail.google.com', category: 'Core', icon: '✉', color: '#ef4444' },
  { id: 'b-cal', title: 'Calendar', url: 'https://calendar.google.com', category: 'Core', icon: '📅', color: '#3b82f6' },
  { id: 'b-drive', title: 'Drive', url: 'https://drive.google.com', category: 'Core', icon: '📁', color: '#f59e0b' },
  { id: 'b-github', title: 'GitHub', url: 'https://github.com', category: 'Dev', icon: '⚡', color: '#fafafa' },
  { id: 'b-classroom', title: 'Nelson & Colne', url: 'https://classroom.google.com', category: 'Academic', icon: '🎓', color: '#8b5cf6' },
  { id: 'b-arxiv', title: 'arXiv CS/Physics', url: 'https://arxiv.org', category: 'Academic', icon: '⚛', color: '#ec4899' },
  { id: 'b-desmos', title: 'Desmos Math', url: 'https://www.desmos.com/calculator', category: 'Academic', icon: '📈', color: '#06b6d4' },
  { id: 'b-youtube', title: 'YouTube', url: 'https://youtube.com', category: 'Media', icon: '▶', color: '#ef4444' }
];

const DEFAULT_TASKS = [
  {
    id: 't-1',
    text: 'A-Level Further Maths MEI - Mechanics calculus derivations',
    category: 'Academic',
    priority: 'P1',
    completed: false,
    createdAt: Date.now(),
    pomodoros: 2
  },
  {
    id: 't-2',
    text: 'MacroStudyHub - Review Summer Crash Course schedule & student intake',
    category: 'MacroStudyHub',
    priority: 'P1',
    completed: false,
    createdAt: Date.now(),
    pomodoros: 1
  },
  {
    id: 't-3',
    text: 'AQA Computer Science - Complex algorithmic data structures & OOP model',
    category: 'Academic',
    priority: 'P2',
    completed: false,
    createdAt: Date.now(),
    pomodoros: 0
  }
];

const CURATED_QUOTES = [
  { quote: "Success in this life and the hereafter is anchored upon discipline, sincere intention, and constant excellence.", author: "Islamic Wisdom" },
  { quote: "First principles thinking breaks things down to their most fundamental truths and reasons upward from there.", author: "Physics Philosophy" },
  { quote: "Mastery is not an accident. It is the steady accumulation of zero-decay understanding.", author: "MacroStudyHub Principle" },
  { quote: "Do every action with Ihsan (perfection and excellence) as if you see the Creator.", author: "Prophetic Tradition" },
  { quote: "Simplicity is prerequisite for reliability. Strip away the superfluous until only pure signal remains.", author: "Edsger W. Dijkstra" },
  { quote: "The true strategist conquers the exam and the algorithm before stepping into the arena.", author: "Academic Strategy" },
  { quote: "Your focus determines your reality. Guard your attention with unwavering discipline.", author: "Deep Work Law" }
];

class StorageManager {
  static getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  static getMainFocus() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOCUS_OF_DAY);
      if (!data) return { text: '', completed: false, date: today, streak: 1 };
      const parsed = JSON.parse(data);
      if (parsed.date !== today) {
        // New day: retain streak if previous was completed
        const streak = parsed.completed ? (parsed.streak || 1) + 1 : (parsed.streak || 1);
        return { text: '', completed: false, date: today, streak };
      }
      return parsed;
    } catch {
      return { text: '', completed: false, date: today, streak: 1 };
    }
  }

  static saveMainFocus(focus) {
    localStorage.setItem(STORAGE_KEYS.FOCUS_OF_DAY, JSON.stringify(focus));
  }

  static getTasks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  }

  static saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    fetch('/api/tasks/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    }).catch(e => console.error('Failed to sync tasks', e));
  }

  static getBookmarks() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : DEFAULT_BOOKMARKS;
    } catch {
      return DEFAULT_BOOKMARKS;
    }
  }

  static saveBookmarks(bookmarks) {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  }

  static getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const index = dayOfYear % CURATED_QUOTES.length;
    return CURATED_QUOTES[index];
  }

  static exportAll() {
    return JSON.stringify({
      settings: this.getSettings(),
      mainFocus: this.getMainFocus(),
      tasks: this.getTasks(),
      bookmarks: this.getBookmarks(),
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  static importAll(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) this.saveSettings(data.settings);
      if (data.mainFocus) this.saveMainFocus(data.mainFocus);
      if (data.tasks) this.saveTasks(data.tasks);
      if (data.bookmarks) this.saveBookmarks(data.bookmarks);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}

window.StorageManager = StorageManager;
