/**
 * Taiwan GSAT Database - Multi-Criteria Filter & Sort Engine
 */

class FilterEngine {
  constructor(departments) {
    this.allData = departments || [];
    this.filteredData = [...this.allData];
    
    // Active Filter State
    this.filters = {
      keyword: '',
      schoolTypes: new Set(),
      regions: new Set(),
      groups: new Set(),
      presets: new Set(),
      subjects: new Set(),
      subjectMode: 'any', // 'any', 'all', 'exact'
      excludedSubjects: new Set(),
      maxStd: 'all', // '頂', '前', '均', '後', '底', 'all'
      minScore: 0,
      maxScore: 60,
      sortBy: 'score_desc' // 'score_desc', 'score_asc', 'quota_desc', 'code_asc', 'name_asc'
    };

    this.PAGE_SIZE = 24;
    this.currentPage = 1;
  }

  setKeyword(kw) {
    this.filters.keyword = (kw || '').trim().toLowerCase();
    this.currentPage = 1;
  }

  toggleSchoolType(type) {
    if (this.filters.schoolTypes.has(type)) {
      this.filters.schoolTypes.delete(type);
    } else {
      this.filters.schoolTypes.add(type);
    }
    this.currentPage = 1;
  }

  toggleRegion(region) {
    if (this.filters.regions.has(region)) {
      this.filters.regions.delete(region);
    } else {
      this.filters.regions.add(region);
    }
    this.currentPage = 1;
  }

  toggleGroup(group) {
    if (this.filters.groups.has(group)) {
      this.filters.groups.delete(group);
    } else {
      this.filters.groups.add(group);
    }
    this.currentPage = 1;
  }

  togglePreset(preset) {
    if (this.filters.presets.has(preset)) {
      this.filters.presets.delete(preset);
    } else {
      this.filters.presets.add(preset);
    }
    this.currentPage = 1;
  }

  toggleSubject(sub) {
    if (this.filters.subjects.has(sub)) {
      this.filters.subjects.delete(sub);
    } else {
      this.filters.subjects.add(sub);
    }
    this.currentPage = 1;
  }

  toggleExcludedSubject(sub) {
    if (this.filters.excludedSubjects.has(sub)) {
      this.filters.excludedSubjects.delete(sub);
    } else {
      this.filters.excludedSubjects.add(sub);
    }
    this.currentPage = 1;
  }

  setSubjectMode(mode) {
    this.filters.subjectMode = mode;
    this.currentPage = 1;
  }

  setMaxStandard(std) {
    this.filters.maxStd = std;
    this.currentPage = 1;
  }

  setScoreRange(min, max) {
    this.filters.minScore = Number(min) || 0;
    this.filters.maxScore = Number(max) || 60;
    this.currentPage = 1;
  }

  setSortBy(sortKey) {
    this.filters.sortBy = sortKey;
    this.currentPage = 1;
  }

  resetFilters() {
    this.filters.keyword = '';
    this.filters.schoolTypes.clear();
    this.filters.regions.clear();
    this.filters.groups.clear();
    this.filters.presets.clear();
    this.filters.subjects.clear();
    this.filters.excludedSubjects.clear();
    this.filters.subjectMode = 'any';
    this.filters.maxStd = 'all';
    this.filters.minScore = 0;
    this.filters.maxScore = 60;
    this.filters.sortBy = 'score_desc';
    this.currentPage = 1;
  }

