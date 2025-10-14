import * as AdminRepository from "../../db/adminRepository.js";

export async function getCollaborators(req, res) {
  try {
    const { id } = req.params;
    const collaborators = await AdminRepository.getCollaborators();

    if (!collaborators || collaborators.length === 0) {
      return res.status(404).json({ message: "Nenhum colaborador encontrado" });
    }

    res.json(collaborators);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao buscar colaboradores1" });
  }
}
