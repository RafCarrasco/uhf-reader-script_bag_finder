const net = require("net");

function crc16(buffer) {
  let crc = 0xFFFF;
  for (let pos = 0; pos < buffer.length; pos++) {
    crc ^= buffer[pos];
    for (let i = 0; i < 8; i++) {
      crc = (crc & 1) ? (crc >> 1) ^ 0x8408 : crc >> 1;
    }
  }
  return crc;
}

function buildInventoryCommand() {
  const data = Buffer.from([
    0x0C, 0x00, 0x01,
    0x04, 0x00, 0x00,
    0x00, 0x00, 0x00,
    0x00, 0x00
  ]);
  const crc = crc16(data);
  return Buffer.concat([data, Buffer.from([crc & 0xff, (crc >> 8) & 0xff])]);
}

function buildGetBufferCommand() {
  const data = Buffer.from([0x04, 0x00, 0x27, 0x01]);
  const crc = crc16(data);
  return Buffer.concat([data, Buffer.from([crc & 0xff, (crc >> 8) & 0xff])]);
}

// Conecta
const client = new net.Socket();
client.connect(6000, "192.168.0.7", () => {
  console.log("Conectado ao leitor");
  const inventory = buildInventoryCommand();
  console.log("→ Enviando comando Inventory...");
  client.write(inventory);

  // Aguarda 500ms e envia o Get Buffer
  setTimeout(() => {
    const buffer = buildGetBufferCommand();
    console.log("→ Enviando comando Get Buffer...");
    client.write(buffer);
  }, 500);
});

client.on("data", (data) => {
  console.log("← Resposta recebida:", data.toString("hex"));
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
