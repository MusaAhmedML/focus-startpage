/**
 * Spotlight / Raycast-style Command Palette (Ctrl+K or /)
 */

class CommandPalette {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.items = [];
    this.modalEl = document.getElementById('command-palette-modal');
    this.inputEl = document.getElementById('palette-input');
    this.listEl = document.getElementById('palette-results');

    this.initListeners();
  }

  initListeners() {
    // Global shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        this.open();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    if (this.inputEl) {
      this.inputEl.addEventListener('input', () => this.filterResults());
      this.inputEl.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }
  }

  open() {
    this.isOpen = true;
    if (this.modalEl) this.modalEl.classList.remove('hidden');
    if (this.inputEl) {
      this.inputEl.value = '';
      this.inputEl.focus();
    }
    this.selectedIndex = 0;
    this.filterResults();
  }

  close() {
    this.isOpen = false;
    if (this.modalEl) this.modalEl.classList.add('hidden');
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  getAllCommands() {
    const commands = [
      // Core Actions
      { type: 'action', title: 'Start / Pause Pomodoro Timer', icon: '⏱', action: () => window.appPomodoro.toggle() },
      { type: 'action', title: 'Reset Pomodoro Timer', icon: '🔄', action: () => window.appPomodoro.reset() },
      { type: 'action', title: 'Change Mountain Wallpaper', icon: '🌄', action: () => window.openWallpaperModal() },
      { type: 'action', title: 'Wallpaper: Moody Mountain Mist', icon: '🏔', action: () => window.selectWallpaper('mountain_mist') },
      { type: 'action', title: 'Wallpaper: Starry Alps Night', icon: '🌌', action: () => window.selectWallpaper('mountain_night') },
      { type: 'action', title: 'Wallpaper: Serene Dusk Lake', icon: '🌅', action: () => window.selectWallpaper('mountain_dusk') },
      { type: 'action', title: 'Wallpaper: Obsidian Void Black', icon: '⬛', action: () => window.selectWallpaper('void') },
      { type: 'action', title: 'Toggle Zen / Deep Focus Mode', icon: '🧘', action: () => window.toggleZenMode() },
      { type: 'action', title: 'View Full Salah Timetable', icon: '🕌', action: () => window.openSalahModal() },
      { type: 'action', title: 'Open Settings & Preferences', icon: '⚙', action: () => window.openSettingsModal() },
      { type: 'action', title: 'Export Configuration Backup (JSON)', icon: '💾', action: () => window.exportConfig() },
      { type: 'action', title: 'Add New Task', icon: '➕', action: () => { document.getElementById('new-task-input')?.focus(); } },
      { type: 'action', title: 'Focus on Main Goal', icon: '🎯', action: () => { document.getElementById('main-focus-input')?.focus(); } }
    ];

    // Bookmarks
    const bookmarks = StorageManager.getBookmarks().map(b => ({
      type: 'bookmark',
      title: `Open ${b.title} (${b.category})`,
      subtitle: b.url,
      icon: '↗',
      action: () => window.open(b.url, '_blank')
    }));

    // Tasks
    const tasks = StorageManager.getTasks().map(t => ({
      type: 'task',
      title: `${t.completed ? '✓' : '○'} Task: ${t.text}`,
      subtitle: `Priority: ${t.priority} • ${t.category}`,
      icon: '📋',
      action: () => {
        window.appTaskManager.toggleTask(t.id);
      }
    }));

    return [...commands, ...bookmarks, ...tasks];
  }

  filterResults() {
    const query = (this.inputEl ? this.inputEl.value : '').toLowerCase().trim();
    const all = this.getAllCommands();

    if (!query) {
      this.items = all.slice(0, 8);
    } else {
      this.items = all.filter(item => {
        return item.title.toLowerCase().includes(query) || (item.subtitle && item.subtitle.toLowerCase().includes(query));
      }).slice(0, 10);
    }

    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.items.length - 1));
    this.render();
  }

  handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.items.length);
      this.render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % Math.max(1, this.items.length);
      this.render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.items[this.selectedIndex]) {
        const item = this.items[this.selectedIndex];
        this.close();
        item.action();
      }
    }
  }

  render() {
    if (!this.listEl) return;
    if (this.items.length === 0) {
      this.listEl.innerHTML = `<div class="palette-empty">No matching commands or links found.</div>`;
      return;
    }

    this.listEl.innerHTML = this.items.map((item, idx) => `
      <div class="palette-item ${idx === this.selectedIndex ? 'selected' : ''}" data-index="${idx}">
        <div class="palette-item-icon">${item.icon}</div>
        <div class="palette-item-content">
          <div class="palette-item-title">${item.title}</div>
          ${item.subtitle ? `<div class="palette-item-sub">${item.subtitle}</div>` : ''}
        </div>
        <div class="palette-item-hint">↵</div>
      </div>
    `).join('');

    // Add click listeners to items
    this.listEl.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-index'), 10);
        if (this.items[idx]) {
          this.close();
          this.items[idx].action();
        }
      });
      el.addEventListener('mouseenter', () => {
        this.selectedIndex = parseInt(el.getAttribute('data-index'), 10);
        this.render();
      });
    });
  }
}

window.CommandPalette = CommandPalette;
