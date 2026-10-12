/**
 * Workflow Hub Engine v2.5
 * Integrates:
 * 1. 3-Option LinkedIn Ghostwriter Hub with Idea Generator
 * 2. 3-Poster MacroStudyHub Marketing Bundle & Video Concept Review
 * 3. Neat Horizontal Autonomous Gemma-4 E2B Workflows (No cramped scrolling)
 * 4. Fullscreen Covering Athletic Reminders (Boxing Sparring, Gym Push/Pull, Jiu-Jitsu)
 * 5. Fullscreen Covering Salah Reminders & Madinah Adhaan Audio
 */

class WorkflowHub {
  constructor() {
    this.linkedinDrafts = [];
    this.selectedDraftIndex = 0;
    this.outreachItems = [];
    this.mshPosters = [];
    this.mshVideo = null;
    this.mshWorkflows = [];
    this.athleticSchedule = [];
    this.audioElement = null;
    this.firedAthleticToday = new Set();

    this.init();
  }

  async init() {
    this.audioElement = document.getElementById('salah-adhan-audio');
    await this.loadAthleticSchedule();
    await this.loadLinkedInWorkflow();
    await this.loadMSHWorkflow();
    this.bindEvents();
    this.startAthleticWatcher();

    // Auto-refresh every 60 seconds
    setInterval(() => {
      this.loadLinkedInWorkflow(true);
      this.loadMSHWorkflow(true);
    }, 60000);
  }

