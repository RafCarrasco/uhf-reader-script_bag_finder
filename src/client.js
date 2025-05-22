const net = require("net");

const client = new net.Socket();
client.connect(5000, "192.168.0.10", () => {
  console.log("Conectado ao leitor");
});

client.on("data", (data) => {
  const hex = data.toString("hex").toUpperCase();
  const ascii = data.toString("ascii");
  console.log("Dados recebidos:");
  console.log("HEX:", hex);
  console.log("ASCII:", ascii);
});

client.on("close", () => {
  console.log("Conexão encerrada");
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});
