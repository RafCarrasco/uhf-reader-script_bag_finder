
import {
    listBags,
    getBag,
    listReadingsByBag,
    listTravelerBagHistory,
    listStatusEventsByBag,
    getBagsByTripId,
    getBagsStatusByUserId,
    findByEpc,
    updateBag,
    deleteBagStatusByBagId
} from '../../db/bagRepository.js';

import { 
    getBagByEPC, 
    markBagCollected
} from '../../db/bagDAO.js'; 

import { saveBagReading} from '../../db/readingRepository.js';
import { pool } from "../../db/db.js";
import { v4 as uuidv4 } from "uuid";
import { broadcast } from '../../services/websocketService.js';

const epcDebounceCache = {};
const DEBOUNCE_MS = 1000;

export const BagsController = {
    async list(req, res) {
        try {
            const bags = await listBags();
            res.json(bags);
        } catch (e) {
            console.error('[bags:list] error', e);
            res.status(500).json({ error: 'internal_error' });
        }
    },

    async get(req, res) {
        try {
            const bag = await getBag(req.params.id);
            if (!bag) return res.status(404).json({ error: 'not_found' });
            res.json(bag);
        } catch (e) {
            console.error('[bags:get] error', e);
            res.status(500).json({ error: 'internal_error' });
        }
    },

    async getBagByEPCController(req, res) {
        try {
            const { epc } = req.params;
            const result = await getBagByEPC(epc);

            if (!result || result.length === 0) {
            return res.status(404).json({ message: "Nenhuma bag encontrada com este EPC." });
            }

            res.status(200).json(result);
        } catch (error) {
            console.error("Erro ao buscar bag por EPC:", error);
            res.status(500).json({ message: "Erro interno no servidor.", error: error.message });
        }
    },

    async readings(req, res) {
        try {
            const rows = await listReadingsByBag(req.params.id);
            res.json(rows);
        } catch (e) {
            console.error('[bags:readings] error', e);
            res.status(500).json({ error: 'internal_error' });
        }
    },

    async historyByTraveler(req, res) {
        try {
            const { travelerId } = req.params;
            const rows = await listTravelerBagHistory(travelerId);
            res.json(rows);
        } catch (e) {
            console.error('[bags:historyByTraveler] error', e);
            res.status(500).json({ error: 'internal_error' });
        }
    },

    async registerReading(req, res) {
        const { epc, timestamp, location } = req.body;

        const now = Date.now();
        const lastTime = epcDebounceCache[epc] || 0;

        if (now - lastTime < DEBOUNCE_MS) {
            return res.json({ success: true, message: `EPC ${epc} ignorado (debounce ativo).` });
        }


        try {
            const result = await saveBagReading(epc, timestamp, location);

            epcDebounceCache[epc] = now;

            broadcast({
                type: 'TAG_READ',
                epc: result.epc,
                status: result.status,
                destination: result.destination,
                bag_id: result.bag_id
            });

            if (result.status === 'NAO_CADASTRADA') {
                console.log(`[bags:registerReading] EPC ${epc} enviado para vínculo.`);
                return res.json({ success: true, message: "EPC lido e enviado ao Front para vínculo.", epc: epc });
            }

            console.log(`[bags:registerReading] EPC ${epc} registrado com sucesso. Novo Status: ${result.status}`);
            return res.json({ success: true, result });

        } catch (e) {
            console.error("[bags:registerReading] error", e);
        }
    },

    async timeline(req, res) {
        try {
            const { id } = req.params;
            const events = await listStatusEventsByBag(id);

            if (!events || events.length === 0) {
                return res.status(404).json({ error: "Nenhum evento de status encontrado para esta mala" });
            }

            const timeline = events.map(e => ({
                time: e.event_time,
                status: e.status,
                destination: e.destination,
                message: `Mala **${e.status.toUpperCase()}** com destino a ${e.destination}` + (e.is_final_destination ? ' (Destino Final)' : ''),
                epc: e.epc_code 
            }));

            res.json(timeline);
        } catch (e) {
            console.error("[bags:timeline] error", e);
            res.status(500).json({ error: "internal_error" });
        }
    },
    async getByTripId(req, res) {
        try {
            const { tripId } = req.params;
            const bags = await getBagsByTripId(tripId);
            res.json(bags);
        } catch (e) {
            console.error('[bags:getByTripId] error', e);
            res.status(500).json({ error: 'internal_error' });
        }
    },
    async getBagsStatusByUserId(req, res) {
        const { userId } = req.params;

        try {
            const bagsStatus = await getBagsStatusByUserId(userId);
            if (!bagsStatus.length) {
            return res.status(404).json({ message: 'Nenhum status encontrado para este usuário.' });
            }
            return res.status(200).json(bagsStatus);
        } catch (error) {
            console.error('[BagController] Erro ao buscar status das bags por userId:', error);
            return res.status(500).json({ message: 'Erro interno ao buscar status das bags.' });
        }
    },
    async getBagStatusByEpc(req, res) {
        const { epc } = req.params;

        try {
        const bag = await findByEpc(epc);

        if (!bag) {
            return res.status(404).json({ message: "Bag não encontrada para o EPC informado." });
        }

        return res.status(200).json({
            id: bag.id,
            epc: bag.epc,
            status: bag.status,
            description: bag.description,
            travelerName: bag.traveler_name,
            tripId: bag.trip_id,
            createdAt: bag.created_at,
        });
        } catch (error) {
        console.error("[BagController] Erro ao buscar EPC:", error);
        return res.status(500).json({ message: "Erro interno ao buscar a bagagem." });
        }
    },
        async updateBag(req, res) {
        try {
            const { id } = req.params;
            const bagData = req.body;
            bagData.id = id;

            const success = await updateBag(bagData);

            if (!success) {
                return res.status(404).json({ message: 'Bag não encontrada.' });
            }

            return res.status(200).json({ message: 'Bag atualizada com sucesso.' });
        } catch (error) {
            console.error('[bags:updateBag] error', error);
            return res.status(500).json({ message: 'Erro ao atualizar a bag.' });
        }
    },
    async deleteBagStatusByBagId(req, res) {
        try {
            const { bagId } = req.params;

            const success = await deleteBagStatusByBagId(bagId);

            if (!success) {
                return res.status(404).json({ message: 'Bag não encontrada.' });
            }

            return res.status(200).json({ message: `Status da bag ${bagId} deletado com sucesso.` });
        } catch (error) {
            console.error('[bags:deleteBagStatusByBagId] error', error);
            return res.status(500).json({ message: 'Erro ao deletar status da bag.' });
        }
    },
};