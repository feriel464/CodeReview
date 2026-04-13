// controllers/dashboardController.js
const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/stats
// ─────────────────────────────────────────────────────────────
const getDashboardStats = async (req, res) => {
  try {
    const [usersResult, reviewsResult, successResult, activeResult] = await Promise.all([

      // Total utilisateurs
      pool.query('SELECT COUNT(*) FROM users'),

      // Total analyses
      pool.query('SELECT COUNT(*) FROM analysis_results'),

      // Taux de réussite : analyses avec quality_score >= 80
      pool.query(`
        SELECT 
          ROUND(
            COUNT(*) FILTER (WHERE quality_score >= 80) * 100.0 
            / NULLIF(COUNT(*), 0), 1
          ) AS rate
        FROM analysis_results
      `),

      // Analyses "actives" = créées dans les dernières 24h
      pool.query(`
        SELECT COUNT(*) 
        FROM analysis_results 
        WHERE analyzed_at >= NOW() - INTERVAL '24 hours'
      `),
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
    const limit = parseInt(req.query.limit) || 5;

    const result = await pool.query(
      `SELECT
        ar.id,
        ar.code_version_id,
        COALESCE(u.name, 'Invité')       AS "user",
        cv.file_name                      AS file,
        cv.programming_language           AS language,
        ar.quality_score                  AS score,
        ar.analyzed_at                    AS created_at
       FROM analysis_results ar
       JOIN code_versions cv  ON cv.id = ar.code_version_id
       JOIN projects p        ON p.id  = cv.project_id
       LEFT JOIN users u      ON u.id  = p.user_id
       ORDER BY ar.analyzed_at DESC
       LIMIT $1`,
      [limit]
    );

    const analyses = result.rows.map(row => ({
      ...row,
      status: 'completed',
      time:   getRelativeTime(row.created_at),
    }));

    res.json({ success: true, analyses });
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
    const result = await pool.query(`
      SELECT
        cv.programming_language  AS lang,
        COUNT(*)                 AS count
      FROM analysis_results ar
      JOIN code_versions cv ON cv.id = ar.code_version_id
      WHERE cv.programming_language IS NOT NULL
      GROUP BY cv.programming_language
      ORDER BY count DESC
      LIMIT 4
    `);

    const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);

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
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE LOWER(type) LIKE '%bug%'      OR LOWER(severity) = 'critical') AS bugs,
        COUNT(*) FILTER (WHERE LOWER(type) LIKE '%smell%'    OR LOWER(type) LIKE '%style%')   AS smells,
        COUNT(*) FILTER (WHERE LOWER(type) LIKE '%optim%'    OR LOWER(type) LIKE '%perf%')    AS optimizations,
        COUNT(*) FILTER (WHERE LOWER(type) LIKE '%doc%'      OR LOWER(type) LIKE '%comment%') AS documentation
      FROM issues
    `);

    const row = result.rows[0];
    res.json({
      success: true,
      issues: {
        bugs:          parseInt(row.bugs          || 0),
        smells:        parseInt(row.smells        || 0),
        optimizations: parseInt(row.optimizations || 0),
        documentation: parseInt(row.documentation || 0),
      },
    });
  } catch (error) {
    console.error('Erreur getIssuesStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// Helper : temps relatif
// ─────────────────────────────────────────────────────────────
function getRelativeTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000); // minutes
  if (diff < 1)    return "À l'instant";
  if (diff < 60)   return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}j`;
}

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
  getCodeVersion
};