// controllers/dashboardController.js
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
// Helper : filtre SQL selon la période
// ─────────────────────────────────────────────────────────────
function getPeriodFilter(period) {
  switch (period) {
    case 'today':  return `AND ar.analyzed_at >= CURRENT_DATE`;
    case '7days':  return `AND ar.analyzed_at >= NOW() - INTERVAL '7 days'`;
    case '30days': return `AND ar.analyzed_at >= NOW() - INTERVAL '30 days'`;
    case 'year':
    default:       return `AND ar.analyzed_at >= DATE_TRUNC('year', NOW())`;
  }
}

// ─────────────────────────────────────────────────────────────
// Helper : temps relatif
// ─────────────────────────────────────────────────────────────
function getRelativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1)    return "À l'instant";
  if (diff < 60)   return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}j`;
}

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// ─────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const filter = getPeriodFilter(req.query.period);

    const [usersResult, reviewsResult, successResult, activeResult] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query(`SELECT COUNT(*) FROM analysis_results ar WHERE 1=1 ${filter}`),
      pool.query(`
        SELECT ROUND(
          COUNT(*) FILTER (WHERE quality_score >= 80) * 100.0
          / NULLIF(COUNT(*), 0), 1
        ) AS rate
        FROM analysis_results ar WHERE 1=1 ${filter}
      `),
      pool.query(`SELECT COUNT(*) FROM analysis_results WHERE analyzed_at >= NOW() - INTERVAL '24 hours'`),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers:     parseInt(usersResult.rows[0].count),
        codeReviews:    parseInt(reviewsResult.rows[0].count),
        successRate:    parseFloat(successResult.rows[0].rate || 0),
        activeAnalyses: parseInt(activeResult.rows[0].count),
      },
    });
  } catch (error) {
    console.error('Erreur getDashboardStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/recent-analyses
// ─────────────────────────────────────────────────────────────
const getRecentAnalyses = async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 5;
    const filter = getPeriodFilter(req.query.period);

    const result = await pool.query(
      `SELECT
        ar.id,
        ar.code_version_id,
        COALESCE(u.name, 'Invité') AS "user",
        cv.file_name               AS file,
        cv.programming_language    AS language,
        ar.quality_score           AS score,
        ar.analyzed_at             AS created_at
       FROM analysis_results ar
       JOIN code_versions cv ON cv.id = ar.code_version_id
       JOIN projects p       ON p.id  = cv.project_id
       LEFT JOIN users u     ON u.id  = p.user_id
       WHERE 1=1 ${filter}
       ORDER BY ar.analyzed_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({
      success: true,
      analyses: result.rows.map(row => ({
        ...row,
        status: 'completed',
        time:   getRelativeTime(row.created_at),
      })),
    });
  } catch (error) {
    console.error('Erreur getRecentAnalyses:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/languages
// ─────────────────────────────────────────────────────────────
const getPopularLanguages = async (req, res) => {
  try {
    const filter = getPeriodFilter(req.query.period);

    const result = await pool.query(`
      SELECT cv.programming_language AS lang, COUNT(*) AS count
      FROM analysis_results ar
      JOIN code_versions cv ON cv.id = ar.code_version_id
      WHERE cv.programming_language IS NOT NULL ${filter}
      GROUP BY cv.programming_language
      ORDER BY count DESC
      LIMIT 4
    `);

    const total     = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const languages = result.rows.map(row => ({
      lang:    row.lang,
      count:   parseInt(row.count),
      percent: total > 0 ? Math.round((parseInt(row.count) / total) * 100) : 0,
    }));

    res.json({ success: true, languages });
  } catch (error) {
    console.error('Erreur getPopularLanguages:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/issues
// ─────────────────────────────────────────────────────────────
const getIssuesStats = async (req, res) => {
  try {
    const filter = getPeriodFilter(req.query.period);

    const result = await pool.query(`
      SELECT improvements, code_smells, documentation, vulnerabilities
      FROM analysis_results ar
      WHERE 1=1 ${filter}
    `);

    let bugs = 0, improvements = 0, smells = 0, vulnerabilities = 0, documentation = 0;

    for (const row of result.rows) {
      const imp = Array.isArray(row.improvements) ? row.improvements : [];

      for (const item of imp) {
        const sev = (item.severity || '').toLowerCase();
        if (sev === 'error' || sev === 'critical') {
          bugs++;
        } else {
          improvements++;
        }
      }

      smells          += Array.isArray(row.code_smells) ? row.code_smells.length : 0;
      vulnerabilities += Array.isArray(row.vulnerabilities) ? row.vulnerabilities.length : 0;
      documentation   += Array.isArray(row.documentation?.missingDocs) ? row.documentation.missingDocs.length : 0;
    }

    res.json({
      success: true,
      issues: { bugs, improvements, smells, vulnerabilities, documentation },
    });
  } catch (error) {
    console.error('Erreur getIssuesStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/code/:codeVersionId
// ─────────────────────────────────────────────────────────────
const getCodeVersion = async (req, res) => {
  try {
    const { codeVersionId } = req.params;

    const result = await pool.query(
      `SELECT cv.file_name, cv.programming_language, cv.code, cv.created_at
       FROM code_versions cv
       WHERE cv.id = $1`,
      [codeVersionId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Code introuvable' });

    res.json({ success: true, code: result.rows[0] });
  } catch (error) {
    console.error('Erreur getCodeVersion:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getDashboardStats,
  getRecentAnalyses,
  getPopularLanguages,
  getIssuesStats,
  getCodeVersion,
};