  applyFilters() {
    const {
      keyword,
      schoolTypes,
      regions,
      groups,
      presets,
      subjects,
      subjectMode,
      excludedSubjects,
      maxStd,
      minScore,
      maxScore,
      sortBy
    } = this.filters;

    const stdRank = { '頂': 5, '頂標': 5, '前': 4, '前標': 4, '均': 3, '均標': 3, '後': 2, '後標': 2, '底': 1, '底標': 1 };

    // 1. Keyword search (School name, department name, department ID) with alias expansion
    const ALIASES = {
      '台大': ['臺灣大學', '台北'], '臺大': ['臺灣大學'], '清大': ['清華大學'], '交大': ['陽明交通'], '陽交': ['陽明交通'],
      '成大': ['成功大學'], '政大': ['政治大學'], '台科': ['臺灣科技'], '臺科': ['臺灣科技'], '北科': ['臺北科技'],
      '中興': ['中興大學'], '中正': ['中正大學'], '中央': ['中央大學'], '中山': ['中山大學'], '師大': ['臺灣師範'],
      '北大': ['臺北大學'], '高大': ['高雄大學'], '東華': ['東華大學'], '輔大': ['輔仁大學'], '東吳': ['東吳大學'],
      '淡江': ['淡江大學'], '中原': ['中原大學'], '東海': ['東海大學'], '逢甲': ['逢甲大學'], '文化': ['中國文化'],
      '北醫': ['臺北醫學'], '高醫': ['高雄醫學'], '長庚': ['長庚大學'], '中國醫': ['中國醫藥'], '中山醫': ['中山醫學'],
      '資工': ['資訊工程', '資工'], '資管': ['資訊管理', '資管'], '電機': ['電機工程', '電機'], '機械': ['機械工程'],
      '化工': ['化學工程'], '材料': ['材料科學', '材料工程'], '企管': ['企業管理'], '財金': ['財務金融', '金融'],
      '國貿': ['國際貿易'], '國企': ['國際企業'], '生科': ['生命科學'], '生技': ['生物科技'], '醫檢': ['醫事檢驗', '醫檢'],
      '物治': ['物理治療'], '職治': ['職能治療'], '公衛': ['公共衛生'], '中文': ['中國文學'], '外文': ['外國語文', '英國語文'],
      '日文': ['日本語文'], '公行': ['公共行政'], '法律': ['法律學系', '法律系', '法學']
    };

    let searchTokens = [];
    if (keyword) {
      searchTokens = [keyword];
      for (const [alias, targets] of Object.entries(ALIASES)) {
        if (keyword.includes(alias)) {
          searchTokens.push(...targets);
        }
      }
    }

    this.filteredData = this.allData.filter(dep => {
      // 1. Keyword search
      if (keyword) {
        const fullStr = `${dep.school_name} ${dep.dep_name} ${dep.dep_id} ${dep.group_18}`.toLowerCase();
        const matchesAny = searchTokens.some(tok => fullStr.includes(tok.toLowerCase()));
        if (!matchesAny) return false;
      }

      // 2. School Type
      if (schoolTypes.size > 0 && !schoolTypes.has(dep.school_type)) {
        return false;
      }

      // 3. Region
      if (regions.size > 0 && !regions.has(dep.region)) {
        return false;
      }

      // 4. 18 Academic Groups
      if (groups.size > 0 && !groups.has(dep.group_18)) {
        return false;
      }

      // 5. Presets
      if (presets.size > 0) {
        let matchPreset = false;
        if (presets.has('top5') && ["臺灣大學", "清華大學", "陽明交通", "成功大學", "政治大學"].some(k => dep.school_name.includes(k))) {
          matchPreset = true;
        }
        if (presets.has('central4') && ["中央大學", "中興大學", "中山大學", "中正大學"].some(k => dep.school_name.includes(k))) {
          matchPreset = true;
        }
        if (presets.has('med') && (dep.group_18 === "醫藥衛生學群" || ["醫學", "牙醫", "藥學"].some(k => dep.dep_name.includes(k)))) {
          matchPreset = true;
        }
        if (presets.has('top_private') && ["輔仁", "東吳", "淡江", "逢甲", "中原", "東海", "元智"].some(k => dep.school_name.includes(k))) {
          matchPreset = true;
        }
        if (presets.has('tech') && (dep.school_type.includes("科技") || dep.school_key.startsWith('j'))) {
          matchPreset = true;
        }
        if (!matchPreset) return false;
      }

      // 6. Subjects Tested
      const depSubjs = new Set(dep.subjects || []);
      
      // Excluded subjects (e.g. without Math A)
      if (excludedSubjects.size > 0) {
        for (const exSub of excludedSubjects) {
          if (depSubjs.has(exSub)) return false;
        }
      }

      if (subjects.size > 0) {
        if (subjectMode === 'all') {
          for (const s of subjects) {
            if (!depSubjs.has(s)) return false;
          }
        } else if (subjectMode === 'any') {
          let hasAny = false;
          for (const s of subjects) {
            if (depSubjs.has(s)) {
              hasAny = true;
              break;
            }
          }
          if (!hasAny) return false;
        }
      }

      // 7. Maximum Standard Threshold
      if (maxStd !== 'all') {
        const threshold = stdRank[maxStd] || 0;
        let exceeds = false;
        for (const sub of ['國文', '英文', '數學A', '數學B', '社會', '自然']) {
          const sVal = dep.standards[sub]?.std;
          if (sVal && stdRank[sVal] && stdRank[sVal] > threshold) {
            exceeds = true;
            break;
          }
        }
        if (exceeds) return false;
      }

      // 8. Score Range
      if (dep.estimated_score < minScore || dep.estimated_score > maxScore) {
        return false;
      }

      return true;
    });

    // Apply Sorting
    this.sortData();

    return this.filteredData;
  }

  sortData() {
    const sortKey = this.filters.sortBy;
    this.filteredData.sort((a, b) => {
      switch (sortKey) {
        case 'score_desc':
          return (b.estimated_score || 0) - (a.estimated_score || 0);
        case 'score_asc':
          return (a.estimated_score || 0) - (b.estimated_score || 0);
        case 'quota_desc':
          return (b.quota || 0) - (a.quota || 0);
        case 'code_asc':
          return a.dep_id.localeCompare(b.dep_id);
        case 'name_asc':
          return a.dep_name.localeCompare(b.dep_name, 'zh-Hant');
        default:
          return 0;
      }
    });
  }

  getCurrentPageItems() {
    const start = (this.currentPage - 1) * this.PAGE_SIZE;
    return this.filteredData.slice(start, start + this.PAGE_SIZE);
  }

  getTotalPages() {
    return Math.max(1, Math.ceil(this.filteredData.length / this.PAGE_SIZE));
  }

  setPage(p) {
    const total = this.getTotalPages();
    this.currentPage = Math.max(1, Math.min(p, total));
  }
}

window.FilterEngine = FilterEngine;
