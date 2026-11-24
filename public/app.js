/**
 * Antigravity Studio Application Logic
 * Clean Professional Design System with dynamic Day / Sunset / Night transitions.
 * Full synchronization with live session steps, roadmap pipeline, and agent states.
 */

let officeSim = null;
let currentProjectId = null;
let currentConversationId = null;
let eventSource = null;
let autoFollowEnabled = true;
let totalStepsCount = 0;
let lastKnownActive = null;
let cachedMissionSteps = [];
const appUrlParams = new URLSearchParams(window.location.search);
const excludeConvId = appUrlParams.get('exclude_conv_id') || "";
let activeSessionsCache = [];
let projectsListCache = [];
let currentFeedFilter = 'all';
let currentArtifactsCache = [];
let currentRawArtifactContent = '';
let currentModalCopyText = '';

document.addEventListener('DOMContentLoaded', () => {
  officeSim = new OfficeSimulator('officeCanvas');
  officeSim.updateRosterUI();

  initAtmosphereControls();
  initUIEvents();
  loadAvailableAgents();
  loadProjects();
  checkActiveSessions();

  // Periodic polling for active workspace and multi-session detection
  setInterval(() => {
    checkActiveSessions();
    if (autoFollowEnabled) {
      checkActiveProject();
    }
  }, 2000);
});

async function loadAvailableAgents() {
  try {
    const res = await fetch('/api/agents/available');
    if (res.ok) {
      const data = await res.json();
      if (officeSim && typeof officeSim.registerPluginAgents === 'function') {
        officeSim.registerPluginAgents(data);
      }
    }
  } catch (e) {
    console.debug('Subagent discovery fallback to builtins:', e);
  }
}

function initAtmosphereControls() {
  const modes = ['day', 'sunset', 'night', 'auto'];
  const savedMode = localStorage.getItem('antigravity_lighting_mode') || 'day';

  const setMode = (mode) => {
    modes.forEach(m => {
      const btn = document.getElementById(`mode-${m}`);
      if (btn) btn.classList.toggle('active', m === mode);
    });

    let effectiveTheme = mode;
    if (mode === 'auto') {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 17) effectiveTheme = 'day';
      else if (hour >= 17 && hour < 20) effectiveTheme = 'sunset';
      else effectiveTheme = 'night';
    }

    officeSim.setLightingMode(mode);
    document.body.classList.remove('theme-day', 'theme-sunset', 'theme-night');
    document.body.classList.add(`theme-${effectiveTheme}`);
    const isDark = effectiveTheme === 'night' || effectiveTheme === 'sunset';
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('antigravity_lighting_mode', mode);
  };

  modes.forEach(m => {
    const btn = document.getElementById(`mode-${m}`);
    if (btn) {
      btn.addEventListener('click', () => setMode(m));
    }
  });

  setMode(savedMode);
}

function initUIEvents() {
  const refreshBtn = document.getElementById('btn-refresh');
  const demoBtn = document.getElementById('btn-simulate');
  const audioBtn = document.getElementById('btn-audio-toggle');

  // Unified Workspace Switcher & Popover
  const switcherWrapper = document.getElementById('workspace-switcher-wrapper');
  const switcherTrigger = document.getElementById('workspace-switcher-trigger');
  const workspacePopover = document.getElementById('workspace-popover');
  const autofollowBtn = document.getElementById('popover-autofollow-btn');

  if (switcherTrigger && workspacePopover) {
    switcherTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      workspacePopover.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (switcherWrapper && !switcherWrapper.contains(e.target)) {
        workspacePopover.classList.add('hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        workspacePopover.classList.add('hidden');
      }
    });
  }

  if (autofollowBtn) {
    autofollowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      autoFollowEnabled = !autoFollowEnabled;
      updateAutoFollowButton();
      if (autoFollowEnabled) {
        checkActiveProject(true);
        checkActiveSessions();
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadProjects();
      checkActiveSessions();
    });
  }
  if (demoBtn) demoBtn.addEventListener('click', runDemoSimulation);

  // Artifacts Drawer
  const openArtifactsBtn = document.getElementById('btn-open-artifacts');
  const closeArtifactsBtn = document.getElementById('btn-close-artifacts');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const copyArtifactBtn = document.getElementById('btn-copy-artifact');

  if (openArtifactsBtn) {
    openArtifactsBtn.addEventListener('click', () => toggleArtifactsDrawer(true));
  }
  if (closeArtifactsBtn) {
    closeArtifactsBtn.addEventListener('click', () => toggleArtifactsDrawer(false));
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => toggleArtifactsDrawer(false));
  }
  if (copyArtifactBtn) {
    copyArtifactBtn.addEventListener('click', () => {
      if (currentRawArtifactContent) {
        navigator.clipboard.writeText(currentRawArtifactContent);
        showToast("Artifact markdown copied to clipboard!");
      }
    });
  }

  // CLI Resume Copy Button
  const copyResumeBtn = document.getElementById('btn-copy-resume');
  if (copyResumeBtn) {
    copyResumeBtn.addEventListener('click', () => {
      if (currentConversationId) {
        const cmd = `agy -r ${currentConversationId}`;
        navigator.clipboard.writeText(cmd);
        showToast(`Copied: ${cmd}`);
      } else {
        showToast("No active conversation selected to resume");
      }
    });
  }

  // Diff & Inspector Modal
  const closeModalBtn = document.getElementById('btn-close-modal');
  const copyModalBtn = document.getElementById('btn-modal-copy');
  const diffModal = document.getElementById('diff-modal');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeDiffModal);
  }
  if (copyModalBtn) {
    copyModalBtn.addEventListener('click', () => {
      if (currentModalCopyText) {
        navigator.clipboard.writeText(currentModalCopyText);
        showToast("Copied content to clipboard!");
      }
    });
  }
  if (diffModal) {
    diffModal.addEventListener('click', (e) => {
      if (e.target === diffModal) closeDiffModal();
    });
  }

  // Feed Category Filter Bar
  const filterBar = document.getElementById('feed-filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-pill');
      if (!btn) return;
      const filter = btn.dataset.filter || 'all';
      setFeedFilter(filter);
    });
  }

  // Chiptune 8-bit Audio Toggle
  if (audioBtn) {
    const updateAudioUI = () => {
      const isEnabled = window.chiptuneAudio && window.chiptuneAudio.enabled;
      const iconSlot = document.getElementById('audio-icon-slot');
      const label = document.getElementById('audio-label');
      if (iconSlot) {
        iconSlot.innerHTML = typeof renderIcon === 'function' 
          ? (isEnabled ? renderIcon('volume', 'w-3.5 h-3.5') : renderIcon('volumeX', 'w-3.5 h-3.5'))
          : '';
      }
      if (label) label.textContent = isEnabled ? 'Audio: ON' : 'Muted';
      audioBtn.classList.toggle('border-indigo-300', isEnabled);
      audioBtn.classList.toggle('bg-indigo-50/50', isEnabled);
      audioBtn.classList.toggle('text-indigo-600', isEnabled);
    };
    audioBtn.addEventListener('click', () => {
      if (window.chiptuneAudio) {
        window.chiptuneAudio.toggle();
        updateAudioUI();
      }
    });
    updateAudioUI();
  }
}

