/**
 * Taiwan GSAT Database - CSV and Print Export Utility
 */

class ExportUtility {
  static exportToCSV(dataList, filename = '大學學測篩選標準資料庫.csv') {
    if (!dataList || dataList.length === 0) {
      alert('目前無可匯出的資料！');
      return;
    }

    const headers = [
      '校系代碼',
      '學校名稱',
      '學系名稱',
      '學校體系',
      '地理區域',
      '18大學群',
      '招收名額',
      '採計考科',
      '國文標準/倍率',
      '英文標準/倍率',
      '數學A標準/倍率',
      '數學B標準/倍率',
      '社會標準/倍率',
      '自然標準/倍率',
      '英聽標準',
      '113年篩選結果/門檻',
      '綜合預估基準級分',
      '大考甄選簡章連結'
    ];

    const rows = [headers];

    for (const d of dataList) {
      const std = d.standards || {};
      const formatStd = (sub) => {
        const item = std[sub];
        if (!item || (item.std === '--' && item.multi === '--')) return '--';
        return `${item.std !== '--' ? item.std : ''} ${item.multi !== '--' ? item.multi + '倍' : ''}`.trim();
      };

      const h113 = d.history?.find(h => h.year === '113');
      const cutoff = h113?.screening_result || d.cutoff_summary || '--';

      rows.push([
        `"${d.dep_id}"`,
        `"${d.school_name}"`,
        `"${d.dep_name}"`,
        `"${d.school_type}"`,
        `"${d.region}"`,
        `"${d.group_18}"`,
        `"${d.quota}"`,
        `"${(d.subjects || []).join('、')}"`,
        `"${formatStd('國文')}"`,
        `"${formatStd('英文')}"`,
        `"${formatStd('數學A')}"`,
        `"${formatStd('數學B')}"`,
        `"${formatStd('社會')}"`,
        `"${formatStd('自然')}"`,
        `"${std['英聽'] || '--'}"`,
        `"${cutoff.replace(/"/g, '""')}"`,
        `"${d.estimated_score}"`,
        `"${d.official_url || ''}"`
      ]);
    }

    // CSV format with UTF-8 BOM (\uFEFF) to guarantee Excel Traditional Chinese compatibility
    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static printPage() {
    window.print();
  }
}

window.ExportUtility = ExportUtility;
