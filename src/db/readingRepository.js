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

    // 1. Encontrar a Mala (BAG) diretamente pelo EPC (NOVA LÓGICA)
    const [bags] = await conn.query(
      "SELECT id, printed_code FROM bags WHERE epc = ? LIMIT 1", // Procura diretamente na tabela bags
      [epc]
    );

    if (bags.length === 0) {
      console.log(`⚠️ EPC ${epc} não cadastrado em nenhuma mala.`);
      await conn.rollback();
      // Retorne um erro que o controller possa tratar como 404/não cadastrado
      throw new Error("Tag não vinculada a uma mala ativa."); 
    }

    const { id: bagId, printed_code } = bags[0];
    
    // Agora o fluxo continua a partir daqui, usando apenas bagId:

    // 2. Registrar a Leitura em bag_readings
    const localLeitura = location || 'Localização Desconhecida'; // Simplificado, use sua lógica de locais
    const readingId = uuidv4();
    
    // ⚠️ ATENÇÃO: Se você criou bag_readings sem rfid_id, use este INSERT:
    await conn.query(
      `INSERT INTO bag_readings (id, bag_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, bagId, localLeitura]
    );
    // Se você Manteve o campo rfid_id/epc em bag_readings, ajuste a query de INSERT

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

    // ... (retorno de sucesso)
    return { readingId, epc, status: proximoStatus, destination: destinoDoEvento, bag_id: bagId };

  } catch (err) {
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
      SELECT br.id, br.location, br.read_time, rt.code AS epc
      FROM bag_readings br
      INNER JOIN rfid_tags rt ON br.rfid_id = rt.id
      WHERE rt.bag_id = ?
      ORDER BY br.read_time ASC
      `,
      [bagId]
    );

    return rows;
  } finally {
    conn.release();
  }
}
