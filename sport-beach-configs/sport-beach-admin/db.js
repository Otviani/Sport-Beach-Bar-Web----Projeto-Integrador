// db.js
// Camada bem simples de "banco de dados": um arquivo JSON em disco.
// Guarda tudo que o admin cadastra: itens (pratos, bebidas, fotos do
// espaço), shows, agenda da quadra e a localização do bar.
//
// Isso é suficiente para o site rodar sozinho, sem precisar instalar
// nenhum servidor de banco. Se um dia vocês quiserem migrar para MySQL
// (como no sistema contábil), basta trocar a implementação deste
// arquivo — as rotas da API em server.js não precisam mudar.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function seedData() {
  return {
    shows: [
      {
        id: 'seed-show-1',
        title: 'Sunset Session',
        artist: 'Banda Maré Alta',
        date: nextFriday(),
        image: null,
        createdAt: new Date().toISOString()
      }
    ],
    items: [
      {
        id: 'seed-espaco-1',
        category: 'espaco',
        name: 'Deck à beira-mar',
        description: 'Mesas com vista para o pôr do sol, a poucos passos da areia.',
        price: '',
        image: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-espaco-2',
        category: 'espaco',
        name: 'Área dos shows',
        description: 'Palco e pista onde acontecem as apresentações ao vivo.',
        price: '',
        image: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-prato-1',
        category: 'prato',
        name: 'Camarão na moranga',
        description: 'Camarões salteados em molho cremoso, servidos dentro da moranga assada. Serve até 2 pessoas.',
        price: '89,90',
        image: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-prato-2',
        category: 'prato',
        name: 'Peixe grelhado do dia',
        description: 'Filé grelhado na chapa com legumes salteados e arroz de coco.',
        price: '64,90',
        image: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-bebida-1',
        category: 'bebida',
        name: 'Caipirinha Spot Beach',
        description: 'Nossa versão com limão, morango e um toque de hortelã.',
        price: '24,90',
        image: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 'seed-bebida-2',
        category: 'bebida',
        name: 'Spot Sunset',
        description: 'Drink autoral com vodka, maracujá e xarope de laranja, inspirado no pôr do sol da casa.',
        price: '29,90',
        image: null,
        createdAt: new Date().toISOString()
      }
    ],
    schedule: WEEKDAYS.map((day) => ({
      day,
      available: day !== 'Segunda',
      hours: day === 'Segunda' ? '' : '14h às 22h'
    })),
    location: {
      address: 'Preencha o endereço do bar no painel do administrador',
      lat: -20.5386,
      lng: -47.4008,
      description: 'Edite esta descrição e as coordenadas na aba Localização do painel.'
    }
  };
}

function nextFriday() {
  const d = new Date();
  const day = d.getDay();
  const diff = (5 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(seedData(), null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // Compatibilidade com bancos criados antes da agenda/localização existirem
  if (!data.schedule) {
    data.schedule = WEEKDAYS.map((day) => ({ day, available: false, hours: '' }));
  }
  if (!data.location) {
    data.location = seedData().location;
  }

  return data;
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb, WEEKDAYS };
