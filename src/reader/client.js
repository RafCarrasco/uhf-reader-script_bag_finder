import net from "net";
import fetch from "node-fetch";

const HOST = "192.168.0.10";
const PORT = 5000;
const API_URL = "http://localhost:3000/bags/readings";

let ultimaLeitura = "";

const client = new net.Socket();
client.connect(PORT, HOST, () => {
  console.log(`Conectado ao leitor ${HOST}:${PORT}`);
});

client.on("data", async (data) => {
  const hex = data.toString("hex").toUpperCase();
  const timestamp = new Date().toISOString();

  if (hex.length >= 32) {
    const epc = hex.match(/E280\w+/);
    if (epc && epc[0] !== ultimaLeitura) {
      ultimaLeitura = epc[0];

      console.log(`[${timestamp}] EPC detectado: ${epc[0]}`);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            epc: epc[0],
            timestamp,
            location: "reader-01"
          })
        });

        if (res.ok) {
          console.log(`✅ EPC ${epc[0]} enviado para API`);
        } else {
          console.error(`❌ Erro ao enviar para API: ${res.status}`);
        }
      } catch (err) {
        console.error("Erro na requisição:", err.message);
      }
    }
  }
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
