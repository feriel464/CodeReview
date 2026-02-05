const pool = require('../config/db');

/**
 * Récupérer toutes les traductions pour toutes les langues
 * GET /api/translations
 */
exports.getAllTranslations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.code as language_code,
        tk.key_name,
        t.value
      FROM translations t
      JOIN languages l ON t.language_id = l.id
      JOIN translation_keys tk ON t.translation_key_id = tk.id
      WHERE l.is_active = true
      ORDER BY l.code, tk.key_name
    `);

    // Transformer en structure { fr: {...}, en: {...}, ar: {...} }
    const translations = {};
    
    result.rows.forEach(row => {
      if (!translations[row.language_code]) {
        translations[row.language_code] = {};
      }
      translations[row.language_code][row.key_name] = row.value;
    });

    res.json({
      success: true,
      data: translations
    });
  } catch (error) {
    console.error('❌ Erreur getAllTranslations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des traductions',
      error: error.message
    });
  }
};

/**
 * Récupérer les traductions pour une langue spécifique
 * GET /api/translations/:languageCode
 */
exports.getTranslationsByLanguage = async (req, res) => {
  try {
    const { languageCode } = req.params;

    const result = await pool.query(`
      SELECT 
        tk.key_name,
        tk.section,
        t.value
      FROM translations t
      JOIN languages l ON t.language_id = l.id
      JOIN translation_keys tk ON t.translation_key_id = tk.id
      WHERE l.code = $1 AND l.is_active = true
      ORDER BY tk.section, tk.key_name
    `, [languageCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucune traduction trouvée pour la langue: ${languageCode}`
      });
    }

    // Transformer en objet clé-valeur
    const translations = {};
    result.rows.forEach(row => {
      translations[row.key_name] = row.value;
    });

    res.json({
      success: true,
      language: languageCode,
      data: translations
    });
  } catch (error) {
    console.error('❌ Erreur getTranslationsByLanguage:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des traductions',
      error: error.message
    });
  }
};

/**
 * Mettre à jour plusieurs traductions (bulk update)
 * PUT /api/translations/bulk
 * Body: { languageCode: 'fr', translations: { hero: 'Nouveau texte', ... } }
 */
exports.updateBulkTranslations = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { languageCode, translations } = req.body;

    if (!languageCode || !translations || typeof translations !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'languageCode et translations (objet) sont requis'
      });
    }

    await client.query('BEGIN');

    // Récupérer l'ID de la langue
    const langResult = await client.query(
      'SELECT id FROM languages WHERE code = $1',
      [languageCode]
    );

    if (langResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: `Langue non trouvée: ${languageCode}`
      });
    }

    const languageId = langResult.rows[0].id;
    const updatedKeys = [];
    const errors = [];

    // Mettre à jour chaque traduction
    for (const [keyName, value] of Object.entries(translations)) {
      try {
        const updateResult = await client.query(`
          UPDATE translations t
          SET value = $1, updated_at = CURRENT_TIMESTAMP
          FROM translation_keys tk
          WHERE t.translation_key_id = tk.id
            AND t.language_id = $2
            AND tk.key_name = $3
          RETURNING tk.key_name
        `, [value, languageId, keyName]);

        if (updateResult.rows.length > 0) {
          updatedKeys.push(keyName);
        } else {
          errors.push({ key: keyName, error: 'Clé non trouvée' });
        }
      } catch (error) {
        errors.push({ key: keyName, error: error.message });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${updatedKeys.length} traduction(s) mise(s) à jour`,
      updated: updatedKeys,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur updateBulkTranslations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des traductions',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Mettre à jour une seule traduction
 * PUT /api/translations/:languageCode/:keyName
 * Body: { value: 'Nouveau texte' }
 */
exports.updateTranslation = async (req, res) => {
  try {
    const { languageCode, keyName } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'La valeur (value) est requise'
      });
    }

    const result = await pool.query(`
      UPDATE translations t
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      FROM languages l, translation_keys tk
      WHERE t.language_id = l.id
        AND t.translation_key_id = tk.id
        AND l.code = $2
        AND tk.key_name = $3
      RETURNING t.value as new_value
    `, [value, languageCode, keyName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Traduction non trouvée'
      });
    }

    res.json({
      success: true,
      message: 'Traduction mise à jour avec succès',
      data: {
        languageCode,
        keyName,
        newValue: value
      }
    });

  } catch (error) {
    console.error('❌ Erreur updateTranslation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la traduction',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les langues disponibles
 * GET /api/translations/languages
 */
exports.getLanguages = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name, flag, is_active
      FROM languages
      ORDER BY code
    `);

    res.json({
      success: true,
      languages: result.rows
    });
  } catch (error) {
    console.error('❌ Erreur getLanguages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des langues',
      error: error.message
    });
  }
};

/**
 * Récupérer les sections disponibles
 * GET /api/translations/sections
 */
exports.getSections = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT section
      FROM translation_keys
      ORDER BY section
    `);

    res.json({
      success: true,
      sections: result.rows.map(r => r.section)
    });
  } catch (error) {
    console.error('❌ Erreur getSections:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des sections',
      error: error.message
    });
  }
};