/**
 * Taiwan GSAT Wishlist & 6 Choices Comparison Matrix
 */

class WishlistManager {
  constructor() {
    this.STORAGE_KEY = 'taiwan_gsat_wishlist_v1';
    this.MAX_CHOICES = 6;
    this.items = this.load();
    this.listeners = [];
  }

  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.error('Failed to save wishlist to localStorage', e);
    }
    this.notify();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try { cb(this.items); } catch(e) {}
    }
  }

  has(depId) {
    return this.items.some(d => d.dep_id === depId);
  }

  toggle(dept) {
    if (this.has(dept.dep_id)) {
      this.remove(dept.dep_id);
      return { action: 'removed', count: this.items.length };
    } else {
      if (this.items.length >= this.MAX_CHOICES) {
        return { action: 'limit_reached', count: this.items.length, max: this.MAX_CHOICES };
      }
      this.items.push(dept);
      this.save();
      return { action: 'added', count: this.items.length };
    }
  }

  remove(depId) {
    this.items = this.items.filter(d => d.dep_id !== depId);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }

  getCount() {
    return this.items.length;
  }

  getItems() {
    return this.items;
  }

  renderComparisonMatrix() {
    if (this.items.length === 0) {
      return `
        <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
          <h3 style="font-size: 1.2rem; color: var(--text-primary); margin-bottom: 8px;">志願清單目前為空</h3>
          <p>請在校系列表或落點分析中，點擊科系卡片右上角的「加入志願」按鈕（最多可選填 6 個志願）。</p>
        </div>
      `;
    }

    const subjs = ['國文', '英文', '數學A', '數學B', '社會', '自然', '英聽'];

    let html = `
      <div style="font-size: 0.82rem; color: var(--primary); background: var(--primary-light); padding: 8px 12px; border-radius: var(--radius-sm); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <span>👉</span> <strong>滑動比對提示：</strong>左右滑動表格即可橫向對照各校系之檢定標準、超篩與錄取門檻。
      </div>
      <div class="table-wrap">
        <table class="data-table" style="min-width: 780px;">
          <thead>
            <tr>
              <th style="width: 130px; background: var(--bg-tertiary); position: sticky; left: 0; z-index: 3; box-shadow: 2px 0 4px rgba(0,0,0,0.05);">評比項目</th>
    `;

    // Headers: department names
    for (const item of this.items) {
      html += `
        <th style="min-width: 180px; text-align: center;">
          <div style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">${item.school_name}</div>
          <div style="font-size: 1rem; color: var(--text-primary); font-weight: 700; margin: 4px 0;">${item.dep_name}</div>
          <button class="btn-link" style="color: var(--danger); font-size: 0.75rem;" onclick="window.app.removeFromWishlist('${item.dep_id}')">✕ 移除此志願</button>
        </th>
      `;
    }
    html += `</tr></thead><tbody>`;

    // Row: School type & region
    html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">學校屬性 / 地區</td>`;
    for (const item of this.items) {
      html += `<td style="text-align: center;"><span class="badge badge-public">${item.school_type}</span> <span class="badge badge-region">${item.region}</span></td>`;
    }
    html += `</tr>`;

    // Row: Group
    html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">所屬學群</td>`;
    for (const item of this.items) {
      html += `<td style="text-align: center;"><span class="badge badge-group">${item.group_18}</span></td>`;
    }
    html += `</tr>`;

    // Row: Quota
    html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">招生名額</td>`;
    for (const item of this.items) {
      html += `<td style="text-align: center; font-weight: 700; color: var(--primary); font-size: 1.1rem;">${item.quota} 人</td>`;
    }
    html += `</tr>`;

    // Row: Tested Subjects
    html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">採計考科組合</td>`;
    for (const item of this.items) {
      html += `<td style="text-align: center; font-size: 0.85rem;">${item.subjects.join('、')}</td>`;
    }
    html += `</tr>`;

    // Rows: Each Subject Standard & Multiplier
    for (const sub of subjs) {
      html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">${sub} 門檻/倍率</td>`;
      for (const item of this.items) {
        if (sub === '英聽') {
          const l = item.standards?.['英聽'] || '--';
          html += `<td style="text-align: center; font-size: 0.85rem;">${l !== '--' ? `<strong>${l} 級</strong>` : '--'}</td>`;
        } else {
          const s = item.standards?.[sub];
          if (!s || (s.std === '--' && s.multi === '--')) {
            html += `<td style="text-align: center; color: var(--text-muted);">--</td>`;
          } else {
            const stdStr = s.std !== '--' ? `<span style="color: var(--primary); font-weight: 600;">${s.std}標</span>` : '';
            const multiStr = s.multi !== '--' ? ` <span style="color: var(--text-secondary);">(${s.multi}倍)</span>` : '';
            html += `<td style="text-align: center; font-size: 0.85rem;">${stdStr}${multiStr}</td>`;
          }
        }
      }
      html += `</tr>`;
    }

    // Row: Historical Screening Result (115)
    html += `<tr style="background: var(--warning-bg);"><td style="font-weight: 700; position: sticky; left: 0; background: var(--warning-bg);">115 篩選最低門檻</td>`;
    for (const item of this.items) {
      const h115 = item.history?.find(h => h.year === '115') || item.history?.[0];
      const res = h115?.screening_result || item.cutoff_summary || '倍率依序篩選';
      html += `<td style="text-align: center; font-size: 0.85rem; font-weight: 600; color: #b45309;">${res}</td>`;
    }
    html += `</tr>`;

    // Row: Estimated score
    html += `<tr><td style="font-weight: 600; position: sticky; left: 0; background: var(--bg-secondary);">綜合建議基準級分</td>`;
    for (const item of this.items) {
      html += `<td style="text-align: center; font-weight: 700; color: var(--primary); font-size: 1.1rem;">約 ${item.estimated_score} 級分</td>`;
    }
    html += `</tr>`;

    html += `</tbody></table></div>`;
    return html;
  }
}

window.WishlistManager = WishlistManager;
