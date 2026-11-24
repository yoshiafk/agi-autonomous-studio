/**
 * Architectural Dev Studio Canvas Engine (Studio V3 - Decluttered & Polished)
 * Spacious 4-desk executive workstation pods with generous open central walkway.
 * Natural distributed seating in the break lounge with smart single speech bubble.
 * Theme-aware roster cards with zero white-box color clashes in night mode.
 * Organic panoramic horizon with twinkling night stars.
 */

class OfficeSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.container = this.canvas.parentElement;
    
    this.dpr = window.devicePixelRatio || 1;
    this.width = 1160;
    this.height = 460;
    this.tickCount = 0;
    this.selectedAgentId = 0;
    this.lightingMode = 'day'; // 'day' | 'sunset' | 'night' | 'auto'
    this.missionSteps = [];
    this.uplinkPulse = 0;
    this.particles = [];
    this.maxParticles = 80;
    this.wasAllStepsDone = false;

    // Studio Zones (Decluttered Spacious Layout)
    this.zones = {
      windowWall: { y: 65, height: 60 },
      glassBoard: { x: 130, y: 155, label: "Strategy Easel" },
      library: { x: 360, y: 155, label: "Knowledge Archive" },
      securityVault: { x: 620, y: 150, label: "Security Vault" },
      serverLab: { x: 1045, y: 155, label: "CI/CD Server Bay" },
      espressoBar: { x: 145, y: 345, label: "Espresso Lounge" },
      postOffice: { x: 1030, y: 340, label: "Git Post Office" },
      plants: [
        { x: 45, y: 160, type: "monstera" },
        { x: 860, y: 155, type: "ficus" },
        { x: 45, y: 405, type: "palm" }
      ],
      // 6 Executive Workstation Desks in Central Atrium (Row 1 & Row 2)
      desks: [
        { x: 380, y: 260, occupiedBy: 0 },
        { x: 570, y: 260, occupiedBy: null },
        { x: 760, y: 260, occupiedBy: null },
        { x: 380, y: 375, occupiedBy: null },
        { x: 570, y: 375, occupiedBy: null },
        { x: 760, y: 375, occupiedBy: null }
      ]
    };

    // Atmospheres (Day, Sunset, Night)
    this.atmospheres = {
      day: {
        skyTop: '#93c5fd',
        skyBottom: '#e0f2fe',
        sunlightRay: 'rgba(255, 255, 255, 0.16)',
        floorBase: '#efeae1',
        floorSeams: 'rgba(180, 165, 145, 0.4)',
        windowFrame: '#e2e8f0',
        deskTop: '#ffffff',
        deskBorder: '#cbd5e1',
        deskMat: '#f1f5f9',
        ambientShadow: 'rgba(120, 100, 80, 0.1)',
        bubbleBg: '#ffffff',
        bubbleBorder: '#e2e8f0',
        bubbleText: '#0f172a',
        nightLamps: false
      },
      sunset: {
        skyTop: '#f97316',
        skyBottom: '#fed7aa',
        sunlightRay: 'rgba(251, 146, 60, 0.2)',
        floorBase: '#e8d4be',
        floorSeams: 'rgba(160, 130, 100, 0.4)',
        windowFrame: '#cbd5e1',
        deskTop: '#fff7ed',
        deskBorder: '#fed7aa',
        deskMat: '#ffedd5',
        ambientShadow: 'rgba(140, 90, 60, 0.15)',
        bubbleBg: '#fffcf9',
        bubbleBorder: '#fed7aa',
        bubbleText: '#431407',
        nightLamps: false
      },
      night: {
        skyTop: '#060a12',
        skyBottom: '#131b26',
        sunlightRay: 'rgba(255, 255, 255, 0.02)',
        floorBase: '#151d29',
        floorSeams: 'rgba(15, 23, 42, 0.7)',
        windowFrame: '#223044',
        deskTop: '#1a2332',
        deskBorder: '#2d3d54',
        deskMat: '#0d131c',
        ambientShadow: 'rgba(0, 0, 0, 0.35)',
        bubbleBg: '#131b26',
        bubbleBorder: '#273549',
        bubbleText: '#f8fafc',
        nightLamps: true
      }
    };

    // Dynamic Specialist Roles (Tasteful Professional Colors)
    this.specialistTemplates = {
      planner: { role: "Lead Architect", color: "#4f46e5", hair: "#b45309", shirt: "#e0e7ff" },
      researcher: { role: "Research Analyst", color: "#7c3aed", hair: "#d97706", shirt: "#ede9fe" },
      coder: { role: "Core Developer", color: "#059669", hair: "#334155", shirt: "#d1fae5" },
      devops: { role: "DevOps & QA", color: "#d97706", hair: "#475569", shirt: "#fef3c7" },
      dispatcher: { role: "Git Postmaster", color: "#0891b2", hair: "#1e293b", shirt: "#cffafe" },
      reviewer: { role: "Code Reviewer", color: "#6366f1", hair: "#1e293b", shirt: "#e0e7ff" },
      security: { role: "Security Auditor", color: "#ef4444", hair: "#0f172a", shirt: "#fee2e2" },
      tester: { role: "Test Engineer", color: "#f59e0b", hair: "#475569", shirt: "#fef3c7" },
      architect: { role: "AI Architect", color: "#8b5cf6", hair: "#1e1b4b", shirt: "#ede9fe" },
      optimizer: { role: "Perf Optimizer", color: "#10b981", hair: "#064e3b", shirt: "#d1fae5" },
      browser: { role: "Browser Agent", color: "#3b82f6", hair: "#1e3a8a", shirt: "#dbeafe" },
      designer: { role: "Creative Designer", color: "#ec4899", hair: "#831843", shirt: "#fce7f3" }
    };

    const d0 = this.zones.desks[0];
    this.agents = [
      {
        id: 0,
        key: "coordinator",
        name: "Lead Architect",
        role: "Planner & Coordinator",
        color: "#4f46e5",
        hair: "#b45309",
        shirt: "#e0e7ff",
        deskIndex: 0,
        x: d0.x, y: d0.y - 14,
        targetX: d0.x, targetY: d0.y - 14,
        homeX: d0.x, homeY: d0.y - 14,
        state: "working",
        speech: "Architecting project milestones...",
        currentTask: "Planning architecture"
      }
    ];

    this.setupHiDPI();
    this.initEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setLightingMode(mode) {
    if (mode === 'auto') {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 17) this.lightingMode = 'day';
      else if (hour >= 17 && hour < 20) this.lightingMode = 'sunset';
      else this.lightingMode = 'night';
    } else {
      this.lightingMode = mode;
    }
  }

  setupHiDPI() {
    const resize = () => {
      const rect = this.container.getBoundingClientRect();
      this.dpr = Math.max(window.devicePixelRatio || 1, 2);

      const baseWidth = 1160;
      const baseHeight = 460;
      this.cssWidth = rect.width;
      this.scale = this.cssWidth / baseWidth;
      this.cssHeight = Math.round(baseHeight * this.scale);

      this.width = baseWidth;
      this.height = baseHeight;

      this.canvas.width = Math.round(this.cssWidth * this.dpr);
      this.canvas.height = Math.round(this.cssHeight * this.dpr);

      this.canvas.style.width = `${this.cssWidth}px`;
      this.canvas.style.height = `${this.cssHeight}px`;

      this.ctx.resetTransform?.();
      this.ctx.scale(this.dpr * this.scale, this.dpr * this.scale);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(this.container);
    window.addEventListener('resize', resize);
  }

  initEvents() {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scale = this.scale || 1;
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;

      this.agents.forEach(ag => {
        if (Math.hypot(clickX - ag.x, clickY - ag.y) < 32) {
          this.selectAgent(ag.id);
        }
      });
    });
  }

  selectAgent(id) {
    this.selectedAgentId = id;
    const ag = this.agents.find(a => a.id === id) || this.agents[0];
    if (!ag) return;

    const badge = document.getElementById('insp-role-badge');
    const name = document.getElementById('insp-agent-name');
    const status = document.getElementById('insp-status-text');

    if (badge) {
      badge.textContent = ag.role.toUpperCase();
      badge.style.backgroundColor = `${ag.color}15`;
      badge.style.borderColor = `${ag.color}40`;
      badge.style.color = ag.color;
    }
    if (name) name.textContent = ag.name;
    if (status) status.textContent = ag.speech;

    this.updateRosterUI();
  }

  setMissionSteps(steps) {
    if (typeof steps === 'string') {
      try {
        this.missionSteps = JSON.parse(steps);
      } catch (e) {
        this.missionSteps = [];
      }
    } else {
      this.missionSteps = steps || [];
    }
  }

  resetSessionState(isActive = true) {
    this.missionSteps = [];
    this.wasAllStepsDone = false;
    this.particles = [];

    // Return agents to their workstation stations
    this.agents.forEach(ag => {
      ag.targetX = ag.homeX;
      ag.targetY = ag.homeY;
      ag.isPaused = false;
      ag.isDrifting = false;
      if (isActive) {
        ag.state = (ag.id === 0) ? "working" : "resting";
        ag.currentTask = (ag.id === 0) ? "Session Coordinator" : "Station Idle";
        ag.speech = (ag.id === 0) ? "Monitoring workspace..." : "";
      } else {
        ag.state = "resting";
        ag.currentTask = "Resting";
        ag.speech = "";
      }
    });
    this.updateRosterUI();
  }

  setAllIdle() {
    // Natural distributed seating in the redesigned Scandinavian cafe lounge
    const loungeSpots = [
      { x: 145, y: 338 }, // At the espresso machine (brewing coffee)
      { x: 72,  y: 340 }, // Seated relaxed inside the armchair
      { x: 185, y: 342 }, // By the round birch coffee table
      { x: 45,  y: 335 }, // By the monstera planter
      { x: 215, y: 338 }  // Chatting near the lounge entrance
    ];

    this.agents.forEach((ag, idx) => {
      ag.state = "coffee";
      ag.currentTask = "Resting";
      ag.speech = "Milestones completed! Team in standby.";
      const spot = loungeSpots[idx % loungeSpots.length];
      ag.targetX = spot.x;
      ag.targetY = spot.y;
    });
    this.updateRosterUI();
  }

  getStationLabel(ag) {
    if (ag.state === "coffee" || (Math.hypot(ag.x - 130, ag.y - 340) < 110)) {
      return "Breakout Atrium";
    }
    if (ag.key === "dispatcher" || Math.hypot(ag.x - 980, ag.y - 342) < 45) {
      return "Git Remote Dispatch";
    }
    if ((ag.key === "devops" || ag.key === "tester") && Math.hypot(ag.x - 980, ag.y - 165) < 45) {
      return "CI/CD Server Bay";
    }
    if ((ag.key === "security" || (ag.role && ag.role.toLowerCase().includes("security"))) && Math.hypot(ag.x - this.zones.securityVault.x, ag.y - (this.zones.securityVault.y + 35)) < 65) {
      return "Security Operations";
    }
    if (ag.key === "planner" && Math.hypot(ag.x - (this.zones.glassBoard.x + 30), ag.y - (this.zones.glassBoard.y + 35)) < 60) {
      return "Strategy Board";
    }
    if (ag.key === "researcher" && Math.hypot(ag.x - (this.zones.library.x + 20), ag.y - (this.zones.library.y + 35)) < 60) {
      return "Knowledge Archive";
    }
    if (ag.deskIndex !== null && ag.deskIndex !== undefined && ag.deskIndex >= 0 && ag.deskIndex < this.zones.desks.length) {
      const row = ag.deskIndex < 3 ? "Front" : "Back";
      const col = (ag.deskIndex % 3) + 1;
      return `Desk ${ag.deskIndex + 1} (${row} Pod ${col})`;
    }
    return "Studio Floor";
  }

  getOrCreateSpecialist(roleKey, nameOverride) {
    const tmpl = this.specialistTemplates[roleKey] || this.specialistTemplates.coder;
    const agentName = nameOverride || tmpl.role;

    let ag = this.agents.find(a => a.key === roleKey || a.name.toLowerCase() === agentName.toLowerCase());
    if (ag) return ag;

    let deskIdx = null;
    let initialX, initialY;

    if (roleKey === "dispatcher") {
      deskIdx = null;
      initialX = 980;
      initialY = 342;
    } else if (roleKey === "planner") {
      deskIdx = 0;
      initialX = this.zones.glassBoard.x + 30;
      initialY = this.zones.glassBoard.y + 35;
      this.zones.desks[0].occupiedBy = 0;
    } else if (roleKey === "security") {
      deskIdx = null;
      initialX = this.zones.securityVault.x;
      initialY = this.zones.securityVault.y + 35;
    } else if (roleKey === "devops" || roleKey === "tester") {
      deskIdx = null;
      initialX = 980;
      initialY = 165;
    } else if (roleKey === "researcher") {
      deskIdx = null;
      initialX = this.zones.library.x + 20;
      initialY = this.zones.library.y + 35;
    } else {
      let openDesk = this.zones.desks.findIndex((d, i) => i > 0 && d.occupiedBy === null);
      if (openDesk !== -1) {
        deskIdx = openDesk;
        this.zones.desks[deskIdx].occupiedBy = this.agents.length;
      } else {
        deskIdx = this.agents.length % this.zones.desks.length;
      }
      const desk = this.zones.desks[deskIdx];
      initialX = desk.x;
      initialY = desk.y - 14;
    }

    ag = {
      id: this.agents.length,
      key: roleKey,
      name: agentName,
      role: tmpl.role,
      color: tmpl.color,
      hair: tmpl.hair,
      shirt: tmpl.shirt,
      deskIndex: deskIdx,
      x: initialX, y: initialY,
      targetX: initialX, targetY: initialY,
      homeX: initialX, homeY: initialY,
      state: "working",
      speech: `Joined studio: ${tmpl.role}`,
      currentTask: "Ready"
    };

    this.agents.push(ag);
    this.updateRosterUI();
    return ag;
  }

  registerPluginAgents(pluginAgents) {
    if (!Array.isArray(pluginAgents)) return;
    pluginAgents.forEach(p => {
      if (!p || !p.id) return;
      const key = p.id.replace(/-/g, "_");
      this.specialistTemplates[p.id] = {
        role: p.name || p.role || p.id,
        color: p.color || "#6366f1",
        hair: p.hair || "#334155",
        shirt: p.shirt || "#f1f5f9",
        station: p.station || "Studio Workstation"
      };
      if (key !== p.id) {
        this.specialistTemplates[key] = this.specialistTemplates[p.id];
      }
    });
  }

  handleSubagentInvocation(typeName, role, prompt) {
    const rawType = (typeName || "coder").toLowerCase();
    let roleKey = "coder";

    if (rawType.includes("review")) roleKey = "reviewer";
    else if (rawType.includes("security") || rawType.includes("audit")) roleKey = "security";
    else if (rawType.includes("test") || rawType.includes("qa")) roleKey = "tester";
    else if (rawType.includes("architect")) roleKey = "architect";
    else if (rawType.includes("optimi") || rawType.includes("perf")) roleKey = "optimizer";
    else if (rawType.includes("research") || rawType.includes("analyst")) roleKey = "researcher";
    else if (rawType.includes("deploy") || rawType.includes("devops") || rawType.includes("ci")) roleKey = "devops";
    else if (rawType.includes("git") || rawType.includes("push") || rawType.includes("dispatch")) roleKey = "dispatcher";
    else if (rawType.includes("browser") || rawType.includes("web")) roleKey = "browser";
    else if (rawType.includes("image") || rawType.includes("design")) roleKey = "designer";
    else if (this.specialistTemplates[rawType]) roleKey = rawType;

    const name = role || (this.specialistTemplates[roleKey] ? this.specialistTemplates[roleKey].role : rawType);
    const ag = this.getOrCreateSpecialist(roleKey, name);

    ag.state = "working";
    ag.isPaused = false;
    ag.currentTask = prompt ? (prompt.length > 40 ? prompt.slice(0, 37) + "..." : prompt) : "Delegated Subagent Task";
    ag.speech = prompt ? (prompt.length > 45 ? prompt.slice(0, 42) + "..." : prompt) : `Executing ${name}...`;

    if (roleKey === "security") {
      ag.targetX = this.zones.securityVault.x;
      ag.targetY = this.zones.securityVault.y + 35;
    } else if (roleKey === "devops" || roleKey === "tester") {
      ag.targetX = 980;
      ag.targetY = 165;
    } else if (roleKey === "dispatcher") {
      ag.targetX = 980;
      ag.targetY = 342;
    } else if (roleKey === "researcher") {
      ag.targetX = this.zones.library.x + 20;
      ag.targetY = this.zones.library.y + 35;
    } else if (roleKey === "planner") {
      ag.targetX = this.zones.glassBoard.x + 30;
      ag.targetY = this.zones.glassBoard.y + 35;
    } else if (ag.deskIndex !== null && ag.deskIndex !== undefined && this.zones.desks[ag.deskIndex]) {
      ag.targetX = this.zones.desks[ag.deskIndex].x;
      ag.targetY = this.zones.desks[ag.deskIndex].y - 14;
    }

    if (this.spawnParticle) {
      this.spawnParticle(ag.targetX, ag.targetY - 20, 'badge', '', ag.color || '#3b82f6');
    }

    this.selectAgent(ag.id);
    this.updateRosterUI();
    return ag;
  }

  // --- Theme-Aware In-Card Cockpit Roster UI ---
  updateRosterUI() {
    const list = document.getElementById('agent-roster-list');
    const counter = document.getElementById('agent-counter');
    const rosterCount = document.getElementById('roster-count');

    if (counter) counter.textContent = this.agents.length;
    if (rosterCount) rosterCount.textContent = `${this.agents.length} Online`;
    if (!list) return;

    list.innerHTML = "";
    this.agents.forEach(ag => {
      const isSelected = (ag.id === this.selectedAgentId);
      const card = document.createElement('div');
      card.className = `roster-item-card ${isSelected ? 'selected' : ''}`;

      card.onclick = (e) => {
        if (e.target.closest('input') || e.target.closest('button')) return;
        this.selectAgent(ag.id);
      };

      const stationLabel = this.getStationLabel(ag);

      let statusClass = "working";
      let statusLabel = "WORKING";

      if (ag.isPaused) {
        statusClass = "paused";
        statusLabel = "PAUSED";
      } else if (ag.state === "coffee" || (stationLabel.includes("Atrium") && (ag.currentTask === "Resting" || (ag.speech && ag.speech.includes("standby"))))) {
        statusClass = "resting";
        statusLabel = "RESTING";
      } else if (ag.currentTask === "Ready" && ag.state !== "working" && ag.state !== "shipping") {
        statusClass = "standby";
        statusLabel = "STANDBY";
      } else {
        statusClass = "working";
        statusLabel = "WORKING";
      }

      // Metadata calculations
      const tokenRatio = ag.contextRatio || (0.35 + (ag.id * 0.14));
      const tokenPct = Math.round(tokenRatio * 100);
      const tokenCount = Math.round(tokenRatio * 200);
      const contextColor = tokenRatio > 0.85 ? '#ef4444' : (tokenRatio > 0.65 ? '#f59e0b' : '#10b981');

      let expandedHtml = '';
      if (isSelected) {
        expandedHtml = `
          <div class="roster-expanded-panel">
            <!-- Context Window Utilization HUD -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-[10.5px]">
                <span class="font-semibold flex items-center gap-1.5" style="color: var(--text-primary);">Context Window Capacity</span>
                <span class="font-mono font-bold" style="color: ${contextColor}">${tokenPct}% (${tokenCount}k / 200k)</span>
              </div>
              <div class="w-full h-1.5 rounded-full overflow-hidden" style="background: var(--border-card);">
                <div class="h-full transition-all duration-300" style="width: ${tokenPct}%; background-color: ${contextColor}"></div>
              </div>
            </div>

            <!-- Station & Target Info Grid -->
            <div class="grid grid-cols-2 gap-1.5 text-[10.5px] pt-0.5">
              <div class="truncate">
                <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Station</span>
                <span class="font-semibold truncate block" style="color: var(--text-primary);">${stationLabel}</span>
              </div>
              <div class="truncate">
                <span class="block text-[9px] uppercase font-bold" style="color: var(--text-muted);">Action Target</span>
                <span class="font-semibold truncate block font-mono" style="color: var(--accent-primary);">${ag.currentTask || 'Idle in Studio'}</span>
              </div>
            </div>

            <!-- Inline Human-in-the-Loop Steering Controls -->
            <div class="flex items-center gap-1.5 pt-1.5" style="border-top: 1px solid var(--border-card);">
              <input type="text" placeholder="Nudge agent..." class="roster-nudge-input flex-1 text-xs px-2.5 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-indigo-500" style="background: var(--surface-card); border-color: var(--border-card); color: var(--text-primary);">
              <button class="roster-nudge-btn px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] transition">Nudge</button>
              <button class="roster-pause-btn px-2 py-1 rounded-md border text-[10.5px] font-semibold transition" style="border-color: var(--border-card); color: var(--text-primary);" title="Toggle Pause">${ag.isPaused ? 'Resume' : 'Pause'}</button>
              <button class="roster-lounge-btn px-2 py-1 rounded-md border text-[10.5px] font-semibold transition" style="border-color: var(--border-card); color: var(--text-primary);" title="Send to Breakout">Breakout</button>
            </div>
          </div>
        `;
      }

      const shortStation = stationLabel.replace(" (Front Exec)", "").replace(" (Back Exec)", "");

      card.innerHTML = `
        <div class="roster-card-header">
          <div class="flex items-center gap-2.5 truncate">
            <div class="w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm" style="background-color: ${ag.color}">
              ${ag.name.slice(0, 2).toUpperCase()}
            </div>
            <div class="truncate">
              <div class="font-semibold text-xs truncate" style="color: var(--text-primary);">${ag.name}</div>
              <div class="text-[10px] truncate" style="color: var(--text-muted);">${ag.currentTask}</div>
            </div>
          </div>
          <div class="roster-card-meta">
            <span class="roster-station-pill">${shortStation}</span>
            <span class="roster-context-pill font-mono" style="color: ${contextColor}; border-color: ${contextColor}40">${tokenPct}%</span>
            <span class="roster-status-badge ${statusClass}">
              ${statusLabel}
            </span>
          </div>
        </div>
        ${expandedHtml}
      `;

      // Wire inline steering buttons when card is expanded
      if (isSelected) {
        const nudgeInput = card.querySelector('.roster-nudge-input');
        const nudgeBtn = card.querySelector('.roster-nudge-btn');
        const pauseBtn = card.querySelector('.roster-pause-btn');
        const loungeBtn = card.querySelector('.roster-lounge-btn');

        const doNudge = () => {
          if (!nudgeInput || !nudgeInput.value.trim()) return;
          const val = nudgeInput.value.trim();
          ag.speech = `Operator: "${val}"`;
          ag.isDrifting = false;
          nudgeInput.value = '';
          this.selectAgent(ag.id);
          if (window.chiptuneAudio) window.chiptuneAudio.playSatellitePing();
        };

        if (nudgeBtn) {
          nudgeBtn.onclick = (e) => {
            e.stopPropagation();
            doNudge();
          };
        }
        if (nudgeInput) {
          nudgeInput.onclick = (e) => e.stopPropagation();
          nudgeInput.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') doNudge();
          };
        }

        if (pauseBtn) {
          pauseBtn.onclick = (e) => {
            e.stopPropagation();
            ag.isPaused = !ag.isPaused;
            ag.state = ag.isPaused ? "resting" : "working";
            ag.speech = ag.isPaused ? "Paused by operator." : "Resumed active work.";
            this.selectAgent(ag.id);
            if (window.chiptuneAudio) window.chiptuneAudio.playAlert();
          };
        }

        if (loungeBtn) {
          loungeBtn.onclick = (e) => {
            e.stopPropagation();
            ag.targetX = 145;
            ag.targetY = 345;
            ag.state = "coffee";
            ag.speech = "Taking a breakout rest.";
            this.selectAgent(ag.id);
            if (window.chiptuneAudio) window.chiptuneAudio.playCoffeeSteam();
          };
        }
      }

      list.appendChild(card);
    });
  }

  handleCommandTrigger(commandName, queryOrPrompt) {
    if (commandName === "/plan" || commandName === "plan") {
      const planner = this.getOrCreateSpecialist("planner", "Lead Architect");
      planner.speech = "Planning architecture & milestones...";
      planner.currentTask = "Designing Roadmap";
      planner.targetX = this.zones.glassBoard.x + 30;
      planner.targetY = this.zones.glassBoard.y + 35;
      this.selectAgent(planner.id);
    } else if (commandName === "/research" || commandName === "research") {
      const researcher = this.getOrCreateSpecialist("researcher", "Research Analyst");
      researcher.speech = "Investigating documentation...";
      researcher.currentTask = "Knowledge Research";
      researcher.targetX = this.zones.library.x + 20;
      researcher.targetY = this.zones.library.y + 35;
      this.selectAgent(researcher.id);
    }
    this.updateRosterUI();
  }

  handleToolAction(toolName, args, subagentRole) {
    let target = this.agents[0];

    if (subagentRole) {
      if (subagentRole.toLowerCase().includes("test") || subagentRole.toLowerCase().includes("devops")) {
        target = this.getOrCreateSpecialist("devops", "DevOps & QA");
      } else if (subagentRole.toLowerCase().includes("research")) {
        target = this.getOrCreateSpecialist("researcher", "Research Analyst");
      } else {
        target = this.getOrCreateSpecialist("coder", subagentRole);
      }
    }

    if (toolName === "update_steps") {
      const planner = this.getOrCreateSpecialist("planner", "Lead Architect");
      planner.speech = "Refining mission roadmap...";
      planner.currentTask = "Roadmap Update";
      planner.state = "working";
      planner.isPaused = false;
      planner.targetX = this.zones.glassBoard.x + 30;
      planner.targetY = this.zones.glassBoard.y + 35;
      if (args.steps) this.setMissionSteps(args.steps);
      target = planner;
    } else if (toolName === "update_focus") {
      target.speech = `Focus: ${args.focus || ''}`;
      target.currentTask = args.focus || "Executing Task";
      target.state = "working";
      target.isPaused = false;
    } else if (toolName === "run_command") {
      const cmd = (args.CommandLine || "").toLowerCase();
      
      // Git command detection -> Route to Git Remote Dispatch
      if (cmd.includes("git") || cmd.includes("commit") || cmd.includes("push") || cmd.includes("release") || cmd.includes("remote")) {
        const dispatcher = this.getOrCreateSpecialist("dispatcher", "Git Postmaster");
        dispatcher.speech = "Packing & pushing commit to origin/main.";
        dispatcher.currentTask = "Git Remote Push";
        dispatcher.state = "shipping";
        dispatcher.isPaused = false;
        dispatcher.targetX = 980;
        dispatcher.targetY = 342;
        this.uplinkPulse = 1.0;
        target = dispatcher;
      } else if (cmd.includes("test") || cmd.includes("docker") || cmd.includes("playwright") || cmd.includes("pytest")) {
        const devops = this.getOrCreateSpecialist("devops", "DevOps & QA");
        devops.speech = "Running container test suite...";
        devops.currentTask = "Server QA";
        devops.state = "working";
        devops.isPaused = false;
        devops.targetX = 980;
        devops.targetY = 165;
        target = devops;
      } else {
        const devops = this.getOrCreateSpecialist("devops", "DevOps & QA");
        devops.speech = `Exec: ${(args.CommandLine || "").slice(0, 25)}...`;
        devops.currentTask = "CLI Execution";
        devops.state = "working";
        devops.isPaused = false;
        devops.targetX = devops.homeX;
        devops.targetY = devops.homeY;
        target = devops;
      }
    } else if (toolName === "write_file" || toolName === "edit_file") {
      const coder = this.getOrCreateSpecialist("coder", "Core Developer");
      const fname = args.Path ? args.Path.split(/[\\/]/).pop() : 'code';
      coder.speech = `Editing ${fname}`;
      coder.currentTask = `Modifying ${fname}`;
      coder.state = "working";
      coder.isPaused = false;
      coder.targetX = coder.homeX;
      coder.targetY = coder.homeY;
      target = coder;
    } else if (toolName === "search_web" || toolName === "read_file" || toolName.includes("docs")) {
      const researcher = this.getOrCreateSpecialist("researcher", "Research Analyst");
      researcher.speech = "Consulting API specifications...";
      researcher.currentTask = "Docs Review";
      researcher.state = "working";
      researcher.isPaused = false;
      researcher.targetX = this.zones.library.x + 20;
      researcher.targetY = this.zones.library.y + 35;
      target = researcher;
    } else if (toolName === "done") {
      this.setAllIdle();
      return;
    }

    if (target) {
      if (target.state !== "shipping") {
        target.state = "working";
      }
      target.isPaused = false;
    }

    this.selectAgent(target.id);
    this.updateRosterUI();
  }

  // --- Architectural Vector Rendering ---

  drawHardwoodFloor(palette) {
    this.ctx.fillStyle = palette.floorBase;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = palette.floorSeams;
    this.ctx.lineWidth = 1;
    const plankHeight = 36;
    const plankWidth = 180;

    for (let y = this.zones.windowWall.y + this.zones.windowWall.height; y < this.height; y += plankHeight) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();

      const offset = (Math.round(y / plankHeight) % 2 === 0) ? 0 : (plankWidth * 0.5);
      for (let x = offset; x < this.width; x += plankWidth) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + plankHeight);
        this.ctx.stroke();
      }
    }
  }

  drawPanoramicWindows(palette) {
    const wy = 0;
    const wh = this.zones.windowWall.height + 20;

    const skyGrad = this.ctx.createLinearGradient(0, wy, 0, wh);
    skyGrad.addColorStop(0, palette.skyTop);
    skyGrad.addColorStop(1, palette.skyBottom);
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, wy, this.width, wh);

    // Night Stars (Soft, gentle twinkling night sky)
    if (this.lightingMode === 'night') {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const stars = [
        [70, 16], [140, 30], [230, 14], [330, 24], [410, 12],
        [500, 28], [590, 16], [690, 32], [770, 18], [860, 14],
        [940, 26], [1030, 16], [1100, 30]
      ];
      stars.forEach(([sx, sy], i) => {
        const twinkle = (this.tickCount + i * 7) % 32 < 16;
        if (twinkle) {
          this.ctx.beginPath();
          this.ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      });
    }

    // Organic Horizon Landscape (Distant hills / gentle skyline silhouette)
    if (this.lightingMode === 'night') {
      this.ctx.fillStyle = '#0a101d';
    } else if (this.lightingMode === 'sunset') {
      this.ctx.fillStyle = '#7c2d12';
    } else {
      this.ctx.fillStyle = '#86efac';
    }

    this.ctx.beginPath();
    this.ctx.moveTo(0, wh);
    this.ctx.quadraticCurveTo(this.width * 0.15, wh - 16, this.width * 0.3, wh - 8);
    this.ctx.quadraticCurveTo(this.width * 0.45, wh - 20, this.width * 0.6, wh - 10);
    this.ctx.quadraticCurveTo(this.width * 0.78, wh - 18, this.width * 0.9, wh - 12);
    this.ctx.quadraticCurveTo(this.width * 0.96, wh - 6, this.width, wh - 10);
    this.ctx.lineTo(this.width, wh);
    this.ctx.closePath();
    this.ctx.fill();

    // Clean Architectural Window Mullions
    this.ctx.fillStyle = palette.windowFrame;
    this.ctx.fillRect(0, wh - 6, this.width, 6);
    this.ctx.fillRect(0, 0, this.width, 8);

    const paneWidth = this.width / 6;
    for (let i = 1; i < 6; i++) {
      this.ctx.fillRect(i * paneWidth - 3, 0, 6, wh);
    }

    // Gentle Sunlight Rays streaming across the studio floor
    if (palette.sunlightRay) {
      this.ctx.save();
      this.ctx.fillStyle = palette.sunlightRay;
      this.ctx.beginPath();
      this.ctx.moveTo(40, wh);
      this.ctx.lineTo(this.width * 0.45, this.height);
      this.ctx.lineTo(this.width * 0.15, this.height);
      this.ctx.lineTo(0, wh + 80);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawPlant(x, y) {
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#f8fafc';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#334155' : '#e2e8f0';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 12, y + 2, 24, 20, [2, 2, 8, 8]);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#78350f';
    this.ctx.fillRect(x - 10, y + 4, 20, 4);

    this.ctx.fillStyle = '#16a34a';
    this.ctx.beginPath();
    this.ctx.ellipse(x - 10, y - 10, 8, 14, -0.4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.ellipse(x + 10, y - 8, 8, 14, 0.4, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#15803d';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y - 18, 9, 16, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawStrategyBoard(x, y, palette) {
    const bw = 150;
    const bh = 100;

    // Sleek wall-mounted architectural glass board (clean, no protruding tripod legs!)
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#131b26' : '#ffffff';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#2d3d54' : '#cbd5e1';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Aluminum wall-mounting bracket clips
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillRect(x - bw / 2 - 2, y - bh / 2 + 10, 3, 6);
    this.ctx.fillRect(x + bw / 2 - 1, y - bh / 2 + 10, 3, 6);
    this.ctx.fillRect(x - bw / 2 - 2, y + bh / 2 - 16, 3, 6);
    this.ctx.fillRect(x + bw / 2 - 1, y + bh / 2 - 16, 3, 6);

    const allDone = (this.missionSteps.length > 0 && this.missionSteps.every(s => s.status === "done"));
    this.ctx.fillStyle = allDone ? '#16a34a' : '#2563eb';
    this.ctx.fillRect(x - bw / 2 + 8, y - bh / 2 + 8, 3, 12);

    this.ctx.font = 'bold 9px sans-serif';
    this.ctx.fillStyle = allDone ? '#15803d' : (this.lightingMode === 'night' ? '#93c5fd' : '#1e3a8a');
    this.ctx.fillText(allDone ? "ALL STEPS COMPLETED" : "STRATEGY ROADMAP", x - bw / 2 + 16, y - bh / 2 + 17);

    const stepsToShow = this.missionSteps.slice(0, 5);
    if (stepsToShow.length > 0) {
      stepsToShow.forEach((st, idx) => {
        const sy = y - bh / 2 + 33 + (idx * 14);
        const isDone = (st.status === "done");
        const isInProgress = (st.status === "in_progress");

        // Dynamic pulsing indicator for in-progress step
        const pulse = isInProgress ? (Math.sin(this.tickCount * 0.18) * 1.5) : 0;
        if (isInProgress) {
          this.ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
          this.ctx.beginPath();
          this.ctx.arc(x - bw / 2 + 14, sy - 3, 6 + pulse, 0, Math.PI * 2);
          this.ctx.fill();
        }

        this.ctx.fillStyle = isDone ? '#16a34a' : (isInProgress ? '#4f46e5' : '#94a3b8');
        this.ctx.beginPath();
        this.ctx.arc(x - bw / 2 + 14, sy - 3, 3 + (isInProgress ? pulse * 0.5 : 0), 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.font = isDone ? '9px sans-serif' : '600 9px sans-serif';
        this.ctx.fillStyle = isDone ? '#64748b' : (this.lightingMode === 'night' ? '#f1f5f9' : '#0f172a');
        const truncated = st.title.length > 18 ? st.title.slice(0, 16) + '..' : st.title;
        this.ctx.fillText(truncated, x - bw / 2 + 22, sy);
      });
    } else {
      this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#fef08a';
      this.ctx.fillRect(x - bw / 2 + 12, y - bh / 2 + 28, 36, 16);
      this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1c2636' : '#dcfce7';
      this.ctx.fillRect(x - bw / 2 + 54, y - bh / 2 + 28, 36, 16);
    }

    // Active Idea Spark Particle emission from Glass Board
    if ((this.tickCount % 80 === 0) && this.spawnParticle) {
      this.spawnParticle(x - bw / 2 + 18 + Math.random() * (bw - 36), y - bh / 2 + 28 + Math.random() * 45, 'spark', '', '#facc15');
    }
  }

  drawOakBookshelf(x, y, palette) {
    const bw = 120;
    const bh = 80;

    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#131b26' : '#fdf8f0';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#2d3d54' : '#d4b996';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#c5a882';
    this.ctx.fillRect(x - bw / 2 + 6, y - bh / 2 + 26, bw - 12, 3);
    this.ctx.fillRect(x - bw / 2 + 6, y - bh / 2 + 54, bw - 12, 3);

    const bookColors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777', '#0284c7'];
    bookColors.forEach((c, idx) => {
      this.ctx.fillStyle = c;
      this.ctx.fillRect(x - bw / 2 + 14 + (idx * 15), y - bh / 2 + 32, 9, 22);
    });

    this.ctx.font = 'bold 9px sans-serif';
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#cbd5e1' : '#78350f';
    this.ctx.fillText("KNOWLEDGE ARCHIVE", x - bw / 2 + 10, y - bh / 2 + 18);
  }

  drawSecurityVault(x, y, palette) {
    const vw = 96;
    const vh = 72;
    const isNight = (this.lightingMode === 'night');

    // Vault Console Body
    this.ctx.fillStyle = isNight ? '#0f172a' : '#f8fafc';
    this.ctx.strokeStyle = isNight ? '#334155' : '#cbd5e1';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - vw / 2, y - vh / 2, vw, vh, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // High-tech Header Bar
    this.ctx.fillStyle = isNight ? '#1e293b' : '#e2e8f0';
    this.ctx.fillRect(x - vw / 2 + 4, y - vh / 2 + 4, vw - 8, 16);

    this.ctx.font = 'bold 8.5px sans-serif';
    this.ctx.fillStyle = isNight ? '#f87171' : '#dc2626';
    this.ctx.fillText("SECURITY VAULT", x - vw / 2 + 8, y - vh / 2 + 15);

    // Status LED
    const pulse = Math.sin(this.tickCount * 0.08) > 0;
    this.ctx.fillStyle = pulse ? '#10b981' : '#059669';
    this.ctx.beginPath();
    this.ctx.arc(x + vw / 2 - 12, y - vh / 2 + 12, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Central Vault Terminal Screen
    this.ctx.fillStyle = isNight ? '#020617' : '#0f172a';
    this.ctx.beginPath();
    this.ctx.roundRect(x - vw / 2 + 8, y - vh / 2 + 24, vw - 16, 40, 4);
    this.ctx.fill();

    // Shield Glyph / Scanning HUD
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    const sx = x;
    const sy = y + 4;
    this.ctx.moveTo(sx, sy - 8);
    this.ctx.lineTo(sx + 7, sy - 4);
    this.ctx.lineTo(sx + 7, sy + 3);
    this.ctx.quadraticCurveTo(sx + 7, sy + 9, sx, sy + 12);
    this.ctx.quadraticCurveTo(sx - 7, sy + 9, sx - 7, sy + 3);
    this.ctx.lineTo(sx - 7, sy - 4);
    this.ctx.closePath();
    this.ctx.stroke();

    // Lock check inside shield
    this.ctx.fillStyle = '#22c55e';
    this.ctx.font = 'bold 7px sans-serif';
    this.ctx.fillText("0 VULN", x - 13, y + 22);

    // Particle pulse
    if (this.tickCount % 90 === 0 && this.spawnParticle) {
      this.spawnParticle(x + (Math.random() - 0.5) * 30, y - 5, 'shield', '', '#ef4444');
    }
  }

  drawServerBay(x, y, palette) {
    const rw = 76;
    const rh = 104;

    // 1. Overhead Cable Conduit Ladder Rack
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#64748b';
    this.ctx.fillRect(x - rw / 2 - 4, y - rh / 2 - 12, rw + 8, 5);
    // Colorful bundled patch cables arching into top of cabinet
    const cableColors = ['#38bdf8', '#fbbf24', '#a855f7', '#22c55e'];
    cableColors.forEach((cc, ci) => {
      this.ctx.strokeStyle = cc;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x - 20 + ci * 12, y - rh / 2 - 12);
      this.ctx.lineTo(x - 16 + ci * 10, y - rh / 2);
      this.ctx.stroke();
    });

    // 2. Enterprise Server Rack Chassis
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#070c14' : '#0f172a';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#1e293b' : '#334155';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - rw / 2, y - rh / 2, rw, rh, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // 5 Server Blades (1U/2U Chassis units) with Cascading Packet LEDs
    const packetStep = Math.floor(this.tickCount * 0.12) % 7;
    for (let i = 0; i < 5; i++) {
      const sy = y - rh / 2 + 12 + (i * 17);
      this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0d1522' : '#1e293b';
      this.ctx.beginPath();
      this.ctx.roundRect(x - rw / 2 + 6, sy, rw - 12, 13, 2);
      this.ctx.fill();

      // Horizontal cooling vent slats
      this.ctx.fillStyle = '#334155';
      this.ctx.fillRect(x - rw / 2 + 22, sy + 3, 24, 1.5);
      this.ctx.fillRect(x - rw / 2 + 22, sy + 6, 24, 1.5);
      this.ctx.fillRect(x - rw / 2 + 22, sy + 9, 24, 1.5);

      // Status Indicator LEDs with cascading packet burst activity
      const isPacketActive = (packetStep === i || packetStep === (i + 1));
      const blinkA = ((this.tickCount + i * 11) % 20) < 10;
      
      const ledColorA = isPacketActive ? '#4ade80' : (i === 0 ? '#38bdf8' : (i === 1 ? '#f59e0b' : (i === 2 ? '#10b981' : (i === 3 ? '#a855f7' : '#06b6d4'))));
      this.ctx.fillStyle = isPacketActive ? '#4ade80' : (blinkA ? ledColorA : '#064e3b');
      this.ctx.fillRect(x - rw / 2 + 10, sy + 4, 3, 3);

      this.ctx.fillStyle = isPacketActive ? '#22d3ee' : '#14532d';
      this.ctx.fillRect(x - rw / 2 + 15, sy + 4, 3, 3);

      // Drive bay latch
      this.ctx.fillStyle = '#64748b';
      this.ctx.fillRect(x + rw / 2 - 14, sy + 3, 4, 7);
    }

    // Tinted Glass Door Sheen
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.beginPath();
    this.ctx.moveTo(x - rw / 2 + 2, y - rh / 2 + 2);
    this.ctx.lineTo(x + rw / 2 - 2, y - rh / 2 + 2);
    this.ctx.lineTo(x - rw / 2 + 2, y + rh / 2 - 2);
    this.ctx.closePath();
    this.ctx.fill();

    // 3. Slide-Out Ops Diagnostic Terminal / Crash Cart (Where DevOps interacts!)
    const cx = x - 54;
    const cy = y + 10;

    // Cart Aluminum Stand with Castor Wheels
    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(cx - 10, cy + 18, 20, 4);
    this.ctx.fillStyle = '#334155';
    this.ctx.beginPath();
    this.ctx.arc(cx - 8, cy + 23, 2, 0, Math.PI * 2);
    this.ctx.arc(cx + 8, cy + 23, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Telescoping Pole
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillRect(cx - 2, cy - 6, 4, 24);

    // Diagnostic Console Display (Angled toward operator)
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b111a' : '#1e293b';
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 14, cy - 26, 28, 18, 2);
    this.ctx.fill();

    // Screen
    this.ctx.fillStyle = '#05101a';
    this.ctx.fillRect(cx - 12, cy - 24, 24, 14);

    // Terminal Output Lines (Live tests / Docker logs)
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(cx - 10, cy - 22, 10, 1.5);
    this.ctx.fillStyle = '#4ade80';
    this.ctx.fillRect(cx - 10, cy - 19, 14, 1.5);

    // Live compilation / test progress bar
    const progW = ((this.tickCount * 0.4) % 18);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fillRect(cx - 10, cy - 16, 18, 2);
    this.ctx.fillStyle = '#22c55e';
    this.ctx.fillRect(cx - 10, cy - 16, progW, 2);

    // Blinking prompt cursor
    if (this.tickCount % 20 < 10) {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillRect(cx - 10, cy - 13, 3, 2);
    }

    // Emit green checkmark particle when test suite completes
    if ((this.tickCount % 100 === 0) && this.spawnParticle) {
      this.spawnParticle(cx + 6, cy - 22, 'check', '', '#22c55e');
    }

    // Keyboard Tray
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#475569';
    this.ctx.beginPath();
    this.ctx.roundRect(cx - 12, cy - 6, 24, 4, 1);
    this.ctx.fill();
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillRect(cx - 9, cy - 5, 18, 2);

    // Station Signage Badge
    this.ctx.font = 'bold 8.5px sans-serif';
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#38bdf8' : '#0284c7';
    this.ctx.fillText("CI/CD SERVER BAY & OPS", x - rw / 2 - 12, y - rh / 2 - 18);
  }

  drawMarbleEspressoBar(x, y, palette) {
    // 1. Scandinavian Cafe Woven Rug
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#131c28' : '#eae3d8';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#243247' : '#d8cfc2';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 88, y - 24, 186, 76, 10);
    this.ctx.fill();
    this.ctx.stroke();

    // 2. Barista Espresso Bar Counter
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#131b26' : '#ffffff';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#2d3d54' : '#cbd5e1';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 22, y - 16, 68, 28, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Counter Front Acoustic Slats (Vertical timber pattern)
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#f1f5f9';
    for (let sl = x - 16; sl < x + 40; sl += 5) {
      this.ctx.fillRect(sl, y - 2, 2.5, 12);
    }

    // 3. Commercial Dual-Group Espresso Machine (Polished Stainless Steel)
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 14, y - 36, 28, 20, 3);
    this.ctx.fill();

    // Twin Clear Coffee Bean Hoppers
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    this.ctx.fillRect(x - 12, y - 43, 9, 7);
    this.ctx.fillRect(x + 1, y - 43, 9, 7);
    this.ctx.fillStyle = '#451a03'; // Roasted beans
    this.ctx.fillRect(x - 10, y - 41, 5, 4);
    this.ctx.fillRect(x + 3, y - 41, 5, 4);

    // Brass Portafilters
    this.ctx.fillStyle = '#d97706';
    this.ctx.fillRect(x - 10, y - 16, 4, 6);
    this.ctx.fillRect(x + 4, y - 16, 4, 6);

    // Pressure & Temperature Digital Display
    this.ctx.fillStyle = '#0284c7';
    this.ctx.fillRect(x - 3, y - 30, 6, 4);

    // Animated Steam Puffs from Steam Wand with organic pulsing
    const steamPulse = (Math.sin(this.tickCount * 0.18) + 1) * 0.5;
    this.ctx.fillStyle = `rgba(180, 180, 180, ${0.25 + steamPulse * 0.3})`;
    this.ctx.beginPath();
    this.ctx.arc(x + 16, y - 38 - steamPulse * 3, 2 + steamPulse * 1.5, 0, Math.PI * 2);
    this.ctx.arc(x + 18, y - 43 - steamPulse * 4, 3 + steamPulse * 2, 0, Math.PI * 2);
    this.ctx.fill();

    if ((this.tickCount % 75 === 0) && this.spawnParticle) {
      this.spawnParticle(x + 18, y - 45, 'steam', '', 'rgba(210, 210, 210, 0.4)');
    }

    // Cup Warmer Stack on top of machine
    this.ctx.fillStyle = '#e2e8f0';
    this.ctx.fillRect(x - 8, y - 38, 4, 2);
    this.ctx.fillRect(x - 2, y - 38, 4, 2);

    // 4. Mid-Century Modern Armchair (Cozy lounge seating)
    const ax = x - 68;
    const ay = y - 8;
    // Wooden Legs
    this.ctx.strokeStyle = '#78350f';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(ax - 12, ay + 14);
    this.ctx.lineTo(ax - 16, ay + 24);
    this.ctx.moveTo(ax + 12, ay + 14);
    this.ctx.lineTo(ax + 16, ay + 24);
    this.ctx.stroke();

    // Chair Backrest & Cushion
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#334155';
    this.ctx.strokeStyle = '#b45309';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(ax - 14, ay - 8, 28, 24, 7);
    this.ctx.fill();
    this.ctx.stroke();

    // Padded Armrests
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#243247' : '#475569';
    this.ctx.fillRect(ax - 17, ay + 2, 4, 14);
    this.ctx.fillRect(ax + 13, ay + 2, 4, 14);

    // 5. Birch Coffee Table
    const tx = x + 60;
    const ty = y + 2;
    // 3 Peg Legs
    this.ctx.strokeStyle = '#a16207';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(tx - 7, ty + 6);
    this.ctx.lineTo(tx - 11, ty + 16);
    this.ctx.moveTo(tx + 7, ty + 6);
    this.ctx.lineTo(tx + 11, ty + 16);
    this.ctx.stroke();

    // Round Birch Top
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#fdf8f0';
    this.ctx.strokeStyle = '#d4b996';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(tx, ty, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Steaming Mug on Coffee Table
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(tx - 6, ty - 5, 6, 7, 1.5);
    this.ctx.fill();
    this.ctx.stroke();

    // Miniature Succulent Pot on Table
    this.ctx.fillStyle = '#b45309';
    this.ctx.fillRect(tx + 3, ty - 1, 5, 4);
    this.ctx.fillStyle = '#22c55e';
    this.ctx.beginPath();
    this.ctx.arc(tx + 5.5, ty - 3, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Station Badge
    this.ctx.font = 'bold 8.5px sans-serif';
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#fcd34d' : '#92400e';
    this.ctx.fillText("BREAKOUT ATRIUM", x - 38, y + 36);
  }

  drawGitPostOffice(x, y, palette) {
    const pw = 94;
    const ph = 46;

    // 1. Industrial Cedar & Steel Dispatch Counter
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#131b26' : '#f8fafc';
    this.ctx.strokeStyle = '#0891b2';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - pw / 2, y - ph / 2 + 10, pw, 32, 6);
    this.ctx.fill();
    this.ctx.stroke();

    // Front Cedar Inlay
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1a2332' : '#fed7aa';
    this.ctx.fillRect(x - pw / 2 + 6, y - ph / 2 + 16, pw - 12, 18);

    // 2. Built-in Parcel Weighing Scale on Counter
    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(x - 16, y - ph / 2 + 12, 26, 6);
    
    // Digital readout with dynamic scale weight
    const isDispatching = (this.uplinkPulse > 0.05);
    const weightTxt = isDispatching ? (1.4 + Math.sin(this.tickCount * 0.15) * 0.08).toFixed(1) + 'kg' : '0.0kg';
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.font = 'bold 5px monospace';
    this.ctx.fillText(weightTxt, x - 14, y - ph / 2 + 17);

    // Mechanical Rubber Stamp & Arm (Stamps down onto package when commit pushed)
    if (isDispatching) {
      const stampDown = Math.sin(this.tickCount * 0.4) > 0;
      const stampY = stampDown ? (y - ph / 2 + 10) : (y - ph / 2 + 4);
      // Stamp Handle
      this.ctx.fillStyle = '#475569';
      this.ctx.fillRect(x - 5, stampY - 7, 4, 4);
      // Red Stamp Head
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillRect(x - 8, stampY - 3, 10, 3);
      // Stamp ink seal on package
      if (stampDown) {
        this.ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
        this.ctx.fillRect(x - 5, y - ph / 2 + 13, 4, 3);
      }
    }

    // 3. Desktop Kiosk Dispatch Screen
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b0f17' : '#0f172a';
    this.ctx.beginPath();
    this.ctx.roundRect(x - pw / 2 + 6, y - ph / 2 - 8, 24, 18, 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(x - pw / 2 + 8, y - ph / 2 - 6, 20, 14);
    // Cyan terminal prompt on screen
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(x - pw / 2 + 10, y - ph / 2 - 3, 10, 1.5);
    this.ctx.fillRect(x - pw / 2 + 10, y - ph / 2 + 1, 14, 1.5);

    // 4. Wall-Mounted Branch Mail Pigeonholes / Cubbies
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b0f17' : '#e2e8f0';
    this.ctx.fillRect(x - pw / 2 + 8, y - ph / 2 - 38, 48, 24);
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - pw / 2 + 8, y - ph / 2 - 38, 48, 24);
    // Dividers
    this.ctx.beginPath();
    this.ctx.moveTo(x - pw / 2 + 24, y - ph / 2 - 38);
    this.ctx.lineTo(x - pw / 2 + 24, y - ph / 2 - 14);
    this.ctx.moveTo(x - pw / 2 + 40, y - ph / 2 - 38);
    this.ctx.lineTo(x - pw / 2 + 40, y - ph / 2 - 14);
    this.ctx.moveTo(x - pw / 2 + 8, y - ph / 2 - 26);
    this.ctx.lineTo(x - pw / 2 + 56, y - ph / 2 - 26);
    this.ctx.stroke();

    // Color-coded Branch Envelopes
    this.ctx.fillStyle = '#38bdf8'; // main
    this.ctx.fillRect(x - pw / 2 + 11, y - ph / 2 - 35, 9, 6);
    this.ctx.fillStyle = '#4ade80'; // develop
    this.ctx.fillRect(x - pw / 2 + 27, y - ph / 2 - 35, 9, 6);
    this.ctx.fillStyle = '#c084fc'; // staging
    this.ctx.fillRect(x - pw / 2 + 43, y - ph / 2 - 35, 9, 6);
    this.ctx.fillStyle = '#fb923c'; // hotfix
    this.ctx.fillRect(x - pw / 2 + 11, y - ph / 2 - 23, 9, 6);
    this.ctx.fillStyle = '#f43f5e'; // release
    this.ctx.fillRect(x - pw / 2 + 27, y - ph / 2 - 23, 9, 6);

    // 5. Stacked Release Cargo Crates (Tagged origin/main)
    this.ctx.fillStyle = '#d97706';
    this.ctx.beginPath();
    this.ctx.roundRect(x + 16, y - ph / 2 + 2, 26, 20, 3);
    this.ctx.fill();
    this.ctx.fillStyle = '#b45309';
    this.ctx.fillRect(x + 27, y - ph / 2 + 2, 4, 20);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 7px sans-serif';
    this.ctx.fillText("MAIN", x + 19, y - ph / 2 + 14);

    // 6. Directional Satellite Uplink Dish on Wall
    const dishX = x + pw / 2 - 10;
    const dishY = y - ph / 2 - 26;

    this.ctx.strokeStyle = '#0891b2';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(dishX, dishY, 14, -Math.PI * 0.7, Math.PI * 0.2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(dishX - 2, dishY - 14, 4, 16);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.beginPath();
    this.ctx.arc(dishX, dishY - 14, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Pulsing Satellite Uplink Radio Waves when pushing to remote
    if (this.uplinkPulse > 0.05) {
      this.ctx.strokeStyle = `rgba(6, 182, 212, ${this.uplinkPulse})`;
      this.ctx.lineWidth = 2;
      const waveOffset = (this.tickCount * 0.8) % 12;
      for (let r = 16 + waveOffset; r <= 42; r += 10) {
        this.ctx.beginPath();
        this.ctx.arc(dishX, dishY - 14, r, -Math.PI * 0.8, -Math.PI * 0.2);
        this.ctx.stroke();
      }
      this.uplinkPulse -= 0.008;

      if ((this.tickCount % 50 === 0) && this.spawnParticle) {
        this.spawnParticle(dishX + 4, dishY - 26, 'stamp', 'PUSHED', '#06b6d4');
      }

      if ((this.tickCount % 42 === 0) && window.chiptuneAudio) {
        window.chiptuneAudio.playSatellitePing();
      }
    }

    // Station Badge
    this.ctx.font = 'bold 8.5px sans-serif';
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#67e8f9' : '#0891b2';
    this.ctx.fillText("GIT REMOTE DISPATCH", x - pw / 2 + 8, y + 36);
  }

  // --- Ergonomic Chair & Desk Layering ---

  drawErgonomicChair(x, y, palette) {
    this.ctx.strokeStyle = '#64748b';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 12, y + 8);
    this.ctx.lineTo(x + 12, y + 8);
    this.ctx.moveTo(x - 8, y + 4);
    this.ctx.lineTo(x + 8, y + 12);
    this.ctx.stroke();

    this.ctx.fillStyle = '#334155';
    this.ctx.fillRect(x - 2, y - 6, 4, 12);

    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#334155';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 15, y - 10, 30, 8, 3);
    this.ctx.fill();

    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b0f17' : '#1e293b';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#2d3d54' : '#475569';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 13, y - 30, 26, 20, 5);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#334155';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 8, y - 36, 16, 5, 2);
    this.ctx.fill();
  }

  drawSeatedAvatar(ag, deskX, deskY, palette) {
    const isSelected = (ag.id === this.selectedAgentId);
    const isTyping = (ag.state === "working");
    const px = deskX;
    const py = deskY - 14;

    // Head Bob (Subtle groove to headphone music when in the coding zone)
    const headGroove = isTyping ? (Math.sin(this.tickCount * 0.22) * 1.0) : 0;

    // Selection Halo
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(px, py - 10 + headGroove, 24, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Specialist Uniform Body (Chest / Shoulders)
    this.ctx.fillStyle = ag.color;
    this.ctx.beginPath();
    this.ctx.roundRect(px - 10, py - 10, 20, 18, 4);
    this.ctx.fill();

    // Shirt Collar V-neck
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#f8fafc';
    this.ctx.beginPath();
    this.ctx.moveTo(px - 3, py - 10);
    this.ctx.lineTo(px, py - 5);
    this.ctx.lineTo(px + 3, py - 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Unobstructed Face (Warm skin tone with subtle groove)
    this.ctx.fillStyle = '#fed7aa';
    this.ctx.beginPath();
    this.ctx.roundRect(px - 8, py - 27 + headGroove, 16, 16, 4);
    this.ctx.fill();

    // Styled Hair
    this.ctx.fillStyle = ag.hair;
    this.ctx.beginPath();
    this.ctx.roundRect(px - 9, py - 31 + headGroove, 18, 8, [5, 5, 0, 0]);
    this.ctx.fill();

    // Focused Eyes (Looking toward desk and code monitors)
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(px - 4, py - 19 + headGroove, 2.5, 3);
    this.ctx.fillRect(px + 2, py - 19 + headGroove, 2.5, 3);

    // Studio Audio Headphones (Band curved across top of hair)
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#475569' : '#1e293b';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(px, py - 27 + headGroove, 10, -Math.PI * 0.9, -Math.PI * 0.1);
    this.ctx.stroke();

    // Cushioned Earcups on sides of head
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#334155' : '#0f172a';
    this.ctx.beginPath();
    this.ctx.roundRect(px - 11, py - 23 + headGroove, 3.5, 8, 2);
    this.ctx.roundRect(px + 7.5, py - 23 + headGroove, 3.5, 8, 2);
    this.ctx.fill();

    // Headphone Blue Accent Rings
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(px - 10.5, py - 20 + headGroove, 2, 2);
    this.ctx.fillRect(px + 8.5, py - 20 + headGroove, 2, 2);

    // Typing Arms extending forward onto keyboard with rapid mechanical cadence
    const leftArmBob = isTyping ? (Math.sin(this.tickCount * 0.85) * 2.0) : 0;
    const rightArmBob = isTyping ? (-Math.sin(this.tickCount * 0.85 + 0.3) * 2.0) : 0;

    // Sleeves
    this.ctx.fillStyle = ag.color;
    this.ctx.beginPath();
    this.ctx.roundRect(px - 13, py - 4, 4.5, 12 + leftArmBob, 2);
    this.ctx.roundRect(px + 8.5, py - 4, 4.5, 12 + rightArmBob, 2);
    this.ctx.fill();

    // Hands on Keyboard
    this.ctx.fillStyle = '#fed7aa';
    this.ctx.beginPath();
    this.ctx.arc(px - 10.5, py + 9 + leftArmBob, 2.8, 0, Math.PI * 2);
    this.ctx.arc(px + 10.5, py + 9 + rightArmBob, 2.8, 0, Math.PI * 2);
    this.ctx.fill();

    // Emit live code tokens when in flow
    if (isTyping && (this.tickCount % 50 === 0) && this.spawnParticle) {
      const tokens = ['{ }', '=>', ';', '</>', 'fn()', 'git'];
      const tok = tokens[Math.floor(Math.random() * tokens.length)];
      this.spawnParticle(px + (Math.random() * 24 - 12), py - 10, 'code', tok, '#38bdf8');
    }

    // Chiptune mechanical typing audio
    if (isTyping && (this.tickCount % 14 === 0) && window.chiptuneAudio) {
      window.chiptuneAudio.playKeyClick();
    }

    // Speech / Thought Bubble (Generous headroom above headphones)
    this.renderBubble(ag, px, py - 24, palette);
  }

  drawDeskSurface(x, y, isOccupied, seatedAgent, palette) {
    // 1. Scandinavian Solid Wood Tabletop (Spacious 84px wide executive desk)
    this.ctx.fillStyle = palette.deskTop;
    this.ctx.strokeStyle = palette.deskBorder;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 42, y - 8, 84, 26, 4);
    this.ctx.fill();
    this.ctx.stroke();

    // Modern Steel Desk Legs
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#223044' : '#94a3b8';
    this.ctx.fillRect(x - 38, y + 18, 4, 14);
    this.ctx.fillRect(x + 34, y + 18, 4, 14);

    // 2. Centered Dark Leather Desk Mat
    this.ctx.fillStyle = palette.deskMat;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 24, y - 4, 48, 16, 3);
    this.ctx.fill();

    // Context Window & Token Utilization HUD Bar (Market-leading feature from Pixel Agents & OpenHands)
    if (isOccupied && seatedAgent) {
      const tokenRatio = seatedAgent.contextRatio || 0.48;
      const barW = 32;
      const barH = 2.5;
      const bx = x - barW / 2;
      const by = y - 6;

      this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b111a' : '#1e293b';
      this.ctx.beginPath();
      this.ctx.roundRect(bx - 1, by - 0.5, barW + 2, barH + 1, 1);
      this.ctx.fill();

      let healthColor = '#10b981';
      if (tokenRatio > 0.85) {
        healthColor = ((this.tickCount % 20 < 10) ? '#ef4444' : '#991b1b');
      } else if (tokenRatio > 0.65) {
        healthColor = '#f59e0b';
      }

      this.ctx.fillStyle = healthColor;
      this.ctx.beginPath();
      this.ctx.roundRect(bx, by, Math.max(2, barW * tokenRatio), barH, 0.5);
      this.ctx.fill();
    }

    // 3. Centered Mechanical Keyboard
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#cbd5e1';
    this.ctx.strokeStyle = (this.lightingMode === 'night') ? '#334155' : '#94a3b8';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x - 14, y, 22, 6, 1.5);
    this.ctx.fill();
    this.ctx.stroke();

    // Keyboard Keycaps Accent Row (Illuminated RGB/Cyan on active typing)
    const keyGlow = isOccupied ? (((this.tickCount % 12) < 6) ? '#38bdf8' : '#0284c7') : '#64748b';
    this.ctx.fillStyle = (this.lightingMode === 'night') ? (isOccupied ? keyGlow : '#334155') : keyGlow;
    this.ctx.fillRect(x - 12, y + 2, 18, 2);

    // 4. Ergonomic Precision Mouse
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#334155' : '#94a3b8';
    this.ctx.beginPath();
    this.ctx.roundRect(x + 12, y + 1, 5, 7, 2);
    this.ctx.fill();

    // 5. Ceramic Coffee Mug with Rising Steam
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#e2e8f0' : '#ffffff';
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x + 25, y - 4, 7, 8, 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Mug Handle
    this.ctx.beginPath();
    this.ctx.arc(x + 32, y, 2.5, -Math.PI * 0.5, Math.PI * 0.5);
    this.ctx.stroke();

    // Rising Steam Animation
    if (this.tickCount % 24 < 12) {
      this.ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(x + 28, y - 8, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 6. Left Wing: Vertical Docs / Terminal Monitor (Angled inward)
    // Heavy Silver Desk Stand
    this.ctx.fillStyle = '#64748b';
    this.ctx.fillRect(x - 32, y - 8, 4, 6);
    this.ctx.fillRect(x - 34, y - 2, 8, 2);

    // Vertical Bezel
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#080d16' : '#1e293b';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 38, y - 28, 16, 26, 2);
    this.ctx.fill();

    // Vertical Screen: Terminal / Logs Editor
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0b111a' : '#0f172a';
    this.ctx.fillRect(x - 36, y - 26, 12, 22);

    if (isOccupied) {
      // Terminal Logs Lines (Cyan, Green, Yellow with active scrolling cadence)
      const logScroll = Math.floor(this.tickCount * 0.08) % 3;
      const logColors = ['#38bdf8', '#4ade80', '#facc15', '#94a3b8', '#38bdf8', '#4ade80'];
      for (let li = 0; li < 6; li++) {
        const cIdx = (li + logScroll) % logColors.length;
        const lw = 5 + ((li * 3 + this.tickCount) % 5);
        this.ctx.fillStyle = logColors[cIdx];
        this.ctx.fillRect(x - 34, y - 24 + (li * 3.5), Math.min(lw, 9), 1.5);
      }
      // Blinking command cursor prompt
      if (this.tickCount % 20 < 10) {
        this.ctx.fillStyle = '#4ade80';
        this.ctx.fillRect(x - 34, y - 4, 3, 2);
      }
    }

    // 7. Right Wing: Articulated Curved Display (Angled inward)
    // Articulated Monitor Arm
    this.ctx.strokeStyle = '#94a3b8';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + 22, y - 4);
    this.ctx.lineTo(x + 26, y - 14);
    this.ctx.stroke();

    // Curved Display Bezel
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#080d16' : '#1e293b';
    this.ctx.beginPath();
    this.ctx.roundRect(x + 14, y - 28, 26, 20, 3);
    this.ctx.fill();

    // Display Screen: Syntax Highlighted IDE
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0d1522' : '#f8fafc';
    this.ctx.fillRect(x + 16, y - 26, 22, 16);

    if (isOccupied) {
      // Live streaming syntax code lines with animated lengths & blinking cursor!
      const cursorBlink = (this.tickCount % 20 < 10);

      // Line 1 (Function / Keyword)
      const l1w = 9 + Math.sin(this.tickCount * 0.15) * 2;
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fillRect(x + 18, y - 23, l1w, 2);
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillRect(x + 19 + l1w, y - 23, 6, 2);

      // Line 2 (Variable / String)
      const l2w = 11 + Math.cos(this.tickCount * 0.12) * 3;
      this.ctx.fillStyle = '#fb923c';
      this.ctx.fillRect(x + 18, y - 19, l2w, 2);

      // Line 3 (Logic / Call)
      this.ctx.fillStyle = '#c084fc';
      this.ctx.fillRect(x + 20, y - 15, 11, 2);

      // Line 4 (Active editing line with blinking cursor)
      const l4w = 6 + (Math.sin(this.tickCount * 0.25) * 2);
      this.ctx.fillStyle = '#22c55e';
      this.ctx.fillRect(x + 18, y - 12, l4w, 2);
      if (cursorBlink) {
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(x + 19 + l4w, y - 13, 2, 3);
      }
    }

    // 8. Night Mode: Ambient Lighting and Monitor Glows
    if (palette.nightLamps && isOccupied) {
      this.ctx.save();
      // Warm desk lamp glow centered on mat & keyboard
      const lampGrad = this.ctx.createRadialGradient(x, y - 2, 4, x, y + 4, 38);
      lampGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
      lampGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      this.ctx.fillStyle = lampGrad;
      this.ctx.beginPath();
      this.ctx.arc(x, y + 2, 38, 0, Math.PI * 2);
      this.ctx.fill();

      // Soft Cyan Glow from Right Code Screen
      const screenGrad = this.ctx.createRadialGradient(x + 25, y - 18, 2, x + 25, y - 18, 24);
      screenGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      screenGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      this.ctx.fillStyle = screenGrad;
      this.ctx.beginPath();
      this.ctx.arc(x + 25, y - 18, 24, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawWalkingAvatar(ag, palette) {
    const isSelected = (ag.id === this.selectedAgentId);
    const isArmchairSeated = (ag.state === "coffee" && Math.hypot(ag.x - 72, ag.y - 340) < 14);
    const isAtServerLab = (Math.hypot(ag.x - 980, ag.y - 165) < 30);
    const isAtPostOffice = (ag.state === "shipping" || Math.hypot(ag.x - 980, ag.y - 342) < 25);
    const isCoffee = (ag.state === "coffee" && !isArmchairSeated);

    const isWalking = (ag.state === "walking" && !isArmchairSeated);
    const walkCadence = isWalking ? Math.sin(this.tickCount * 0.35) : 0;
    const walkBob = isWalking ? (Math.abs(Math.sin(this.tickCount * 0.35)) * 2.5) : 0;
    const legSwing = walkCadence * 3.5;

    const px = Math.round(ag.x);
    const py = Math.round(ag.y - walkBob);

    // Selection Halo
    if (isSelected) {
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(px, py - 4, 20, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Shadow (Only when not seated in armchair)
    if (!isArmchairSeated) {
      this.ctx.fillStyle = palette.ambientShadow;
      this.ctx.beginPath();
      this.ctx.ellipse(px, py + 18, 12 + (isWalking ? 2 : 0), 5, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Legs & 2-Beat Footstep Stride Cadence
    this.ctx.fillStyle = (this.lightingMode === 'night') ? '#1e293b' : '#334155';
    if (isArmchairSeated) {
      // Seated tucked legs
      this.ctx.fillRect(px - 5, py + 4, 4, 8);
      this.ctx.fillRect(px + 1, py + 4, 4, 8);
    } else if (isWalking) {
      // Dynamic alternating leg stride
      this.ctx.fillRect(px - 7, py + 4, 4.5, 12 + walkCadence * 2);
      this.ctx.fillRect(px + 2, py + 4, 4.5, 12 - walkCadence * 2);
      // Feet / shoes with stride offset
      this.ctx.fillStyle = (this.lightingMode === 'night') ? '#0f172a' : '#1e293b';
      this.ctx.fillRect(px - 8 + legSwing, py + 15, 6, 3);
      this.ctx.fillRect(px + 1 - legSwing, py + 15, 6, 3);
    } else {
      // Standing legs
      this.ctx.fillRect(px - 7, py + 4, 5, 12);
      this.ctx.fillRect(px + 2, py + 4, 5, 12);
    }

    // Specialist Uniform Body (Chest / Torso)
    this.ctx.fillStyle = ag.color;
    this.ctx.beginPath();
    this.ctx.roundRect(px - 9, py - 8, 18, 16, 4);
    this.ctx.fill();

    // Armchair Coffee Sipping Cycle Parameters:
    const sipCycle = (this.tickCount + ag.id * 75) % 320;
    let sipLift = 0;
    let isSipping = false;
    if (isArmchairSeated) {
      if (sipCycle >= 160 && sipCycle < 200) {
        // Lifting mug upwards toward mouth
        const prog = (sipCycle - 160) / 40;
        sipLift = -prog * 9;
      } else if (sipCycle >= 200 && sipCycle < 250) {
        // Mug held at mouth, taking a sip!
        sipLift = -9;
        isSipping = true;
        if (sipCycle === 225 && this.spawnParticle) {
          this.spawnParticle(px, py - 18, 'steam', '', 'rgba(210, 210, 210, 0.5)');
          if (window.chiptuneAudio) window.chiptuneAudio.playCoffeeSteam();
        }
      } else if (sipCycle >= 250 && sipCycle < 280) {
        // Lowering mug back down to lap
        const prog = 1 - ((sipCycle - 250) / 30);
        sipLift = -prog * 9;
      }
    }

    // Arms & Hands based on Interaction:
    if (isArmchairSeated) {
      // Both arms holding ceramic mug with dynamic sipping motion
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 11, py - 2 + sipLift * 0.5, 4, 8);
      this.ctx.fillRect(px + 7, py - 2 + sipLift * 0.5, 4, 8);

      // Hands holding mug
      this.ctx.fillStyle = '#fed7aa';
      this.ctx.beginPath();
      this.ctx.arc(px - 4, py + 6 + sipLift, 2.5, 0, Math.PI * 2);
      this.ctx.arc(px + 4, py + 6 + sipLift, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Ceramic Coffee Mug in hands
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#cbd5e1';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(px - 4, py + 2 + sipLift, 8, 8, 2);
      this.ctx.fill();
      this.ctx.stroke();
      // Mug handle
      this.ctx.beginPath();
      this.ctx.arc(px + 5, py + 6 + sipLift, 2, -Math.PI * 0.5, Math.PI * 0.5);
      this.ctx.stroke();

      // Rising steam
      if (!isSipping && this.tickCount % 24 < 12) {
        this.ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(px, py - 3 + sipLift, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (isAtServerLab) {
      // Hands typing on diagnostic cart keyboard!
      const typeBob = (ag.state === "working") ? (Math.sin(this.tickCount * 0.8) * 1.5) : 0;
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 11, py - 4 + typeBob, 4, 11);
      this.ctx.fillRect(px + 7, py - 4 - typeBob, 4, 11);
      // Hands on cart keys
      this.ctx.fillStyle = '#fed7aa';
      this.ctx.beginPath();
      this.ctx.arc(px - 9, py + 8 + typeBob, 2.5, 0, Math.PI * 2);
      this.ctx.arc(px + 9, py + 8 - typeBob, 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      if (ag.state === "working" && (this.tickCount % 12 === 0) && window.chiptuneAudio) {
        window.chiptuneAudio.playKeyClick();
      }
    } else if (isAtPostOffice) {
      // Holding wooden Git commit parcel crate onto counter
      this.ctx.fillStyle = '#d97706';
      this.ctx.beginPath();
      this.ctx.roundRect(px - 3, py - 3, 16, 12, 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#b45309';
      this.ctx.fillRect(px + 4, py - 3, 3, 12);
      // Arms wrapped around package
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 8, py - 4, 4, 10);
      this.ctx.fillRect(px + 12, py - 4, 4, 10);
      this.ctx.fillStyle = '#fed7aa';
      this.ctx.beginPath();
      this.ctx.arc(px - 5, py + 4, 2.5, 0, Math.PI * 2);
      this.ctx.arc(px + 13, py + 4, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (isCoffee) {
      // Standing holding ceramic coffee mug in right hand
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 12, py - 5, 4, 12); // Left arm relaxed
      this.ctx.fillRect(px + 8, py - 5, 4, 8);   // Right arm bent up
      // Ceramic Coffee Mug
      this.ctx.fillStyle = '#ffffff';
      this.ctx.strokeStyle = '#cbd5e1';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(px + 8, py - 1, 6, 7, 1.5);
      this.ctx.fill();
      this.ctx.stroke();
      // Handle
      this.ctx.beginPath();
      this.ctx.arc(px + 15, py + 2, 2, -Math.PI * 0.5, Math.PI * 0.5);
      this.ctx.stroke();
      // Rising steam
      if (this.tickCount % 24 < 12) {
        this.ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(px + 11, py - 5, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (isWalking) {
      // Natural walking arm swing cadence
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 12, py - 6 - walkCadence * 3, 4, 12);
      this.ctx.fillRect(px + 8, py - 6 + walkCadence * 3, 4, 12);
      this.ctx.fillStyle = '#fed7aa';
      this.ctx.beginPath();
      this.ctx.arc(px - 10, py + 6 - walkCadence * 3, 2.5, 0, Math.PI * 2);
      this.ctx.arc(px + 10, py + 6 + walkCadence * 3, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Normal stationary standing arms
      this.ctx.fillStyle = ag.color;
      this.ctx.fillRect(px - 12, py - 6, 4, 13);
      this.ctx.fillRect(px + 8, py - 6, 4, 13);
    }

    // Face (Warm skin tone)
    this.ctx.fillStyle = '#fed7aa';
    this.ctx.beginPath();
    this.ctx.roundRect(px - 8, py - 26, 16, 16, 4);
    this.ctx.fill();

    // Eyes (with gentle sipping squint when drinking)
    this.ctx.fillStyle = '#0f172a';
    const lookX = isAtServerLab ? -1.5 : (isAtPostOffice ? 1.5 : ((ag.targetX > ag.x) ? 1.5 : ((ag.targetX < ag.x) ? -1.5 : 0)));
    if (isSipping) {
      // Happy squint while taking a warm sip
      this.ctx.fillRect(px - 4, py - 17, 2.5, 1.5);
      this.ctx.fillRect(px + 2, py - 17, 2.5, 1.5);
    } else {
      this.ctx.fillRect(px - 4 + lookX, py - 18, 2.5, 3);
      this.ctx.fillRect(px + 2 + lookX, py - 18, 2.5, 3);
    }

    // Hair
    this.ctx.fillStyle = ag.hair;
    this.ctx.beginPath();
    this.ctx.roundRect(px - 9, py - 30, 18, 7, [4, 4, 0, 0]);
    this.ctx.fill();

    this.renderBubble(ag, px, py - 14, palette);
  }

  // Smart Speech Bubble: Clean speech bubbles without floating emoji clutter!
  renderBubble(ag, px, py, palette) {
    if (!ag.speech) return;

    if (ag.state === "coffee") {
      const isSelected = (ag.id === this.selectedAgentId);
      const isLead = (ag.id === 0);
      if (!isSelected && !isLead) {
        return; // Non-selected agents quietly sip their real coffee mugs
      }
    }

    this.ctx.font = '600 11px sans-serif';
    const txt = ag.speech.length > 32 ? ag.speech.slice(0, 30) + '...' : ag.speech;
    const tw = this.ctx.measureText(txt).width;
    const bw = Math.max(tw + 18, 90);
    const bx = Math.max(16, Math.min(px - bw / 2, this.width - bw - 16));
    const by = py - 46;

    this.ctx.fillStyle = palette.bubbleBg;
    this.ctx.strokeStyle = palette.bubbleBorder;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(bx, by, bw, 22, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = palette.bubbleText;
    this.ctx.fillText(txt, bx + 9, by + 15);

    this.ctx.fillStyle = palette.bubbleBg;
    this.ctx.beginPath();
    this.ctx.moveTo(px, by + 22);
    this.ctx.lineTo(px - 4, by + 27);
    this.ctx.lineTo(px + 4, by + 22);
    this.ctx.fill();

    // Drift Warning Alert Badge (Market-leading feature from AgentGUI - ETH Zurich)
    if (ag.isDrifting) {
      const dw = 114;
      const dh = 18;
      const dx = Math.max(16, Math.min(px - dw / 2, this.width - dw - 16));
      const dy = by - 24;
      const pulse = Math.sin(this.tickCount * 0.25) > 0;
      this.ctx.fillStyle = pulse ? '#ef4444' : '#b91c1c';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.roundRect(dx, dy, dw, dh, 4);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.font = 'bold 8.5px sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText("DRIFT DETECTED", dx + 8, dy + 12);
    }
  }

  // --- Dynamic Particle Atmosphere Engine ---

  spawnParticle(x, y, type = 'code', text = '', color = '#38bdf8') {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    const angle = (type === 'confetti')
      ? (Math.random() * Math.PI)
      : ((Math.random() * Math.PI * 0.6) - (Math.PI * 0.8));
    const speed = (type === 'confetti') ? (0.6 + Math.random() * 1.4) : (0.4 + Math.random() * 0.8);
    this.particles.push({
      x,
      y,
      vx: (type === 'confetti') ? (Math.random() * 2.4 - 1.2) : Math.cos(angle) * speed,
      vy: (type === 'confetti') ? (0.6 + Math.random() * 1.2) : (Math.sin(angle) * speed - 0.35),
      alpha: 1.0,
      decay: (type === 'confetti') ? (0.005 + Math.random() * 0.005) : (0.016 + Math.random() * 0.014),
      type,
      text,
      color,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      size: (type === 'steam') ? 2.5 : ((type === 'spark') ? 3 : ((type === 'confetti') ? (3.5 + Math.random() * 2.5) : 8.5))
    });
  }

  triggerCelebration() {
    if (window.chiptuneAudio) {
      window.chiptuneAudio.playChime();
    }
    const colors = ['#38bdf8', '#facc15', '#4ade80', '#ec4899', '#a855f7', '#fb923c'];
    for (let i = 0; i < 50; i++) {
      this.spawnParticle(
        50 + Math.random() * (this.width - 100),
        10 + Math.random() * 70,
        'confetti',
        '',
        colors[i % colors.length]
      );
    }
  }

  updateAndRenderParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'code') {
        this.ctx.font = 'bold 8.5px monospace';
        this.ctx.fillStyle = p.color || '#38bdf8';
        this.ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === 'spark') {
        this.ctx.fillStyle = p.color || '#facc15';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size || 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'steam') {
        p.size += 0.08;
        this.ctx.fillStyle = p.color || 'rgba(210, 210, 210, 0.45)';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'check') {
        this.ctx.strokeStyle = '#22c55e';
        this.ctx.lineWidth = 1.6;
        this.ctx.beginPath();
        this.ctx.moveTo(p.x - 3, p.y);
        this.ctx.lineTo(p.x - 0.5, p.y + 3);
        this.ctx.lineTo(p.x + 4.5, p.y - 3);
        this.ctx.stroke();
      } else if (p.type === 'shield') {
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 1.3;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (p.type === 'badge') {
        this.ctx.strokeStyle = p.color || '#6366f1';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (p.type === 'stamp') {
        this.ctx.font = 'bold 8px monospace';
        this.ctx.fillStyle = p.color || '#06b6d4';
        this.ctx.fillText(p.text || 'PUSHED', p.x, p.y);
      } else if (p.type === 'confetti') {
        p.vy += 0.02; // subtle gravity flutter
        p.rotation += p.rotSpeed;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      }
      this.ctx.restore();
    }
  }

  animate() {
    this.tickCount++;
    const palette = this.atmospheres[this.lightingMode] || this.atmospheres.day;

    // 1. Draw Hardwood Floor
    this.drawHardwoodFloor(palette);

    // 2. Draw Panoramic Windows with Organic Horizon & Night Stars
    this.drawPanoramicWindows(palette);

    // 3. Draw Greenery Plants
    this.zones.plants.forEach(p => this.drawPlant(p.x, p.y));

    // 4. Draw Stations (Clean, uncluttered, no giant easel legs or empty collab hub!)
    this.drawStrategyBoard(this.zones.glassBoard.x, this.zones.glassBoard.y, palette);
    this.drawOakBookshelf(this.zones.library.x, this.zones.library.y, palette);
    this.drawSecurityVault(this.zones.securityVault.x, this.zones.securityVault.y, palette);
    this.drawServerBay(this.zones.serverLab.x, this.zones.serverLab.y, palette);
    this.drawMarbleEspressoBar(this.zones.espressoBar.x, this.zones.espressoBar.y, palette);
    this.drawGitPostOffice(this.zones.postOffice.x, this.zones.postOffice.y, palette);

    // 5. Physics & Movement Update
    this.agents.forEach(ag => {
      const dx = ag.targetX - ag.x;
      const dy = ag.targetY - ag.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 2) {
        if (ag.state !== "shipping") ag.state = "walking";
        const speed = 2.4;
        ag.x += (dx / dist) * speed;
        ag.y += (dy / dist) * speed;
      } else {
        ag.x = ag.targetX;
        ag.y = ag.targetY;
        if (ag.state === "walking" || ag.state === "shipping") {
          const atLounge = Math.hypot(ag.x - this.zones.espressoBar.x, ag.y - this.zones.espressoBar.y) < 95;
          const atPostOffice = Math.hypot(ag.x - 980, ag.y - 342) < 30;
          const atServerLab = Math.hypot(ag.x - 980, ag.y - 165) < 30;
          if (atLounge) {
            ag.state = "coffee";
            ag.currentTask = "Resting";
          } else if (atPostOffice) {
            ag.state = "shipping";
            ag.speech = "Commit pushed to remote origin/main.";
          } else if (atServerLab) {
            ag.state = "working";
            ag.speech = "Running container test suite...";
          } else if (Math.abs(ag.x - ag.homeX) < 8 && Math.abs(ag.y - ag.homeY) < 8) {
            ag.state = (ag.currentTask === "Resting" ? "coffee" : "working");
          } else {
            ag.state = (ag.currentTask === "Resting" ? "coffee" : "working");
          }
          this.updateRosterUI();
        }
      }
    });

    // 6. Draw 4 Spacious Executive Workstations with Authentic Ergonomic Layering
    // Layer A: Ergonomic Chairs behind all desks
    this.zones.desks.forEach(desk => {
      this.drawErgonomicChair(desk.x, desk.y, palette);
    });

    // Layer B: Desk Surfaces, Leather Mats, Keyboards & Angled Side Monitors
    this.zones.desks.forEach((desk, idx) => {
      const seatedAgent = this.agents.find(a => 
        (a.deskIndex === idx && Math.abs(a.x - desk.x) < 15 && Math.abs(a.y - (desk.y - 14)) < 15)
      );
      this.drawDeskSurface(desk.x, desk.y, !!seatedAgent, seatedAgent, palette);
    });

    // Layer C: Seated Developers (Unobstructed face, studio headphones, hands on keyboard)
    this.zones.desks.forEach((desk, idx) => {
      const seatedAgent = this.agents.find(a => 
        (a.deskIndex === idx && Math.abs(a.x - desk.x) < 15 && Math.abs(a.y - (desk.y - 14)) < 15)
      );
      if (seatedAgent) {
        this.drawSeatedAvatar(seatedAgent, desk.x, desk.y, palette);
      }
    });

    // Layer D: Walking / Roaming Agents
    this.agents.forEach(ag => {
      const isSeated = this.zones.desks.some(d => 
        Math.abs(ag.x - d.x) < 15 && Math.abs(ag.y - (d.y - 14)) < 15
      );
      if (!isSeated) {
        this.drawWalkingAvatar(ag, palette);
      }
    });

    // 7. Render dynamic particle atmosphere (code tokens, ideation sparks, steam, seals, confetti)
    this.updateAndRenderParticles();

    // 8. Milestone Celebration Trigger (Checks if all mission steps transitioned to completed)
    const allDone = (this.missionSteps.length > 0 && this.missionSteps.every(s => s.status === "done"));
    if (allDone && !this.wasAllStepsDone) {
      this.wasAllStepsDone = true;
      this.triggerCelebration();
      this.setAllIdle();
    } else if (!allDone) {
      this.wasAllStepsDone = false;
    }

    requestAnimationFrame(this.animate);
  }
}
