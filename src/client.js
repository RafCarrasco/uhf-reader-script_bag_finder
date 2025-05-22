const net = require("net");

const client = new net.Socket();
const HOST = "192.168.0.10";
const PORT = 5000;

let ultimaMensagem = "";

client.connect(PORT, HOST, () => {
  console.log(`Conectado ao leitor em ${HOST}:${PORT}`);
});

client.on("data", (data) => {
  const hex = data.toString("hex").toUpperCase();
  const ascii = data.toString("ascii").replace(/\W/g, "");
  const timestamp = new Date().toISOString();

  if (hex !== ultimaMensagem) {
    ultimaMensagem = hex;

    console.log(`\n[${timestamp}] Dados recebidos:`);
    console.log("HEX  :", hex);
    console.log("ASCII:", ascii);
  }
});

client.on("close", () => {
  console.log("Conexão encerrada");
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});
