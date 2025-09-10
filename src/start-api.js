import app from './api/api.js';
import { pingDB } from './db/db.js';

const PORT = process.env.PORT || 3000;

async function start() {
  const ok = await pingDB();
  if (!ok) {
    console.error('Erro ao conectar no MySQL');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(` API rodando em http://localhost:${PORT}`);
  });
}

start();
