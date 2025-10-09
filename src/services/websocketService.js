// src/services/websocketService.js
import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

// 1. Inicializa o servidor WebSocket (usa o mesmo servidor HTTP)
export const initWebSocket = (server) => {
    wss = new WebSocketServer({ server });
    console.log('🌐 WebSocket Server inicializado.');

    wss.on('connection', (ws) => {
        console.log('Novo cliente WebSocket conectado.');
    });
};

// 2. Função para enviar dados para todos os clientes conectados (Flutter)
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