// --- Studio Toast Feedback ---
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'studio-toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => toast.remove(), 220);
  }, 2400);
}

// --- Diff & Output Inspector Modal ---
function showDiffModal(title, contentHtml, copyText = '') {
  const modal = document.getElementById('diff-modal');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = title;
  bodyEl.innerHTML = contentHtml;
  currentModalCopyText = copyText || '';
  modal.classList.remove('hidden');
}

function closeDiffModal() {
  const modal = document.getElementById('diff-modal');
  if (modal) modal.classList.add('hidden');
}

// --- Artifacts & Plan Studio Drawer ---
function toggleArtifactsDrawer(open = null) {
  const drawer = document.getElementById('artifacts-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!drawer) return;

  const shouldOpen = (open !== null) ? open : !drawer.classList.contains('open');
  if (shouldOpen) {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.remove('hidden');
    if (currentConversationId) {
      loadArtifactsList(currentConversationId);
    }
  } else {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.add('hidden');
  }
}

async function loadArtifactsList(convId) {
  const listEl = document.getElementById('drawer-artifacts-list');
  const countBadge = document.getElementById('drawer-artifact-count');
  const headerBadge = document.getElementById('artifacts-badge-count');
  if (!convId || !listEl) return;

  try {
    const res = await fetch(`/api/artifacts?conversation_id=${encodeURIComponent(convId)}`);
    if (!res.ok) return;
    const artifacts = await res.json();
    currentArtifactsCache = artifacts;

    if (countBadge) countBadge.textContent = artifacts.length;
    if (headerBadge) headerBadge.textContent = artifacts.length;

    listEl.innerHTML = '';
    if (artifacts.length === 0) {
      listEl.innerHTML = '<div class="text-[11px] text-slate-400 italic p-2">No plans or artifacts generated yet.</div>';
      return;
    }

    artifacts.forEach((art, idx) => {
      const item = document.createElement('div');
      item.className = `artifact-item ${idx === 0 ? 'active' : ''}`;
      item.dataset.filename = art.name;

      const kindColor = art.kind === 'plan' ? 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
        : (art.kind === 'walkthrough' ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
        : 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700');

      item.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 pr-2">
          <span class="badge-kind ${kindColor}">${art.kind}</span>
          <span class="font-medium truncate text-xs" style="color: var(--text-primary);">${art.title}</span>
        </div>
        <span class="text-[9.5px] font-mono text-[var(--text-muted)] shrink-0">${art.modified_iso ? art.modified_iso.slice(11, 16) : ''}</span>
      `;

      item.addEventListener('click', () => {
        listEl.querySelectorAll('.artifact-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
        loadArtifactContent(art.name);
      });

      listEl.appendChild(item);
    });

    if (artifacts.length > 0) {
      loadArtifactContent(artifacts[0].name);
    }
  } catch (e) {
    console.error("Failed to load artifacts list:", e);
  }
}

async function loadArtifactContent(filename) {
  const viewer = document.getElementById('artifact-markdown-viewer');
  const titleEl = document.getElementById('active-artifact-title');
  if (!viewer || !currentConversationId || !filename) return;

  if (titleEl) titleEl.textContent = filename;
  viewer.innerHTML = '<div class="text-[11px] text-slate-400 italic p-4 text-center">Loading document...</div>';

  try {
    const res = await fetch(`/api/artifacts/content?conversation_id=${encodeURIComponent(currentConversationId)}&file=${encodeURIComponent(filename)}`);
    if (!res.ok) {
      viewer.innerHTML = '<div class="text-[11px] text-rose-500 p-4">Failed to load artifact content.</div>';
      return;
    }
    const md = await res.text();
    currentRawArtifactContent = md;
    viewer.innerHTML = renderSimpleMarkdown(md);
  } catch (e) {
    viewer.innerHTML = `<div class="text-[11px] text-rose-500 p-4">Error loading content: ${e.message}</div>`;
  }
}

function renderSimpleMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCode) {
        html += `<pre><code>${codeBuffer.map(DiffInspector.escapeHtml).join('\n')}</code></pre>`;
        codeBuffer = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      html += `<h3>${DiffInspector.escapeHtml(line.slice(4))}</h3>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2>${DiffInspector.escapeHtml(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith('# ')) {
      html += `<h1>${DiffInspector.escapeHtml(line.slice(2))}</h1>`;
      continue;
    }

    if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
      html += `<div class="flex items-center gap-2 py-0.5"><span class="w-3.5 h-3.5 rounded border border-[var(--border-card)] shrink-0"></span><span>${DiffInspector.escapeHtml(line.slice(6))}</span></div>`;
      continue;
    }
    if (line.startsWith('- [x] ') || line.startsWith('* [x] ')) {
      html += `<div class="flex items-center gap-2 py-0.5"><span class="w-3.5 h-3.5 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0"><svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></span><span class="line-through opacity-70">${DiffInspector.escapeHtml(line.slice(6))}</span></div>`;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<li class="ml-4 list-disc">${DiffInspector.escapeHtml(line.slice(2))}</li>`;
      continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      html += `<hr class="my-3 border-[var(--border-card)]" />`;
      continue;
    }

    if (!line.trim()) {
      html += `<div class="h-2"></div>`;
      continue;
    }

    let formatted = DiffInspector.escapeHtml(line);
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    html += `<p class="leading-relaxed mb-1.5">${formatted}</p>`;
  }

  if (inCode && codeBuffer.length > 0) {
    html += `<pre><code>${codeBuffer.map(DiffInspector.escapeHtml).join('\n')}</code></pre>`;
  }

  return html;
}

// --- Feed Filter & Token Health ---
function setFeedFilter(filter) {
  currentFeedFilter = filter;
  const filterBar = document.getElementById('feed-filter-bar');
  if (filterBar) {
    filterBar.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  const feed = document.getElementById('action-feed');
  if (!feed) return;
  const cards = feed.querySelectorAll('.feed-card');
  cards.forEach(card => {
    if (filter === 'all') {
      card.classList.remove('hidden');
    } else {
      card.classList.toggle('hidden', card.dataset.category !== filter);
    }
  });
}

function updateTokenHealth(analytics) {
  if (!analytics) return;
  const tokenPillText = document.getElementById('token-stat-text');
  if (!tokenPillText) return;

  const currentCtx = analytics.estimated_context_tokens || analytics.total_input_tokens || 0;
  const limit = analytics.context_window_limit || 200000;
  const pct = analytics.context_window_percent || 0;

  const fmt = (n) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`;
  tokenPillText.textContent = `${fmt(currentCtx)} / ${fmt(limit)} (${pct}%)`;

  const pill = document.getElementById('token-health-pill');
  if (pill) {
    pill.classList.remove('hidden');
    const dot = pill.querySelector('span');
    if (dot) {
      if (pct > 85) dot.className = "w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse";
      else if (pct > 65) dot.className = "w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse";
      else dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse";
    }
  }
}

function updateAutoFollowButton() {
  const btn = document.getElementById('popover-autofollow-btn');
  const dot = document.getElementById('popover-autofollow-dot');
  if (!btn) return;
  if (autoFollowEnabled) {
    btn.textContent = "ON";
    btn.className = "px-2.5 py-1 rounded text-[11px] font-bold border transition bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300";
    if (dot) {
      dot.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse";
    }
  } else {
    btn.textContent = "OFF";
    btn.className = "px-2.5 py-1 rounded text-[11px] font-bold border transition border-[var(--border-card)] bg-[var(--surface-card)] text-[var(--text-muted)]";
    if (dot) {
      dot.className = "w-2 h-2 rounded-full bg-slate-400";
    }
  }
}

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    projectsListCache = projects;

    renderPopoverWorkspaceList(projects);

    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const urlProj = params.get('project');
    const urlConv = params.get('conversation');

    if (urlConv) {
      currentConversationId = urlConv;
      connectToEventStream(urlConv, true);
      return;
    }

    if (urlProj) {
      autoFollowEnabled = false;
      updateAutoFollowButton();
      const match = projects.find(p => p.id === urlProj || p.name.toLowerCase() === urlProj.toLowerCase());
      if (match) {
        localStorage.setItem('antigravity_selected_project', match.id);
        switchProject(match.id, projects);
        return;
      }
    }

    // Check saved project selection
    const saved = localStorage.getItem('antigravity_selected_project');
    if (saved) {
      const match = projects.find(p => p.id === saved);
      if (match) {
        currentProjectId = match.id;
        renderPopoverWorkspaceList(projects);
      }
    }

    checkActiveProject(true);
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

function renderPopoverWorkspaceList(projects) {
  const container = document.getElementById('popover-workspace-list');
  if (!container) return;
  container.innerHTML = '';

  if (!projects || projects.length === 0) {
    container.innerHTML = '<div class="text-[11px] py-1 px-2 text-[var(--text-muted)] italic">No workspaces detected.</div>';
    return;
  }

  projects.forEach(p => {
    const item = document.createElement('div');
    const isCurrent = (p.id === currentProjectId);
    item.className = `popover-item ${isCurrent ? 'active' : ''}`;
    item.dataset.projectId = p.id;

    const dotHtml = p.active 
      ? '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>'
      : '<span class="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>';

    const activeBadge = p.active
      ? '<span class="badge-steps ml-auto">Active</span>'
      : '';

    item.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        ${dotHtml}
        <span class="font-medium truncate" style="color: var(--text-primary);">${p.display_name}</span>
      </div>
      ${activeBadge}
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const popover = document.getElementById('workspace-popover');
      if (popover) popover.classList.add('hidden');

      if (autoFollowEnabled) {
        autoFollowEnabled = false;
        updateAutoFollowButton();
      }
      localStorage.setItem('antigravity_selected_project', p.id);
      switchProject(p.id, projects);
    });

    container.appendChild(item);
  });
}

async function checkActiveProject(force = false) {
  try {
    const url = excludeConvId ? `/api/projects/active?exclude_conv_id=${encodeURIComponent(excludeConvId)}` : '/api/projects/active';
    const res = await fetch(url);
    const active = await res.json();

    if (!active || !active.conversation_id) return;

    const isActive = Boolean(active.active);
    const projectName = active.project_name || active.project_id || "Workspace";

    updateActiveHeader(projectName, active.title, isActive);

    if (lastKnownActive === true && !isActive) {
      onConversationIdle();
    }
    lastKnownActive = isActive;

    if (force || (autoFollowEnabled && active.conversation_id !== currentConversationId)) {
      currentConversationId = active.conversation_id;
      currentProjectId = active.project_id;

      renderPopoverWorkspaceList(projectsListCache);
      connectToEventStream(active.conversation_id, isActive);
    }
  } catch (err) {
    console.error("Active project check error:", err);
  }
}

function onConversationIdle() {
  const focusBanner = document.getElementById('focus-banner-text');
  if (focusBanner) {
    focusBanner.textContent = "All Milestones Completed — Studio is Idle & Ready";
  }
  const badgeEl = document.getElementById('active-project-badge');
  if (badgeEl) {
    badgeEl.className = "status-pill status-idle";
    badgeEl.textContent = "IDLE / READY";
  }
  const switcherDot = document.getElementById('switcher-live-dot');
  if (switcherDot) {
    switcherDot.className = "w-2 h-2 rounded-full bg-slate-400 shrink-0";
  }
  const switcherSession = document.getElementById('switcher-session-title');
  if (switcherSession) {
    switcherSession.textContent = "Studio is Idle & Ready";
  }
  if (officeSim) {
    officeSim.setAllIdle();
  }

  renderGenericCard("Turn Complete", "All steps finished. Specialists resting at Breakout Atrium", "action-card-cmd", "checkCircle");
}

async function switchProject(projectId, projectsCache = null) {
  currentProjectId = projectId;
  let projects = projectsCache || projectsListCache;
  if (!projects || projects.length === 0) {
    const res = await fetch('/api/projects');
    projects = await res.json();
    projectsListCache = projects;
  }

  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;

  const convId = proj.latest_conversation_id;
  currentConversationId = convId;

  const convTitle = (proj.conversations && proj.conversations[0]) ? proj.conversations[0].title : proj.display_name;
  updateActiveHeader(proj.display_name, convTitle, proj.active);

  if (convId) {
    connectToEventStream(convId, proj.active);
  }

  renderPopoverWorkspaceList(projects);
  if (activeSessionsCache && activeSessionsCache.length > 0) {
    renderActiveSessionsBar(activeSessionsCache);
  }
}

function updateActiveHeader(projectName, sessionTitle, isActive) {
  const nameEl = document.getElementById('active-project-name');
  const badgeEl = document.getElementById('active-project-badge');
  const focusBanner = document.getElementById('focus-banner-text');

  if (nameEl) nameEl.textContent = projectName || "Workspace";
  if (badgeEl) {
    if (isActive) {
      badgeEl.className = "status-pill status-working";
      badgeEl.textContent = "WORKING";
    } else {
      badgeEl.className = "status-pill status-idle";
      badgeEl.textContent = "IDLE / READY";
    }
  }
  if (focusBanner && sessionTitle) {
    focusBanner.textContent = sessionTitle;
  }

  // Update Header Breadcrumb Switcher Trigger
  const switcherProj = document.getElementById('switcher-proj-name');
  const switcherSession = document.getElementById('switcher-session-title');
  const switcherDot = document.getElementById('switcher-live-dot');

  if (switcherProj) {
    switcherProj.textContent = projectName || "Detecting...";
  }
  if (switcherSession) {
    switcherSession.textContent = sessionTitle || (isActive ? "Streaming live actions..." : "Idle / Ready");
  }
  if (switcherDot) {
    if (isActive) {
      switcherDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0";
    } else {
      switcherDot.className = "w-2 h-2 rounded-full bg-slate-400 shrink-0";
    }
  }
}

// --- Multi-Session Live Detection & Instant Popover Switcher ---

async function checkActiveSessions() {
  try {
    const url = excludeConvId ? `/api/sessions/active?exclude_conv_id=${encodeURIComponent(excludeConvId)}` : '/api/sessions/active';
    const res = await fetch(url);
    const sessions = await res.json();
    renderActiveSessionsBar(sessions);

    // If auto-follow is active and we don't have a session currently selected
    if (autoFollowEnabled && sessions && sessions.length > 0) {
      if (!currentConversationId) {
        const top = sessions.find(s => s.active) || sessions[0];
        if (top) {
          switchSession(top.conversation_id, top.project_name, top.project_id, top.title, top.active);
        }
      }
    }
  } catch (err) {
    console.error("Check active sessions error:", err);
  }
}

function renderActiveSessionsBar(sessions) {
  const container = document.getElementById('popover-active-list');
  const countBadge = document.getElementById('popover-active-count');

  if (!Array.isArray(sessions)) sessions = [];
  activeSessionsCache = sessions;

  const activeCount = sessions.filter(s => s.active).length;
  if (countBadge) {
    countBadge.textContent = activeCount === 1 ? '1 Active' : `${activeCount} Active`;
  }

  if (!container) return;
  container.innerHTML = "";

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="text-[11px] py-1.5 px-2 text-[var(--text-muted)] italic">
        No active background sessions running.
      </div>
    `;
    return;
  }

  sessions.forEach(s => {
    const isCurrent = (s.conversation_id === currentConversationId);
    const item = document.createElement('div');
    item.className = `popover-item ${isCurrent ? 'active' : ''} ${s.active ? '' : 'idle-item'}`;
    item.title = `Project: ${s.project_name}\nTask: ${s.title}\nStatus: ${s.active ? 'ACTIVE' : 'IDLE'}`;

    const pulseDot = `<span class="pulse-dot"></span>`;
    const titleShort = s.title ? (s.title.length > 30 ? s.title.slice(0, 28) + '..' : s.title) : 'Active Task';
    const stepsBadge = s.steps ? `<span class="badge-steps shrink-0">${s.steps} steps</span>` : '';

    item.innerHTML = `
      <div class="flex items-center gap-2 min-w-0 pr-2">
        ${pulseDot}
        <div class="truncate">
          <div class="font-bold text-[11.5px] truncate leading-tight" style="color: var(--text-primary);">${s.project_name}</div>
          <div class="text-[10px] truncate leading-tight" style="color: var(--text-muted);">${titleShort}</div>
        </div>
      </div>
      ${stepsBadge}
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const popover = document.getElementById('workspace-popover');
      if (popover) popover.classList.add('hidden');

      if (autoFollowEnabled) {
        autoFollowEnabled = false;
        updateAutoFollowButton();
      }
      switchSession(s.conversation_id, s.project_name, s.project_id, s.title, s.active);
    });

    container.appendChild(item);
  });
}

