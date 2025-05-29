const net = require("net");

const client = new net.Socket();
client.connect(5000, "192.168.0.10", () => {
  console.log("Conectado. Enviando comando...");

  const rebootCommand = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
  client.write(rebootCommand);
});

client.on("data", (data) => {
  console.log("Resposta:", data.toString("hex"));
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
