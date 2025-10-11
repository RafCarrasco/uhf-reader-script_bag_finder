// db/readingRepository.js
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";
import { getBagItineraryAndLastEvent } from "./bagDAO.js";

export async function saveBagReading(epc, timestamp, location) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [bags] = await conn.query(
      "SELECT id, printed_code FROM bags WHERE epc = ? LIMIT 1",
      [epc]
    );

    if (bags.length === 0) {
      await conn.rollback();
      console.log(`⚠️ EPC ${epc} não cadastrado em nenhuma mala.`);
      return {
        readingId: null,
        epc: epc,
        status: "NAO_CADASTRADA",
        destination: null,
        bag_id: null
      };
    }

    const { id: bagId, printed_code } = bags[0];

    const itinerary = await getBagItineraryAndLastEvent(bagId);
    if (!itinerary) {
      await conn.rollback();
      throw new Error("Itinerário da viagem não encontrado para esta mala.");
    }

    const lastStatus = itinerary.last_status
      ? itinerary.last_status.toUpperCase()
      : null;
    const lastLocation = itinerary.last_location || null;

    let newEventStatus;
    let eventDestination; 
    let newBagStatus = "IN_TRANSIT";

    if (!lastStatus || lastStatus === "CHECKED_IN") {
      newEventStatus = "EMBARQUE";
      eventDestination = itinerary.connection || itinerary.destination;
    } else if (lastStatus === "EMBARQUE") {
      newEventStatus = "DESEMBARQUE";

      if (itinerary.connection && lastLocation !== itinerary.connection) {
        eventDestination = itinerary.connection;
      } else {
        eventDestination = itinerary.destination;
        newBagStatus = "DELIVERED";
      }
    } else if (lastStatus === "DESEMBARQUE") {
      newEventStatus = "EMBARQUE";
      eventDestination = itinerary.destination;
    } else if (lastStatus === "DELIVERED" || lastStatus === "COLLECTED") {
      await conn.rollback();
      return { success: true, message: "Leitura ignorada: ciclo de viagem concluído." };
    }

    const localLeitura = location || "Localização Desconhecida";
    const readingId = uuidv4();

    await conn.query(
      `INSERT INTO bag_readings (id, bag_id, location, read_time)
       VALUES (?, ?, ?, NOW())`,
      [readingId, bagId, localLeitura]
    );

    const eventId = uuidv4();
    await conn.query(
      `INSERT INTO bag_status_events
       (id, bag_id, status, destination, rfid_tag, printed_code, created_at, is_final_destination)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)`,
      [eventId, bagId, newEventStatus, eventDestination, epc, printed_code]
    );

    await conn.query(
      `UPDATE bags SET status = ?, updated_at = NOW() WHERE id = ?`,
      [newBagStatus, bagId]
    );

    await conn.commit();

    return {
      readingId,
      epc,
      status: newEventStatus,
      destination: eventDestination,
      bag_id: bagId
    };
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
      SELECT br.id, br.location, br.read_time, b.epc
      FROM bag_readings br
      JOIN bags b ON br.bag_id = b.id
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
