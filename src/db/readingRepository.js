import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

const locais = [
  "São Paulo",
  "Miami",
  "Nova York",
  "Paris",
  "Dubai",
  "Tóquio",
  "Pequim",
  "Londres",
  "Berlim",
  "Los Angeles",
  "Toronto",
  "Madri",
  "Cairo",
  "Johannesburgo",
  "Sydney"
];

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Encontrar a Mala (BAG) diretamente pelo EPC
    const [bags] = await conn.query(
      "SELECT id, printed_code FROM bags WHERE epc = ? LIMIT 1",
      [epc]
    );

    if (bags.length === 0) {
      // 🛑 CORREÇÃO CRÍTICA AQUI: Não lançar um erro.
      // Faz o rollback da transação (pois não há nada para salvar)
      await conn.rollback();

      console.log(`⚠️ EPC ${epc} não cadastrado em nenhuma mala.`);

      // Retorna o status de "Tag Não Cadastrada" para o Controller enviar via WebSocket
      return { 
        readingId: null, 
        epc: epc, 
        status: 'NAO_CADASTRADA', // Sinaliza o Flutter para preencher o campo
        destination: null, 
        bag_id: null 
      };
    }

    // -------------------------------------------------------------
    // Lógica de SUCESSO (Tag Cadastrada)
    // -------------------------------------------------------------
    const { id: bagId, printed_code } = bags[0];

    // 2. Registrar a Leitura em bag_readings
    const localLeitura = location || 'Localização Desconhecida';
    const readingId = uuidv4();

    // ⚠️ ATENÇÃO: Corrigi o INSERT para incluir o 'epc' no log, se a tabela tiver a coluna 'epc'.
    // Caso contrário, use a versão que já estava funcionando:
    await conn.query(
      `INSERT INTO bag_readings (id, bag_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, bagId, localLeitura]
    );

    // 3. Determinar o Próximo Status (lógica de alternância)
    const [lastEvent] = await conn.query(
      "SELECT status FROM bag_status_events WHERE bag_id = ? ORDER BY created_at DESC LIMIT 1",
      [bagId]
    );

    let proximoStatus = 'embarque'; 
    if (lastEvent.length > 0) {
      proximoStatus = lastEvent[0].status.toLowerCase() === 'embarque' ? 'desembarque' : 'embarque';
    }

    const destinoDoEvento = localLeitura;

    // 4. Inserir o Novo Evento na bag_status_events
    const eventId = uuidv4();
    await conn.query(
      `INSERT INTO bag_status_events 
       (id, bag_id, status, destination, rfid_tag, printed_code, created_at, is_final_destination) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [eventId, bagId, proximoStatus, destinoDoEvento, epc, printed_code]
    );

    await conn.query(`UPDATE bags SET updated_at = NOW() WHERE id = ?`, [bagId]);

    await conn.commit();

    return { readingId, epc, status: proximoStatus, destination: destinoDoEvento, bag_id: bagId };

  } catch (err) {
    // Captura APENAS erros críticos de DB/transação
    await conn.rollback();
    console.error("[DB ERROR] Falha ao salvar leitura e evento:", err);
    throw err;
  } finally {
    conn.release();
  }
}

export async function listReadingsByBagId(bagId) {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `
      SELECT br.id, br.location, br.read_time, b.epc /* ⬅️ Pega o EPC da tabela bags */
      FROM bag_readings br
      JOIN bags b ON br.bag_id = b.id /* ⬅️ NOVO JOIN: Liga readings à bags */
      WHERE br.bag_id = ? 
      ORDER BY br.read_time ASC
      `,
      [bagId]
    );

    return rows;
  } finally {
    conn.release();
  }
}
