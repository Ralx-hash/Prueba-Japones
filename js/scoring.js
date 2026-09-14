window.App = window.App || {};

App.Scoring = (function () {
  function pct(correctPoints, totalPoints) {
    if (totalPoints <= 0) return 0;
    return Math.round((correctPoints / totalPoints) * 100);
  }

  // records: array de { question, sectionId, correct, expectedForResults,
  //   userForResults, replays, slow_replays, time_ms, extra }
  function buildResultObject(input) {
    var meta = input.meta;
    var records = input.records;
    var startedAt = input.startedAt;
    var finishedAt = input.finishedAt;
    var environment = input.environment;

    var totalPoints = 0;
    var correctPoints = 0;
    var bySection = {};
    var byTag = {};
    var answers = [];

    records.forEach(function (r) {
      var q = r.question;
      var points = typeof q.points === "number" ? q.points : 1;
      totalPoints += points;
      if (r.correct) correctPoints += points;

      if (!bySection[r.sectionId]) {
        bySection[r.sectionId] = { correct: 0, total: 0, pct: 0 };
      }
      bySection[r.sectionId].total += 1;
      if (r.correct) bySection[r.sectionId].correct += 1;

      (q.tags || []).forEach(function (tag) {
        if (!byTag[tag]) byTag[tag] = { correct: 0, total: 0, pct: 0 };
        byTag[tag].total += 1;
        if (r.correct) byTag[tag].correct += 1;
      });

      var answerRecord = {
        id: q.id,
        type: q.type,
        tags: q.tags || [],
        correct: !!r.correct,
        expected: r.expectedForResults,
        user: r.userForResults,
        replays: r.replays || 0,
        slow_replays: r.slow_replays || 0,
        time_ms: r.time_ms || 0,
      };
      if (r.extra) {
        Object.keys(r.extra).forEach(function (k) {
          answerRecord[k] = r.extra[k];
        });
      }
      answers.push(answerRecord);
    });

    Object.keys(bySection).forEach(function (k) {
      bySection[k].pct = pct(bySection[k].correct, bySection[k].total);
    });
    Object.keys(byTag).forEach(function (k) {
      byTag[k].pct = pct(byTag[k].correct, byTag[k].total);
    });

    var overallPct = pct(correctPoints, totalPoints);

    return {
      test_id: meta.id,
      test_title: meta.title,
      started_at: startedAt,
      finished_at: finishedAt,
      environment: environment,
      score: {
        points: correctPoints,
        max: totalPoints,
        pct: overallPct,
        passed: overallPct >= (meta.passing_pct || 0),
      },
      by_section: bySection,
      by_tag: byTag,
      answers: answers,
    };
  }

  // Ordena las entradas de by_tag de peor a mejor porcentaje.
  function sortedTagEntries(byTag) {
    return Object.keys(byTag)
      .map(function (tag) {
        return { tag: tag, stats: byTag[tag] };
      })
      .sort(function (a, b) {
        return a.stats.pct - b.stats.pct;
      });
  }

  return {
    buildResultObject: buildResultObject,
    sortedTagEntries: sortedTagEntries,
  };
})();
