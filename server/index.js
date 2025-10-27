import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readDb, writeDb } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'lax' }
  })
);

const allowedAdmins = [
  { username: 'hod', password: 'hodpass', role: 'admin' },
  { username: 'clerk', password: 'clerkpass', role: 'admin' }
];

const allowedUsersPerClass = {
  CD: ['cd1', 'cd2'],
  CSE: ['cse1', 'cse2'],
  EC: ['ec1', 'ec2'],
  MECH: ['mech1', 'mech2'],
  CIVIL: ['civil1', 'civil2'],
  AI: ['ai1', 'ai2']
};

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/api/login', async (req, res) => {
  const { mode, username, password, className } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  if (mode === 'user') {
    if (!className) {
      return res.status(400).json({ error: 'Missing className' });
    }
    const allowed = allowedUsersPerClass[className] || [];
    if (!allowed.includes(username)) {
      return res.status(401).json({ error: `Access denied for ${className}` });
    }
    req.session.user = { username, role: 'user', className };
  } else if (mode === 'admin') {
    const admin = allowedAdmins.find(
      (a) => a.username === username && a.password === password
    );
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    req.session.user = { username: admin.username, role: 'admin' };
  } else {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  res.json({ user: req.session.user });
});

app.post('/api/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/tickets', requireAuth, async (req, res) => {
  const db = await readDb();
  const user = req.session.user;
  const result =
    user.role === 'admin'
      ? db.tickets
      : db.tickets.filter((t) => t.user === user.username);
  res.json({ tickets: result });
});

app.post('/api/tickets', requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role !== 'user') {
    return res.status(403).json({ error: 'Only users can submit tickets' });
  }
  const { category, description } = req.body || {};
  if (!category || !description) {
    return res.status(400).json({ error: 'Missing category or description' });
  }
  const db = await readDb();
  const newTicket = {
    id: db.ticketCounter++,
    user: user.username,
    className: user.className,
    category,
    description,
    status: 'Open'
  };
  db.tickets.push(newTicket);
  await writeDb(db);
  res.status(201).json({ ticket: newTicket });
});

app.patch('/api/tickets/:id/resolve', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const db = await readDb();
  const ticket = db.tickets.find((t) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }
  ticket.status = 'Resolved';
  await writeDb(db);
  res.json({ ticket });
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  const db = await readDb();
  res.json({ notifications: db.notifications });
});

app.post('/api/notifications', requireAdmin, async (req, res) => {
  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message required' });
  }
  const db = await readDb();
  const entry = { message, date: new Date().toLocaleString() };
  db.notifications.push(entry);
  await writeDb(db);
  res.status(201).json({ notification: entry });
});

app.use(express.static(resolve(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
