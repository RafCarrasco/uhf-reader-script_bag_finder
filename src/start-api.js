import app from './api/api.js';
import { pingDB } from './db/db.js';
import { cfg } from './config/config.js';
import { initWebSocket } from './services/websocketService.js'; 


const PORT = cfg.apiPort || process.env.PORT || 3000; 

async function start() {

    const ok = await pingDB();
    if (!ok) {
        console.error('❌ Erro ao conectar no MySQL. Verifique as credenciais.');
        process.exit(1);
    }
    

    const server = app.listen(PORT, () => { 
        console.log(`🚀 API HTTP rodando em http://localhost:${PORT}`);
    });
    
    initWebSocket(server); 
}

start();