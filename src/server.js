const net = require('net');

const HOST = '0.0.0.0';
const PORT = 8234;

const server = net.createServer((socket) => {
    console.log('Cliente conectado:', socket.remoteAddress);

    socket.on('data', (data) => {
        const mensagem = data.toString().trim();
        console.log('Dados recebidos:', mensagem);

        // Aqui você pode tratar os dados, salvar em arquivo ou banco, etc.
    });

    socket.on('end', () => {
        console.log('Cliente desconectado');
    });

    socket.on('error', (err) => {
        console.error('Erro:', err.message);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Servidor TCP ouvindo em ${HOST}:${PORT}`);
});
