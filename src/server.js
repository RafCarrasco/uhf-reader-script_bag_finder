const net = require("net");
const fs = require("fs");

const HOST = "0.0.0.0"; 
const PORT = 5000;    

const server = net.createServer((socket) => {
    const clientIP = socket.remoteAddress;
    console.log(" Leitor conectado:", clientIP);

    socket.on("data", (data) => {
        const hex = data.toString("hex").toUpperCase();
        const timestamp = new Date().toISOString();

        console.log(`[${timestamp}] Dados recebidos: ${hex}`);

        fs.appendFileSync("leituras.txt", `[${timestamp}] ${hex}\n`);
    });

    socket.on("end", () => {
        console.log("🔌 Leitor desconectado:", clientIP);
    });

    socket.on("error", (err) => {
        console.error("Erro:", err.message);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`Servidor aguardando conexões em ${HOST}:${PORT}`);
});