  bindEvents() {
    window.postLinkedInDraft = () => this.postLinkedInDraft();
    window.regenerateLinkedInDraft = () => this.regenerateLinkedInDraft();
    window.generateDifferentPostIdea = () => this.generateDifferentPostIdea();
    window.selectLinkedInOption = (idx) => this.selectLinkedInOption(idx);

    window.copyOutreachPitch = (encodedMsg, btnId) => {
      const msg = decodeURIComponent(encodedMsg || '');
      navigator.clipboard.writeText(msg).then(() => {
        const btn = document.getElementById(btnId);
        if (btn) {
          const original = btn.innerHTML;
          btn.innerHTML = '<span>✓ Copied!</span>';
          btn.classList.add('btn-copied');
          setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('btn-copied');
          }, 2000);
        }
      }).catch(err => {
        alert('Could not copy to clipboard: ' + err);
      });
    };

    window.seekVideoTo = (seconds) => {
      const vid = document.getElementById('msh-reel-video');
      if (vid) {
        vid.currentTime = seconds;
        vid.play().catch(() => {});
      }
    };

    window.approveMSHAssets = () => this.approveMSHAssets();
    window.launchMSHWorkflow = (idx) => this.launchMSHWorkflow(idx);
    window.openPosterLightbox = (url) => this.openPosterLightbox(url);
    window.closePosterLightbox = () => this.closePosterLightbox();

    window.dismissSalahAlert = () => this.dismissSalahAlert();
    window.testSalahAlert = () => this.testSalahAlert();

    window.dismissAthleticAlert = () => this.dismissAthleticAlert();
    window.testAthleticAlert = (type) => this.testAthleticAlert(type);
  }

  /* ================= ATHLETIC SCHEDULE & FULLSCREEN ALERTS ================= */
  async loadAthleticSchedule() {
    try {
      const res = await fetch('/api/athletic/schedule');
      if (res.ok) {
        const data = await res.json();
        this.athleticSchedule = data.schedule || [];
      }
    } catch (e) {
      console.warn('[WorkflowHub] Could not load athletic schedule:', e);
    }
  }

  startAthleticWatcher() {
    setInterval(() => {
      const now = new Date();
      const dayIdx = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      // Convert Sunday (0) to 6, Monday (1) to 0, etc.
      const adjustedDayIdx = (dayIdx + 6) % 7;
      const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const session = this.athleticSchedule.find(s => s.day_index === adjustedDayIdx && s.time === nowStr);
      if (session) {
        const alertKey = `athletic_${session.type}_${now.toISOString().split('T')[0]}_${nowStr}`;
        if (!this.firedAthleticToday.has(alertKey)) {
          this.firedAthleticToday.add(alertKey);
          this.openCoveringAthleticAlert(session);
        }
      }
    }, 15000);
  }

  openCoveringAthleticAlert(session) {
    const overlay = document.getElementById('athletic-alert-overlay');
    if (!overlay) return;

    document.getElementById('athletic-overlay-tag').textContent = `${session.type.toUpperCase()} PROTOCOL (${session.time})`;
    document.getElementById('athletic-overlay-title').textContent = session.title;
    document.getElementById('athletic-overlay-identity').textContent = session.identity;

    const bulletsList = document.getElementById('athletic-overlay-bullets');
    if (bulletsList && session.bullets) {
      bulletsList.innerHTML = session.bullets.map(b => `
        <li class="athletic-bullet-item">
          <span class="athletic-bullet-dot"></span>
          <span>${b}</span>
        </li>
      `).join('');
    }

    const recoveryEl = document.getElementById('athletic-overlay-recovery');
    if (recoveryEl) {
      recoveryEl.innerHTML = `<strong>Recovery Mandate:</strong> ${session.recovery || 'Sauna, steam, and hydration.'}`;
    }

    const quoteEl = document.getElementById('athletic-overlay-quote');
    if (quoteEl) {
      quoteEl.textContent = `"${session.quote || 'Discipline over motivation.'}"`;
    }

    overlay.classList.remove('hidden');
    document.body.classList.add('salah-modal-open');
  }

  dismissAthleticAlert() {
    const overlay = document.getElementById('athletic-alert-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    document.body.classList.remove('salah-modal-open');
  }

  testAthleticAlert(type = 'Boxing') {
    const session = this.athleticSchedule.find(s => s.type.toLowerCase().includes(type.toLowerCase())) || {
      type: 'Boxing',
      time: '17:30',
      title: 'BOXING SPAR PROTOCOL: THE SIEGE',
      identity: 'Musa Ahmed | Height: 5\'7" | Weight: 76kg | Pressure-Heavy Fighter (Artur Beterbiev & Islam Makhachev)',
      bullets: [
        'Relentless Forward Pressure: Cut off the ring systematically; do not follow, intercept.',
        'Inside Fighting & Clinch: Short concussive hooks and heavy physical framing to control posture.',
        'High Guard & Parry: Keep the shell tight, parry the jab, slip inside longer reach.',
        'Level Changes: Mix body-head combinations continuously to break rhythm and exhaust opponents.',
        'Calculated Feints: Draw out reactions, bite down, and counter cleanly over the top.'
      ],
      recovery: 'Post-sparring cold hydration (2-3L), joint mobilization, and mental fight audit.',
      quote: 'Victory belongs to those who embrace the trenches.'
    };
    this.openCoveringAthleticAlert(session);
  }

  /* ================= LINKEDIN 3-OPTION POST HUB ================= */
  async loadLinkedInWorkflow(silent = false) {
    const statusEl = document.getElementById('linkedin-status-badge');
    const tabsContainer = document.getElementById('linkedin-options-tabs');
    const editorEl = document.getElementById('linkedin-draft-editor');
    const outreachListEl = document.getElementById('linkedin-outreach-list');

    try {
      const res = await fetch('/api/linkedin/drafts');
      if (res.ok) {
        const data = await res.json();
        this.linkedinDrafts = data.drafts || [];
        this.selectedDraftIndex = data.selected_index || 0;
        this.outreachItems = data.outreach || [];

        // Render option tabs
        if (tabsContainer) {
          tabsContainer.innerHTML = this.linkedinDrafts.map((d, idx) => `
            <button class="tab-option-btn ${idx === this.selectedDraftIndex ? 'active' : ''}" onclick="window.selectLinkedInOption(${idx})">
              <span class="option-num">${idx + 1}</span>
              <span class="option-tag">${d.tag || `Option ${idx + 1}`}</span>
            </button>
          `).join('');
        }

        // Render active content
        const activeDraft = this.linkedinDrafts[this.selectedDraftIndex];
        if (editorEl && (document.activeElement !== editorEl || !silent)) {
          editorEl.value = activeDraft ? activeDraft.content : '';
        }

        if (statusEl) {
          statusEl.textContent = '3 Options Ready';
          statusEl.className = 'status-badge badge-ready';
        }

        if (outreachListEl) {
          this.renderOutreach(outreachListEl);
        }
      }
    } catch (e) {
      if (!silent) console.warn('[WorkflowHub] Error loading LinkedIn draft:', e);
    }
  }

  selectLinkedInOption(idx) {
    this.selectedDraftIndex = idx;
    const editorEl = document.getElementById('linkedin-draft-editor');
    const tabsContainer = document.getElementById('linkedin-options-tabs');

    if (tabsContainer) {
      tabsContainer.querySelectorAll('.tab-option-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
      });
    }

    const activeDraft = this.linkedinDrafts[idx];
    if (editorEl && activeDraft) {
      editorEl.value = activeDraft.content;
    }
  }

  async generateDifferentPostIdea() {
    const btn = document.getElementById('btn-linkedin-new-idea');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Generating Ideas...';
    }

    try {
      await fetch('/api/linkedin/generate_ideas', { method: 'POST' });
      await this.loadLinkedInWorkflow();
      if (btn) {
        btn.innerHTML = '✓ Fresh Ideas Loaded';
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = '💡 Generate Different Idea';
        }, 2000);
      }
    } catch (e) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '💡 Generate Different Idea';
      }
    }
  }

  async postLinkedInDraft() {
    const editorEl = document.getElementById('linkedin-draft-editor');
    const postBtn = document.getElementById('btn-linkedin-post');
    const draftText = editorEl ? editorEl.value : '';

    if (!draftText.trim()) {
      alert('Post draft is empty.');
      return;
    }

    if (postBtn) {
      postBtn.disabled = true;
      postBtn.innerHTML = '🚀 Publishing...';
    }

    try {
      const res = await fetch('/api/linkedin/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draftText })
      });

      if (res.ok) {
        if (postBtn) {
          postBtn.innerHTML = '✓ Published to LinkedIn!';
          postBtn.classList.add('btn-success');
          setTimeout(() => {
            postBtn.disabled = false;
            postBtn.innerHTML = '🚀 Post to LinkedIn';
            postBtn.classList.remove('btn-success');
          }, 4000);
        }
      }
    } catch (e) {
      alert('Failed to publish: ' + e.message);
      if (postBtn) {
        postBtn.disabled = false;
        postBtn.innerHTML = '🚀 Post to LinkedIn';
      }
    }
  }

  async regenerateLinkedInDraft() {
    const regenBtn = document.getElementById('btn-linkedin-regen');
    if (regenBtn) {
      regenBtn.disabled = true;
      regenBtn.innerHTML = '⏳ Regenerating...';
    }

    try {
      await fetch('/api/linkedin/regenerate', { method: 'POST' });
      await this.loadLinkedInWorkflow();
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.innerHTML = '🔄 Regenerate Option';
      }
    } catch (e) {
      if (regenBtn) {
        regenBtn.disabled = false;
        regenBtn.innerHTML = '🔄 Regenerate Option';
      }
    }
  }

  renderOutreach(container) {
    if (!this.outreachItems || this.outreachItems.length === 0) {
      container.innerHTML = '<div class="text-zinc-500 text-xs py-2">No target outreach queued for today.</div>';
      return;
    }

    container.innerHTML = this.outreachItems.map((item, idx) => {
      const profileUrl = item.profile_url || `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(item.name.replace(/\(.*?\)/g, '').trim())}`;
      const msgEscaped = encodeURIComponent(item.message || '');
      
      return `
        <div class="outreach-card">
          <div class="outreach-header">
            <span class="outreach-name">${item.name || 'Target Contact'}</span>
            <span class="outreach-category">${item.category || 'Outreach'}</span>
          </div>
          <div class="outreach-headline">${item.headline || ''}</div>
          <div class="outreach-msg">"${item.message || ''}"</div>
          <div class="outreach-actions-row">
            <a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="btn-outreach-action btn-outreach-profile" title="View LinkedIn Profile">
              <span>👤 View Profile</span>
            </a>
            <button class="btn-outreach-action btn-outreach-copy" id="btn-copy-outreach-${idx}" onclick="window.copyOutreachPitch('${msgEscaped}', 'btn-copy-outreach-${idx}')" title="Copy tailored message to clipboard">
              <span>📋 Copy Pitch</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ================= MACROSTUDYHUB 3-POSTER BUNDLE & VIDEO REEL ENGINE ================= */
  async loadMSHWorkflow(silent = false) {
    const postersRow = document.getElementById('msh-posters-row');
    const videoCard = document.getElementById('msh-video-preview-card');
    const wfListEl = document.getElementById('msh-workflows-list');

    try {
      const res = await fetch('/api/msh/assets');
      if (res.ok) {
        const data = await res.json();
        this.mshPosters = data.posters || [];
        this.mshVideo = data.video || null;
        this.mshWorkflows = data.workflows || [];

        // Render 3 High-Fidelity Poster Thumbnails
        if (postersRow && this.mshPosters.length > 0) {
          postersRow.innerHTML = this.mshPosters.map(p => `
            <div class="poster-thumb-card" onclick="window.openPosterLightbox('${p.url}')" title="Click to view full high-resolution poster">
              <div class="poster-thumb-media">
                <img src="${p.url}" alt="${p.title}" class="poster-img-fluid" loading="lazy">
                <div class="poster-hover-overlay">🔍 View Full Poster</div>
              </div>
              <div class="poster-thumb-info">
                <span class="poster-tag-pill">${p.subject || 'A*'}</span>
                <div class="poster-thumb-title">${p.title}</div>
              </div>
            </div>
          `).join('');
        }

        // Render Interactive Video Reel Player Card
        if (videoCard && this.mshVideo) {
          const videoSrc = this.mshVideo.video_url || '/MacroStudyHub/Today/daily_reel_latest.mp4';
          const posterSrc = (this.mshPosters && this.mshPosters[0]) ? this.mshPosters[0].url : '/MacroStudyHub/Today/poster_1.png';

          videoCard.innerHTML = `
            <div class="video-card-header">
              <div class="video-title">🎬 Daily Short-Form Reel: ${this.mshVideo.title}</div>
              <span class="video-duration">${this.mshVideo.duration}</span>
            </div>
            
            <div class="video-player-wrapper">
              <video id="msh-reel-video" class="msh-reel-video" controls playsinline preload="metadata" poster="${posterSrc}">
                <source src="${videoSrc}" type="video/mp4">
                Your browser does not support the video tag.
              </video>
            </div>

            <div class="video-hook"><strong>Hook:</strong> "${this.mshVideo.hook}"</div>
            
            <div class="video-scenes-section">
              <div class="scene-section-title">Jump to Scene Timestamp:</div>
              <div class="video-scenes-row">
                ${(this.mshVideo.scenes || []).map((s, sIdx) => {
                  const match = s.time.match(/(\d+):(\d+)/);
                  const seconds = match ? (parseInt(match[1]) * 60 + parseInt(match[2])) : (sIdx * 10);
                  return `
                    <button class="scene-chip-btn" onclick="window.seekVideoTo(${seconds})" title="Seek video to ${s.time}">
                      <span class="scene-time">▶ ${s.time}</span>
                      <span class="scene-text">${s.narration}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }

        // Render Horizontal Autonomous Workflows
        if (wfListEl) {
          this.renderHorizontalMSHWorkflows(wfListEl);
        }
      }
    } catch (e) {
      if (!silent) console.warn('[WorkflowHub] Error loading MSH assets:', e);
    }
  }

  renderHorizontalMSHWorkflows(container) {
    if (!this.mshWorkflows || this.mshWorkflows.length === 0) return;

    container.innerHTML = this.mshWorkflows.map((wf, idx) => `
      <div class="wf-horizontal-card">
        <div class="wf-card-left">
          <div class="wf-row-top">
            <span class="wf-badge-tag badge-${wf.badge_color || 'violet'}">${wf.tag || 'AGY'}</span>
            <span class="wf-title-text">${wf.title}</span>
          </div>
          <div class="wf-row-bottom">
            <span class="wf-desc-text">${wf.description}</span>
          </div>
        </div>
        <div class="wf-card-right">
          <button class="btn-wf-launch-horizontal" id="btn-wf-launch-${idx}" onclick="window.launchMSHWorkflow(${idx})">
            ⚡ Launch in AGY
          </button>
        </div>
      </div>
    `).join('');
  }

  async approveMSHAssets() {
    const approveBtn = document.getElementById('btn-msh-approve');
    if (approveBtn) {
      approveBtn.disabled = true;
      approveBtn.innerHTML = 'Approving...';
    }

    try {
      await fetch('/api/msh/approve', { method: 'POST' });
      if (approveBtn) {
        approveBtn.innerHTML = '✓ Assets Approved';
        approveBtn.classList.add('btn-success');
        setTimeout(() => {
          approveBtn.disabled = false;
          approveBtn.innerHTML = '✓ Approve Daily Assets';
          approveBtn.classList.remove('btn-success');
        }, 3000);
      }
    } catch (e) {
      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.innerHTML = '✓ Approve Daily Assets';
      }
    }
  }

  async launchMSHWorkflow(idx) {
    const wf = this.mshWorkflows[idx];
    const btn = document.getElementById(`btn-wf-launch-${idx}`) || event?.currentTarget;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '🚀 Opening Terminal...';
      btn.classList.add('btn-launching');
    }

    try {
      const res = await fetch('/api/msh/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf?.prompt || wf?.description, title: wf?.title })
      });

      if (res.ok) {
        if (btn) {
          btn.innerHTML = '✓ Terminal Launched';
          btn.classList.remove('btn-launching');
          btn.classList.add('btn-success');
          setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '⚡ Launch in AGY';
            btn.classList.remove('btn-success');
          }, 4000);
        }
      }
    } catch (e) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '⚡ Launch in AGY';
        btn.classList.remove('btn-launching');
      }
    }
  }

  openPosterLightbox(url) {
    const modal = document.getElementById('poster-lightbox-modal');
    const img = document.getElementById('lightbox-poster-img');
    if (modal && img) {
      img.src = url;
      modal.classList.remove('hidden');
    }
  }

  closePosterLightbox() {
    const modal = document.getElementById('poster-lightbox-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /* ================= SALAH ALERT & ADHAAN ================= */
  openCoveringSalahAlert(prayerName, timeStr, reflectionData, jamaatStr) {
    const overlay = document.getElementById('salah-alert-overlay');
    if (!overlay) return;

    document.getElementById('salah-overlay-title').textContent = `${prayerName} has begun (${timeStr})`;
    
    const jamaatEl = document.getElementById('salah-overlay-jamaat');
    if (jamaatEl) {
      if (jamaatStr) {
        jamaatEl.textContent = `🕌 Jama'ah at Masjid: ${jamaatStr}`;
        jamaatEl.classList.remove('hidden');
      } else {
        jamaatEl.classList.add('hidden');
      }
    }

    document.getElementById('salah-overlay-arabic').textContent = reflectionData.arabic || 'أَقِمِ الصَّلَاةَ';
    document.getElementById('salah-overlay-translit').textContent = reflectionData.pronunciation || 'Aqimi s-salah';
    document.getElementById('salah-overlay-meaning').textContent = reflectionData.meaning || 'Establish the prayer.';
    document.getElementById('salah-overlay-reflection').textContent = reflectionData.reflection || 'Take a sacred pause to detach from worldly noise and connect with Allah.';

    overlay.classList.remove('hidden');
    document.body.classList.add('salah-modal-open');

    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.play().catch(() => {});
    }
  }

  dismissSalahAlert() {
    const overlay = document.getElementById('salah-alert-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    document.body.classList.remove('salah-modal-open');

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  testSalahAlert() {
    this.openCoveringSalahAlert('Dhuhr', '13:21', {
      arabic: 'أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ',
      pronunciation: 'Aqimi s-salata li-duluki s-shams',
      meaning: 'Establish prayer at the decline of the sun.',
      reflection: 'At midday, as worldly duties peak, let the prayer be your anchor of peace and purpose.'
    });
  }
}

window.WorkflowHub = WorkflowHub;
