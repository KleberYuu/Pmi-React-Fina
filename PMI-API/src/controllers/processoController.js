import * as processoService from "../services/processoService.js";

/**
 * Endpoint para Formalizador criar um processo completo.
 * Não inclui mais a criação de documentos individuais, nem a vinculação persistente de CCTs.
 * Requisição: POST /api/processos/full-creation
 * Corpo: {
 * "numero_contrato": "CONTRATO_EXEMPLO_001",
 * "chave_acesso": "senhaforte123",
 * "tipo_processo": "Concorrência Pública",
 * "data_apresentacao_proposta": "YYYY-MM-DD",
 * "num_meses_execucao_contratual": 12,
 * "lotes": [
 * { "numero_lote": 5, "quantidade_profissionais": 2 },
 * { "numero_lote": 8, "quantidade_profissionais": 1 }
 * ]
 * }
 */
export const createProcessoCompleto = async (req, res) => {
  const formalizadorId = req.usuario ? req.usuario.id : 1; // MOCK

  const {
    numero_contrato,
    chave_acesso,
    tipo_processo,
    data_apresentacao_proposta,
    num_meses_execucao_contratual,
    lotes,
  } = req.body;

  if (
    !numero_contrato ||
    !chave_acesso ||
    !tipo_processo ||
    !lotes ||
    !Array.isArray(lotes) ||
    lotes.length === 0
  ) {
    return res.status(400).json({
      message:
        "Dados incompletos para a criação do processo completo. Verifique numero_contrato, chave_acesso, tipo_processo e lotes.",
    });
  }

  for (const lote of lotes) {
    if (
      !lote.numero_lote ||
      lote.quantidade_profissionais === undefined ||
      lote.quantidade_profissionais <= 0
    ) {
      return res.status(400).json({
        message:
          "Dados de lote incompletos ou inválidos. Verifique numero_lote e quantidade_profissionais.",
      });
    }
  }

  try {
    const result = await processoService.createFullProcess(
      {
        numero_contrato,
        chave_acesso,
        tipo_processo,
        data_apresentacao_proposta,
        num_meses_execucao_contratual,
        lotes,
      },
      formalizadorId
    );
    res.status(201).json({
      message: "Processo completo, prestador e lotes criados com sucesso.",
      data: result,
    });
  } catch (error) {
    console.error("Erro no controller createProcessoCompleto:", error);
    if (
      error.message.includes("Número de contrato") &&
      error.message.includes("já existe")
    ) {
      return res.status(409).json({ message: error.message });
    }
    res
      .status(500)
      .json({ message: "Erro interno ao criar processo completo." });
  }
};