function switchSession(convId, projName, projId, title, isActive) {
  if (convId === currentConversationId) return;

  currentConversationId = convId;
  currentProjectId = projId;

  // Instantly update header display
  updateActiveHeader(projName, title, isActive);

  // Connect with instant hydration (no 1500-step replay!)
  connectToEventStream(convId, isActive);

  // Refresh popover items
  renderPopoverWorkspaceList(projectsListCache);
  if (activeSessionsCache && activeSessionsCache.length > 0) {
    renderActiveSessionsBar(activeSessionsCache);
  }
}

function handleInitialState(data) {
  if (!data) return;

  // 1. Total Step Counter
  totalStepsCount = data.total_steps || 0;
  const counter = document.getElementById('step-counter');
  if (counter) counter.textContent = totalStepsCount;

  // 1b. Real-Time Analytics & Token Health
  if (data.analytics) {
    updateTokenHealth(data.analytics);
  }

  // 1c. Artifacts Count
  if (data.artifacts_count !== undefined) {
    const badge = document.getElementById('artifacts-badge-count');
    const drawerBadge = document.getElementById('drawer-artifact-count');
    if (badge) badge.textContent = data.artifacts_count;
    if (drawerBadge) drawerBadge.textContent = data.artifacts_count;
  }

  // 2. Focus
  if (data.focus) {
    let cleanFocus = data.focus;
    if (typeof cleanFocus === 'string') {
      cleanFocus = cleanFocus.replace(/^["']|["']$/g, '').trim();
    }
    const focusBanner = document.getElementById('focus-banner-text');
    if (focusBanner) focusBanner.textContent = cleanFocus;
    renderFocusCard(cleanFocus);
    if (officeSim) officeSim.handleToolAction("update_focus", { focus: cleanFocus });
  }

  // 3. Roadmap steps
  if (data.steps && data.steps.length > 0) {
    let stepsData = data.steps;
    if (typeof stepsData === 'string') {
      try { stepsData = JSON.parse(stepsData); } catch (e) { stepsData = []; }
    }
    cachedMissionSteps = stepsData;
    renderRoadmapPipeline(stepsData);
    if (officeSim) officeSim.handleToolAction("update_steps", { steps: stepsData });
  } else {
    renderRoadmapPipeline([]);
  }

  // 4. Render recent steps into feed & set specialist states in 1 frame (<15ms)
  const feed = document.getElementById('action-feed');
  if (feed) feed.innerHTML = "";

  if (data.recent_steps && Array.isArray(data.recent_steps)) {
    data.recent_steps.forEach(st => {
      handleStepEvent(st, true);
    });

    if (data.recent_steps.length > 0 && officeSim) {
      const lastStep = data.recent_steps[data.recent_steps.length - 1];
      if (lastStep.tool_calls && lastStep.tool_calls.length > 0) {
        const tc = lastStep.tool_calls[lastStep.tool_calls.length - 1];
        officeSim.handleToolAction(tc.name, tc.args || {});
      }
    }
  }
}

function connectToEventStream(conversationId, isActive = true) {
  if (eventSource) {
    eventSource.close();
  }

  // 1. Reset metrics & step cache
  cachedMissionSteps = [];
  totalStepsCount = 0;
  const counter = document.getElementById('step-counter');
  if (counter) counter.textContent = '0';

  // 2. Reset Roadmap UI to clean telemetry stream
  renderRoadmapPipeline([]);

  // 3. Reset Office Simulator state (clear stale mission steps, return agents to desks)
  if (officeSim && typeof officeSim.resetSessionState === 'function') {
    officeSim.resetSessionState(isActive);
  }

  // 4. Reset Action Feed with clean connection indicator
  const feed = document.getElementById('action-feed');
  if (feed) {
    feed.innerHTML = `
      <div class="text-slate-400 text-xs italic p-4 text-center">
        Connected to live session stream: <strong class="font-mono text-slate-600">${conversationId.slice(0, 8)}</strong>
      </div>
    `;
  }

  const statusText = document.getElementById('stream-status');
  const connPill = document.getElementById('conn-pill');
  const connText = document.getElementById('conn-text');

  if (statusText) statusText.textContent = `Streaming session: ${conversationId.slice(0, 8)}`;

  eventSource = new EventSource(`/api/events?conversation_id=${encodeURIComponent(conversationId)}`);

  eventSource.addEventListener('init', () => {
    if (connPill) connPill.className = "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (connText) connText.textContent = "LIVE";
  });

  // Fast Instant Hydration: avoids 1,500+ step replay freeze
  eventSource.addEventListener('initial_state', (e) => {
    try {
      const initData = JSON.parse(e.data);
      handleInitialState(initData);
    } catch (err) {
      console.error("Initial state parse error:", err);
    }
  });

  // Real-time active sessions broadcast
  eventSource.addEventListener('active_sessions', (e) => {
    try {
      const activeList = JSON.parse(e.data);
      renderActiveSessionsBar(activeList);
    } catch (err) {}
  });

  eventSource.addEventListener('step', (e) => {
    try {
      const step = JSON.parse(e.data);
      handleStepEvent(step);
    } catch (err) {
      console.error("Step parse error:", err);
    }
  });

  eventSource.addEventListener('activate', (e) => {
    try {
      const act = JSON.parse(e.data);
      renderGenericCard("Session Initialized", act.workspace || act.conversation_id, "action-card-info", "play");
      checkActiveSessions();
      if (autoFollowEnabled && act.conversation_id !== currentConversationId) {
        checkActiveProject(true);
      }
    } catch (err) {}
  });

  eventSource.onerror = () => {
    if (connPill) connPill.className = "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200";
    if (connText) connText.textContent = "RECONNECTING";
  };
}

function handleStepEvent(step, isHydrate = false) {
  if (!isHydrate) {
    totalStepsCount++;
    const counter = document.getElementById('step-counter');
    if (counter) counter.textContent = totalStepsCount;
  }

  // 1. Detect Commands (/plan, /research, /goal)
  if (step.type === "USER_INPUT" && step.content) {
    const raw = step.content;
    const matchCmd = raw.match(/\/(plan|research|goal|learn|boost|compact)/i);
    if (matchCmd) {
      const cmdName = matchCmd[1].toLowerCase();
      officeSim.handleCommandTrigger(`/${cmdName}`, raw);
      renderGenericCard(`Command: /${cmdName}`, raw.slice(0, 100), "action-card-info", "zap");
    } else {
      renderGenericCard("User Prompt", raw.slice(0, 100) + '...', "action-card-info", "user");
    }
    return;
  }

  // 2. Process Tool Calls
  if (step.tool_calls && step.tool_calls.length > 0) {
    step.tool_calls.forEach(tc => {
      const toolName = tc.name || "tool";
      const args = tc.args || {};

      let subagent = null;
      if (toolName === "invoke_subagent") {
        subagent = args.Role || args.TypeName || "Subagent";
        if (officeSim && typeof officeSim.handleSubagentInvocation === 'function') {
          officeSim.handleSubagentInvocation(args.TypeName, args.Role, args.Prompt);
        }
        renderGenericCard(`Subagent: ${subagent}`, (args.Prompt || "").slice(0, 100), "action-card-code", "cpu");
        return;
      }

      if (toolName === "swarm") {
        const swarmName = args.name || "worker";
        const swarmRole = args.role || args.name || "Swarm Specialist";
        const swarmBrief = args.brief || (args.tasks ? args.tasks.join(", ") : "");
        if (args.action === "add" && officeSim && typeof officeSim.handleSubagentInvocation === 'function') {
          officeSim.handleSubagentInvocation(swarmName, swarmRole, swarmBrief);
        }
        renderGenericCard(`Swarm: ${swarmName}`, (swarmBrief || "").slice(0, 100), "action-card-code", "network");
        return;
      }

      // Handle update_focus
      if (toolName === "update_focus" && args.focus) {
        let cleanFocus = args.focus;
        if (typeof cleanFocus === 'string') {
          cleanFocus = cleanFocus.replace(/^["']|["']$/g, '').trim();
        }
        const focusBanner = document.getElementById('focus-banner-text');
        if (focusBanner) focusBanner.textContent = cleanFocus;
        renderFocusCard(cleanFocus);
        officeSim.handleToolAction(toolName, { focus: cleanFocus }, subagent);
        return;
      }

      // Handle update_steps
      if (toolName === "update_steps" && args.steps) {
        let stepsData = args.steps;
        if (typeof stepsData === 'string') {
          try {
            stepsData = JSON.parse(stepsData);
          } catch (e) {
            stepsData = [];
          }
        }
        cachedMissionSteps = stepsData;
        renderRoadmapPipeline(stepsData);
        officeSim.handleToolAction(toolName, { steps: stepsData }, subagent);
        return;
      }

      // Handle CLI Command
      if (toolName === "run_command") {
        let cmd = args.CommandLine || "";
        if (typeof cmd === 'string') cmd = cmd.replace(/^["']|["']$/g, '').trim();
        let summary = args.toolSummary || "Terminal Command";
        if (typeof summary === 'string') summary = summary.replace(/^["']|["']$/g, '').trim();

        renderCommandCard(cmd, summary);
        officeSim.handleToolAction(toolName, { CommandLine: cmd, toolSummary: summary }, subagent);
        return;
      }

      // Handle File Edit
      if (toolName === "write_file" || toolName === "edit_file") {
        let p = args.Path || "";
        if (typeof p === 'string') p = p.replace(/^["']|["']$/g, '').trim();
        let target = args.Target || null;
        let replacement = args.Replacement || args.Content || null;
        renderFileCard(p, toolName === "write_file" ? "Write File" : "Edit File", target, replacement);
        officeSim.handleToolAction(toolName, { Path: p }, subagent);
        return;
      }

      // Handle Research
      if (toolName === "search_web" || toolName.includes("docs") || toolName === "read_file") {
        let q = args.query || args.Path || "";
        if (typeof q === 'string') q = q.replace(/^["']|["']$/g, '').trim();
        renderResearchCard(toolName, q);
        officeSim.handleToolAction(toolName, args, subagent);
        return;
      }

      // Fallback
      renderGenericCard(`Tool: ${toolName}`, JSON.stringify(args).slice(0, 100), "action-card-code", "terminal");
      officeSim.handleToolAction(toolName, args, subagent);
    });
    return;
  }

  // 3. Process Model Thinking
  if (step.thinking) {
    const preview = step.thinking.slice(0, 140).replace(/[\n\r]+/g, ' ');
    renderThinkingCard(preview);
    officeSim.handleToolAction("thinking", { focus: preview });
    return;
  }

  // 4. Completed Step / Final Model Content
  if (step.type === "PLANNER_RESPONSE") {
    if (step.content && !step.tool_calls) {
      onConversationIdle();
      const nameEl = document.getElementById('active-project-name');
      const curName = nameEl ? nameEl.textContent : currentProjectId;
      updateActiveHeader(curName, null, false);
    }
  }
}

// --- Structured Action Card Renderers (Clean Modern Design, No Side Color Borders) ---

function getFeedContainer() {
  const feed = document.getElementById('action-feed');
  if (feed && feed.children.length === 1 && feed.children[0].textContent.includes("Waiting")) {
    feed.innerHTML = "";
  }
  return feed;
}

function renderCommandCard(command, summary) {
  const feed = getFeedContainer();
  if (!feed) return;

  const cmdLower = command.toLowerCase();
  const isGit = cmdLower.includes("git") || cmdLower.includes("commit") || cmdLower.includes("push") || cmdLower.includes("remote");
  const badgeClass = isGit ? "feed-badge badge-git" : "feed-badge";
  const badgeText = isGit ? (cmdLower.includes("push") ? "GIT PUSH" : "GIT COMMIT") : "CLI";

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-2";
  card.dataset.category = 'cmd';
  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="${badgeClass}">${badgeText}</span>
        <span class="font-semibold text-xs truncate max-w-[220px]">${summary}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button class="feed-action-btn copy-cmd-btn" title="Copy exact command">Copy</button>
        <span class="text-[10px] text-slate-400 font-mono">${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
    <div class="cmd-box truncate cursor-pointer hover:border-[var(--accent-primary)] transition" title="Click to view full command in inspector">
      $ ${command}
    </div>
  `;

  const copyBtn = card.querySelector('.copy-cmd-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(command);
      showToast("Copied terminal command to clipboard!");
    });
  }

  const cmdBox = card.querySelector('.cmd-box');
  if (cmdBox) {
    cmdBox.addEventListener('click', () => {
      if (window.DiffInspector) {
        const outHtml = window.DiffInspector.renderCommandOutput(command, summary);
        showDiffModal(`Command: ${summary}`, outHtml, command);
      }
    });
  }

  appendCard(feed, card);
}

function renderFileCard(filePath, action, target = null, replacement = null) {
  const feed = getFeedContainer();
  if (!feed) return;

  const fileName = filePath.split(/[\\/]/).pop() || "file";
  const ext = fileName.split('.').pop() || "";
  const isEdit = (action.toLowerCase().includes("edit") || action.toLowerCase().includes("write"));

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-1.5";
  card.dataset.category = isEdit ? 'edit' : 'read';

  let inspectBtnHtml = "";
  if (isEdit && (target || replacement)) {
    inspectBtnHtml = `
      <button class="feed-action-btn inspect-diff-btn flex items-center gap-1 shrink-0 ml-auto" title="Inspect unified code diff">
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        <span>Inspect Diff</span>
      </button>
    `;
  }

  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="feed-badge">${action.toUpperCase()}</span>
        <span class="font-bold text-xs truncate max-w-[200px]" style="color: var(--text-primary);">${fileName}</span>
        <span class="feed-badge text-[9px] font-mono">${ext}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${inspectBtnHtml}
        <span class="text-[10px] font-mono shrink-0" style="color: var(--text-muted);">${new Date().toLocaleTimeString()}</span>
      </div>
    </div>
    <div class="text-[11px] font-mono truncate" style="color: var(--text-muted);">
      ${filePath}
    </div>
  `;

  if (isEdit && (target || replacement)) {
    const btn = card.querySelector('.inspect-diff-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.DiffInspector) {
          const diffHtml = window.DiffInspector.renderUnifiedDiff(target, replacement, filePath);
          showDiffModal(`File Diff: ${fileName}`, diffHtml, replacement || target);
        }
      });
    }
  }

  appendCard(feed, card);
}

function renderResearchCard(toolName, query) {
  const feed = getFeedContainer();
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-1.5";
  card.dataset.category = 'read';
  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="feed-badge">DOCS</span>
        <span class="font-semibold text-xs truncate max-w-[220px]" style="color: var(--text-primary);">${toolName}</span>
      </div>
      <span class="text-[10px] font-mono shrink-0" style="color: var(--text-muted);">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="text-xs italic truncate" style="color: var(--text-secondary);">
      "${query}"
    </div>
  `;
  appendCard(feed, card);
}

function renderThinkingCard(thoughtSnippet) {
  const feed = getFeedContainer();
  if (!feed) return;

  const iconSvg = typeof renderIcon === 'function' ? renderIcon('activity', 'w-3.5 h-3.5 text-indigo-500') : '';
  const card = document.createElement('div');
  card.className = "feed-card flex items-start gap-2";
  card.dataset.category = 'other';
  card.innerHTML = `
    <span class="shrink-0 mt-0.5">${iconSvg}</span>
    <div class="truncate text-xs italic" style="color: var(--text-secondary);">
      ${thoughtSnippet}...
    </div>
  `;
  appendCard(feed, card);
}

function renderFocusCard(focusText) {
  const feed = getFeedContainer();
  if (!feed) return;

  const iconSvg = typeof renderIcon === 'function' ? renderIcon('target', 'w-3.5 h-3.5 text-indigo-500') : '';
  const card = document.createElement('div');
  card.className = "feed-card flex items-center justify-between gap-2";
  card.dataset.category = 'other';
  card.innerHTML = `
    <div class="flex items-center gap-2 truncate">
      <span class="shrink-0">${iconSvg}</span>
      <span class="text-xs font-semibold truncate" style="color: var(--accent-primary);">${focusText}</span>
    </div>
    <span class="text-[10px] font-mono shrink-0" style="color: var(--text-muted);">${new Date().toLocaleTimeString()}</span>
  `;
  appendCard(feed, card);
}

function renderGenericCard(title, details, borderClass = "", iconName = "activity") {
  const feed = getFeedContainer();
  if (!feed) return;

  const isSubagent = title.toLowerCase().includes("subagent") || title.toLowerCase().includes("swarm");
  const iconSvg = typeof renderIcon === 'function' ? renderIcon(iconName, "w-3.5 h-3.5 text-indigo-500 shrink-0") : "";
  const card = document.createElement('div');
  card.className = `feed-card flex items-center justify-between gap-2.5 ${borderClass}`;
  card.dataset.category = isSubagent ? 'subagent' : 'other';
  card.innerHTML = `
    <div class="flex items-center gap-2 truncate text-xs" style="color: var(--text-secondary);">
      ${iconSvg}
      <div class="truncate">
        <strong class="font-semibold" style="color: var(--text-primary);">${title}:</strong> ${details}
      </div>
    </div>
    <span class="text-[10px] font-mono shrink-0" style="color: var(--text-muted);">${new Date().toLocaleTimeString()}</span>
  `;
  appendCard(feed, card);
  return card;
}

function appendCard(feed, card) {
  if (currentFeedFilter !== 'all') {
    if (card.dataset.category !== currentFeedFilter) {
      card.classList.add('hidden');
    }
  }
  feed.appendChild(card);
  feed.scrollTop = feed.scrollHeight;
  while (feed.children.length > 50) {
    feed.removeChild(feed.firstChild);
  }
}

// --- Live Roadmap Pipeline Renderer (Sidebar Vertical Checklist) ---

function renderRoadmapPipeline(steps) {
  const container = document.getElementById('roadmap-container');
  const stepsList = document.getElementById('roadmap-steps');
  const summaryEl = document.getElementById('roadmap-summary');

  let stepsArray = steps;
  if (typeof stepsArray === 'string') {
    try {
      stepsArray = JSON.parse(stepsArray);
    } catch (e) {
      stepsArray = [];
    }
  }

  if (!container || !stepsList) return;

  if (!Array.isArray(stepsArray) || stepsArray.length === 0) {
    container.classList.remove('hidden');
    stepsList.innerHTML = `
      <div class="p-2.5 text-center text-xs text-slate-400 italic">
        Streaming real-time tool executions & telemetry...
      </div>
    `;
    if (summaryEl) summaryEl.textContent = "Autonomous Stream";
    if (officeSim) officeSim.setMissionSteps([]);
    return;
  }

  container.classList.remove('hidden');
  stepsList.innerHTML = "";

  let doneCount = 0;
  stepsArray.forEach((st, idx) => {
    const isDone = (st.status === "done");
    const isInProgress = (st.status === "in_progress");
    if (isDone) doneCount++;

    const item = document.createElement('div');
    item.className = `roadmap-item ${
      isDone ? 'done' : (isInProgress ? 'in-progress' : 'pending')
    }`;

    const icon = isDone
      ? `<span class="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">${typeof renderIcon === 'function' ? renderIcon('checkCircle', 'w-3 h-3') : 'ok'}</span>`
      : (isInProgress
        ? `<span class="w-4 h-4 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 animate-pulse">${typeof renderIcon === 'function' ? renderIcon('play', 'w-2.5 h-2.5') : '>'}</span>`
        : `<span class="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400 shrink-0 font-mono">${idx + 1}</span>`);

    item.innerHTML = `
      ${icon}
      <span class="truncate flex-1 ${isDone ? 'line-through text-slate-500' : ''}">${st.title}</span>
    `;
    stepsList.appendChild(item);
  });

  const isAllDone = (doneCount === stepsArray.length && stepsArray.length > 0);
  if (summaryEl) {
    if (isAllDone) {
      summaryEl.innerHTML = `<span class="text-emerald-500 font-bold font-mono">All ${stepsArray.length} Completed (100%)</span>`;
      onConversationIdle();
    } else {
      summaryEl.textContent = `${doneCount} / ${stepsArray.length} Completed`;
    }
  }

  if (officeSim) {
    officeSim.setMissionSteps(stepsArray);
  }
}

// Interactive Multi-Role Sprint Demo with 6 Concurrent Specialists
function runDemoSimulation() {
  const focusBanner = document.getElementById('focus-banner-text');
  if (focusBanner) focusBanner.textContent = "Executing Multi-Agent Autonomous Sprint (6 Specialists Active)";

  const demoRoadmap = [
    { title: "Define Architecture & Specs", status: "in_progress" },
    { title: "Security Vulnerability Audit", status: "pending" },
    { title: "Implement Auth Session Pod", status: "pending" },
    { title: "Senior Code Review", status: "pending" },
    { title: "Docker QA Verification", status: "pending" },
    { title: "Git Push to Remote", status: "pending" }
  ];
  renderRoadmapPipeline(demoRoadmap);

  // 1. Lead Architect (Planning Easel)
  officeSim.handleCommandTrigger("/plan", "Architectural blueprint and roadmap planning");
  renderGenericCard("Planning", "Lead Architect designing system architecture at Strategy Board", "action-card-info", "gitBranch");

  // 2. Security Auditor (Security Vault)
  setTimeout(() => {
    demoRoadmap[0].status = "done";
    demoRoadmap[1].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleSubagentInvocation("security-auditor", "Security Auditor", "Audit authentication tokens and session security");
    renderGenericCard("Security Audit", "Security Auditor verifying cryptographic tokens at Security Operations", "action-card-info", "shieldCheck");
  }, 2000);

  // 3. Core Developer (Desk 1)
  setTimeout(() => {
    demoRoadmap[1].status = "done";
    demoRoadmap[2].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleToolAction("write_file", { Path: "src/auth/session.ts" });
    renderFileCard("src/auth/session.ts", "Write File");
  }, 4000);

  // 4. Code Reviewer (Desk 2)
  setTimeout(() => {
    demoRoadmap[2].status = "done";
    demoRoadmap[3].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleSubagentInvocation("code-reviewer", "Code Reviewer", "Review session.ts against security requirements");
    renderGenericCard("Code Review", "Senior Code Reviewer validating PR implementation", "action-card-info", "search");
  }, 6000);

  // 5. Test Engineer & DevOps (CI/CD Bay)
  setTimeout(() => {
    demoRoadmap[3].status = "done";
    demoRoadmap[4].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleToolAction("run_command", { CommandLine: "docker compose run --rm tests pytest" });
    renderCommandCard("docker compose run --rm tests pytest", "Automated QA Suite at CI/CD Bay");
  }, 8000);

  // 6. Git Postmaster (Git Post Office)
  setTimeout(() => {
    demoRoadmap[4].status = "done";
    demoRoadmap[5].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleToolAction("run_command", { CommandLine: "git commit -m 'feat: ship auth session pod' && git push origin main" });
    renderCommandCard("git commit -m 'feat: ship auth session pod' && git push origin main", "Remote Push at Git Dispatch");
  }, 10000);

  // 7. Team Celebration & Espresso Lounge
  setTimeout(() => {
    demoRoadmap[5].status = "done";
    renderRoadmapPipeline(demoRoadmap);

    onConversationIdle();
    renderGenericCard("Sprint Complete", "All milestones validated and shipped. All 6 specialists in standby at Breakout Atrium", "action-card-cmd", "checkCircle");
  }, 12500);
}
