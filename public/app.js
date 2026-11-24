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
const META_CONVERSATION_ID = "7f270c91-8b98-45aa-9bfd-311aa2a47b72";
let activeSessionsCache = [];

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
  const projectSelect = document.getElementById('project-select');
  const toggleBtn = document.getElementById('toggle-autofollow');
  const refreshBtn = document.getElementById('btn-refresh');
  const demoBtn = document.getElementById('btn-simulate');
  const audioBtn = document.getElementById('btn-audio-toggle');

  projectSelect.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (selected) {
      if (autoFollowEnabled) {
        autoFollowEnabled = false;
        updateAutoFollowButton();
      }
      localStorage.setItem('antigravity_selected_project', selected);
      switchProject(selected);
    }
  });

  toggleBtn.addEventListener('click', () => {
    autoFollowEnabled = !autoFollowEnabled;
    updateAutoFollowButton();
    if (autoFollowEnabled) {
      checkActiveProject(true);
      checkActiveSessions();
    }
  });

  refreshBtn.addEventListener('click', () => loadProjects());
  demoBtn.addEventListener('click', runDemoSimulation);

  // Chiptune 8-bit Audio Toggle
  if (audioBtn) {
    const updateAudioUI = () => {
      const isEnabled = window.chiptuneAudio && window.chiptuneAudio.enabled;
      const icon = document.getElementById('audio-icon');
      const label = document.getElementById('audio-label');
      if (icon) icon.textContent = isEnabled ? '🔊' : '🔇';
      if (label) label.textContent = isEnabled ? '8-bit Audio: ON' : 'Muted';
      audioBtn.classList.toggle('border-blue-300', isEnabled);
      audioBtn.classList.toggle('bg-blue-50', isEnabled);
      audioBtn.classList.toggle('text-blue-700', isEnabled);
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

function updateAutoFollowButton() {
  const btn = document.getElementById('toggle-autofollow');
  if (!btn) return;
  if (autoFollowEnabled) {
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-sm";
    btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span><span>Auto-Follow: ON</span>`;
    btn.title = "Auto-Follow is ON: automatically following active workspace sessions";
  } else {
    btn.className = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:text-slate-800 transition shadow-sm";
    btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span>Auto-Follow: OFF</span>`;
    btn.title = "Click to turn Auto-Follow ON";
  }
}

async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();

    const select = document.getElementById('project-select');
    select.innerHTML = '<option value="" disabled>-- Select Workspace --</option>';

    projects.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      const statusIcon = p.active ? '🟢' : '⚪';
      const activeText = p.active ? ' (Active)' : '';
      opt.textContent = `${statusIcon} ${p.display_name}${activeText}`;
      select.appendChild(opt);
    });

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
        select.value = match.id;
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
        select.value = saved;
      }
    }

    checkActiveProject(true);
  } catch (err) {
    console.error("Failed to load projects:", err);
  }
}

async function checkActiveProject(force = false) {
  try {
    const url = `/api/projects/active?exclude_conv_id=${META_CONVERSATION_ID}`;
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

      const select = document.getElementById('project-select');
      if (select) {
        select.value = active.project_id;
      }

      connectToEventStream(active.conversation_id, isActive);
    }
  } catch (err) {
    console.error("Active project check error:", err);
  }
}

function onConversationIdle() {
  const focusBanner = document.getElementById('focus-banner-text');
  if (focusBanner) {
    focusBanner.textContent = "🎉 All Milestones Completed — Studio is Idle & Ready";
  }
  const badgeEl = document.getElementById('active-project-badge');
  if (badgeEl) {
    badgeEl.className = "px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200";
    badgeEl.textContent = "IDLE / READY";
  }
  if (officeSim) {
    officeSim.setAllIdle();
  }

  renderGenericCard("☕ Turn Complete", "All steps finished. Developers resting at the Espresso Bar", "action-card-cmd");
}

async function switchProject(projectId, projectsCache = null) {
  currentProjectId = projectId;
  let projects = projectsCache;
  if (!projects) {
    const res = await fetch('/api/projects');
    projects = await res.json();
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
      badgeEl.className = "px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200";
      badgeEl.textContent = "WORKING";
    } else {
      badgeEl.className = "px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200";
      badgeEl.textContent = "IDLE / READY";
    }
  }
  if (focusBanner && sessionTitle) {
    focusBanner.textContent = sessionTitle;
  }
}

// --- Multi-Session Live Detection & Instant Switcher Bar ---

