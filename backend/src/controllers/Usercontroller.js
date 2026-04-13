// controllers/userController.js
const pool = require('../config/db'); // Adapte le chemin vers ta connexion PostgreSQL
const PDFDocument = require('pdfkit');  

// ─── Helpers PDF ─────────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '—';

const drawGradientBar = (doc, x, y, w, h) => {
  doc.save().rect(x, y, w, h).fill('#7C3AED').restore();
};

const drawStatCard = (doc, x, y, w, h, label, value, color) => {
  doc.save().roundedRect(x, y, w, h, 6).fill('#F9FAFB').restore();
  doc.font('Helvetica-Bold').fontSize(18).fill(color)
     .text(String(value), x + 10, y + 8, { width: w - 20, align: 'center' });
  doc.font('Helvetica').fontSize(7).fill('#6B7280')
     .text(label, x + 4, y + 32, { width: w - 8, align: 'center' });
};


// GET /api/users — Récupérer tous les utilisateurs (avec recherche + filtre statut)
const getAllUsers = async (req, res) => {
  try {
    const { search = '', status } = req.query;

    let query = `
      SELECT 
        id,
        name,
        email,
        role,
        created_at,
        updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    // Filtre de recherche (nom ou email)
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
  if (status === 'active') {
    query += ` AND role != 'banned'`;
  } else if (status === 'inactive') {
    query += ` AND role = 'banned'`;
  }
}

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      total: result.rowCount,
      users: result.rows,
    });
  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/users/:id — Récupérer un utilisateur par ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Erreur getUserById:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/users — Créer un utilisateur
const createUser = async (req, res) => {
  try {
    const { name, email, password_hash, role = 'user' } = req.body;

    if (!name || !email || !password_hash) {
      return res.status(400).json({ success: false, message: 'Champs obligatoires manquants' });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, password_hash, role]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email déjà utilisé' });
    }
    console.error('Erreur createUser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/users/:id — Mettre à jour un utilisateur
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, created_at, updated_at`,
      [name, email, role, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateUser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// DELETE /api/users/:id — Supprimer un utilisateur
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Erreur deleteUser:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
const exportUsersPdf = async (req, res) => {
  try {
    // 1. Récupérer les utilisateurs avec les mêmes filtres que getAllUsers
    const { search = '', status } = req.query;
    let query = `SELECT id, name, email, role, created_at FROM users WHERE 1=1`;
    const params = [];
 
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    if (status && status !== 'all') {
      params.push(status);
      query += ` AND role = $${params.length}`;
    }
    query += ' ORDER BY created_at DESC';
 
    const result = await pool.query(query, params);
    const users = result.rows;
 
    const stats = {
      total:    users.length,
      active:   users.filter(u => u.role !== 'banned').length,
      inactive: users.filter(u => u.role === 'banned').length,
      admins:   users.filter(u => u.role === 'admin').length,
    };
 
    // 2. Headers HTTP → téléchargement
    const filename = `utilisateurs_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
 
    // 3. Création du PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: 'Rapport Utilisateurs', Author: 'Plateforme Admin' },
    });
    doc.pipe(res);
 
    const ML = 40;
    const PW = 595 - ML * 2;
    let y = 0;
 
    // ── Barre dégradée haut ─────────────────────────────────
    drawGradientBar(doc, 0, 0, 595, 6);
    y = 20;
 
    // ── Titre ───────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(22).fill('#111827')
       .text('Rapport Utilisateurs', ML, y);
    doc.font('Helvetica').fontSize(8).fill('#6B7280')
       .text(
         `Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
         ML, y + 7, { align: 'right', width: PW }
       );
    y += 28;
 
    doc.font('Helvetica').fontSize(9).fill('#6B7280')
       .text('Liste complète des utilisateurs enregistrés sur la plateforme', ML, y);
    y += 16;
 
    // Ligne séparatrice
    doc.save().moveTo(ML, y).lineTo(ML + PW, y).lineWidth(0.5).stroke('#E5E7EB').restore();
    y += 14;
 
    // ── Stat cards ──────────────────────────────────────────
    const cardW = (PW - 15) / 4;
    const cardH = 52;
    [
      { label: 'Total utilisateurs',  value: stats.total,    color: '#7C3AED' },
      { label: 'Utilisateurs actifs', value: stats.active,   color: '#059669' },
      { label: 'Inactifs / Bannis',   value: stats.inactive, color: '#DC2626' },
      { label: 'Administrateurs',     value: stats.admins,   color: '#EC4899' },
    ].forEach((c, i) => {
      drawStatCard(doc, ML + i * (cardW + 5), y, cardW, cardH, c.label, c.value, c.color);
    });
    y += cardH + 20;
 
    // ── Titre section ───────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(11).fill('#111827')
       .text('Liste des utilisateurs', ML, y);
    y += 14;
 
    // ── Colonnes ────────────────────────────────────────────
    const cols = [
      { label: '#',          w: 26,  align: 'center' },
      { label: 'Nom',        w: 148, align: 'left'   },
      { label: 'Email',      w: 170, align: 'left'   },
      { label: 'Rôle',       w: 62,  align: 'center' },
      { label: 'Inscrit le', w: 83,  align: 'center' },
    ];
    const ROW_H  = 28;
    const HEAD_H = 24;
 
    // Header
    doc.save().roundedRect(ML, y, PW, HEAD_H, 4).fill('#7C3AED').restore();
    let cx = ML + 8;
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(8).fill('white')
         .text(col.label, cx, y + 8, { width: col.w, align: col.align });
      cx += col.w;
    });
    y += HEAD_H;
 
    // Lignes
    users.forEach((user, idx) => {
      // Nouvelle page si dépassement
      if (y + ROW_H > 810) {
        doc.addPage();
        y = 30;
        drawGradientBar(doc, 0, 0, 595, 3);
        y = 20;
        doc.save().roundedRect(ML, y, PW, HEAD_H, 4).fill('#7C3AED').restore();
        let hx = ML + 8;
        cols.forEach(col => {
          doc.font('Helvetica-Bold').fontSize(8).fill('white')
             .text(col.label, hx, y + 8, { width: col.w, align: col.align });
          hx += col.w;
        });
        y += HEAD_H;
      }
 
      // Fond alterné
      const rowBg = idx % 2 === 0 ? 'white' : '#F9FAFB';
      doc.save().rect(ML, y, PW, ROW_H).fill(rowBg).restore();
      doc.save().moveTo(ML, y + ROW_H).lineTo(ML + PW, y + ROW_H)
         .lineWidth(0.3).stroke('#E5E7EB').restore();
 
      const textY = y + (ROW_H - 9) / 2;
      cx = ML + 8;
 
      // # index
      doc.font('Helvetica').fontSize(8).fill('#9CA3AF')
         .text(String(idx + 1).padStart(2, '0'), cx, textY, { width: cols[0].w, align: 'center' });
      cx += cols[0].w;
 
      // Avatar cercle + nom
      const avatarX = cx + 9;
      const avatarY = y + ROW_H / 2;
      doc.save().circle(avatarX, avatarY, 9).fill('#7C3AED').restore();
      doc.font('Helvetica-Bold').fontSize(6).fill('white')
         .text(getInitials(user.name), cx, avatarY - 4, { width: 18, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).fill('#111827')
         .text(user.name, cx + 22, textY - 2, { width: cols[1].w - 26, ellipsis: true });
      cx += cols[1].w;
 
      // Email
      doc.font('Helvetica').fontSize(8).fill('#374151')
         .text(user.email, cx, textY, { width: cols[2].w - 6, ellipsis: true });
      cx += cols[2].w;
 
      // Badge rôle
      const role = user.role || 'user';
      const badgePalette = {
        admin:  { fg: '#7C3AED', bg: '#EDE9FE' },
        banned: { fg: '#DC2626', bg: '#FEE2E2' },
        user:   { fg: '#059669', bg: '#D1FAE5' },
      };
      const { fg, bg } = badgePalette[role] || badgePalette.user;
      const bw = 46, bh = 14;
      const bx = cx + (cols[3].w - bw) / 2;
      const by = y + (ROW_H - bh) / 2;
      doc.save().roundedRect(bx, by, bw, bh, 7).fill(bg).restore();
      doc.font('Helvetica-Bold').fontSize(7.5).fill(fg)
         .text(role.charAt(0).toUpperCase() + role.slice(1), bx, by + 3, { width: bw, align: 'center' });
      cx += cols[3].w;
 
      // Date
      doc.font('Helvetica').fontSize(8).fill('#6B7280')
         .text(formatDate(user.created_at), cx, textY, { width: cols[4].w, align: 'center' });
 
      y += ROW_H;
    });
 
    // ── Pied de page ────────────────────────────────────────
    y += 12;
    if (y < 800) {
      doc.save().moveTo(ML, y).lineTo(ML + PW, y).lineWidth(0.5).stroke('#E5E7EB').restore();
      y += 8;
      doc.font('Helvetica').fontSize(7).fill('#9CA3AF')
         .text('Document confidentiel — Usage interne uniquement', ML, y);
      doc.font('Helvetica').fontSize(7).fill('#9CA3AF')
         .text(`Plateforme Admin • ${new Date().getFullYear()}  —  ${users.length} utilisateur(s)`,
               ML, y, { align: 'right', width: PW });
    }
 
    // Barre basse sur toutes les pages
    const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
    drawGradientBar(doc, 0, 837, 595, 5);
 
    doc.end();
 
  } catch (error) {
    console.error('Erreur exportUsersPdf:', error);
    if (!res.headersSent)
      res.status(500).json({ success: false, message: 'Erreur lors de la génération du PDF' });
  }
};
module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser ,exportUsersPdf };