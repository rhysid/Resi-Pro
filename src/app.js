const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const methodOverride = require('method-override');
const env = require('./config/env');
const routes = require('./routes');
const { exposeSession } = require('./middleware/auth');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv === 'production',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.use(exposeSession);
app.use('/assets', express.static(path.join(__dirname, 'public')));
app.get('/manifest.json', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});
app.get('/service-worker.js', (_req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});
app.use('/', routes);

app.use((_req, res) => {
  res.status(404).render('pages/not-found', { title: 'Not Found' });
});

module.exports = app;
