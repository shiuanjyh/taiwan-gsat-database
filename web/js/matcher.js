/**
 * Taiwan GSAT Score Matcher & Prediction Engine
 */

class ScoreMatcher {
  constructor(departments) {
    this.departments = departments || [];
    
    // 115 Academic Year Official Five Standards (大考中心 115 各科五標)
    this.STANDARDS_115 = {
      '國文': { '頂': 13, '前': 12, '均': 10, '後': 9, '底': 7 },
      '英文': { '頂': 13, '前': 11, '均': 8,  '後': 5, '底': 3 },
      '數學A': { '頂': 12, '前': 10, '均': 8,  '後': 5, '底': 4 },
      '數學B': { '頂': 11, '前': 9,  '均': 5,  '後': 3, '底': 2 },
      '社會': { '頂': 13, '前': 12, '均': 10, '後': 8, '底': 7 },
      '自然': { '頂': 13, '前': 12, '均': 9,  '後': 7, '底': 5 }
    };

    this.LISTENING_RANK = {
      'A': 4, 'B': 3, 'C': 2, 'F': 1, '--': 0
    };
  }

  getCutoff(subject, stdLevel) {
    const cleanStd = stdLevel ? stdLevel.replace('標', '').trim() : '';
    if (this.STANDARDS_115[subject] && this.STANDARDS_115[subject][cleanStd] !== undefined) {
      return this.STANDARDS_115[subject][cleanStd];
    }
    const fallback = { '頂': 13, '前': 11, '均': 8, '後': 5, '底': 3 };
    return fallback[cleanStd] || 8;
  }

  evaluate(userScores) {
    // userScores: { chi: 14, eng: 13, matha: 12, mathb: 10, soc: 13, sci: 12, listen: 'A' }
    const results = {
      dream: [],   // 夢幻志願
      target: [],  // 落點志願
      safe: [],    // 保底志願
      failed: []   // 門檻未過
    };

    const userMap = {
      '國文': Number(userScores.chi) || 0,
      '英文': Number(userScores.eng) || 0,
      '數學A': Number(userScores.matha) || 0,
      '數學B': Number(userScores.mathb) || 0,
      '社會': Number(userScores.soc) || 0,
      '自然': Number(userScores.sci) || 0
    };

    const userListen = userScores.listen || 'B';
    const userListenRank = this.LISTENING_RANK[userListen] || 3;

    for (const dep of this.departments) {
      const standards = dep.standards || {};
      let passedStandards = true;
      let failReason = '';

      // 1. Check English Listening Standard
      const reqListen = standards['英聽'] || '--';
      if (reqListen !== '--' && this.LISTENING_RANK[reqListen]) {
        if (userListenRank < this.LISTENING_RANK[reqListen]) {
          passedStandards = false;
          failReason = `英聽未達 ${reqListen} 級`;
        }
      }

      // 2. Check Subject Standards
      if (passedStandards) {
        for (const [subName, score] of Object.entries(userMap)) {
          const stdInfo = standards[subName];
          if (stdInfo && stdInfo.std && stdInfo.std !== '--') {
            const reqScore = this.getCutoff(subName, stdInfo.std);
            if (score < reqScore) {
              passedStandards = false;
              failReason = `${subName}未達${stdInfo.std}標（需 ${reqScore} 級，差 ${reqScore - score} 級分）`;
              break;
            }
          }
        }
      }

      if (!passedStandards) {
        results.failed.push({
          ...dep,
          matchType: 'failed',
          matchNote: failReason
        });
        continue;
      }

      // 3. Calculate User Score for Required Subjects
      const reqSubjects = dep.subjects && dep.subjects.length > 0 ? dep.subjects : ['國文', '英文', '數學A', '自然'];
      let userTotalReq = 0;
      let reqCount = 0;

      for (const sub of reqSubjects) {
        if (userMap[sub] !== undefined) {
          userTotalReq += userMap[sub];
          reqCount++;
        }
      }

      // Benchmark normalized to tested subjects
      const estTarget = dep.estimated_score || 40;
      const scoreDiff = userTotalReq - estTarget;

      let matchType = 'target';
      let matchNote = '';

      if (scoreDiff < -2) {
        matchType = 'dream';
        matchNote = `挑戰型志願（預估差距 ${Math.abs(scoreDiff)} 級分，建議衝刺）`;
        results.dream.push({ ...dep, userTotalReq, scoreDiff, matchType, matchNote });
      } else if (scoreDiff >= -2 && scoreDiff <= 3) {
        matchType = 'target';
        matchNote = `理想落點志願（落點吻合度高，錄取機率高）`;
        results.target.push({ ...dep, userTotalReq, scoreDiff, matchType, matchNote });
      } else {
        matchType = 'safe';
        matchNote = `穩健保底志願（超越預估 ${scoreDiff} 級分，極度安全）`;
        results.safe.push({ ...dep, userTotalReq, scoreDiff, matchType, matchNote });
      }
    }

    // Sort each bucket by estimated score desc
    results.dream.sort((a, b) => (b.estimated_score || 0) - (a.estimated_score || 0));
    results.target.sort((a, b) => (b.estimated_score || 0) - (a.estimated_score || 0));
    results.safe.sort((a, b) => (b.estimated_score || 0) - (a.estimated_score || 0));

    return results;
  }
}

window.ScoreMatcher = ScoreMatcher;
