/**
 * Taiwan GSAT Database - Application Controller
 */

class App {
  constructor() {
    this.departments = [];
    this.schools = [];
    this.filterEngine = null;
    this.scoreMatcher = null;
    this.wishlistManager = new WishlistManager();
    this.viewMode = 'cards'; // 'cards' | 'table'
    this.activeTab = 'browse'; // 'browse' | 'matcher' | 'wishlist' | 'analytics'
    this.matcherActiveBucket = 'target'; // 'dream' | 'target' | 'safe'
    this.currentModalDept = null;
  }

  async init() {
    this.initTheme();
    this.setupEventListeners();
    await this.loadData();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('gsat_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('gsat_theme', next);
    this.updateThemeIcon(next);
  }

  updateThemeIcon(theme) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
      icon.innerHTML = theme === 'dark' 
        ? '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
        : '<path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
  }

  async loadData() {
    const container = document.getElementById('main-container');
    try {
      // Load departments and schools minified JSON
      const [deptResp, schoolResp] = await Promise.all([
        fetch('data/departments.min.json'),
        fetch('data/schools.json')
      ]);

      if (!deptResp.ok || !schoolResp.ok) {
        throw new Error('Failed to load database JSON files');
      }

      this.departments = await deptResp.json();
      this.schools = await schoolResp.json();

      this.filterEngine = new FilterEngine(this.departments);
      this.scoreMatcher = new ScoreMatcher(this.departments);

      // Initialize UI controls and render
      this.initFilterSidebar();
      this.updateWishlistCount();
      this.render();

      this.wishlistManager.onChange(() => {
        this.updateWishlistCount();
        if (this.activeTab === 'wishlist') {
          this.renderWishlistTab();
        }
        // Update wishlist button states on current page
        this.updateWishlistButtons();
      });

    } catch (err) {
      console.error('Error initializing app:', err);
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: var(--danger);">
            <h2>資料載入失敗</h2>
            <p style="margin-top: 8px;">請確認本地資料庫 JSON 檔案存在且網絡伺服器運作正常。</p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 12px;">${err.message}</p>
          </div>
        `;
      }
    }
  }

  initFilterSidebar() {
    // 1. Groups Filter
    const groupContainer = document.getElementById('group-filter-pills');
    if (groupContainer) {
      const allGroups = [
        "資訊學群", "工程學群", "數理化學群", "醫藥衛生學群", "生命科學學群", "生物資源學群",
        "地球環境學群", "建築設計學群", "藝術學群", "社會心理學群", "大眾傳播學群", "外語學群",
        "文史哲學群", "教育學群", "法政學群", "管理學群", "財經學群", "遊憩運動學群"
      ];
      groupContainer.innerHTML = allGroups.map(g => `
        <button class="pill-btn" data-group="${g}" onclick="window.app.onToggleGroup('${g}', this)">
          ${g}
        </button>
      `).join('');
    }

    // 2. Score range slider
    const scoreRange = document.getElementById('score-range');
    const scoreVal = document.getElementById('score-val-label');
    if (scoreRange && scoreVal) {
      scoreRange.addEventListener('input', (e) => {
        const val = e.target.value;
        scoreVal.innerText = `${val} 級分以上`;
        this.filterEngine.setScoreRange(val, 60);
        this.render();
      });
    }

    // 3. Search Input with debounce
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.filterEngine.setKeyword(e.target.value);
          this.render();
        }, 180);
      });
    }
  }

  setupEventListeners() {
    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('mobile-filter-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.toggleMobileSidebar();
      });
    }

    // Floating filter button (FAB) on mobile
    const fabBtn = document.getElementById('mobile-filter-fab');
    if (fabBtn) {
      fabBtn.addEventListener('click', () => {
        this.openMobileSidebar();
      });
    }

    // Close on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMobileSidebar();
        this.closeModal();
      }
    });
  }

  openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      this.closeMobileSidebar();
    } else {
      this.openMobileSidebar();
    }
  }

  updateFilterBadges() {
    if (!this.filterEngine) return;
    const f = this.filterEngine.filters;
    let activeCount = 0;
    if (f.keyword) activeCount++;
    activeCount += f.schoolTypes.size;
    activeCount += f.regions.size;
    activeCount += f.groups.size;
    activeCount += f.presets.size;
    activeCount += f.subjects.size;
    activeCount += f.excludedSubjects.size;
    if (f.maxStd !== 'all') activeCount++;
    if (f.minScore > 0) activeCount++;

    const headerBadge = document.getElementById('mobile-filter-badge');
    const fabBadge = document.getElementById('mobile-fab-badge');

    if (headerBadge) {
      headerBadge.innerText = activeCount;
      headerBadge.style.display = activeCount > 0 ? 'flex' : 'none';
    }
    if (fabBadge) {
      fabBadge.innerText = activeCount;
      fabBadge.style.display = activeCount > 0 ? 'flex' : 'none';
    }
  }

  setTab(tab) {
    this.activeTab = tab;
    this.closeMobileSidebar();

    // Desktop nav tabs
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Mobile bottom nav items
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Mobile FAB button: only visible in browse tab
    const fab = document.getElementById('mobile-filter-fab');
    if (fab) {
      fab.style.display = (tab === 'browse') ? 'flex' : 'none';
    }

    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth > 1024) {
      sidebar.style.display = (tab === 'browse') ? 'flex' : 'none';
    }

    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    document.querySelectorAll('.view-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === mode);
    });
    this.render();
  }

  onToggleGroup(group, btn) {
    this.filterEngine.toggleGroup(group);
    btn.classList.toggle('active');
    this.render();
  }

  onToggleType(type, btn) {
    this.filterEngine.toggleSchoolType(type);
    btn.classList.toggle('active');
    this.render();
  }

  onToggleRegion(region, btn) {
    this.filterEngine.toggleRegion(region);
    btn.classList.toggle('active');
    this.render();
  }

  onTogglePreset(preset, btn) {
    this.filterEngine.togglePreset(preset);
    btn.classList.toggle('active');
    this.render();
  }

  onToggleSubject(sub, btn) {
    this.filterEngine.toggleSubject(sub);
    btn.classList.toggle('checked');
    const cb = btn.querySelector('input');
    if (cb) cb.checked = !cb.checked;
    this.render();
  }

  onSortChange(val) {
    this.filterEngine.setSortBy(val);
    this.render();
  }

  resetAllFilters() {
    this.filterEngine.resetFilters();
    document.getElementById('search-input').value = '';
    document.querySelectorAll('.pill-btn, .preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.subject-checkbox-card').forEach(b => {
      b.classList.remove('checked');
      const cb = b.querySelector('input');
      if (cb) cb.checked = false;
    });
    const slider = document.getElementById('score-range');
    if (slider) slider.value = 0;
    const scoreVal = document.getElementById('score-val-label');
    if (scoreVal) scoreVal.innerText = `0 級分以上`;
    this.render();
  }

  render() {
    this.updateFilterBadges();
    const container = document.getElementById('main-container');
    if (!container) return;

    if (this.activeTab === 'browse') {
      this.renderBrowseTab(container);
    } else if (this.activeTab === 'matcher') {
      this.renderMatcherTab(container);
    } else if (this.activeTab === 'wishlist') {
      this.renderWishlistTab(container);
    } else if (this.activeTab === 'analytics') {
      this.renderAnalyticsTab(container);
    }
  }

  renderBrowseTab(container) {
    const items = this.filterEngine.applyFilters();
    const pageItems = this.filterEngine.getCurrentPageItems();
    const totalCount = items.length;

    let contentHtml = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="result-count">共找到 <span>${totalCount.toLocaleString()}</span> 個符合條件校系</div>
        </div>
        <div class="toolbar-right">
          <button class="btn-link" style="display: flex; align-items: center; gap: 4px;" onclick="window.ExportUtility.exportToCSV(window.app.filterEngine.filteredData)">
            📥 匯出搜尋結果 CSV
          </button>
          <select class="select-dropdown" onchange="window.app.onSortChange(this.value)">
            <option value="score_desc" ${this.filterEngine.filters.sortBy === 'score_desc' ? 'selected' : ''}>落點熱門度 (由高到低)</option>
            <option value="score_asc" ${this.filterEngine.filters.sortBy === 'score_asc' ? 'selected' : ''}>落點熱門度 (由低到高)</option>
            <option value="quota_desc" ${this.filterEngine.filters.sortBy === 'quota_desc' ? 'selected' : ''}>招收名額 (由多到少)</option>
            <option value="code_asc" ${this.filterEngine.filters.sortBy === 'code_asc' ? 'selected' : ''}>校系代碼 (順序)</option>
            <option value="name_asc" ${this.filterEngine.filters.sortBy === 'name_asc' ? 'selected' : ''}>學系名稱 (筆畫)</option>
          </select>
          <div class="view-toggle">
            <button class="view-btn ${this.viewMode === 'cards' ? 'active' : ''}" data-view="cards" onclick="window.app.setViewMode('cards')">
              🗂 卡片
            </button>
            <button class="view-btn ${this.viewMode === 'table' ? 'active' : ''}" data-view="table" onclick="window.app.setViewMode('table')">
              📑 表格
            </button>
          </div>
        </div>
      </div>
    `;

    if (pageItems.length === 0) {
      contentHtml += `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
          <h3 style="color: var(--text-primary); margin-bottom: 8px;">沒有找到符合條件的校系</h3>
          <p>請嘗試減少篩選條件，或使用不同的關鍵字重新搜尋。</p>
          <button class="btn-primary-large" style="margin-top: 16px; padding: 8px 18px; font-size: 0.9rem;" onclick="window.app.resetAllFilters()">重設所有條件</button>
        </div>
      `;
    } else if (this.viewMode === 'cards') {
      contentHtml += `<div class="cards-grid">`;
      for (const d of pageItems) {
        contentHtml += this.renderDeptCard(d);
      }
      contentHtml += `</div>`;
    } else {
      contentHtml += this.renderDeptTable(pageItems);
    }

    // Pagination
    contentHtml += this.renderPagination();

    container.innerHTML = contentHtml;
  }

  renderDeptCard(d) {
    const isWishlisted = this.wishlistManager.has(d.dep_id);
    const subjs = (d.subjects || []).join('、');
    const stds = d.standards || {};

    let stdPillsHtml = '';
    for (const [s, info] of Object.entries(stds)) {
      if (s === '英聽') {
        if (info && info !== '--') {
          stdPillsHtml += `<span class="std-pill">英聽:<strong>${info}級</strong></span>`;
        }
      } else if (info && (info.std !== '--' || info.multi !== '--')) {
        const stdPart = info.std !== '--' ? `<strong>${info.std}標</strong>` : '';
        const multiPart = info.multi !== '--' ? `(${info.multi}倍)` : '';
        stdPillsHtml += `<span class="std-pill">${s}:${stdPart}${multiPart}</span>`;
      }
    }

    return `
      <div class="dept-card">
        <div>
          <div class="dept-card-top">
            <div class="school-badge-group">
              <span class="badge ${d.school_type.includes('國立') ? 'badge-public' : 'badge-private'}">${d.school_type}</span>
              <span class="badge badge-region">${d.region}</span>
              <span class="badge badge-group">${d.group_18}</span>
            </div>
            <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" title="加入/移出個人申請6志願清單" onclick="window.app.toggleWishlist('${d.dep_id}')">
              ${isWishlisted ? '★' : '☆'}
            </button>
          </div>

          <div class="dept-header">
            <div class="dept-school-name">${d.school_name} <span class="dept-code">#${d.dep_id}</span></div>
            <div class="dept-title">${d.dep_name}</div>
          </div>

          <div class="dept-info-grid">
            <div class="info-item">
              <span class="info-label">招收名額</span>
              <span class="info-value" style="color: var(--primary);">${d.quota} 人</span>
            </div>
            <div class="info-item">
              <span class="info-label">採計考科</span>
              <span class="info-value" style="font-size: 0.78rem;" title="${subjs}">${subjs || '--'}</span>
            </div>
          </div>

          <div class="dept-standards-preview">
            <span class="info-label">各科檢定與倍率</span>
            <div class="std-pills">${stdPillsHtml || '<span style="color: var(--text-muted); font-size: 0.75rem;">無特定檢定門檻</span>'}</div>
          </div>

          <div class="cutoff-preview">
            <span style="font-weight: 700;">113 門檻:</span>
            <span>${d.cutoff_summary || '倍率依序錄取'}</span>
          </div>
        </div>

        <div class="dept-card-footer">
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            預估門檻: <strong style="color: var(--text-primary); font-size: 0.95rem;">${d.estimated_score} 級分</strong>
          </div>
          <button class="btn-detail" onclick="window.app.openDetailModal('${d.dep_id}')">
            歷年完整數據 →
          </button>
        </div>
      </div>
    `;
  }

  renderDeptTable(items) {
    let html = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 50px;">志願</th>
              <th>校系代碼 / 學校</th>
              <th>學系名稱</th>
              <th>學群領域</th>
              <th>公私立</th>
              <th>地區</th>
              <th>名額</th>
              <th>採計考科</th>
              <th>113 篩選門檻</th>
              <th>預估級分</th>
              <th style="text-align: center;">詳情</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const d of items) {
      const isWishlisted = this.wishlistManager.has(d.dep_id);
      html += `
        <tr>
          <td style="text-align: center;">
            <button class="btn-wishlist ${isWishlisted ? 'active' : ''}" style="width: 28px; height: 28px; font-size: 14px;" onclick="window.app.toggleWishlist('${d.dep_id}')">
              ${isWishlisted ? '★' : '☆'}
            </button>
          </td>
          <td>
            <div style="font-family: monospace; font-size: 0.78rem; color: var(--text-muted);">${d.dep_id}</div>
            <div style="font-weight: 600;">${d.school_name}</div>
          </td>
          <td><strong style="color: var(--text-primary); font-size: 0.95rem;">${d.dep_name}</strong></td>
          <td><span class="badge badge-group">${d.group_18}</span></td>
          <td><span class="badge ${d.school_type.includes('國立') ? 'badge-public' : 'badge-private'}">${d.school_type}</span></td>
          <td><span class="badge badge-region">${d.region}</span></td>
          <td><strong style="color: var(--primary);">${d.quota}</strong></td>
          <td style="font-size: 0.82rem;">${(d.subjects || []).join('、')}</td>
          <td style="font-size: 0.85rem; font-weight: 600; color: #b45309;">${d.cutoff_summary || '依序通過'}</td>
          <td><strong>${d.estimated_score}</strong></td>
          <td style="text-align: center;">
            <button class="btn-link" onclick="window.app.openDetailModal('${d.dep_id}')">查看</button>
          </td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
    return html;
  }

  renderPagination() {
    const totalPages = this.filterEngine.getTotalPages();
    const cur = this.filterEngine.currentPage;
    if (totalPages <= 1) return '';

    let btnsHtml = '';
    const maxVisible = 5;
    let startPage = Math.max(1, cur - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    btnsHtml += `<button class="page-btn" ${cur === 1 ? 'disabled' : ''} onclick="window.app.goToPage(1)">«</button>`;
    btnsHtml += `<button class="page-btn" ${cur === 1 ? 'disabled' : ''} onclick="window.app.goToPage(${cur - 1})">‹</button>`;

    for (let p = startPage; p <= endPage; p++) {
      btnsHtml += `<button class="page-btn ${p === cur ? 'active' : ''}" onclick="window.app.goToPage(${p})">${p}</button>`;
    }

    btnsHtml += `<button class="page-btn" ${cur === totalPages ? 'disabled' : ''} onclick="window.app.goToPage(${cur + 1})">›</button>`;
    btnsHtml += `<button class="page-btn" ${cur === totalPages ? 'disabled' : ''} onclick="window.app.goToPage(${totalPages})">»</button>`;

    return `
      <div class="pagination">
        ${btnsHtml}
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-left: 12px;">第 ${cur} / ${totalPages} 頁</span>
      </div>
    `;
  }

  goToPage(p) {
    this.filterEngine.setPage(p);
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderMatcherTab(container) {
    container.innerHTML = `
      <div class="matcher-container">
        <div class="matcher-card">
          <div class="matcher-card-title">
            <span>🎯</span> 學測成績落點分析與智能適配器
          </div>
          <div class="matcher-card-desc">
            輸入您的 6 科學測級分（0-15級分）與高中英語聽力測驗等級，系統將即時檢核全台 2,072 個校系的檢定標準，並依據歷年門檻自動劃分「夢幻衝刺」、「最佳落點」與「安全保底」志願！
          </div>

          <div class="score-inputs-grid">
            <div class="score-input-item">
              <label class="score-input-label">國文 (滿分15)</label>
              <input type="number" min="0" max="15" id="user-chi" class="score-input-box" value="13">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">英文 (滿分15)</label>
              <input type="number" min="0" max="15" id="user-eng" class="score-input-box" value="13">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">數學A (滿分15)</label>
              <input type="number" min="0" max="15" id="user-matha" class="score-input-box" value="12">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">數學B (滿分15)</label>
              <input type="number" min="0" max="15" id="user-mathb" class="score-input-box" value="13">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">社會 (滿分15)</label>
              <input type="number" min="0" max="15" id="user-soc" class="score-input-box" value="14">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">自然 (滿分15)</label>
              <input type="number" min="0" max="15" id="user-sci" class="score-input-box" value="11">
            </div>
            <div class="score-input-item">
              <label class="score-input-label">英聽測驗</label>
              <select id="user-listen" class="score-input-box" style="font-size: 1rem;">
                <option value="A" selected>A 級</option>
                <option value="B">B 級</option>
                <option value="C">C 級</option>
                <option value="F">F 級</option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end;">
            <button class="btn-primary-large" onclick="window.app.runMatcherAnalysis()">
              ⚡ 開始落點智能分析
            </button>
          </div>
        </div>

        <div id="matcher-results-section"></div>
      </div>
    `;

    // Auto-run with defaults
    this.runMatcherAnalysis();
  }

  runMatcherAnalysis() {
    const scores = {
      chi: Number(document.getElementById('user-chi')?.value) || 0,
      eng: Number(document.getElementById('user-eng')?.value) || 0,
      matha: Number(document.getElementById('user-matha')?.value) || 0,
      mathb: Number(document.getElementById('user-mathb')?.value) || 0,
      soc: Number(document.getElementById('user-soc')?.value) || 0,
      sci: Number(document.getElementById('user-sci')?.value) || 0,
      listen: document.getElementById('user-listen')?.value || 'B'
    };

    const results = this.scoreMatcher.evaluate(scores);
    this.currentMatcherResults = results;

    const resSection = document.getElementById('matcher-results-section');
    if (!resSection) return;

    resSection.innerHTML = `
      <div class="matcher-results-tabs">
        <div class="result-tab-card tab-dream ${this.matcherActiveBucket === 'dream' ? 'active' : ''}" onclick="window.app.switchMatcherBucket('dream')">
          <div>
            <div style="font-weight: 700; font-size: 1.1rem;">🔥 夢幻志願 (Dream)</div>
            <div style="font-size: 0.8rem; margin-top: 2px;">適合衝刺挑戰 (1~2志願)</div>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800;">${results.dream.length}</div>
        </div>

        <div class="result-tab-card tab-target ${this.matcherActiveBucket === 'target' ? 'active' : ''}" onclick="window.app.switchMatcherBucket('target')">
          <div>
            <div style="font-weight: 700; font-size: 1.1rem;">🎯 落點志願 (Target)</div>
            <div style="font-size: 0.8rem; margin-top: 2px;">實力完美適配 (2~3志願)</div>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800;">${results.target.length}</div>
        </div>

        <div class="result-tab-card tab-safe ${this.matcherActiveBucket === 'safe' ? 'active' : ''}" onclick="window.app.switchMatcherBucket('safe')">
          <div>
            <div style="font-weight: 700; font-size: 1.1rem;">🛡️ 保底志願 (Safe)</div>
            <div style="font-size: 0.8rem; margin-top: 2px;">穩操勝券安心選 (1~2志願)</div>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800;">${results.safe.length}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="font-size: 0.9rem; color: var(--text-muted);">
          已排除未達門檻之校系共 <strong>${results.failed.length}</strong> 個。
        </div>
        <button class="btn-link" onclick="window.ExportUtility.exportToCSV(window.app.currentMatcherResults['${this.matcherActiveBucket}'], '學測落點推薦清單.csv')">
          📥 匯出當前落點清單 CSV
        </button>
      </div>

      <div class="cards-grid">
        ${(results[this.matcherActiveBucket] || []).slice(0, 36).map(d => this.renderDeptCard(d)).join('')}
      </div>
    `;
  }

  switchMatcherBucket(bucket) {
    this.matcherActiveBucket = bucket;
    this.runMatcherAnalysis();
  }

  renderWishlistTab(container) {
    const target = container || document.getElementById('main-container');
    if (!target) return;

    const count = this.wishlistManager.getCount();
    target.innerHTML = `
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h1 style="font-size: 1.6rem; font-weight: 800;">📋 個人申請 6 大志願比對與清單</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
              已選擇 <strong>${count} / 6</strong> 個志願。提供全方位橫向條件對比、歷年分數與篩選門檻一覽。
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-link" style="color: var(--danger);" onclick="if(confirm('確定要清空所有志願嗎？')) window.app.wishlistManager.clear();">
              🗑 清空志願表
            </button>
            <button class="btn-primary-large" style="padding: 8px 18px; font-size: 0.9rem;" onclick="window.ExportUtility.exportToCSV(window.app.wishlistManager.getItems(), '個人申請6志願比對表.csv')">
              📥 匯出志願清單 CSV
            </button>
            <button class="btn-detail" onclick="window.print()">
              🖨 列印志願表
            </button>
          </div>
        </div>

        ${this.wishlistManager.renderComparisonMatrix()}
      </div>
    `;
  }

  renderAnalyticsTab(container) {
    // Analytics overview of 2,072 departments
    const groups = {};
    const regions = {};
    const types = {};
    let totalQuota = 0;

    for (const d of this.departments) {
      groups[d.group_18] = (groups[d.group_18] || 0) + 1;
      regions[d.region] = (regions[d.region] || 0) + 1;
      types[d.school_type] = (types[d.school_type] || 0) + 1;
      totalQuota += d.quota || 0;
    }

    container.innerHTML = `
      <div style="max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
        <div>
          <h1 style="font-size: 1.6rem; font-weight: 800;">📊 全台大專院校學測入學大數據透視</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">
            全台 123 所公私立學校、2,072 個科系與近三年申請錄取統計分析
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          <div class="matcher-card" style="padding: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">收錄學校總數</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--primary); margin: 6px 0;">123 所</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">涵蓋所有公私立及科大</div>
          </div>
          <div class="matcher-card" style="padding: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">收錄校系組數</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--success); margin: 6px 0;">2,072 系</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">100% 完整收錄</div>
          </div>
          <div class="matcher-card" style="padding: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">招生總名額</div>
            <div style="font-size: 2rem; font-weight: 800; color: #7c3aed; margin: 6px 0;">${totalQuota.toLocaleString()} 人</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">學測個人申請總名額</div>
          </div>
          <div class="matcher-card" style="padding: 20px;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">涵蓋學年度</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--warning); margin: 6px 0;">近 3 年</div>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">111、112、113/114年度</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <div class="matcher-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px;">🎓 18 大學群科系數量排行</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([g, cnt]) => `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                    <span>${g}</span>
                    <strong>${cnt} 系 (${Math.round(cnt / this.departments.length * 100)}%)</strong>
                  </div>
                  <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.round(cnt / 350 * 100)}%; background: var(--primary); border-radius: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="matcher-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 16px;">🗺️ 地理分區與學校體系分佈</h3>
            <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">五大地理分區</h4>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px;">
              ${Object.entries(regions).sort((a, b) => b[1] - a[1]).map(([r, cnt]) => `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                    <span>${r}地區</span>
                    <strong>${cnt} 系 (${Math.round(cnt / this.departments.length * 100)}%)</strong>
                  </div>
                  <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.round(cnt / 1200 * 100)}%; background: var(--success); border-radius: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <h4 style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 8px;">公私立學校體系</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, cnt]) => `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                    <span>${t}</span>
                    <strong>${cnt} 系 (${Math.round(cnt / this.departments.length * 100)}%)</strong>
                  </div>
                  <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.round(cnt / 1100 * 100)}%; background: #7c3aed; border-radius: 4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  toggleWishlist(depId) {
    const dept = this.departments.find(d => d.dep_id === depId);
    if (!dept) return;

    const res = this.wishlistManager.toggle(dept);
    if (res.action === 'limit_reached') {
      alert(`個人申請志願最多僅能選填 ${res.max} 個志願！請先移除其他志願再進行更換。`);
    }
  }

  removeFromWishlist(depId) {
    this.wishlistManager.remove(depId);
  }

  updateWishlistCount() {
    const badge = document.getElementById('wishlist-badge');
    const mobileBottomBadge = document.getElementById('mobile-bottom-wishlist-badge');
    const count = this.wishlistManager.getCount();
    if (badge) {
      badge.innerText = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    if (mobileBottomBadge) {
      mobileBottomBadge.innerText = count;
      mobileBottomBadge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  updateWishlistButtons() {
    document.querySelectorAll('.btn-wishlist').forEach(btn => {
      // Find parent card or row
      const card = btn.closest('.dept-card');
      if (card) {
        const titleEl = card.querySelector('.dept-title');
        // Will refresh when rendering
      }
    });
  }

  openWishlistDrawer() {
    this.setTab('wishlist');
  }

  openDetailModal(depId) {
    const dept = this.departments.find(d => d.dep_id === depId);
    if (!dept) return;

    this.currentModalDept = dept;
    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('modal-content');
    if (!modal || !content) return;

    const subjs = ['國文', '英文', '數學A', '數學B', '社會', '自然'];
    const h113 = dept.history?.find(h => h.year === '113');
    const h112 = dept.history?.find(h => h.year === '112');
    const h111 = dept.history?.find(h => h.year === '111');

    content.innerHTML = `
      <div class="modal-header">
        <div>
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px;">
            <span class="badge ${dept.school_type.includes('國立') ? 'badge-public' : 'badge-private'}">${dept.school_type}</span>
            <span class="badge badge-region">${dept.region}</span>
            <span class="badge badge-group">${dept.group_18}</span>
            <span class="dept-code">校系代碼: ${dept.dep_id}</span>
          </div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">
            ${dept.school_name} - ${dept.dep_name}
          </h2>
        </div>
        <button class="modal-close" onclick="window.app.closeModal()">✕</button>
      </div>

      <div class="modal-body">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
          <div class="matcher-card" style="padding: 14px;">
            <div class="info-label">核定招收名額</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--primary);">${dept.quota} 人</div>
          </div>
          <div class="matcher-card" style="padding: 14px;">
            <div class="info-label">採計考科組合</div>
            <div style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-top: 4px;">
              ${(dept.subjects || []).join('、')}
            </div>
          </div>
          <div class="matcher-card" style="padding: 14px;">
            <div class="info-label">113 最新篩選結果</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #b45309; margin-top: 4px;">
              ${dept.cutoff_summary || '倍率依序錄取'}
            </div>
          </div>
          <div class="matcher-card" style="padding: 14px;">
            <div class="info-label">英聽檢定標準</div>
            <div style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
              ${dept.standards?.['英聽'] !== '--' ? dept.standards?.['英聽'] + ' 級' : '不拘'}
            </div>
          </div>
        </div>

        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">📅 近三年（111-113）檢定標準與篩選倍率對照表</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>學年度</th>
                  <th>國文</th>
                  <th>英文</th>
                  <th>數A</th>
                  <th>數B</th>
                  <th>社會</th>
                  <th>自然</th>
                  <th>英聽</th>
                  <th>篩選結果 / 超篩門檻</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>113 學年</strong></td>
                  <td>${this.formatStdCell(h113?.standards?.['國文'])}</td>
                  <td>${this.formatStdCell(h113?.standards?.['英文'])}</td>
                  <td>${this.formatStdCell(h113?.standards?.['數學A'])}</td>
                  <td>${this.formatStdCell(h113?.standards?.['數學B'])}</td>
                  <td>${this.formatStdCell(h113?.standards?.['社會'])}</td>
                  <td>${this.formatStdCell(h113?.standards?.['自然'])}</td>
                  <td>${dept.standards?.['英聽'] || '--'}</td>
                  <td><strong style="color: #b45309;">${h113?.screening_result || dept.cutoff_summary || '依序通過'}</strong></td>
                </tr>
                <tr>
                  <td><strong>112 學年</strong></td>
                  <td>${this.formatStdString(h112?.standards?.['國文'])}</td>
                  <td>${this.formatStdString(h112?.standards?.['英文'])}</td>
                  <td>${this.formatStdString(h112?.standards?.['數學A'])}</td>
                  <td>${this.formatStdString(h112?.standards?.['數學B'])}</td>
                  <td>${this.formatStdString(h112?.standards?.['社會'])}</td>
                  <td>${this.formatStdString(h112?.standards?.['自然'])}</td>
                  <td>--</td>
                  <td>${h112?.screening_result || '倍率依序通過'}</td>
                </tr>
                <tr>
                  <td><strong>111 學年</strong></td>
                  <td>${this.formatStdString(h111?.standards?.['國文'])}</td>
                  <td>${this.formatStdString(h111?.standards?.['英文'])}</td>
                  <td>${this.formatStdString(h111?.standards?.['數學A'])}</td>
                  <td>${this.formatStdString(h111?.standards?.['數學B'])}</td>
                  <td>${this.formatStdString(h111?.standards?.['社會'])}</td>
                  <td>${this.formatStdString(h111?.standards?.['自然'])}</td>
                  <td>--</td>
                  <td>${h111?.screening_result || '倍率依序通過'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: var(--radius-md); font-size: 0.88rem;">
          <h4 style="font-weight: 700; margin-bottom: 6px;">🔗 官方權威簡章與連結</h4>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>大學甄選入學委員會（CAC）官方歷年篩選結果：<a href="${dept.official_url}" target="_blank" rel="noreferrer">點此檢視官方原檔</a></li>
            <li>大學個人申請校系分則簡章：<a href="https://www.cac.edu.tw/apply113/system/ColQry_forh113apply_8w9u2y/" target="_blank" rel="noreferrer">前往 CAC 甄選委員會網站</a></li>
            <li>Google 快速搜尋該系評價與討論：<a href="https://www.google.com/search?q=${encodeURIComponent(dept.school_name + ' ' + dept.dep_name)}" target="_blank" rel="noreferrer">搜尋 ${dept.school_name} ${dept.dep_name}</a></li>
          </ul>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
          <button class="btn-primary-large" onclick="window.app.toggleWishlist('${dept.dep_id}'); window.app.closeModal();">
            ${this.wishlistManager.has(dept.dep_id) ? '✕ 從志願清單中移除' : '★ 加入個人申請 6 志願'}
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  }

  formatStdCell(info) {
    if (!info) return '--';
    if (typeof info === 'string') return info;
    const s = info.std !== '--' ? `<strong>${info.std}標</strong>` : '';
    const m = info.multi !== '--' ? ` (${info.multi}倍)` : '';
    return `${s}${m}`.trim() || '--';
  }

  formatStdString(str) {
    if (!str || str === '--') return '--';
    if (typeof str === 'object') return this.formatStdCell(str);
    return str;
  }

  closeModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.remove('open');
    this.currentModalDept = null;
  }
}

// Global instance
window.app = new App();
window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
