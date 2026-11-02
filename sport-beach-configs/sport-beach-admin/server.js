// server.js
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Onde as imagens enviadas ficam salvas. Por padrão, a pasta "uploads" do projeto,
// mas dá para apontar para outro lugar com UPLOADS_DIR no .env.
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Em hospedagens com proxy na frente, isso faz o Express
// enxergar corretamente que a conexão é HTTPS.
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'troque-este-segredo-no-.env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // sessão dura 4h
    httpOnly: true,
    sameSite: 'lax',
    secure: 'auto' // cookie "seguro" só quando o acesso é por HTTPS
  }
}));

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

// Express 4 não captura erros de funções async sozinho; este helper faz isso.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Data de "hoje" no fuso de Brasília (evita o show do dia sumir à noite por causa do UTC)
function todayBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

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

function deleteUploadedFile(imagePath) {
  if (!imagePath) return;
  const filePath = path.join(UPLOADS_DIR, path.basename(imagePath));
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
app.get('/api/shows', asyncHandler(async (req, res) => {
  const shows = await db.getShows();
  const today = todayBR();

  const upcoming = shows
    .filter((s) => s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = shows
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  res.json({ upcoming, past });
}));

app.post('/api/admin/shows', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { title, artist, date } = req.body;
  if (!title || !artist || !date) {
    return res.status(400).json({ error: 'Preencha nome do evento, artista e data.' });
  }

  const show = await db.createShow({
    id: crypto.randomUUID(),
    title,
    artist,
    date,
    image: req.file ? `/uploads/${req.file.filename}` : null
  });

  res.status(201).json(show);
}));

app.put('/api/admin/shows/:id', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const show = await db.getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show não encontrado.' });

  const { title, artist, date } = req.body;
  if (title) show.title = title;
  if (artist) show.artist = artist;
  if (date) show.date = date;

  if (req.file) {
    deleteUploadedFile(show.image);
    show.image = `/uploads/${req.file.filename}`;
  }

  res.json(await db.updateShow(show));
}));

app.delete('/api/admin/shows/:id', requireAdmin, asyncHandler(async (req, res) => {
  const show = await db.getShowById(req.params.id);
  if (!show) return res.status(404).json({ error: 'Show não encontrado.' });

  await db.deleteShow(show.id);
  deleteUploadedFile(show.image);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// Itens: pratos, bebidas e fotos do espaço
// (público: listar / admin: criar, editar, excluir)
// ---------------------------------------------------------------
app.get('/api/items', asyncHandler(async (req, res) => {
  res.json(await db.getItems(req.query.category));
}));

app.post('/api/admin/items', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { category, name, description, price } = req.body;
  if (!category || !name) {
    return res.status(400).json({ error: 'Preencha categoria e nome.' });
  }

  const item = await db.createItem({
    id: crypto.randomUUID(),
    category,
    name,
    description: description || '',
    price: price || '',
    image: req.file ? `/uploads/${req.file.filename}` : null
  });

  res.status(201).json(item);
}));

app.put('/api/admin/items/:id', requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const item = await db.getItemById(req.params.id);
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

  res.json(await db.updateItem(item));
}));

app.delete('/api/admin/items/:id', requireAdmin, asyncHandler(async (req, res) => {
  const item = await db.getItemById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

  await db.deleteItem(item.id);
  deleteUploadedFile(item.image);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// Quadra (Esportes e Lazer): dimensões e esportes praticados.
// As fotos da quadra usam as rotas de itens, com category = 'quadra'.
// ---------------------------------------------------------------
const COURT_LIMITS = { length: [6, 30], width: [4, 16] }; // mesmos limites do desenho na tela

app.get('/api/court', asyncHandler(async (req, res) => {
  res.json(await db.getCourt());
}));

app.put('/api/admin/court', requireAdmin, asyncHandler(async (req, res) => {
  const length = Number(req.body.length);
  const width = Number(req.body.width);
  const [lMin, lMax] = COURT_LIMITS.length;
  const [wMin, wMax] = COURT_LIMITS.width;

  if (Number.isNaN(length) || Number.isNaN(width)
      || length < lMin || length > lMax || width < wMin || width > wMax) {
    return res.status(400).json({
      error: `Use comprimento entre ${lMin} e ${lMax} m e largura entre ${wMin} e ${wMax} m.`
    });
  }

  res.json(await db.saveCourt({ length, width }));
}));

app.get('/api/sports', asyncHandler(async (req, res) => {
  res.json(await db.getSports());
}));

app.post('/api/admin/sports', requireAdmin, asyncHandler(async (req, res) => {
  const { emoji, name, description } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Informe o nome do esporte.' });
  }

  const sport = await db.createSport({
    id: crypto.randomUUID(),
    emoji: String(emoji || '🏖️').trim().slice(0, 8),
    name: String(name).trim(),
    description: String(description || '').trim()
  });
  res.status(201).json(sport);
}));

app.delete('/api/admin/sports/:id', requireAdmin, asyncHandler(async (req, res) => {
  const removed = await db.deleteSport(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Esporte não encontrado.' });
  res.json({ ok: true });
}));

// ---------------------------------------------------------------
// Localização
// ---------------------------------------------------------------
app.get('/api/location', asyncHandler(async (req, res) => {
  res.json(await db.getLocation());
}));

app.put('/api/admin/location', requireAdmin, asyncHandler(async (req, res) => {
  const { address, lat, lng, description } = req.body;
  const latNum = Number(lat);
  const lngNum = Number(lng);

  if (!address || Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    return res.status(400).json({ error: 'Preencha endereço e coordenadas válidas.' });
  }

  res.json(await db.saveLocation({
    address,
    lat: latNum,
    lng: lngNum,
    description: description || ''
  }));
}));

// ---------------------------------------------------------------
// Tratamento de erros (deve ficar depois de todas as rotas)
// ---------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Formato de imagem não suportado') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ---------------------------------------------------------------
// Inicialização: conecta no MySQL, cria tabelas se preciso e sobe o servidor
// ---------------------------------------------------------------
db.initDb()
  .then(() => {
    app.listen(PORT, () => {
    console.log(`Spot Beach rodando em http://localhost:${PORT}`);
    console.log(`Painel do admin em http://localhost:${PORT}/admin/admin.html`);
    });
  })
  .catch((err) => {
    console.error('Não foi possível conectar ao MySQL. Confira as variáveis DB_* no .env.');
    console.error(err.message);
    process.exit(1);
  });
