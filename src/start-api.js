// start-api.js (Versão Corrigida e Integrada)

// 1. Adicione os imports necessários
import app from './api/api.js';
import { pingDB } from './db/db.js';
import { cfg } from './config/config.js';
import { initWebSocket } from './services/websocketService.js'; 

// Ajusta a porta para usar a sua configuração (se o .env estiver configurado)
const PORT = cfg.apiPort || process.env.PORT || 3000; 

async function start() {
    // 2. Lógica de verificação de DB (Mantida)
    const ok = await pingDB();
    if (!ok) {
        console.error('❌ Erro ao conectar no MySQL. Verifique as credenciais.');
        process.exit(1);
    }
    
    // 3. Inicia o servidor HTTP e armazena a referência
    // É crucial armazenar a referência em 'server'
    const server = app.listen(PORT, () => { 
        console.log(`🚀 API HTTP rodando em http://localhost:${PORT}`);
    });
    
    // 4. Inicializa o WebSocket, anexando-o ao servidor HTTP já existente
    initWebSocket(server); 
}

start();