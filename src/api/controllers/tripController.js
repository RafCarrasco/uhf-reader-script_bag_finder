import { pool } from "../../db/db.js";

export async function getTripsByStatus(req, res) {
  const { isDone, travelerId } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        t.id,
        t.origin,
        t.destination,
        t.created_at,
        b.id AS bag_id,
        b.status AS bag_status,
        rt.epc AS rfid_code,
        rt.printed_code
      FROM trips t
      LEFT JOIN bags b ON b.trip_id = t.id
      LEFT JOIN bag_tags bt ON bt.bag_id = b.id
      LEFT JOIN rfid_tags rt ON rt.id = bt.rfid_id
      WHERE t.user_id = ? AND t.is_done = ?
      ORDER BY t.created_at DESC
      `,
      [travelerId, isDone]
    );

    res.json(rows);
  } catch (err) {
    console.error("[Trips:getTripsByStatus] Erro:", err);
    res.status(500).json({ error: "Erro ao consultar viagens" });
  }
}