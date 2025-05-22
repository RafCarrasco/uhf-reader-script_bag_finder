const net = require("net");

const client = new net.Socket();
client.connect(5000, "192.168.0.10", () => {
  console.log("Conectado ao leitor");

  const command = Buffer.from([0x04, 0x00, 0x27, 0x01]); 
  client.write(command);
});

client.on("data", (data) => {
  console.log("Dados recebidos:", data.toString("hex"));
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
