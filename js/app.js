/**
 * Main Application Orchestrator for Focus Startpage (Enhanced Deep Work Cockpit)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load Settings
  let settings = StorageManager.getSettings();

  // Initialize Engines
  const prayerEngine = new SalahEngine({
    lat: settings.lat,
    lng: settings.lng,
    asrMethod: settings.asrMethod,
    fajrAngle: settings.fajrAngle,
    ishaAngle: settings.ishaAngle,
    city: settings.city,
    customEndpoint: settings.customPrayerEndpoint
  });

  const weatherService = new WeatherService({
    lat: settings.lat,
    lng: settings.lng,
    city: settings.city
  });

  // Task & Bookmark Managers
  const taskManager = new TaskManager(() => renderTasks());
  window.appTaskManager = taskManager;

  // Load daily tasks from backend
  fetch('/api/tasks/daily')
    .then(res => res.json())
    .then(data => {
      if (data.tasks && data.tasks.length > 0) {
        let changed = false;
        data.tasks.forEach(t => {
          if (!taskManager.tasks.find(ex => ex.id === t.id)) {
            taskManager.tasks.unshift(t); // add to top
            changed = true;
          }
        });
        if (changed) {
          StorageManager.saveTasks(taskManager.tasks);
          renderTasks();
        }
      }
    })
    .catch(e => console.error('Failed to load daily tasks', e));

  const bookmarkManager = new BookmarkManager(() => renderBookmarks());
  window.appBookmarkManager = bookmarkManager;

  // Enhanced Pomodoro Timer
  const pomodoro = new PomodoroTimer({
    focusMinutes: settings.focusMinutes || 25,
    shortBreakMinutes: settings.shortBreakMinutes || 5,
    longBreakMinutes: settings.longBreakMinutes || 15,
    longBreakInterval: settings.longBreakInterval || 4,
    autoStartBreaks: settings.autoStartBreaks !== false,
    autoStartFocus: settings.autoStartFocus === true
  });
  window.appPomodoro = pomodoro;

  // Workflow Hub (LinkedIn, MacroStudyHub, Covering Salah Alert)
  const workflowHub = new WorkflowHub();
  window.appWorkflowHub = workflowHub;

  // Wallpaper Engine
  const wallpaperLayer = document.getElementById('wallpaper-layer');
  function applyWallpaper(wp) {
    if (!wallpaperLayer) return;
    wallpaperLayer.className = `wp-${wp || 'mountain_mist'}`;
    document.querySelectorAll('.wallpaper-card').forEach(card => {
      if (card.getAttribute('data-wp') === wp) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
  applyWallpaper(settings.wallpaper || 'mountain_mist');

  if (settings.zenMode) document.body.classList.add('zen-active');

  // DOM Elements
  const timeEl = document.getElementById('digital-clock');
  const dateEl = document.getElementById('date-display');
  const greetingEl = document.getElementById('greeting-display');
  const quoteTextEl = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');

  // Weather Elements
  const weatherTempEl = document.getElementById('weather-temp');
  const weatherIconEl = document.getElementById('weather-icon');
  const weatherDescEl = document.getElementById('weather-desc');
  const weatherCityEl = document.getElementById('weather-city');

  // Salah Elements
  const salahCurrentEl = document.getElementById('salah-current');
  const salahCountdownEl = document.getElementById('salah-countdown');
  const salahNextNameEl = document.getElementById('salah-next-name');

  // Main Focus Elements
  const focusInputEl = document.getElementById('main-focus-input');
  const focusCardEl = document.getElementById('main-focus-card');
  const focusCheckboxEl = document.getElementById('main-focus-check');
  const focusTextDisplayEl = document.getElementById('main-focus-text');
  const focusStreakEl = document.getElementById('focus-streak');

  // ----------------------------------------------------
  // 1. Clock, Date & Greeting Engine
  // ----------------------------------------------------
  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    if (settings.timeFormat === '12h') {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      timeEl.textContent = `${hours}:${minutes}${settings.showSeconds ? `:${seconds}` : ''} ${ampm}`;
    } else {
      const hStr = String(hours).padStart(2, '0');
      timeEl.textContent = `${hStr}:${minutes}${settings.showSeconds ? `:${seconds}` : ''}`;
    }

    // Date
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('en-GB', options);

    // Contextual Greeting
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour >= 5 && hour < 12) greeting = 'Good morning';
    else if (hour >= 12 && hour < 18) greeting = 'Good afternoon';

    const name = settings.userName ? `, ${settings.userName}` : '';
    greetingEl.textContent = `${greeting}${name}`;
  }

  setInterval(updateClock, 1000);
  updateClock();

  // Daily Quote
  const quote = StorageManager.getDailyQuote();
  if (quoteTextEl) quoteTextEl.textContent = `"${quote.quote}"`;
  if (quoteAuthorEl) quoteAuthorEl.textContent = `— ${quote.author}`;

  // ----------------------------------------------------
  // 2. Astronomical Salah Ticker & Timetable
  // ----------------------------------------------------
  function updateSalah() {
    const status = prayerEngine.getStatus();
    if (salahCurrentEl) salahCurrentEl.textContent = status.current;
    if (salahNextNameEl) salahNextNameEl.textContent = status.next;
    if (salahCountdownEl) salahCountdownEl.textContent = status.countdownStr;
  }

  window.updateSalah = updateSalah;
  setInterval(updateSalah, 1000);
  updateSalah();

  // ----------------------------------------------------
  // 3. Weather Fetcher & Cache
  // ----------------------------------------------------
  function renderWeatherUI(w) {
    if (weatherTempEl) weatherTempEl.textContent = `${w.temp}°C`;
    if (weatherDescEl) weatherDescEl.textContent = w.desc;
    if (weatherIconEl) weatherIconEl.innerHTML = w.svg;
    if (weatherCityEl) weatherCityEl.textContent = w.city;
  }

  renderWeatherUI(weatherService.getCachedForecast());

  async function loadWeather() {
    const w = await weatherService.getForecast();
    renderWeatherUI(w);
  }
  loadWeather();
  setInterval(loadWeather, 20 * 60 * 1000);

  // ----------------------------------------------------
  // 4. Main Focus of the Day
  // ----------------------------------------------------
  function renderMainFocus() {
    const focus = StorageManager.getMainFocus();
    if (focus.text && focus.text.trim()) {
      focusInputEl.classList.add('hidden');
      focusTextDisplayEl.textContent = focus.text;
      focusCheckboxEl.checked = focus.completed;
      if (focus.completed) {
        focusTextDisplayEl.classList.add('completed');
      } else {
        focusTextDisplayEl.classList.remove('completed');
      }
      focusCardEl.classList.remove('hidden');
    } else {
      focusInputEl.classList.remove('hidden');
      focusCardEl.classList.add('hidden');
      focusInputEl.value = '';
    }

    if (focusStreakEl && focus.streak > 1) {
      focusStreakEl.textContent = `🔥 ${focus.streak} day streak`;
      focusStreakEl.classList.remove('hidden');
    }
  }

  if (focusInputEl) {
    focusInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && focusInputEl.value.trim()) {
        const focus = StorageManager.getMainFocus();
        focus.text = focusInputEl.value.trim();
        focus.completed = false;
        StorageManager.saveMainFocus(focus);
        renderMainFocus();
      }
    });
  }

  if (focusCheckboxEl) {
    focusCheckboxEl.addEventListener('change', () => {
      const focus = StorageManager.getMainFocus();
      focus.completed = focusCheckboxEl.checked;
      StorageManager.saveMainFocus(focus);
      renderMainFocus();
      if (focus.completed) {
        pomodoro.playChime();
      }
    });
  }

  window.clearMainFocus = function() {
    const focus = StorageManager.getMainFocus();
    focus.text = '';
    focus.completed = false;
    StorageManager.saveMainFocus(focus);
    renderMainFocus();
  };

  renderMainFocus();

  // ----------------------------------------------------
  // 5. Tasks & Schedule Matrix Rendering
  // ----------------------------------------------------
  const taskListEl = document.getElementById('task-list');
  const newTaskInputEl = document.getElementById('new-task-input');
  const taskCatSelectEl = document.getElementById('new-task-category');
  const taskPrioritySelectEl = document.getElementById('new-task-priority');

  function renderTasks() {
    if (!taskListEl) return;
    const tasks = taskManager.getFilteredTasks();

    if (tasks.length === 0) {
      taskListEl.innerHTML = `<div class="empty-state">No tasks in this category. Press Enter to add one.</div>`;
      return;
    }

    taskListEl.innerHTML = tasks.map(t => `
      <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <label class="custom-checkbox">
          <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="window.appTaskManager.toggleTask('${t.id}')">
          <span class="checkmark"></span>
        </label>
        <div class="task-content">
          <span class="task-text">${t.text}</span>
          <div class="task-meta">
            <span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
            <span class="category-badge">${t.category}</span>
            ${t.pomodoros ? `<span class="pomodoro-count">🍅 ${t.pomodoros}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon" title="Link to Pomodoro" onclick="window.linkTaskToPomodoro('${t.id}')">⏱</button>
          <button class="btn-icon delete-btn" title="Delete Task" onclick="window.appTaskManager.deleteTask('${t.id}')">✕</button>
        </div>
      </div>
    `).join('');
  }

  if (newTaskInputEl) {
    newTaskInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && newTaskInputEl.value.trim()) {
        const cat = taskCatSelectEl ? taskCatSelectEl.value : 'Academic';
        const prio = taskPrioritySelectEl ? taskPrioritySelectEl.value : 'P2';
        taskManager.addTask(newTaskInputEl.value.trim(), cat, prio);
        newTaskInputEl.value = '';
      }
    });
  }

  window.linkTaskToPomodoro = function(id) {
    const task = taskManager.tasks.find(t => t.id === id);
    if (task) {
      pomodoro.linkTask(task);
      showToast(`Linked timer to: "${task.text.substring(0, 24)}..."`);
    }
  };

  document.querySelectorAll('.task-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.task-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      taskManager.setCategory(tab.getAttribute('data-cat'));
    });
  });

  renderTasks();

  // ----------------------------------------------------
  // 6. Central Deep Work Cockpit Orchestration
  // ----------------------------------------------------
  const pomoTimeEl = document.getElementById('pomo-time');
  const pomoToggleBtn = document.getElementById('pomo-toggle-btn');
  const pomoResetBtn = document.getElementById('pomo-reset-btn');
  const pomoLinkedTaskEl = document.getElementById('pomo-linked-task');

  // Mode Tabs
  const modeTabFocus = document.getElementById('mode-tab-focus');
  const modeTabShort = document.getElementById('mode-tab-short');
  const modeTabLong = document.getElementById('mode-tab-long');

  // Timing Config Drawer Elements
  const cfgFocusInput = document.getElementById('cfg-focus-min');
  const cfgShortInput = document.getElementById('cfg-short-min');
  const cfgLongInput = document.getElementById('cfg-long-min');
  const cfgIntervalInput = document.getElementById('cfg-long-interval');
  const chkAutoBreaks = document.getElementById('chk-auto-breaks');
  const chkAutoFocus = document.getElementById('chk-auto-focus');

  // Populate drawer inputs
  if (cfgFocusInput) cfgFocusInput.value = settings.focusMinutes || 25;
  if (cfgShortInput) cfgShortInput.value = settings.shortBreakMinutes || 5;
  if (cfgLongInput) cfgLongInput.value = settings.longBreakMinutes || 15;
  if (cfgIntervalInput) cfgIntervalInput.value = settings.longBreakInterval || 4;
  if (chkAutoBreaks) chkAutoBreaks.checked = settings.autoStartBreaks !== false;
  if (chkAutoFocus) chkAutoFocus.checked = settings.autoStartFocus === true;

  function updateModeTabLabels() {
    const focusMin = settings.focusMinutes || 25;
    const shortMin = settings.shortBreakMinutes || 5;
    const longMin = settings.longBreakMinutes || 15;
    if (modeTabFocus) modeTabFocus.textContent = `Focus (${focusMin}m)`;
    if (modeTabShort) modeTabShort.textContent = `Short Break (${shortMin}m)`;
    if (modeTabLong) modeTabLong.textContent = `Long Break (${longMin}m)`;
  }
  updateModeTabLabels();

  pomodoro.onTick = (state) => {
    if (pomoTimeEl) pomoTimeEl.textContent = state.timeFormatted;
    if (pomoToggleBtn) {
      pomoToggleBtn.textContent = state.isRunning ? 'Pause' : (state.mode === 'focus' ? 'Start Focus' : 'Start Break');
      pomoToggleBtn.className = state.isRunning ? 'btn-pomo-large btn-running' : 'btn-pomo-large btn-idle';
    }
    // Update active tab highlight
    document.querySelectorAll('.pomo-mode-tab').forEach(tab => {
      if (tab.getAttribute('data-mode') === state.mode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (pomoLinkedTaskEl) {
      if (state.linkedTask) {
        pomoLinkedTaskEl.innerHTML = `<span>🎯 <strong>${state.linkedTask.text}</strong></span> <button class="btn-text-xs" onclick="window.appPomodoro.unlinkTask()">Unlink</button>`;
        pomoLinkedTaskEl.classList.remove('hidden');
      } else {
        pomoLinkedTaskEl.classList.add('hidden');
      }
    }
  };

  if (pomoToggleBtn) pomoToggleBtn.addEventListener('click', () => pomodoro.toggle());
  if (pomoResetBtn) pomoResetBtn.addEventListener('click', () => pomodoro.reset());

  document.querySelectorAll('.pomo-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      pomodoro.setMode(tab.getAttribute('data-mode'));
    });
  });

  // Toggle & Save Timer Config Drawer
  const timerConfigDrawer = document.getElementById('timer-config-drawer');
  window.toggleTimerConfigDrawer = function() {
    if (timerConfigDrawer) {
      timerConfigDrawer.classList.toggle('hidden');
    }
  };

  window.saveTimerConfig = function() {
    const focusMin = parseInt(cfgFocusInput.value, 10) || 25;
    const shortMin = parseInt(cfgShortInput.value, 10) || 5;
    const longMin = parseInt(cfgLongInput.value, 10) || 15;
    const interval = parseInt(cfgIntervalInput.value, 10) || 4;
    const autoBreaks = chkAutoBreaks.checked;
    const autoFocus = chkAutoFocus.checked;

    settings.focusMinutes = focusMin;
    settings.shortBreakMinutes = shortMin;
    settings.longBreakMinutes = longMin;
    settings.longBreakInterval = interval;
    settings.autoStartBreaks = autoBreaks;
    settings.autoStartFocus = autoFocus;

    StorageManager.saveSettings(settings);

    pomodoro.updateConfig({
      focusMinutes: focusMin,
      shortBreakMinutes: shortMin,
      longBreakMinutes: longMin,
      longBreakInterval: interval,
      autoStartBreaks: autoBreaks,
      autoStartFocus: autoFocus
    });

    updateModeTabLabels();
    showToast('Timer settings & auto-transitions updated');
  };

  pomodoro.setMode('focus');

  // ----------------------------------------------------
  // 7. Bookmarks Grid & Categories
  // ----------------------------------------------------
  const bookmarksGridEl = document.getElementById('bookmarks-grid');

  function renderBookmarks() {
    if (!bookmarksGridEl) return;
    const bms = bookmarkManager.getFilteredBookmarks();

    bookmarksGridEl.innerHTML = bms.map(b => {
      const faviconUrl = b.domain ? `https://www.google.com/s2/favicons?domain=${b.domain}&sz=64` : '';
      return `
        <a href="${b.url}" class="bookmark-card" target="_blank" rel="noopener noreferrer">
          <div class="bookmark-icon-wrap" style="border-color: ${b.color || '#10b981'}40">
            ${b.domain ? `<img src="${faviconUrl}" class="bookmark-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` : ''}
            <span class="bookmark-initial" style="display: ${b.domain ? 'none' : 'flex'}; color: ${b.color || '#fafafa'}">${b.icon || '★'}</span>
          </div>
          <div class="bookmark-info">
            <span class="bookmark-title">${b.title}</span>
            <span class="bookmark-cat">${b.category}</span>
          </div>
          <button class="bookmark-del-btn" title="Delete" onclick="event.preventDefault(); window.appBookmarkManager.deleteBookmark('${b.id}')">✕</button>
        </a>
      `;
    }).join('');
  }

  document.querySelectorAll('.bookmark-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.bookmark-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      bookmarkManager.setCategory(tab.getAttribute('data-cat'));
    });
  });

  renderBookmarks();

  // ----------------------------------------------------
  // 8. Wallpaper Switcher & Modals
  // ----------------------------------------------------
  const wallpaperModal = document.getElementById('wallpaper-modal');
  window.openWallpaperModal = function() {
    if (wallpaperModal) wallpaperModal.classList.remove('hidden');
  };

  window.closeWallpaperModal = function() {
    if (wallpaperModal) wallpaperModal.classList.add('hidden');
  };

  window.selectWallpaper = function(wp) {
    settings.wallpaper = wp;
    StorageManager.saveSettings(settings);
    applyWallpaper(wp);
    closeWallpaperModal();
    showToast(`Wallpaper changed to ${wp.replace('_', ' ')}`);
  };

  // Command Palette
  const palette = new CommandPalette();
  window.appPalette = palette;

  // Zen Mode Toggle
  window.toggleZenMode = function() {
    settings.zenMode = !settings.zenMode;
    StorageManager.saveSettings(settings);
    if (settings.zenMode) {
      document.body.classList.add('zen-active');
      showToast('Zen Mode Enabled (Click Zen or press Ctrl+K to exit)');
    } else {
      document.body.classList.remove('zen-active');
      showToast('Zen Mode Disabled');
    }
  };

  // Salah Timetable Modal
  const salahModal = document.getElementById('salah-modal');
  window.openSalahModal = function() {
    const times = prayerEngine.calculateTimes(new Date());
    const tbody = document.getElementById('salah-table-body');
    if (tbody) {
      const list = [
        { name: 'Fajr', time: times.formatted24.Fajr, time12: times.formatted12.Fajr, desc: 'Dawn twilight' },
        { name: 'Sunrise', time: times.formatted24.Sunrise, time12: times.formatted12.Sunrise, desc: 'Solar disc sunrise' },
        { name: 'Dhuhr', time: times.formatted24.Dhuhr, time12: times.formatted12.Dhuhr, desc: 'Post-solar noon' },
        { name: 'Asr (Hanafi)', time: times.formatted24.Asr, time12: times.formatted12.Asr, desc: '2x Shadow ratio' },
        { name: 'Maghrib', time: times.formatted24.Maghrib, time12: times.formatted12.Maghrib, desc: 'Sunset' },
        { name: 'Isha', time: times.formatted24.Isha, time12: times.formatted12.Isha, desc: 'Night twilight' }
      ];
      tbody.innerHTML = list.map(item => `
        <tr class="${item.name.toLowerCase().includes(prayerEngine.getStatus().current.toLowerCase()) ? 'active-salah-row' : ''}">
          <td class="font-semibold">${item.name}</td>
          <td class="font-mono text-emerald-400">${item.time}</td>
          <td class="font-mono text-zinc-400">${item.time12}</td>
          <td class="text-xs text-zinc-500">${item.desc}</td>
        </tr>
      `).join('');
    }
    if (salahModal) salahModal.classList.remove('hidden');
  };

  window.closeSalahModal = function() {
    if (salahModal) salahModal.classList.add('hidden');
  };

  // Weather Hourly Modal
  const weatherModal = document.getElementById('weather-modal');
  window.openWeatherModal = async function() {
    const w = await weatherService.getForecast();
    const grid = document.getElementById('weather-hourly-grid');
    if (grid && w.hourly) {
      grid.innerHTML = w.hourly.map(h => `
        <div class="hourly-card">
          <span class="text-xs text-zinc-400">${h.time}</span>
          <div class="my-2">${h.svg}</div>
          <span class="text-sm font-bold">${h.temp}°C</span>
          <span class="text-[10px] text-sky-400">${h.precipProb}% rain</span>
        </div>
      `).join('');
    }
    if (weatherModal) weatherModal.classList.remove('hidden');
  };

  window.closeWeatherModal = function() {
    if (weatherModal) weatherModal.classList.add('hidden');
  };

  // Add Bookmark Modal
  const addBookmarkModal = document.getElementById('add-bookmark-modal');
  window.openAddBookmarkModal = function() {
    if (addBookmarkModal) addBookmarkModal.classList.remove('hidden');
    document.getElementById('bm-title-input')?.focus();
  };

  window.closeAddBookmarkModal = function() {
    if (addBookmarkModal) addBookmarkModal.classList.add('hidden');
  };

  window.submitNewBookmark = function() {
    const title = document.getElementById('bm-title-input')?.value;
    const url = document.getElementById('bm-url-input')?.value;
    const cat = document.getElementById('bm-cat-input')?.value || 'Core';
    const color = document.getElementById('bm-color-input')?.value || '#10b981';

    if (title && url) {
      bookmarkManager.addBookmark(title, url, cat, color);
      closeAddBookmarkModal();
      document.getElementById('bm-title-input').value = '';
      document.getElementById('bm-url-input').value = '';
    }
  };

  // Settings Modal
  const settingsModal = document.getElementById('settings-modal');
  window.openSettingsModal = function() {
    document.getElementById('setting-name').value = settings.userName;
    document.getElementById('setting-city').value = settings.city;
    document.getElementById('setting-lat').value = settings.lat;
    document.getElementById('setting-lng').value = settings.lng;
    document.getElementById('setting-timeformat').value = settings.timeFormat;
    document.getElementById('setting-asr').value = settings.asrSchool;
    document.getElementById('setting-wallpaper').value = settings.wallpaper || 'mountain_mist';
    document.getElementById('setting-script-endpoint').value = settings.customPrayerEndpoint || '';
    if (settingsModal) settingsModal.classList.remove('hidden');
  };

  window.closeSettingsModal = function() {
    if (settingsModal) settingsModal.classList.add('hidden');
  };

  window.saveSettingsForm = function() {
    settings.userName = document.getElementById('setting-name').value;
    settings.city = document.getElementById('setting-city').value;
    settings.lat = parseFloat(document.getElementById('setting-lat').value) || 53.7893;
    settings.lng = parseFloat(document.getElementById('setting-lng').value) || -2.2406;
    settings.timeFormat = document.getElementById('setting-timeformat').value;
    settings.asrSchool = document.getElementById('setting-asr').value;
    settings.wallpaper = document.getElementById('setting-wallpaper').value;
    settings.customPrayerEndpoint = document.getElementById('setting-script-endpoint').value;

    StorageManager.saveSettings(settings);
    applyWallpaper(settings.wallpaper);
    closeSettingsModal();
    updateClock();
    updateSalah();
    loadWeather();
    showToast('Settings saved successfully');
  };

  // Export / Import
  window.exportConfig = function() {
    const json = StorageManager.exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-startpage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported to file');
  };

  window.importConfig = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const ok = StorageManager.importAll(e.target.result);
      if (ok) {
        showToast('Configuration restored! Reloading...');
        setTimeout(() => location.reload(), 800);
      } else {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Keyboard shortcuts (Escape / Space to dismiss covering Salah alert, Athletic alert, or Lightbox)
  document.addEventListener('keydown', (e) => {
    const salahOverlay = document.getElementById('salah-alert-overlay');
    if (salahOverlay && !salahOverlay.classList.contains('hidden')) {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        window.dismissSalahAlert();
        return;
      }
    }

    const athleticOverlay = document.getElementById('athletic-alert-overlay');
    if (athleticOverlay && !athleticOverlay.classList.contains('hidden')) {
      if (e.key === 'Escape' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        window.dismissAthleticAlert();
        return;
      }
    }

    const lightbox = document.getElementById('poster-lightbox-modal');
    if (lightbox && !lightbox.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        window.closePosterLightbox();
        return;
      }
    }
  });

  // Toast Notification
  function showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'show';
    setTimeout(() => { toast.className = ''; }, 3000);
  }
  window.showToast = showToast;
});
