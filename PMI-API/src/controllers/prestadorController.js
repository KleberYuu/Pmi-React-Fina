import * as prestadorService from "../services/prestadorService.js";
// Importe um middleware de autenticação/autorização aqui se for usar
// Ex: import { verifyToken, authorizeFormalizador } from '../middlewares/authMiddleware.js';

/**
 * Endpoint para Formalizador criar o acesso inicial de um Prestador de Serviço.
 * O Formalizador estará autenticado e seu ID virá do token JWT.
 * Requisição: POST /api/prestadores/access
 * Corpo: { "numero_contrato": "CONTRATOABC", "chave_acesso": "senhaforte123" }
 */
export const createPrestadorAccess = async (req, res) => {
  // req.usuario.id viria do middleware de autenticação do Formalizador
  // Supondo que o formalizadorId venha do token JWT após verificação
  const formalizadorId = req.usuario ? req.usuario.id : 1; // MOCK: Assumindo ID 1 para teste se não houver middleware ainda

  const { numero_contrato, chave_acesso } = req.body;

  if (!numero_contrato || !chave_acesso) {
    return res.status(400).json({
      message: "Número do contrato e chave de acesso são obrigatórios.",
    });
  }

  try {
    const newPrestador = await prestadorService.createPrestadorAccess(
      { numero_contrato, chave_acesso },
      formalizadorId
    );
    res.status(201).json({
      message: "Acesso de prestador criado com sucesso.",
      prestador: {
        id: newPrestador.id,
        numero_contrato: newPrestador.numero_contrato,
        // A chave de acesso hash NUNCA deve ser retornada aqui
      },
    });
  } catch (error) {
    console.error("Erro no controller createPrestadorAccess:", error);
    if (error.message.includes("Número de contrato ou CNPJ já existe")) {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    res
      .status(500)
      .json({ message: "Erro interno ao criar acesso de prestador." });
  }
};

/**
 * Endpoint para um Prestador de Serviço (logado) atualizar seus próprios dados de perfil.
 * Requisição: PUT /api/prestadores/profile
 * Corpo: { "razao_social": "Nova Razão Social", "cnpj": "...", ... }
 */
export const updatePrestadorProfile = async (req, res) => {
  // req.prestador.id viria do middleware de autenticação do Prestador
  const prestadorId = req.prestador ? req.prestador.id : 13; // MOCK: Assumindo ID 1 para teste

  const updateData = req.body; // Pega todos os dados do corpo da requisição

  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json({ message: "Nenhum dado para atualização fornecido." });
  }

  try {
    const isUpdated = await prestadorService.updatePrestadorProfile(
      prestadorId,
      updateData
    );

    if (isUpdated) {
      res
        .status(200)
        .json({ message: "Perfil do prestador atualizado com sucesso." });
    } else {
      res.status(404).json({
        message: "Prestador não encontrado ou nenhum dado para atualizar.",
      });
    }
  } catch (error) {
    console.error("Erro no controller updatePrestadorProfile:", error);
    if (error.message.includes("CNPJ já existe")) {
      return res.status(409).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Erro interno ao atualizar perfil do prestador." });
  }
};

/**
 * Endpoint para buscar os dados de um prestador de serviço (seja por ID ou pelo token do usuário logado).
 * Requisição: GET /api/prestadores/:id ou GET /api/prestadores (com query param)
 */
export const getPrestador = async (req, res) => {
  let prestadorId = req.params.id; // Tenta pegar da URL (se for admin buscando por ID)
  let numeroContrato = req.query.numeroContrato; // Tenta pegar do query param

  // Se não for passado ID na URL e o usuário for um prestador logado
  if (!prestadorId && req.prestador) {
    prestadorId = req.prestador.id;
  }

  // Se o formalizador estiver logado e buscar por numeroContrato via query param
  if (
    req.usuario &&
    req.usuario.tipo_usuario === "formalizador" &&
    !prestadorId &&
    numeroContrato
  ) {
    // Ok, busca por numeroContrato
  } else if (!prestadorId && !numeroContrato) {
    return res.status(400).json({
      message: "ID do prestador ou número do contrato é obrigatório.",
    });
  }

  try {
    const prestador = await prestadorService.getPrestador({
      prestadorId,
      numeroContrato,
    });

    if (!prestador) {
      return res.status(404).json({ message: "Prestador não encontrado." });
    }

    // Não retornar a chave_acesso_hash por segurança
    const { chave_acesso_hash, ...prestadorSafeData } = prestador;
    res.status(200).json(prestadorSafeData);
  } catch (error) {
    console.error("Erro no controller getPrestador:", error);
    res.status(500).json({ message: "Erro interno ao buscar prestador." });
  }
};

/**
 * Endpoint para Formalizador redefinir a chave de acesso de um prestador.
 * Requisição: POST /api/prestadores/reset-access-key
 * Corpo: { "numero_contrato": "NUMERO_DO_CONTRATO_AQUI" }
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const resetPrestadorAccessKey = async (req, res) => {
  // req.usuario.id viria do middleware de autenticação do Formalizador
  // const formalizadorId = req.usuario ? req.usuario.id : 1; // Para fins de log/auditoria

  const { numero_contrato } = req.body;

  if (!numero_contrato) {
    return res.status(400).json({
      message: "Número do contrato é obrigatório para redefinir a chave.",
    });
  }

  try {
    const newRawKey = await prestadorService.resetPrestadorAccessKey(
      numero_contrato
    );

    if (!newRawKey) {
      return res.status(404).json({
        message: "Prestador com o número de contrato fornecido não encontrado.",
      });
    }

    res.status(200).json({
      message: "Nova chave de acesso gerada com sucesso!",
      new_chave_acesso: newRawKey, // Retorna a nova chave para o Formalizador
    });
  } catch (error) {
    console.error("Erro no controller resetPrestadorAccessKey:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao redefinir chave de acesso." });
  }
};
