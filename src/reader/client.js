import net from "net";
import fetch from "node-fetch";

const HOST = "192.168.0.10";
const PORT = 5000;
const API_URL = "http://localhost:3000/bags/readings";

let ultimaLeitura = "";
const TEMPO_RESET = 1000; // 1 segundo

const client = new net.Socket();
client.connect(PORT, HOST, () => {
  console.log(`Conectado ao leitor ${HOST}:${PORT}`);
});

client.on("data", async (data) => {
  const hex = data.toString("hex").toUpperCase();

  // Ignora pacotes sem EPC
  if (!hex.includes("E280")) return;

  // Pega só o EPC (remove cabeçalho do leitor)
  const index = hex.indexOf("E280");
  const epcRaw = hex.substring(index, index + 28); // 28 chars = 14 bytes EPC
  const epc = epcRaw.toUpperCase();

  // Ignora EPC inválido ou incompleto
  if (epc.length < 28) return;

  const timestamp = new Date().toISOString();

  // Evita repetir a mesma leitura em pouco tempo
  if (epc === ultimaLeitura) return;
  ultimaLeitura = epc;
  setTimeout(() => (ultimaLeitura = ""), TEMPO_RESET);

  console.log(`[${timestamp}] EPC detectado: ${epc}`);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        epc,
        timestamp,
        location: "reader-01",
      }),
    });

    if (res.ok) {
      console.log(`✅ EPC ${epc} enviado para API`);
    } else {
      console.error(`❌ Erro ao enviar para API: ${res.status}`);
    }
  } catch (err) {
    console.error("Erro na requisição:", err.message);
  }
});

client.on("error", (err) => {
  console.error("Erro:", err.message);
});

client.on("close", () => {
  console.log("Conexão encerrada");
});