async function checkActiveSessions() {
  try {
    const res = await fetch(`/api/sessions/active?exclude_conv_id=${META_CONVERSATION_ID}`);
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
  const container = document.getElementById('active-sessions-chips');
  const countBadge = document.getElementById('active-sessions-count-text');
  if (!container) return;

  if (!Array.isArray(sessions)) sessions = [];
  activeSessionsCache = sessions;

  const activeCount = sessions.filter(s => s.active).length;
  if (countBadge) {
    if (activeCount > 1) {
      countBadge.textContent = `${activeCount} Active Sessions • Instant Switch`;
    } else if (activeCount === 1) {
      countBadge.textContent = `1 Active Session`;
    } else {
      countBadge.textContent = `Studio Ready • Monitoring Workspaces`;
    }
  }

  container.innerHTML = "";

  if (sessions.length === 0) {
    container.innerHTML = `
      <span class="text-xs text-slate-400 italic py-1 flex items-center gap-1.5">
        <span>⚪</span> No active background sessions running.
      </span>
    `;
    return;
  }

  const label = document.createElement('span');
  label.className = "text-xs font-semibold text-slate-400 shrink-0 mr-1 select-none flex items-center gap-1";
  label.innerHTML = `<span>⚡</span> Active:`;
  container.appendChild(label);

  sessions.forEach(s => {
    const isCurrent = (s.conversation_id === currentConversationId);
    const chip = document.createElement('button');
    chip.className = `session-chip ${isCurrent ? 'active' : ''} ${s.active ? '' : 'idle-chip'}`;
    chip.title = `Project: ${s.project_name}\nTask: ${s.title}\nStatus: ${s.active ? 'ACTIVE' : 'IDLE'}\nClick to view instantly`;

    const pulseDot = `<span class="pulse-dot"></span>`;
    const projLabel = `<strong class="text-xs truncate max-w-[130px]">${s.project_name}</strong>`;
    const titleShort = s.title ? (s.title.length > 26 ? s.title.slice(0, 24) + '..' : s.title) : 'Active Task';
    const taskSpan = `<span class="truncate max-w-[180px] text-[11px] opacity-80">${titleShort}</span>`;
    const stepsBadge = s.steps ? `<span class="badge-steps shrink-0">${s.steps} steps</span>` : '';

    chip.innerHTML = `
      ${pulseDot}
      ${projLabel}
      <span class="opacity-40">•</span>
      ${taskSpan}
      ${stepsBadge}
    `;

    chip.addEventListener('click', (e) => {
      e.preventDefault();
      if (autoFollowEnabled) {
        autoFollowEnabled = false;
        updateAutoFollowButton();
      }
      switchSession(s.conversation_id, s.project_name, s.project_id, s.title, s.active);
    });

    container.appendChild(chip);
  });
}

function switchSession(convId, projName, projId, title, isActive) {
  if (convId === currentConversationId) return;

  currentConversationId = convId;
  currentProjectId = projId;

  // Instantly update header display
  updateActiveHeader(projName, title, isActive);

  // Update project dropdown if matching
  const select = document.getElementById('project-select');
  if (select) {
    const match = Array.from(select.options).find(o => o.value === projId);
    if (match) select.value = projId;
  }

  // Connect with instant hydration (no 1500-step replay!)
  connectToEventStream(convId, isActive);

  // Refresh active chips UI
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
      renderGenericCard("🚀 Session Started", act.workspace || act.conversation_id, "action-card-info");
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
      renderGenericCard(`⚡ Command Triggered: /${cmdName}`, raw.slice(0, 100), "action-card-info");
    } else {
      renderGenericCard("👤 User Prompt", raw.slice(0, 100) + '...', "action-card-info");
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
        renderGenericCard(`🤖 Subagent: ${subagent}`, (args.Prompt || "").slice(0, 100), "action-card-code");
        return;
      }

      if (toolName === "swarm") {
        const swarmName = args.name || "worker";
        const swarmRole = args.role || args.name || "Swarm Specialist";
        const swarmBrief = args.brief || (args.tasks ? args.tasks.join(", ") : "");
        if (args.action === "add" && officeSim && typeof officeSim.handleSubagentInvocation === 'function') {
          officeSim.handleSubagentInvocation(swarmName, swarmRole, swarmBrief);
        }
        renderGenericCard(`🐝 Swarm: ${swarmName}`, (swarmBrief || "").slice(0, 100), "action-card-code");
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
        renderFileCard(p, toolName === "write_file" ? "Write File" : "Edit File");
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
      renderGenericCard(`🛠️ ${toolName}`, JSON.stringify(args).slice(0, 100), "action-card-code");
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
  const badgeText = isGit ? (cmdLower.includes("push") ? "📮 GIT PUSH" : "📦 GIT COMMIT") : "CLI";

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-2";
  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="${badgeClass}">${badgeText}</span>
        <span class="font-semibold text-xs truncate max-w-[220px]">${summary}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono shrink-0">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="cmd-box truncate">
      $ ${command}
    </div>
  `;
  appendCard(feed, card);
}

function renderFileCard(filePath, action) {
  const feed = getFeedContainer();
  if (!feed) return;

  const fileName = filePath.split(/[\\/]/).pop() || "file";
  const ext = fileName.split('.').pop() || "";

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-1.5";
  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="feed-badge">${action.toUpperCase()}</span>
        <span class="font-bold text-slate-800 text-xs truncate max-w-[200px]">${fileName}</span>
        <span class="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-500">${ext}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono shrink-0">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="text-[11px] font-mono text-slate-500 truncate">
      ${filePath}
    </div>
  `;
  appendCard(feed, card);
}

function renderResearchCard(toolName, query) {
  const feed = getFeedContainer();
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "feed-card flex flex-col gap-1.5";
  card.innerHTML = `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2 truncate">
        <span class="feed-badge">RESEARCH</span>
        <span class="font-semibold text-slate-800 text-xs truncate max-w-[220px]">${toolName}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono shrink-0">${new Date().toLocaleTimeString()}</span>
    </div>
    <div class="text-xs text-slate-600 italic truncate">
      "${query}"
    </div>
  `;
  appendCard(feed, card);
}

function renderThinkingCard(thoughtSnippet) {
  const feed = getFeedContainer();
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "feed-card flex items-start gap-2 bg-slate-50/50";
  card.innerHTML = `
    <span class="text-xs shrink-0 mt-0.5">🧠</span>
    <div class="truncate text-xs text-slate-600 italic">
      ${thoughtSnippet}...
    </div>
  `;
  appendCard(feed, card);
}

function renderFocusCard(focusText) {
  const feed = getFeedContainer();
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "feed-card flex items-center justify-between gap-2 border border-blue-200 bg-blue-50/30";
  card.innerHTML = `
    <div class="flex items-center gap-2 truncate">
      <span class="text-sm">🎯</span>
      <span class="text-xs font-semibold text-blue-900 truncate">${focusText}</span>
    </div>
    <span class="text-[10px] text-slate-400 font-mono shrink-0">${new Date().toLocaleTimeString()}</span>
  `;
  appendCard(feed, card);
}

function renderGenericCard(title, details, borderClass = "") {
  const feed = getFeedContainer();
  if (!feed) return;

  const card = document.createElement('div');
  card.className = "feed-card flex items-center justify-between gap-2";
  card.innerHTML = `
    <div class="truncate text-xs text-slate-700">
      <strong class="font-semibold text-slate-900">${title}:</strong> ${details}
    </div>
    <span class="text-[10px] text-slate-400 font-mono shrink-0">${new Date().toLocaleTimeString()}</span>
  `;
  appendCard(feed, card);
}

function appendCard(feed, card) {
  feed.appendChild(card);
  feed.scrollTop = feed.scrollHeight;
  while (feed.children.length > 40) {
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
  stepsArray.forEach((st) => {
    const isDone = (st.status === "done");
    const isInProgress = (st.status === "in_progress");
    if (isDone) doneCount++;

    const item = document.createElement('div');
    item.className = `roadmap-item ${
      isDone ? 'done' : (isInProgress ? 'in-progress' : 'pending')
    }`;

    const icon = isDone
      ? '<span class="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>'
      : (isInProgress
        ? '<span class="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0 animate-pulse">⚡</span>'
        : '<span class="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[9px] text-slate-400 shrink-0">•</span>');

    item.innerHTML = `
      ${icon}
      <span class="truncate flex-1 ${isDone ? 'line-through text-slate-500' : ''}">${st.title}</span>
    `;
    stepsList.appendChild(item);
  });

  const isAllDone = (doneCount === stepsArray.length && stepsArray.length > 0);
  if (summaryEl) {
    if (isAllDone) {
      summaryEl.innerHTML = `<span class="text-emerald-700 font-bold">🎉 All ${stepsArray.length} Completed (100%)</span>`;
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
  renderGenericCard("📐 Planning", "Lead Architect designing system architecture at Strategy Easel");

  // 2. Security Auditor (Security Vault)
  setTimeout(() => {
    demoRoadmap[0].status = "done";
    demoRoadmap[1].status = "in_progress";
    renderRoadmapPipeline(demoRoadmap);

    officeSim.handleSubagentInvocation("security-auditor", "Security Auditor", "Audit authentication tokens and session security");
    renderGenericCard("🛡️ Security Audit", "Security Auditor verifying cryptographic tokens at Security Vault");
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
    renderGenericCard("🔍 Code Review", "Senior Code Reviewer validating PR implementation");
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
    renderCommandCard("git commit -m 'feat: ship auth session pod' && git push origin main", "Remote Push at Git Post Office");
  }, 10000);

  // 7. Team Celebration & Espresso Lounge
  setTimeout(() => {
    demoRoadmap[5].status = "done";
    renderRoadmapPipeline(demoRoadmap);

    onConversationIdle();
    renderGenericCard("🎉 Sprint Complete", "All milestones validated and shipped. All 6 specialists taking team coffee break ☕");
  }, 12500);
}
