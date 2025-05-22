const net = require("net");
const fs = require("fs");

const HOST = "0.0.0.0";
const PORT = 5000;

let ultimaMensagem = "";

const server = net.createServer((socket) => {
  const ip = socket.remoteAddress;
  console.log(`Leitor conectado: ${ip}`);

  socket.on("data", (data) => {
    const hex = data.toString("hex").toUpperCase();
    const ascii = data.toString("ascii").replace(/\W/g, "");
    const timestamp = new Date().toISOString();

    if (hex !== ultimaMensagem) {
      ultimaMensagem = hex;

      console.log(`\n[${timestamp}] Dados recebidos:`);
      console.log(`HEX  : ${hex}`);
      console.log(`ASCII: ${ascii}`);

      fs.appendFileSync("leituras.txt", `[${timestamp}] HEX: ${hex} | ASCII: ${ascii}\n`);
    }
  });

  socket.on("end", () => {
    console.log("Leitor desconectado:", ip);
  });

  socket.on("error", (err) => {
    console.error("Erro:", err.message);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor TCP escutando em ${HOST}:${PORT}`);
});
