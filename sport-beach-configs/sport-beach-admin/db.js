// db.js
// Camada de acesso ao banco de dados MySQL.
//
// - Conecta usando as variáveis DB_* do arquivo .env
// - Cria as tabelas automaticamente na primeira vez (CREATE TABLE IF NOT EXISTS)
// - Expõe funções específicas (getItems, createShow, saveCourt...) em vez de
//   "ler tudo / gravar tudo" como era no arquivo JSON.

const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
      dateStrings: true // colunas DATE voltam como 'AAAA-MM-DD' (texto), não como objeto Date
    });
  }
  return pool;
}

// ---------------------------------------------------------------
// Criação das tabelas + dados iniciais
// ---------------------------------------------------------------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS items (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    category     VARCHAR(20)  NOT NULL,
    name         VARCHAR(150) NOT NULL,
    description  TEXT         NULL,
    price        VARCHAR(20)  NOT NULL DEFAULT '',
    image        VARCHAR(255) NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_items_category (category)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS shows (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    title        VARCHAR(150) NOT NULL,
    artist       VARCHAR(150) NOT NULL,
    show_date    DATE         NOT NULL,
    image        VARCHAR(255) NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_shows_date (show_date)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS court_dimensions (
    id           TINYINT      NOT NULL PRIMARY KEY,
    length_m     DOUBLE       NOT NULL,
    width_m      DOUBLE       NOT NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS sports (
    id           VARCHAR(36)  NOT NULL PRIMARY KEY,
    emoji        VARCHAR(16)  NOT NULL DEFAULT '',
    name         VARCHAR(100) NOT NULL,
    description  VARCHAR(255) NOT NULL DEFAULT '',
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS location_info (
    id           TINYINT      NOT NULL PRIMARY KEY,
    address      VARCHAR(255) NOT NULL,
    lat          DOUBLE       NOT NULL,
    lng          DOUBLE       NOT NULL,
    description  TEXT         NULL
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
];

function nextFriday() {
  const d = new Date();
  const diff = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  const db = getPool();

  // Dimensões da quadra e localização precisam existir sempre (o site depende delas)
  await db.query(
    'INSERT IGNORE INTO court_dimensions (id, length_m, width_m) VALUES (1, 16, 8)'
  );

  await db.query(
    `INSERT IGNORE INTO location_info (id, address, lat, lng, description) VALUES (1, ?, ?, ?, ?)`,
    [
      'Preencha o endereço do bar no painel do administrador',
      -20.5386,
      -47.4008,
      'Edite esta descrição e as coordenadas na aba Localização do painel.'
    ]
  );

  // Exemplos de pratos/bebidas/shows só entram se SEED_SAMPLE_DATA=true (útil em testes locais).
  if (process.env.SEED_SAMPLE_DATA === 'true') {
    const [[items]] = await db.query('SELECT COUNT(*) AS c FROM items');
    if (items.c === 0) {
      const samples = [
        ['seed-espaco-1', 'espaco', 'Deck à beira-mar', 'Mesas com vista para o pôr do sol, a poucos passos da areia.', ''],
        ['seed-espaco-2', 'espaco', 'Área dos shows', 'Palco e pista onde acontecem as apresentações ao vivo.', ''],
        ['seed-quadra-1', 'quadra', 'Quadra principal', 'Areia fofa e nivelada, com rede oficial e marcação nítida.', ''],
        ['seed-quadra-2', 'quadra', 'Visão do entardecer', 'Jogue com o sol se pondo e a arquibancada ao lado.', ''],
        ['seed-prato-1', 'prato', 'Camarão na moranga', 'Camarões salteados em molho cremoso, servidos dentro da moranga assada. Serve até 2 pessoas.', '89,90'],
        ['seed-prato-2', 'prato', 'Peixe grelhado do dia', 'Filé grelhado na chapa com legumes salteados e arroz de coco.', '64,90'],
        ['seed-bebida-1', 'bebida', 'Caipirinha Spot Beach', 'Nossa versão com limão, morango e um toque de hortelã.', '24,90'],
        ['seed-bebida-2', 'bebida', 'Spot Sunset', 'Drink autoral com vodka, maracujá e xarope de laranja, inspirado no pôr do sol da casa.', '29,90']
      ];
      for (const s of samples) {
        await db.query(
          'INSERT INTO items (id, category, name, description, price) VALUES (?, ?, ?, ?, ?)',
          s
        );
      }
    }

    const [[sports]] = await db.query('SELECT COUNT(*) AS c FROM sports');
    if (sports.c === 0) {
      const list = [
        ['seed-sport-1', '🏐', 'Vôlei de praia', 'Duplas ou quartetos, com rede oficial.'],
        ['seed-sport-2', '🎾', 'Beach tênis', 'Raquetes e bolinhas disponíveis para aluguel.'],
        ['seed-sport-3', '⚽', 'Futevôlei', 'Pé, peito e cabeça. Nada de mão!']
      ];
      for (const sp of list) {
        await db.query('INSERT INTO sports (id, emoji, name, description) VALUES (?, ?, ?, ?)', sp);
      }
    }

    const [[shows]] = await db.query('SELECT COUNT(*) AS c FROM shows');
    if (shows.c === 0) {
      await db.query(
        'INSERT INTO shows (id, title, artist, show_date) VALUES (?, ?, ?, ?)',
        ['seed-show-1', 'Sunset Session', 'Banda Maré Alta', nextFriday()]
      );
    }
  }
}

async function initDb() {
  const db = getPool();
  await db.query('SELECT 1'); // falha cedo e com mensagem clara se a conexão estiver errada
  for (const statement of SCHEMA) {
    await db.query(statement);
  }
  await seed();
}

// ---------------------------------------------------------------
// Itens (pratos, bebidas, fotos do espaço)
// ---------------------------------------------------------------
function mapItem(r) {
  return {
    id: r.id,
    category: r.category,
    name: r.name,
    description: r.description || '',
    price: r.price || '',
    image: r.image,
    createdAt: r.created_at
  };
}

async function getItems(category) {
  const [rows] = category
    ? await getPool().query('SELECT * FROM items WHERE category = ? ORDER BY created_at, id', [category])
    : await getPool().query('SELECT * FROM items ORDER BY created_at, id');
  return rows.map(mapItem);
}

async function getItemById(id) {
  const [rows] = await getPool().query('SELECT * FROM items WHERE id = ?', [id]);
  return rows[0] ? mapItem(rows[0]) : null;
}

async function createItem(item) {
  await getPool().query(
    'INSERT INTO items (id, category, name, description, price, image) VALUES (?, ?, ?, ?, ?, ?)',
    [item.id, item.category, item.name, item.description, item.price, item.image]
  );
  return getItemById(item.id);
}

async function updateItem(item) {
  await getPool().query(
    'UPDATE items SET category = ?, name = ?, description = ?, price = ?, image = ? WHERE id = ?',
    [item.category, item.name, item.description, item.price, item.image, item.id]
  );
  return getItemById(item.id);
}

async function deleteItem(id) {
  await getPool().query('DELETE FROM items WHERE id = ?', [id]);
}

// ---------------------------------------------------------------
// Shows
// ---------------------------------------------------------------
function mapShow(r) {
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    date: r.show_date,
    image: r.image,
    createdAt: r.created_at
  };
}

async function getShows() {
  const [rows] = await getPool().query('SELECT * FROM shows ORDER BY show_date, created_at');
  return rows.map(mapShow);
}

async function getShowById(id) {
  const [rows] = await getPool().query('SELECT * FROM shows WHERE id = ?', [id]);
  return rows[0] ? mapShow(rows[0]) : null;
}

async function createShow(show) {
  await getPool().query(
    'INSERT INTO shows (id, title, artist, show_date, image) VALUES (?, ?, ?, ?, ?)',
    [show.id, show.title, show.artist, show.date, show.image]
  );
  return getShowById(show.id);
}

async function updateShow(show) {
  await getPool().query(
    'UPDATE shows SET title = ?, artist = ?, show_date = ?, image = ? WHERE id = ?',
    [show.title, show.artist, show.date, show.image, show.id]
  );
  return getShowById(show.id);
}

async function deleteShow(id) {
  await getPool().query('DELETE FROM shows WHERE id = ?', [id]);
}

// ---------------------------------------------------------------
// Dimensões da quadra
// ---------------------------------------------------------------
async function getCourt() {
  const [rows] = await getPool().query('SELECT length_m, width_m FROM court_dimensions WHERE id = 1');
  const r = rows[0] || { length_m: 16, width_m: 8 };
  return { length: r.length_m, width: r.width_m };
}

async function saveCourt(court) {
  await getPool().query(
    `INSERT INTO court_dimensions (id, length_m, width_m) VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE length_m = VALUES(length_m), width_m = VALUES(width_m)`,
    [court.length, court.width]
  );
  return getCourt();
}

// ---------------------------------------------------------------
// Esportes praticados na quadra
// ---------------------------------------------------------------
function mapSport(r) {
  return { id: r.id, emoji: r.emoji, name: r.name, description: r.description || '', createdAt: r.created_at };
}

async function getSports() {
  const [rows] = await getPool().query('SELECT * FROM sports ORDER BY created_at, id');
  return rows.map(mapSport);
}

async function createSport(sport) {
  await getPool().query(
    'INSERT INTO sports (id, emoji, name, description) VALUES (?, ?, ?, ?)',
    [sport.id, sport.emoji, sport.name, sport.description]
  );
  const [rows] = await getPool().query('SELECT * FROM sports WHERE id = ?', [sport.id]);
  return mapSport(rows[0]);
}

async function deleteSport(id) {
  const [r] = await getPool().query('DELETE FROM sports WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

// ---------------------------------------------------------------
// Localização
// ---------------------------------------------------------------
async function getLocation() {
  const [rows] = await getPool().query(
    'SELECT address, lat, lng, description FROM location_info WHERE id = 1'
  );
  const r = rows[0];
  return { address: r.address, lat: r.lat, lng: r.lng, description: r.description || '' };
}

async function saveLocation(loc) {
  await getPool().query(
    `INSERT INTO location_info (id, address, lat, lng, description) VALUES (1, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE address = VALUES(address), lat = VALUES(lat), lng = VALUES(lng), description = VALUES(description)`,
    [loc.address, loc.lat, loc.lng, loc.description]
  );
  return getLocation();
}

module.exports = {
  getPool, initDb,
  getItems, getItemById, createItem, updateItem, deleteItem,
  getShows, getShowById, createShow, updateShow, deleteShow,
  getCourt, saveCourt,
  getSports, createSport, deleteSport,
  getLocation, saveLocation
};
