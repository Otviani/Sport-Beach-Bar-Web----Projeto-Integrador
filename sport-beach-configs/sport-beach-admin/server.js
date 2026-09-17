// server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { readDb, writeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-este-segredo-no-.env',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // sessão dura 4h
}));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------
// Upload de imagens
// ---------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Formato de imagem não suportado'), ok);
  }
});

function deleteUploadedFile(relativePath) {
  if (!relativePath) return;
  const filePath = path.join(__dirname, relativePath);
  fs.unlink(filePath, () => {}); // ignora erro se o arquivo já não existir
}

// ---------------------------------------------------------------
// Autenticação do admin
// ---------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Não autenticado' });
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!hash) {
    return res.status(500).json({ error: 'Senha do admin não configurada no servidor (.env)' });
  }
  if (!password || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'Senha incorreta' });
  }

  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---------------------------------------------------------------
// Shows (público: listar / admin: criar, editar, excluir)
// ---------------------------------------------------------------
app.get('/api/shows', (req, res) => {
  const db = readDb();
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = db.shows
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = db.shows
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({ upcoming, past });
});

app.post('/api/admin/shows', requireAdmin, upload.single('image'), (req, res) => {
  const { title, artist, date } = req.body;
  if (!title || !artist || !date) {
    return res.status(400).json({ error: 'Preencha nome do evento, artista e data.' });
  }

  const db = readDb();
  const show = {
    id: crypto.randomUUID(),
    title,
    artist,
    date,
    image: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString()
  };

  db.shows.push(show);
  writeDb(db);
  res.status(201).json(show);
});

app.put('/api/admin/shows/:id', requireAdmin, upload.single('image'), (req, res) => {
  const db = readDb();
  const show = db.shows.find((s) => s.id === req.params.id);
  if (!show) return res.status(404).json({ error: 'Show não encontrado.' });

  const { title, artist, date } = req.body;
  if (title) show.title = title;
  if (artist) show.artist = artist;
  if (date) show.date = date;

  if (req.file) {
    deleteUploadedFile(show.image);
    show.image = `/uploads/${req.file.filename}`;
  }

  writeDb(db);
  res.json(show);
});

app.delete('/api/admin/shows/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = db.shows.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Show não encontrado.' });

  const [removed] = db.shows.splice(idx, 1);
  deleteUploadedFile(removed.image);
  writeDb(db);
  res.json({ ok: true });
});

// ---------------------------------------------------------------
// Itens do cardápio: pratos e bebidas
// (público: listar / admin: criar, editar, excluir)
// ---------------------------------------------------------------
app.get('/api/items', (req, res) => {
  const db = readDb();
  const { category } = req.query;
  const items = category ? db.items.filter((i) => i.category === category) : db.items;
  res.json(items);
});

app.post('/api/admin/items', requireAdmin, upload.single('image'), (req, res) => {
  const { category, name, description, price } = req.body;
  if (!category || !name) {
    return res.status(400).json({ error: 'Preencha categoria e nome.' });
  }

  const db = readDb();
  const item = {
    id: crypto.randomUUID(),
    category,
    name,
    description: description || '',
    price: price || '',
    image: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString()
  };

  db.items.push(item);
  writeDb(db);
  res.status(201).json(item);
});

app.put('/api/admin/items/:id', requireAdmin, upload.single('image'), (req, res) => {
  const db = readDb();
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

  const { name, description, price, category } = req.body;
  if (name) item.name = name;
  if (description !== undefined) item.description = description;
  if (price !== undefined) item.price = price;
  if (category) item.category = category;

  if (req.file) {
    deleteUploadedFile(item.image);
    item.image = `/uploads/${req.file.filename}`;
  }

  writeDb(db);
  res.json(item);
});

app.delete('/api/admin/items/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = db.items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item não encontrado.' });

  const [removed] = db.items.splice(idx, 1);
  deleteUploadedFile(removed.image);
  writeDb(db);
  res.json({ ok: true });
});

// Tratamento simples de erros do multer (ex: arquivo grande demais)
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ---------------------------------------------------------------
// Agenda da quadra (Esportes e Lazer)
// ---------------------------------------------------------------
app.get('/api/schedule', (req, res) => {
  const db = readDb();
  res.json(db.schedule);
});

app.put('/api/admin/schedule', requireAdmin, (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) {
    return res.status(400).json({ error: 'Formato de agenda inválido.' });
  }

  const db = readDb();
  db.schedule = schedule.map((entry) => ({
    day: String(entry.day || ''),
    available: !!entry.available,
    hours: String(entry.hours || '')
  }));
  writeDb(db);
  res.json(db.schedule);
});

// ---------------------------------------------------------------
// Localização
// ---------------------------------------------------------------
app.get('/api/location', (req, res) => {
  const db = readDb();
  res.json(db.location);
});

app.put('/api/admin/location', requireAdmin, (req, res) => {
  const { address, lat, lng, description } = req.body;
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!address || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return res.status(400).json({ error: 'Preencha endereço e coordenadas válidas.' });
  }

  const db = readDb();
  db.location = {
    address,
    lat: latNum,
    lng: lngNum,
    description: description || ''
  };
  writeDb(db);
  res.json(db.location);
});

app.listen(PORT, () => {
  console.log(`Spot Beach rodando em http://localhost:${PORT}`);
  console.log(`Painel do admin em http://localhost:${PORT}/admin/admin.html`);
});