/**
 * Endpoint para Prestador de Serviço criar os documentos (fichas profissionais) para um lote específico.
 * Isso seria acionado a partir da tela de "Quadro de Resumo" do Prestador,
 * quando ele decide "expandir" ou "iniciar preenchimento" para um lote.
 *
 * Requisição: POST /api/lotes/:loteId/documents
 * Corpo: { "total_documents": 5 } // QTD Profissionais para aquele lote
 *
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const createDocumentsInLote = async (req, res) => {
  const { loteId } = req.params;
  const { total_documents } = req.body;

  // A validação de se o prestador logado tem acesso a este lote/processo
  // viria de um middleware de autorização.
  // const prestadorId = req.prestador ? req.prestador.id : null;

  if (!loteId || isNaN(loteId)) {
    return res.status(400).json({ message: "ID do lote inválido." });
  }
  if (!total_documents || isNaN(total_documents) || total_documents <= 0) {
    return res
      .status(400)
      .json({ message: "Quantidade de documentos a criar inválida." });
  }

  try {
    const createdDocuments = await processoService.createDocumentsForLote(
      parseInt(loteId),
      total_documents
    );
    res.status(201).json({
      message: `Documentos criados para o lote ${loteId} com sucesso.`,
      documents: createdDocuments,
    });
  } catch (error) {
    console.error("Erro no controller createDocumentsInLote:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao criar documentos no lote." });
  }
};

/**
 * Endpoint para buscar CCTs por um número de lote (região).
 * Usado pelo Prestador para popular as opções de categorias profissionais para preenchimento.
 * Requisição: GET /api/lotes/:loteId/ccts
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getCCTsForLote = async (req, res) => {
  const { loteId } = req.params;

  if (!loteId || isNaN(loteId)) {
    return res.status(400).json({ message: "ID do lote inválido." });
  }

  try {
    // Primeiro, buscar os detalhes do lote para obter o numero_lote (que é a região)
    const processos = await processoService.getProcessos(null); // Busca todos os processos
    let numeroLoteIdentificadorRegiao = null;
    for (const p of processos) {
      const lote = p.lotes.find((l) => l.id === parseInt(loteId));
      if (lote) {
        numeroLoteIdentificadorRegiao = lote.numero_lote; // Obtém o numero_lote do lote
        break;
      }
    }

    if (numeroLoteIdentificadorRegiao === null) {
      return res.status(404).json({ message: "Lote não encontrado." });
    }

    // Em seguida, buscar as CCTs baseadas no numero_lote (identificador regional)
    const ccts = await processoService.getCCTsByLoteRegion(
      numeroLoteIdentificadorRegiao
    );
    res.status(200).json(ccts);
  } catch (error) {
    console.error("Erro no controller getCCTsForLote:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao buscar CCTs para o lote." });
  }
};

/**
 * Endpoint para buscar processos (sempre detalhados, com numero_contrato no topo).
 * Formalizadores/Homologadores podem ver todos. Prestadores veem os seus.
 * Requisição: GET /api/processos
 * Query Params: ?status=<status_do_processo> (ex: ?status=enviado_homologacao)
 * ?numeroContrato=<numero_do_contrato> (ex: ?numeroContrato=CONTRATO_ABC)
 *
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getProcessos = async (req, res) => {
  let prestadorServicoId = null; // Renomeado para alinhar com o serviço
  // req.prestador viria do middleware de autenticação (para prestadores)
  if (req.prestador) {
    prestadorServicoId = req.prestador.id;
  }

  const statusFilter = req.query.status || null;
  const numeroContratoFilter = req.query.numeroContrato || null;

  try {
    // Passar um objeto 'options' para o serviço
    const processos = await processoService.getProcessos({
      prestadorServicoId: prestadorServicoId,
      statusFilter: statusFilter,
      numeroContratoFilter: numeroContratoFilter,
    });
    res.status(200).json(processos);
  } catch (error) {
    console.error("Erro no controller getProcessos:", error);
    res.status(500).json({ message: "Erro interno ao buscar processos." });
  }
};

/**
 * Endpoint para buscar os documentos (fichas) de um lote específico.
 * Usado pelo Prestador na tela de resumo do lote (quando expande) ou antes de editar.
 * Requisição: GET /api/lotes/:loteId/documents
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getDocumentsForLote = async (req, res) => {
  const { loteId } = req.params;

  if (!loteId || isNaN(loteId)) {
    return res.status(400).json({ message: "ID do lote inválido." });
  }

  try {
    const documents = await processoService.getDocumentsForLote(
      parseInt(loteId)
    );
    res.status(200).json(documents);
  } catch (error) {
    console.error("Erro no controller getDocumentsForLote:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao buscar documentos para o lote." });
  }
};

/**
 * Endpoint para buscar a última versão do conteúdo de um documento específico.
 * Usado pelo Prestador na tela de preenchimento/edição.
 * Requisição: GET /api/documentos/:documentoId/content
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getDocumentContent = async (req, res) => {
  const { documentoId } = req.params;

  if (!documentoId || isNaN(documentoId)) {
    return res.status(400).json({ message: "ID do documento inválido." });
  }

  try {
    const content = await processoService.getDocumentLatestVersion(
      parseInt(documentoId)
    );
    if (!content) {
      return res
        .status(404)
        .json({ message: "Conteúdo do documento não encontrado." });
    }
    res.status(200).json(content);
  } catch (error) {
    console.error("Erro no controller getDocumentContent:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao buscar conteúdo do documento." });
  }
};

/**
 * Endpoint para salvar o conteúdo de um documento (nova versão).
 * Usado pelo Prestador na tela de preenchimento/edição.
 * Requisição: POST /api/documentos/:documentoId/content
 * Corpo: { "conteudo": { /* ... seu JSON de dados do formulário ... *\/ } }
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const saveDocumentContent = async (req, res) => {
  const { documentoId } = req.params;

  console.log("DEBUG: req.body recebido:", req.body);
  const { conteudo } = req.body;
  console.log("DEBUG: Conteúdo desestruturado:", conteudo);

  // req.usuario.id ou req.prestador.id viria do middleware de autenticação
  const userId = req.prestador
    ? req.prestador.id
    : req.usuario
    ? req.usuario.id
    : 1; // MOCK
  const userType = req.prestador ? "prestador" : "usuario"; // MOCK

  if (!documentoId || isNaN(documentoId)) {
    return res.status(400).json({ message: "ID do documento inválido." });
  }
  if (!conteudo || typeof conteudo !== "object") {
    console.error("DEBUG: Conteúdo inválido detectado. Tipo:", typeof conteudo);
    return res
      .status(400)
      .json({ message: "Conteúdo do documento inválido ou ausente." });
  }

  try {
    const newVersion = await processoService.saveDocumentVersion(
      parseInt(documentoId),
      conteudo,
      userId,
      userType
    );
    res.status(201).json({
      message: "Conteúdo do documento salvo com sucesso (nova versão).",
      version: newVersion,
    });
  } catch (error) {
    console.error("Erro no controller saveDocumentContent:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    // Para outros erros (erros de banco de dados, erros inesperados), retorna 500
    res
      .status(500)
      .json({ message: "Erro interno ao salvar conteúdo do documento." });
  }
};

/**
 * Endpoint para buscar os totais agregados para um processo completo.
 * Inclui "Total Quantidade", "Total Mensal" e "Total Anual".
 *
 * Requisição: GET /api/processos/:processoId/totals
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getProcessTotals = async (req, res) => {
  const { processoId } = req.params;

  if (!processoId || isNaN(processoId)) {
    return res.status(400).json({ message: "ID do processo inválido." });
  }

  try {
    const totals = await processoService.getProcessTotals(parseInt(processoId));
    res.status(200).json(totals);
  } catch (error) {
    console.error("Erro no controller getProcessTotals:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao buscar totais do processo." });
  }
};

/**
 * Endpoint para buscar o próximo documento (ficha) pendente ou ativo a ser preenchido para um lote.
 * Usado para o botão "Salvar e Ir para o Próximo Documento".
 * Requisição: GET /api/lotes/:loteId/documents/next/:currentDocumentId?
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const getNextDocument = async (req, res) => {
  // currentDocumentId pode ser undefined se a rota sem o ID for chamada
  const { loteId, currentDocumentId } = req.params;

  if (!loteId || isNaN(loteId)) {
    return res.status(400).json({ message: "ID do lote inválido." });
  }

  try {
    const nextDoc = await processoService.getNextDocumentForLote(
      parseInt(loteId),
      currentDocumentId ? parseInt(currentDocumentId) : null // Passa null se currentDocumentId for undefined
    );

    if (!nextDoc) {
      return res.status(200).json({
        message: "Não há mais documentos pendentes ou ativos neste lote.",
        is_last_document: true,
      });
    }

    res.status(200).json(nextDoc);
  } catch (error) {
    console.error("Erro no controller getNextDocument:", error);
    res
      .status(500)
      .json({ message: "Erro interno ao buscar próximo documento." });
  }
};

/**
 * Endpoint para Prestador enviar o processo para homologação.
 * Requisição: POST /api/processos/:processoId/send-homologation
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const sendProcessToHomologation = async (req, res) => {
  const { processoId } = req.params;
  const prestadorId = req.prestador ? req.prestador.id : 13; // MOCK

  if (!processoId || isNaN(processoId)) {
    return res.status(400).json({ message: "ID do processo inválido." });
  }

  try {
    const success = await processoService.sendProcessToHomologation(
      parseInt(processoId),
      prestadorId
    );
    if (success) {
      res
        .status(200)
        .json({ message: "Processo enviado para homologação com sucesso!" });
    } else {
      // Isso geralmente não deveria acontecer se o service lançar erro em vez de false
      res
        .status(500)
        .json({ message: "Falha ao enviar processo para homologação." });
    }
  } catch (error) {
    console.error("Erro no controller sendProcessToHomologation:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    res
      .status(500)
      .json({ message: "Erro interno ao enviar processo para homologação." });
  }
};

/**
 * Endpoint para Formalizador formalizar um processo.
 * Muda o status do processo para 'formalizado'.
 * Requisição: POST /api/processos/:processoId/formalizar
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const formalizeProcesso = async (req, res) => {
  const { processoId } = req.params;
  const formalizadorId = req.usuario ? req.usuario.id : 1; // MOCK

  if (!processoId || isNaN(processoId)) {
    return res.status(400).json({ message: "ID do processo inválido." });
  }

  try {
    const success = await processoService.formalizeProcesso(
      parseInt(processoId),
      formalizadorId
    );
    if (success) {
      res.status(200).json({ message: "Processo formalizado com sucesso!" });
    } else {
      res
        .status(500)
        .json({ message: "Falha desconhecida ao formalizar processo." });
    }
  } catch (error) {
    console.error("Erro no controller formalizeProcesso:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    res.status(500).json({ message: "Erro interno ao formalizar processo." });
  }
};

/**
 * Endpoint para Homologador homologar um processo.
 * Requisição: POST /api/processos/:processoId/homologar
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const homologateProcesso = async (req, res) => {
  const { processoId } = req.params;
  const homologadorId = req.usuario ? req.usuario.id : 1; // MOCK: Assumindo ID 1 para teste

  if (!processoId || isNaN(processoId)) {
    return res.status(400).json({ message: "ID do processo inválido." });
  }

  try {
    const success = await processoService.homologateProcesso(
      parseInt(processoId),
      homologadorId
    );
    if (success) {
      res.status(200).json({ message: "Processo homologado com sucesso!" });
    } else {
      res.status(500).json({ message: "Falha ao homologar processo." });
    }
  } catch (error) {
    console.error("Erro no controller homologateProcesso:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    res.status(500).json({ message: "Erro interno ao homologar processo." });
  }
};

/**
 * Endpoint para Homologador recusar a homologação de um processo.
 * Requisição: POST /api/processos/:processoId/recusar
 * Corpo: { "motivo_recusa": "Documentação incompleta." }
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const refuseHomologation = async (req, res) => {
  const { processoId } = req.params;
  const { motivo_recusa } = req.body;
  const homologadorId = req.usuario ? req.usuario.id : 1; // MOCK

  if (!processoId || isNaN(processoId)) {
    return res.status(400).json({ message: "ID do processo inválido." });
  }
  if (
    !motivo_recusa ||
    typeof motivo_recusa !== "string" ||
    motivo_recusa.trim() === ""
  ) {
    return res.status(400).json({ message: "Motivo da recusa é obrigatório." });
  }

  try {
    const success = await processoService.refuseHomologation(
      parseInt(processoId),
      homologadorId,
      motivo_recusa
    );
    if (success) {
      res.status(200).json({ message: "Homologação recusada com sucesso!" });
    } else {
      res.status(500).json({ message: "Falha ao recusar homologação." });
    }
  } catch (error) {
    console.error("Erro no controller refuseHomologation:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    res.status(500).json({ message: "Erro interno ao recusar homologação." });
  }
};

/**
 * Endpoint para excluir logicamente um documento (ficha).
 * Esta funcionalidade é primariamente para o Homologador em processos de alteração.
 * Requisição: DELETE /api/documentos/:documentoId
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const deleteDocument = async (req, res) => {
  const { documentoId } = req.params;
  const userId = req.usuario ? req.usuario.id : 2; // MOCK: Assumindo ID 1 para teste (Homologador)
  const userType = "usuario";

  if (!documentoId || isNaN(documentoId)) {
    return res.status(400).json({ message: "ID do documento inválido." });
  }

  try {
    const success = await processoService.deleteDocument(
      parseInt(documentoId),
      userId,
      userType
    );
    if (success) {
      res.status(200).json({ message: "Documento excluído com sucesso!" });
    } else {
      res.status(500).json({ message: "Falha ao excluir documento." });
    }
  } catch (error) {
    console.error("Erro no controller deleteDocument:", error);
    if (error.message.startsWith("VALIDATION_ERROR:")) {
      return res
        .status(400)
        .json({ message: error.message.replace("VALIDATION_ERROR: ", "") });
    }
    res.status(500).json({ message: "Erro interno ao excluir documento." });
  }
};
