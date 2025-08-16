import app from './api/api.js';
import { cfg } from './config/config.js';

app.listen(cfg.apiPort, () => {
  console.log(`API up on http://localhost:${cfg.apiPort}`);
});
