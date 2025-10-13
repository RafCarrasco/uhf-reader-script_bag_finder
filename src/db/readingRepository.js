import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { getBagItineraryAndLastEvent } from "./bagDAO.js";

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1️⃣ Buscar a bag pelo EPC
    const [bags] = await conn.query(
      "SELECT id, printed_code, status, trip_id FROM bags WHERE epc = ? LIMIT 1",
      [epc]
    );

    if (bags.length === 0) {
      await conn.rollback();
      console.warn(`⚠️ EPC ${epc} não cadastrado em nenhuma mala.`);
      return { readingId: null, epc, status: "NAO_CADASTRADA" };
    }

    const { id: bagId, printed_code, status: currentStatus, trip_id } = bags[0];

    // 2️⃣ Buscar último evento (caso exista)
    const [lastEvents] = await conn.query(
      "SELECT status FROM bag_status_events WHERE bag_id = ? ORDER BY created_at DESC LIMIT 1",
      [bagId]
    );

    const lastStatus = lastEvents.length ? lastEvents[0].status : currentStatus;

    // 3️⃣ Determinar o próximo status
    const statusFlow = [
      "CHECKED_IN",
      "IN_TRANSIT",
      "ARRIVED_AT_CONNECTION",
      "IN_TRANSIT_CONNECTION",
      "ARRIVED",
      "READY_FOR_PICKUP",
      // "COLLECTED",
    ];

    const currentIndex = statusFlow.indexOf(lastStatus);
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      console.log(`✅ Ciclo finalizado para bag ${bagId} (${lastStatus})`);
      if (lastStatus === "COLLECTED") {
        // 🔹 Marcar a viagem como concluída
        await conn.query("UPDATE trips SET is_done = 1 WHERE id = ?", [trip_id]);
      }
      await conn.commit();
      return { epc, status: lastStatus, message: "Ciclo concluído" };
    }

    const newStatus = statusFlow[currentIndex + 1];
    console.log(`🔄 Bag ${bagId}: ${lastStatus} → ${newStatus}`);

    // 4️⃣ Criar novo evento
    const eventId = uuidv4();
    await conn.query(
      `INSERT INTO bag_status_events
       (id, bag_id, status, destination, rfid_tag, printed_code, created_at, is_final_destination)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        eventId,
        bagId,
        newStatus,
        location || null,
        epc,
        printed_code,
        newStatus === "COLLECTED" ? 1 : 0,
      ]
    );

    // 5️⃣ Atualizar status da bag
    await conn.query(
      "UPDATE bags SET status = ?, updated_at = NOW() WHERE id = ?",
      [newStatus, bagId]
    );

    // 6️⃣ Caso final — encerrar viagem
    if (newStatus === "COLLECTED") {
      await conn.query("UPDATE trips SET is_done = 1 WHERE id = ?", [trip_id]);
    }

    await conn.commit();

    return { epc, bag_id: bagId, status: newStatus, location };
  } catch (err) {
    await conn.rollback();
    console.error("[DB ERROR] Falha ao salvar leitura:", err);
    throw err;
  } finally {
    conn.release();
  }
}
