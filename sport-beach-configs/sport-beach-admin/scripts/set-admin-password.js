// scripts/set-admin-password.js
// Gera o hash da senha do admin para colocar no arquivo .env.
//
// Uso:
//   node scripts/set-admin-password.js "sua-senha-aqui"
//
// Copie o hash impresso e cole em ADMIN_PASSWORD_HASH no .env

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('Uso: node scripts/set-admin-password.js "sua-senha-aqui"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log('\nCole esta linha no seu arquivo .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
