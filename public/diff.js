/**
 * Antigravity Studio - Lightweight Zero-Dependency Unified Diff & Command Output Formatter
 * Zero emojis, WCAG AAA compliant styling, and secure HTML escaping.
 */

(function (window) {
  'use strict';

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Generates a unified diff HTML view from target (before) and replacement (after) strings.
   * @param {string} target - Original code string being replaced
   * @param {string} replacement - New replacement code string
   * @param {string} filePath - Path of modified file
   * @returns {string} Safe HTML string of formatted diff
   */
  function renderUnifiedDiff(target, replacement, filePath) {
    const beforeLines = (target || '').split('\n');
    const afterLines = (replacement || '').split('\n');

    let html = `
      <div class="diff-container rounded-lg border border-[var(--border-card)] bg-[var(--code-bg)] font-mono text-[11.5px] overflow-hidden">
        <div class="diff-header px-4 py-2 border-b border-[var(--border-card)] bg-[var(--surface-muted)] flex items-center justify-between text-xs font-semibold">
          <div class="flex items-center gap-2 truncate">
            <span class="diff-icon text-slate-500">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <span class="truncate" style="color: var(--text-primary);">${escapeHtml(filePath || 'Modified File')}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0 text-[11px] text-[var(--text-muted)]">
            <span class="text-rose-500 font-bold">-${beforeLines.length}</span>
            <span class="text-emerald-500 font-bold">+${afterLines.length}</span>
          </div>
        </div>
        <div class="diff-body overflow-x-auto max-h-[60vh] p-2 leading-relaxed">
          <table class="w-full border-collapse">
            <tbody>
    `;

    // Render removed lines
    beforeLines.forEach((line, idx) => {
      html += `
        <tr class="diff-line-del bg-rose-500/10 text-rose-700 dark:text-rose-300">
          <td class="diff-gutter select-none text-right pr-3 pl-2 py-0.5 text-[10px] opacity-50 border-r border-[var(--border-card)] w-10 shrink-0">${idx + 1}</td>
          <td class="select-none px-2 py-0.5 text-center text-rose-500 w-4 font-bold">-</td>
          <td class="pl-2 py-0.5 whitespace-pre font-mono">${escapeHtml(line)}</td>
        </tr>
      `;
    });

    // Render added lines
    afterLines.forEach((line, idx) => {
      html += `
        <tr class="diff-line-add bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <td class="diff-gutter select-none text-right pr-3 pl-2 py-0.5 text-[10px] opacity-50 border-r border-[var(--border-card)] w-10 shrink-0">${idx + 1}</td>
          <td class="select-none px-2 py-0.5 text-center text-emerald-500 w-4 font-bold">+</td>
          <td class="pl-2 py-0.5 whitespace-pre font-mono">${escapeHtml(line)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Formats terminal command execution and stdout/stderr output into an inspector block.
   */
  function renderCommandOutput(command, output, exitCode = 0) {
    const isSuccess = exitCode === 0;
    return `
      <div class="command-inspector-block rounded-lg border border-[var(--border-card)] bg-[var(--code-bg)] font-mono text-[11px] overflow-hidden">
        <div class="px-4 py-2 border-b border-[var(--border-card)] bg-[var(--surface-muted)] flex items-center justify-between text-xs font-semibold">
          <div class="flex items-center gap-2 truncate">
            <span class="w-2 h-2 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'} shrink-0"></span>
            <span class="font-bold truncate" style="color: var(--text-primary);">$ ${escapeHtml(command)}</span>
          </div>
          <span class="status-pill ${isSuccess ? 'status-idle' : 'status-paused'} shrink-0 text-[10px]">
            Exit ${exitCode}
          </span>
        </div>
        <div class="p-3.5 overflow-x-auto max-h-[60vh] text-[var(--code-text)] whitespace-pre-wrap leading-relaxed select-text font-mono text-[11px]">
${escapeHtml(output || '(Command completed with no stdout/stderr output)')}
        </div>
      </div>
    `;
  }

  window.DiffInspector = {
    renderUnifiedDiff,
    renderCommandOutput,
    escapeHtml
  };
})(window);
