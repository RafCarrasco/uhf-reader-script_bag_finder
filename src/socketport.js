const net = require('net');
const PORT = 5000;

// Cria um novo servidor TCP
const server = net.createServer((socket) => {
  // socket é a conexão com um cliente (nosso leitor RFID)
  const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`\n✅ Cliente conectado do IP: ${clientAddress}`);

  // Quando o servidor recebe dados do cliente
  socket.on('data', (data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📦 Dados recebidos:`);
    console.log(data.toString()); // Convertemos os dados para texto
  });

  // Quando a conexão com o cliente é fechada
  socket.on('close', () => {
    console.log(`❌ Conexão com ${clientAddress} fechada.`);
  });

  // Lidando com erros de conexão
  socket.on('error', (err) => {
    console.error(`Erro na conexão: ${err.message}`);
  });
});

// O servidor começa a escutar por conexões na porta especificada
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor TCP puro escutando na porta ${PORT}`);
  console.log('Aguardando conexão do leitor RFID...');
});