/**
 * Taiwan GSAT Score Matcher & Prediction Engine
 */

class ScoreMatcher {
  constructor(departments) {
    this.departments = departments || [];
    
    // Default estimated standard score cutoffs for evaluation
    this.STANDARD_CUTOFFS = {
      '頂': 13, '頂標': 13,
      '前': 11, '前標': 11,
      '均': 8,  '均標': 8,
      '後': 5,  '後標': 5,
      '底': 3,  '底標': 3
    };

    this.LISTENING_RANK = {
      'A': 4, 'B': 3, 'C': 2, 'F': 1, '--': 0
    };
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
            const reqScore = this.STANDARD_CUTOFFS[stdInfo.std] || 8;
            if (score < reqScore) {
              passedStandards = false;
              failReason = `${subName}未達${stdInfo.std}（差 ${reqScore - score} 級分）`;
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
