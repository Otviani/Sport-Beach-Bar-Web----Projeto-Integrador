// scripts/migrate-json-to-mysql.js
// Copia os dados do antigo arquivo data/db.json para o MySQL.
//
// Uso (com o .env já configurado com as variáveis DB_*):
//   npm run migrate-json
//
// Pode ser executado mais de uma vez: itens/shows que já existem (mesmo id) são ignorados.
// Lembre-se de copiar também a pasta "uploads/" junto, senão as imagens não aparecem.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function main() {
  const jsonPath = path.join(__dirname, '..', 'data', 'db.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('Nenhum data/db.json encontrado — nada para migrar.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  await db.initDb();
  const pool = db.getPool();

  let items = 0;
  for (const i of data.items || []) {
    const [r] = await pool.query(
      'INSERT IGNORE INTO items (id, category, name, description, price, image) VALUES (?, ?, ?, ?, ?, ?)',
      [i.id, i.category, i.name, i.description || '', i.price || '', i.image || null]
    );
    items += r.affectedRows;
  }

  let shows = 0;
  for (const s of data.shows || []) {
    const [r] = await pool.query(
      'INSERT IGNORE INTO shows (id, title, artist, show_date, image) VALUES (?, ?, ?, ?, ?)',
      [s.id, s.title, s.artist, s.date, s.image || null]
    );
    shows += r.affectedRows;
  }

  if (data.location) {
    await db.saveLocation({
      address: data.location.address,
      lat: Number(data.location.lat),
      lng: Number(data.location.lng),
      description: data.location.description || ''
    });
  }

  console.log(`Migração concluída: ${items} itens e ${shows} shows copiados; localização atualizada.`);
}

main()
  .catch((err) => { console.error('Falha na migração:', err.message); process.exitCode = 1; })
  .finally(() => db.getPool().end());
