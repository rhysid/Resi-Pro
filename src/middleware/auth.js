function ensureAuth(req, res, next) {
  if (!req.session?.accessToken) {
    if (req.xhr || req.path.startsWith('/api/') || (req.headers.accept || '').includes('application/json')) {
      return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
    }
    return res.redirect('/login');
  }
  return next();
}

function exposeSession(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  res.locals.flash = req.session?.flash || null;
  req.session.flash = null;
  next();
}

module.exports = { ensureAuth, exposeSession };
