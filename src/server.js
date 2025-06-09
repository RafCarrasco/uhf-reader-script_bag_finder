const express = require("express");
const app = express();
const PORT = 5000;

// Permite que o body venha como JSON ou texto bruto
app.use(express.json());
app.use(express.text({ type: "*/*" }));

app.post("/", (req, res) => {
  const data = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  const timestamp = new Date().toISOString();

  console.log(`\n[${timestamp}] 📦 Dados recebidos do leitor:`);
  console.log(data);

  // Aqui você pode tratar, salvar no Firebase etc.

  res.sendStatus(200); // Confirma pro leitor que recebeu
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP escutando em http://0.0.0.0:${PORT}`);
});
