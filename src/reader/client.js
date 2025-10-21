import net from "net";
import fetch from "node-fetch";

const HOST = "192.168.0.10";
const PORT = 5000;
const API_URL = "http://localhost:3000/bags/readings";

let ultimaLeitura = "";
const TEMPO_RESET = 1000;

const client = new net.Socket();
client.connect(PORT, HOST, () => {
  console.log(`Conectado ao leitor ${HOST}:${PORT}`);
});

client.on("data", async (data) => {
  const hex = data.toString("hex").toUpperCase();

  if (!hex.includes("E280")) return;

  const index = hex.indexOf("E280");
  const epcRaw = hex.substring(index, index + 28).toUpperCase(); // <-- Alterada para já incluir .toUpperCase()

  // 1. NOVO CÓDIGO: Realiza o corte para obter a EPC reduzida
  const epcCompleta = epcRaw;
  const epc = epcCompleta.slice(0, -4); // A variável 'epc' agora tem 24 caracteres!

  if (epc.length < 24) return; // 2. ALTERADA: A validação agora é para 24 (28 - 4)

  const timestamp = new Date().toISOString();

  // 3. ALTERADA: O bloqueio é feito usando a 'epc' reduzida (24 caracteres)
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
