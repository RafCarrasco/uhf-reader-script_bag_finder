import { pool } from "../../db/db.js";
import { v4 as uuidv4 } from 'uuid';

let lastStatus = 'embarque';

export async function processEPC(epc) {
  try {
    console.log(`Recebendo EPC: ${epc}`);

    // ✅ Extrair prefixo constante (27 caracteres)
    const baseEPC = epc.substring(0, 27);

    // ✅ Buscar tag pelo prefixo
    const [tags] = await pool.query(
      'SELECT * FROM rfid_tags WHERE epc LIKE ?',
      [`${baseEPC}%`]
    );

    if (!tags.length) {
      console.log("Tag não cadastrada no sistema — ignorando leitura");
      return;
    }

    const tag = tags[0];

    // ✅ Buscar bag vinculada à tag
    const [bags] = await pool.query(
      `SELECT b.id AS bag_id
       FROM bags b
       JOIN bag_tags bt ON bt.bag_id = b.id
       WHERE bt.rfid_id = ?`,
      [tag.id]
    );

    if (!bags.length) {
      console.log("Nenhuma bag associada à tag — verifique o vínculo com bag_tags");
      return;
    }

    const bagId = bags[0].bag_id;
    const destination = getDestination(lastStatus);

    // ✅ Alterna status
    const eventType = lastStatus === 'embarque' ? 'desembarque' : 'embarque';
    lastStatus = eventType;

    console.log(`Evento a ser registrado: ${eventType} para bag ${bagId}`);

    // ✅ Inserir no banco
    await pool.query(
      `INSERT INTO bag_status_events 
       (id, bag_id, status, created_at, destination, rfid_tag) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), bagId, eventType, new Date(), destination, tag.printed_code]
    );

    console.log(`Evento registrado com sucesso: ${eventType} → bag ${bagId}`);
  } catch (err) {
    console.error("Erro ao processar EPC", err);
  }
}

function getDestination(status) {
  return status === 'embarque' ? "Destino de embarque" : "Destino de desembarque";
}
