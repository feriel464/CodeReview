const pool = require('../config/db');

// ─────────────────────────────────────────────────────────────
// GET /api/code-reviews
// ─────────────────────────────────────────────────────────────
const getCodeReviews = async (req, res) => {
  try {
    const { search, language, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let conditions = ['1=1'];
    let params = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(
        p.name ILIKE $${paramIdx} OR
        cv.file_name ILIKE $${paramIdx} OR
        u.name ILIKE $${paramIdx}
      )`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (language && language !== 'all') {
      conditions.push(`cv.programming_language = $${paramIdx}`);
      params.push(language);
      paramIdx++;
    }

    const where = conditions.join(' AND ');

    const [dataResult, countResult] = await Promise.all([
      pool.query(`
        SELECT
          ar.id,
          ar.code_version_id,
          ar.quality_score                    AS score,
          ar.analyzed_at,
          ar.improvements,
          ar.code_smells,
          ar.documentation,
          ar.vulnerabilities,
          ar.metrics,
          cv.file_name,
          cv.programming_language             AS language,
          cv.code,
          p.id                                AS project_id,
          p.name                              AS project_name,
          p.is_guest,
          COALESCE(u.name, 'Invité')          AS "user",
          (
            SELECT COUNT(*)
            FROM jsonb_array_elements(ar.improvements)  AS i
            WHERE (i->>'severity') IN ('error','critical')
          ) +
          jsonb_array_length(COALESCE(ar.code_smells,    '[]'::jsonb)) +
          jsonb_array_length(COALESCE(ar.vulnerabilities,'[]'::jsonb)) AS issues
        FROM analysis_results ar
        JOIN code_versions cv ON cv.id = ar.code_version_id
        JOIN projects p       ON p.id  = cv.project_id
        LEFT JOIN users u     ON u.id  = p.user_id
        WHERE ${where}
        ORDER BY ar.analyzed_at DESC
        LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
      `, [...params, limit, offset]),

      pool.query(`
        SELECT COUNT(*) FROM analysis_results ar
        JOIN code_versions cv ON cv.id = ar.code_version_id
        JOIN projects p       ON p.id  = cv.project_id
        LEFT JOIN users u     ON u.id  = p.user_id
        WHERE ${where}
      `, params),
    ]);

    res.json({
      success: true,
      reviews: dataResult.rows.map(row => ({
        ...row,
        status: 'analyzed',
        source_type: 'file',
      })),
      pagination: {
        total:      parseInt(countResult.rows[0].count),
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getCodeReviews:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/code-reviews/stats
// ─────────────────────────────────────────────────────────────
const getCodeReviewsStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)                                                          AS total,
        COUNT(*)                                                          AS analyzed,
        0                                                                 AS processing,
        ROUND(AVG(quality_score), 0)                                      AS avg_score
      FROM analysis_results
    `);

    const row = result.rows[0];
    res.json({
      success: true,
      stats: {
        total:      parseInt(row.total),
        analyzed:   parseInt(row.analyzed),
        processing: 0,
        avgScore:   parseFloat(row.avg_score || 0),
      },
    });
  } catch (error) {
    console.error('Erreur getCodeReviewsStats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/code-reviews/:id  — détail complet pour la modale View
// ─────────────────────────────────────────────────────────────
const getCodeReviewDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        ar.id,
        ar.quality_score       AS score,
        ar.analyzed_at,
        ar.improvements,
        ar.code_smells,
        ar.documentation,
        ar.vulnerabilities,
        ar.metrics,
        cv.file_name,
        cv.programming_language AS language,
        cv.code,
        p.name                  AS project_name,
        COALESCE(u.name, 'Invité') AS "user"
      FROM analysis_results ar
      JOIN code_versions cv ON cv.id = ar.code_version_id
      JOIN projects p       ON p.id  = cv.project_id
      LEFT JOIN users u     ON u.id  = p.user_id
      WHERE ar.id = $1
    `, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Analyse introuvable' });

    res.json({ success: true, review: result.rows[0] });
  } catch (error) {
    console.error('Erreur getCodeReviewDetail:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/code-reviews/:id
// ─────────────────────────────────────────────────────────────
const deleteCodeReview = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const arRow = await client.query(
      'SELECT code_version_id FROM analysis_results WHERE id = $1', [id]
    );
    if (arRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Analyse introuvable' });
    }

    const cvId = arRow.rows[0].code_version_id;
    const cvRow = await client.query(
      'SELECT project_id FROM code_versions WHERE id = $1', [cvId]
    );
    const projectId = cvRow.rows[0]?.project_id;

    await client.query('DELETE FROM analysis_results WHERE id = $1', [id]);
    await client.query('DELETE FROM code_versions WHERE id = $1', [cvId]);
    if (projectId) {
      await client.query('DELETE FROM projects WHERE id = $1', [projectId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Analyse supprimée' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur deleteCodeReview:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  } finally {
    client.release();
  }
};

module.exports = {
  getCodeReviews,
  getCodeReviewsStats,
  getCodeReviewDetail,
  deleteCodeReview,
};