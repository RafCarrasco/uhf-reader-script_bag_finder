import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

export const initWebSocket = (server) => {
    wss = new WebSocketServer({ server });
    console.log('🌐 WebSocket Server inicializado.');

    wss.on('connection', (ws) => {
        console.log('Novo cliente WebSocket conectado.');
    });
};

export const broadcast = (data) => {
    if (!wss) {
        console.error('WebSocket Server não está inicializado.');
        return;
    }
    
    const message = JSON.stringify(data);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log(`[WS] Broadcast enviado: Status da mala atualizado.`);
};