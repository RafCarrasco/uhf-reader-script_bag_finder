const net = require("net");

const HOST = "192.168.0.10";
const PORT = 5000;

let ultimaLeitura = "";

const client = new net.Socket();
client.connect(PORT, HOST, () => {
  console.log(`Conectado ao leitor ${HOST}:${PORT}`);
});

client.on("data", (data) => {
  const hex = data.toString("hex").toUpperCase();
  const timestamp = new Date().toISOString();

  if (hex.length >= 32) {
    const epc = hex.match(/E280\w+/);
    if (epc && epc[0] !== ultimaLeitura) {
      ultimaLeitura = epc[0];
      console.log(`[${timestamp}] EPC detectado: ${epc[0]}`);
    }
  }
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
