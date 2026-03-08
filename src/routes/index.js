const express = require('express');
const {
  verifyToken,
  fetchMe,
  logout,
  getDashboardSummary,
  listBelumScan,
  listSelesai,
  getLabelDetail,
  createLabel,
  scanResi,
  listActivityLogs
} = require('../services/backendService');
const { ensureAuth } = require('../middleware/auth');

const router = express.Router();

function isUnauthorizedError(error) {
  return Number(error.statusCode) === 401 || /401|unauthorized|invalid session|expired|revoked/i.test(error.message || '');
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toStatusScan(value) {
  if (value === true) {
    return 1;
  }
  if (value === false) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeLabel(label = {}) {
  return {
    ...label,
    id: pickFirst(label.id, label.label_id),
    resi_id: pickFirst(label.resi_id, label.resiId, label.resi, label.id),
    status_scan: toStatusScan(pickFirst(label.status_scan, label.status, label.scanned)),
    scanned_at: pickFirst(label.scanned_at, label.scannedAt, label.updated_at, label.updatedAt),
    created_at: pickFirst(label.created_at, label.createdAt),
    updated_at: pickFirst(label.updated_at, label.updatedAt),
    source_input: pickFirst(label.source_input, label.sourceInput),
    created_by: pickFirst(label.created_by, label.createdBy)
  };
}

function normalizeListResult(result = {}) {
  const rawRows = Array.isArray(result.data)
    ? result.data
    : Array.isArray(result.rows)
      ? result.rows
      : [];

  return {
    ...result,
    data: rawRows.map(normalizeLabel),
    page: Number(result.page || 1),
    total_pages: Number(result.total_pages || result.totalPages || 1)
  };
}

function redirectToLogin(req, res, message = 'Sesi login tidak valid. Silakan login ulang.') {
  req.session.destroy(() => {
    res.redirect(`/login?message=${encodeURIComponent(message)}`);
  });
}

router.get('/login', (req, res) => {
  if (req.session?.accessToken) {
    return res.redirect('/dashboard');
  }

  return res.render('pages/login', {
    title: 'Login',
    form: {},
    errors: req.query.message || null
  });
});

router.post('/login', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    if (!token) {
      return res.status(422).render('pages/login', {
        title: 'Login',
        form: { token: '' },
        errors: 'Token wajib diisi.'
      });
    }

    const verify = await verifyToken(token);
    req.session.accessToken = verify.data.accessToken;

    const me = await fetchMe(req.session.accessToken);
    req.session.user = me.data;
    req.session.flash = { type: 'success', message: 'Login berhasil.' };

    return res.redirect('/dashboard');
  } catch (error) {
    return res.status(401).render('pages/login', {
      title: 'Login',
      form: { token: req.body.token || '' },
      errors: error.message
    });
  }
});

router.post('/logout', ensureAuth, async (req, res) => {
  try {
    await logout(req.session.accessToken);
  } catch (_error) {
    // Ignore API errors on logout and clear local session anyway.
  }

  req.session.destroy(() => {
    res.redirect('/login');
  });
});

router.get('/', ensureAuth, (_req, res) => res.redirect('/dashboard'));

router.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    const summary = await getDashboardSummary(req.session.accessToken);

    res.render('pages/dashboard', {
      title: 'Dashboard',
      summary: summary.data,
      recentActivity: summary.data.recent_activity || []
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    req.session.flash = { type: 'error', message: error.message };
    return res.redirect('/login');
  }
});

router.get('/resi/add', ensureAuth, (_req, res) => {
  res.render('pages/add-resi', { title: 'Tambah Resi', form: {}, errors: null });
});

router.post('/resi/add', ensureAuth, async (req, res) => {
  try {
    const payload = {
      resi_id: String(req.body.resi_id || '').trim(),
      notes: String(req.body.notes || '').trim(),
      source_input: 'web'
    };

    await createLabel(req.session.accessToken, payload);
    req.session.flash = { type: 'success', message: 'Resi berhasil ditambahkan.' };
    res.redirect('/resi/belum-scan');
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    return res.status(400).render('pages/add-resi', {
      title: 'Tambah Resi',
      form: req.body,
      errors: error.message
    });
  }
});

function parseListQuery(req) {
  const page = Math.max(1, Number(req.query.page || 1));
  const limitRaw = Number(req.query.limit || 10);
  const allowedLimits = [10, 20, 50];
  const limit = allowedLimits.includes(limitRaw) ? limitRaw : 10;

  return {
    q: String(req.query.q || ''),
    sort: req.query.sort === 'oldest' ? 'oldest' : 'newest',
    page,
    limit
  };
}

router.get('/resi/belum-scan', ensureAuth, async (req, res) => {
  try {
    const query = parseListQuery(req);
    const data = await listBelumScan(req.session.accessToken, query);

    res.render('pages/list-resi', {
      title: 'Belum Scan',
      heading: 'Belum Scan',
      status: 'belum-scan',
      list: normalizeListResult(data.data || {}),
      query
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    req.session.flash = { type: 'error', message: error.message };
    return res.redirect('/dashboard');
  }
});

router.get('/resi/selesai', ensureAuth, async (req, res) => {
  try {
    const query = parseListQuery(req);
    const data = await listSelesai(req.session.accessToken, query);

    res.render('pages/list-resi', {
      title: 'Selesai',
      heading: 'Selesai',
      status: 'selesai',
      list: normalizeListResult(data.data || {}),
      query
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    req.session.flash = { type: 'error', message: error.message };
    return res.redirect('/dashboard');
  }
});

router.get('/resi/:id', ensureAuth, async (req, res) => {
  try {
    const data = await getLabelDetail(req.session.accessToken, req.params.id);
    res.render('pages/resi-detail', { title: 'Detail Resi', resi: normalizeLabel(data.data || {}) });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    req.session.flash = { type: 'error', message: error.message };
    return res.redirect('/dashboard');
  }
});

router.get('/activity-logs', ensureAuth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const logs = await listActivityLogs(req.session.accessToken, { page, limit });

    res.render('pages/activity-logs', {
      title: 'Activity Logs',
      logs: logs.data
    });
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return redirectToLogin(req, res);
    }
    req.session.flash = { type: 'error', message: error.message };
    return res.redirect('/dashboard');
  }
});

router.get('/scan', ensureAuth, (_req, res) => {
  res.render('pages/scan', { title: 'Scan Resi' });
});

router.post('/scan', ensureAuth, async (req, res) => {
  try {
    const resiId = String(req.body.resi_id || '').trim();
    if (!resiId) {
      return res.status(422).json({
        success: false,
        message: 'resi_id is required'
      });
    }

    const result = await scanResi(req.session.accessToken, { resi_id: resiId });
    return res.json(result);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      req.session.destroy(() => {});
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.'
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to process scan'
    });
  }
});

module.exports = router;
