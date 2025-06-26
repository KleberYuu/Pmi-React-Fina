import pool from "../config/database.js"; // Importa o pool de conexões do banco de dados
import bcrypt from "bcrypt"; // Importa bcrypt para hashear a chave de acesso

// ========================================================================================================
// FUNÇÕES AUXILIARES INTERNAS (Definidas no topo do módulo para garantir escopo/visibilidade)
// ========================================================================================================

/**
 * Função interna para ajustar a contagem de documentos 'pendentes' em um lote.
 * É chamada após salvar ou atualizar o conteúdo de um documento.
 * Também verifica e atualiza o status do lote para 'completo' ou 'incompleto'.
 * @param {object} connection - A conexão de banco de dados ativa (para participar da transação).
 * @param {number} loteId - O ID do lote sendo ajustado.
 * @param {number} totalProfissionaisNoLoteOriginal - A quantidade_profissionais definida para o lote.
 */
const adjustLoteDocumentsCount = async (
  connection,
  loteId,
  totalProfissionaisNoLoteOriginal
) => {
  // 1. Obter a soma da 'quantidade_total_contratar' dos documentos preenchidos/em revisão (última versão de cada)
  const [latestDocumentContents] = await connection.execute(
    `
      SELECT dv.conteudo
      FROM documentos_versoes dv
      INNER JOIN (
          SELECT documento_id, MAX(versao) AS max_versao
          FROM documentos_versoes
          GROUP BY documento_id
      ) AS latest_versions ON dv.documento_id = latest_versions.documento_id AND dv.versao = latest_versions.max_versao
      INNER JOIN documentos d ON dv.documento_id = d.id
      WHERE d.lote_id = ? AND d.status IN ('preenchido', 'em_revisao')
  `,
    [loteId]
  );

  let totalQuantityContractedSum = 0;
  for (const row of latestDocumentContents) {
    try {
      const content = row.conteudo; // Já é objeto JSON, não precisa de JSON.parse()
      const quantidade =
        content?.identificacao_servico?.quantidade_total_contratar; // Use optional chaining
      if (typeof quantidade === "number" && quantidade > 0) {
        totalQuantityContractedSum += quantidade;
      }
    } catch (e) {
      console.error(
        `Erro ao processar conteúdo JSON para lote ${loteId} (adjustLoteDocumentsCount):`,
        e
      );
    }
  }

  // 2. Obter todos os documentos (fichas) atuais do lote, por status e numero_documento
  const [allDocsInLote] = await connection.execute(
    `SELECT id, status, numero_documento FROM documentos WHERE lote_id = ? ORDER BY CAST(numero_documento AS UNSIGNED) ASC`,
    [loteId]
  );

  const pendingDocs = allDocsInLote.filter((doc) => doc.status === "pendente");
  const excludedDocs = allDocsInLote.filter((doc) => doc.status === "excluido");

  // ** Lógica Principal de Ajuste: Sincronizar o número de documentos ativos/pendentes **

  const idealPendingCount =
    totalProfissionaisNoLoteOriginal - totalQuantityContractedSum;
  const currentTotalDbCount = allDocsInLote.length;

  // Cenário 1: Ajustar o número total de documentos no BD para `totalProfissionaisNoLoteOriginal`
  const deltaTotalDocs = totalProfissionaisNoLoteOriginal - currentTotalDbCount;

  if (deltaTotalDocs > 0) {
    // Precisamos criar ou reativar `deltaTotalDocs` no total
    let docsReactivated = 0;
    for (const doc of excludedDocs) {
      if (docsReactivated < deltaTotalDocs) {
        await connection.execute(
          `UPDATE documentos SET status = 'pendente', ultima_atualizacao = NOW() WHERE id = ?`,
          [doc.id]
        );
        docsReactivated++;
      } else {
        break;
      }
    }

    const remainingToCreate = deltaTotalDocs - reactivated;
    if (remainingToCreate > 0) {
      const lastDocQuery = await connection.execute(
        `SELECT MAX(CAST(numero_documento AS UNSIGNED)) AS max_num FROM documentos WHERE lote_id = ?`,
        [loteId]
      );
      let nextDocNumber = (lastDocQuery[0].max_num || 0) + 1;
      const newDocumentValues = [];
      for (let i = 0; i < remainingToCreate; i++) {
        newDocumentValues.push([
          loteId,
          String(nextDocNumber++),
          "Ficha do Profissional",
          "pendente",
        ]);
      }
      if (newDocumentValues.length > 0) {
        await connection.query(
          `INSERT INTO documentos (lote_id, numero_documento, tipo, status) VALUES ?`,
          [newDocumentValues]
        );
      }
    }
  } else if (deltaTotalDocs < 0) {
    let toDeactivate = Math.abs(deltaTotalDocs);
    let deactivated = 0;
    for (const doc of [...pendingDocs].reverse()) {
      if (deactivated < toDeactivate) {
        await connection.execute(
          `UPDATE documentos SET status = 'excluido', ultima_atualizacao = NOW() WHERE id = ?`,
          [doc.id]
        );
        deactivated++;
      } else {
        break;
      }
    }
  }

  // Cenário 2: Ajustar o status dos documentos existentes (após o Cenário 1 ter garantido o total de slots)
  // Re-busca para ter o estado atualizado
  const [recheckedDocsInLote] = await connection.execute(
    `SELECT id, status FROM documentos WHERE lote_id = ? ORDER BY CAST(numero_documento AS UNSIGNED) ASC`,
    [loteId]
  );
  const updatedPendingDocs = recheckedDocsInLote.filter(
    (doc) => doc.status === "pendente"
  );
  const updatedExcludedDocs = recheckedDocsInLote.filter(
    (doc) => doc.status === "excluido"
  );

  const deltaPendingStatus = idealPendingCount - updatedPendingDocs.length;

  if (deltaPendingStatus > 0) {
    let reactivatedFromExcluded = 0;
    for (const doc of updatedExcludedDocs) {
      if (reactivatedFromExcluded < deltaPendingStatus) {
        await connection.execute(
          `UPDATE documentos SET status = 'pendente', ultima_atualizacao = NOW() WHERE id = ?`,
          [doc.id]
        );
        reactivatedFromExcluded++;
      } else break;
    }
  } else if (deltaPendingStatus < 0) {
    let docsToExclude = Math.abs(deltaPendingStatus);
    let excludedCount = 0;
    for (const doc of [...updatedPendingDocs].reverse()) {
      if (excludedCount < docsToExclude) {
        await connection.execute(
          `UPDATE documentos SET status = 'excluido', ultima_atualizacao = NOW() WHERE id = ?`,
          [doc.id]
        );
        excludedCount++;
      } else break;
    }
  }

  // --- INÍCIO DA LÓGICA PARA VERIFICAR E ATUALIZAR O STATUS DO LOTE ---
  // Esta lógica é executada toda vez que adjustLoteDocumentsCount é chamada (após salvar um documento)
  const [finalDocsInLote] = await connection.execute(
    `SELECT status FROM documentos WHERE lote_id = ? AND status != 'excluido'`,
    [loteId]
  );

  // Verifica se todos os documentos NÃO EXCLUÍDOS estão preenchidos ou em revisão
  const allDocsAreFilled = finalDocsInLote.every(
    (doc) => doc.status === "preenchido" || doc.status === "em_revisao"
  );

  // Verifica se a soma das quantidades preenchidas é igual à quantidade_profissionais original do lote.
  // Esta é a condição principal para o lote ser considerado "completo".
  const allQuantitiesMatch =
    totalQuantityContractedSum === totalProfissionaisNoLoteOriginal;

  const [loteCurrentStatusRows] = await connection.execute(
    `SELECT status FROM lotes WHERE id = ?`,
    [loteId]
  );
  const currentLoteStatus = loteCurrentStatusRows[0]?.status;

  // Se todas as condições para "completo" são atendidas E o status atual não é 'completo' nem 'liberado_para_homologacao'
  if (allDocsAreFilled && allQuantitiesMatch) {
    if (
      currentLoteStatus !== "completo" &&
      currentLoteStatus !== "liberado_para_homologacao"
    ) {
      await connection.execute(
        `UPDATE lotes SET status = 'completo', ultima_atualizacao = NOW() WHERE id = ?`,
        [loteId]
      );
      console.log(`Lote ${loteId} atualizado para status 'completo'.`);
    }
  } else {
    // Se alguma condição para "completo" não é atendida
    // Se o status atual é 'completo' ou 'liberado_para_homologacao', reverte para 'incompleto'
    if (
      currentLoteStatus === "completo" ||
      currentLoteStatus === "liberado_para_homologacao"
    ) {
      await connection.execute(
        `UPDATE lotes SET status = 'incompleto', ultima_atualizacao = NOW() WHERE id = ?`,
        [loteId]
      );
      console.log(`Lote ${loteId} atualizado para status 'incompleto'.`);
    } else if (
      currentLoteStatus !== "incompleto" &&
      currentLoteStatus !== "pendente"
    ) {
      // Se não estava completo, nem incompleto, nem pendente (ex: novo lote), define como pendente.
      await connection.execute(
        `UPDATE lotes SET status = 'pendente', ultima_atualizacao = NOW() WHERE id = ?`,
        [loteId]
      );
      console.log(`Lote ${loteId} atualizado para status 'pendente'.`);
    }
  }
  // --- FIM DA LÓGICA DE VERIFICAR E ATUALIZAR O STATUS DO LOTE ---
};

/**
 * Função interna para calcular os custos detalhados de um profissional
 * com base nos dados preenchidos pelo usuário e na CCT relevante.
 * Assume uma jornada de 220 horas mensais para cálculo de valor da hora normal,
 * mas pode ser ajustado com base em `jornada_semanal_horas` da CCT.
 * @param {object} userData - Dados preenchidos pelo usuário (content do documento).
 * @param {object} cctData - Conteúdo JSON da CCT relevante.
 * @param {number} salarioMinimoNacional - O Salário Mínimo Nacional vigente.
 * @returns {object} - Objeto com os campos calculados injetados no userData.
 */
const calculateDocumentCosts = (userData, cctData, salarioMinimoNacional) => {
  // Faz uma cópia profunda para não modificar o objeto original
  const calculatedContent = JSON.parse(JSON.stringify(userData));
  const remuneracao = calculatedContent.composicao_remuneracao || {};
  const custosCalculados = calculatedContent.custos_calculados || {};
  const beneficiosCalculados = calculatedContent.beneficios_calculados || {};
  const provisionCalculated =
    calculatedContent.provisoes_e_encargos_calculados || {};

  // Dados base para cálculos (vindos do usuário e da CCT)
  const salarioBase = parseFloat(remuneracao.salario_base || 0);
  const qtdContratar = parseFloat(
    calculatedContent.identificacao_servico?.quantidade_total_contratar || 0
  );
  const jornadaSemanalHorasCCT = parseFloat(
    cctData.categorias_profissionais?.[0]?.jornada_semanal_horas || 44
  );
  // Para 220 horas/mês (5 dias x 8h x 5,5 semanas) ou 200h/mês (5 dias x 8h x 5 semanas)
  // Usando 220 horas mensais como padrão comum, se não for explícito na CCT
  const horasMensaisPadrao = 220; // Geralmente 220 horas (44h/semana * 5 semanas/mês)
  // Se a CCT tiver outra regra, use cctData.jornada_mensal_horas_padrao ou similar.

  remuneracao.valor_hora_normal = salarioBase / horasMensaisPadrao;

  // ====================================================================
  // 4. Composição da Remuneração (Calculados com base em Salário-Base e CCT)
  // ====================================================================
  // 4.1 Salário-Base (já vem do usuário)

  // 4.2 Adicionais (Insalubridade, Periculosidade)
  const insalubridadeConfig = cctData.adicionais_e_verbas?.insalubridade;
  if (
    insalubridadeConfig?.aplicavel &&
    remuneracao.adic_insalubridade_percentual !== undefined
  ) {
    let baseInsalubridade =
      insalubridadeConfig.tipo_calculo === "percentual_salario_minimo"
        ? salarioMinimoNacional
        : salarioBase;
    remuneracao.valor_insalubridade =
      baseInsalubridade * remuneracao.adic_insalubridade_percentual;
  } else {
    remuneracao.valor_insalubridade = 0;
  }

  const periculosidadeConfig = cctData.adicionais_e_verbas?.periculosidade;
  if (
    periculosidadeConfig?.aplicavel &&
    remuneracao.adic_periculosidade_percentual !== undefined
  ) {
    remuneracao.valor_periculosidade =
      salarioBase * remuneracao.adic_periculosidade_percentual; // Geralmente sobre salário base
  } else {
    remuneracao.valor_periculosidade = 0;
  }

  // 4.3 Adicional Noturno e 4.4 Hora Noturna Adicional
  const adicNoturnoConfig = cctData.adicionais_e_verbas?.adicional_noturno;
  if (
    adicNoturnoConfig?.aplicavel &&
    remuneracao.horas_noturnas_mes !== undefined
  ) {
    const horasNoturnasReais = remuneracao.horas_noturnas_mes;
    // Valor da hora noturna já com o adicional (ex: R$10/h * 1.20 = R$12/h noturna)
    const valorHoraNoturnaComAdicional =
      remuneracao.valor_hora_normal * (1 + adicNoturnoConfig.percentual);
    remuneracao.valor_adicional_noturno =
      valorHoraNoturnaComAdicional * horasNoturnasReais;
  } else {
    remuneracao.valor_adicional_noturno = 0;
  }

  // 4.5 e 4.6 Horas Extras
  remuneracao.valor_horas_extras_50 = 0;
  remuneracao.valor_horas_extras_100 = 0;

  if (remuneracao.horas_extras_50_mes !== undefined) {
    remuneracao.valor_horas_extras_50 =
      remuneracao.valor_hora_normal *
      remuneracao.horas_extras_50_mes *
      (1 + (cctData.adicionais_e_verbas?.horas_extras?.percentual_50 || 0));
  }
  if (remuneracao.horas_extras_100_mes !== undefined) {
    remuneracao.valor_horas_extras_100 =
      remuneracao.valor_hora_normal *
      remuneracao.horas_extras_100_mes *
      (1 + (cctData.adicionais_e_verbas?.horas_extras?.percentual_100 || 0));
  }

  // 4.7 DSR sobre Variáveis (HE, AN, etc.)
  const dsrConfig = cctData.adicionais_e_verbas?.dsr_sobre_variaveis;
  // Base para DSR sobre variáveis: horas extras + adicional noturno
  let baseDSRVariaveis =
    (remuneracao.valor_horas_extras_50 || 0) +
    (remuneracao.valor_horas_extras_100 || 0) +
    (remuneracao.valor_adicional_noturno || 0);

  remuneracao.valor_dsr =
    baseDSRVariaveis * (dsrConfig?.percentual_sobre_he_an_etcs || 0);

  // 4.8 Outros (especificar) - Valor já vem do usuário.
  remuneracao.outros_valor = parseFloat(remuneracao.outros_valor || 0);

  // Total da Remuneração (Soma dos itens 4.x - Remuneração Base + Adicionais)
  remuneracao.total_da_remuneracao =
    salarioBase +
    (remuneracao.valor_insalubridade || 0) +
    (remuneracao.valor_periculosidade || 0) +
    (remuneracao.valor_adicional_noturno || 0) +
    (remuneracao.valor_horas_extras_50 || 0) +
    (remuneracao.valor_horas_extras_100 || 0) +
    (remuneracao.valor_dsr || 0) +
    (remuneracao.outros_valor || 0);

  // ====================================================================
  // 5. Benefícios Mensais e Diários (da CCT)
  // ====================================================================
  let totalBeneficios = 0;
  if (cctData.adicionais_e_verbas?.beneficios_mensais_fixos) {
    for (const beneficio of cctData.adicionais_e_verbas
      .beneficios_mensais_fixos) {
      let valorBeneficio = 0;
      if (beneficio.valor_mensal_rs) {
        // Benefícios com valor mensal fixo
        valorBeneficio = beneficio.valor_mensal_rs;
      } else if (
        beneficio.tipo === "vale_refeicao_alimentacao" &&
        beneficio.valor_diario_minimo
      ) {
        // Dias úteis no mês: pega do documento se o usuário preencheu (dados_contratacao), senão usa o padrão da CCT
        const diasUteisNoMes = parseFloat(
          calculatedContent.dados_contratacao?.dias_uteis_no_mes ||
            beneficio.dias_uteis_mes_padrao ||
            22
        );
        valorBeneficio = beneficio.valor_diario_minimo * diasUteisNoMes;
      }
      beneficiosCalculados[beneficio.tipo] = valorBeneficio;
      totalBeneficios += valorBeneficio;
    }
  }
  // Vale Transporte - Custo da empresa (Valor Bruto VT - Desconto Empregado)
  if (remuneracao.valor_vale_transporte_bruto !== undefined) {
    const vtDescontoEmpregado =
      (salarioBase || 0) *
      (cctData.adicionais_e_verbas?.vale_transporte
        ?.desconto_empregado_percentual || 0);
    beneficiosCalculados.valor_vale_transporte_liquido =
      parseFloat(remuneracao.valor_vale_transporte_bruto) - vtDescontoEmpregado;
    totalBeneficios += beneficiosCalculados.valor_vale_transporte_liquido;
  } else {
    beneficiosCalculados.valor_vale_transporte_liquido = 0;
  }

  // ====================================================================
  // Módulo 3 (Provisões e Encargos) - Percentuais sobre a base de cálculo (geralmente Remuneração Total)
  // ====================================================================
  let totalProvisoesEncargos = 0;
  const encargosPercentuais = cctData.provisoes_e_encargos_percentuais;
  if (encargosPercentuais) {
    const baseDeCalculoEncargos = remuneracao.total_da_remuneracao; // Base comum para muitos encargos

    for (const key in encargosPercentuais) {
      const percentual = encargosPercentuais[key];
      if (typeof percentual === "number") {
        let valorEncargo = baseDeCalculoEncargos * percentual;
        provisionCalculated[key] = valorEncargo;
        totalProvisoesEncargos += valorEncargo;
      }
    }
  }

  // ====================================================================
  // Módulo Final - Totais de Custo para o Posto (injetados no Documento)
  // ====================================================================

  // Valor total por posto (R$) - Este é o custo MENSAL para a empresa por UNIDADE de profissional
  // Soma: Total Remuneração + Total Benefícios da CCT + Total Provisões e Encargos
  custosCalculados.valor_total_mensal_por_posto =
    remuneracao.total_da_remuneracao + totalBeneficios + totalProvisoesEncargos;

  // Valor Total Mensal(R$) - Este é o custo MENSAL para a empresa para esta LINHA de profissional (posto)
  // Multiplica o custo por posto pela quantidade de profissionais desta ficha
  custosCalculados.valor_total_mensal =
    custosCalculados.valor_total_mensal_por_posto * qtdContratar;

  // Injeta os objetos atualizados de volta no content
  calculatedContent.composicao_remuneracao = remuneracao; // Atualiza com os valores adicionais calculados
  calculatedContent.beneficios_calculados = beneficiosCalculados;
  calculatedContent.provisoes_e_encargos_calculados = provisionCalculated;
  calculatedContent.custos_calculados = custosCalculados;

  // Formatar para 2 casas decimais todos os valores monetários calculados
  const formatToTwoDecimals = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "number") {
        obj[key] = parseFloat(obj[key].toFixed(2));
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        formatToTwoDecimals(obj[key]); // Recursivo para objetos aninhados
      }
    }
  };

  formatToTwoDecimals(calculatedContent.composicao_remuneracao);
  formatToTwoDecimals(calculatedContent.beneficios_calculados);
  formatToTwoDecimals(calculatedContent.provisoes_e_encargos_calculados);
  formatToTwoDecimals(calculatedContent.custos_calculados);

  return calculatedContent;
};

// ========================================================================================================
// FUNÇÕES EXPORTADAS
// ========================================================================================================

/**
 * Cria um novo processo completo, incluindo o registro inicial do prestador de serviço
 * e a adição de lotes. A vinculação de CCTs é agora dinâmica, baseada na região do lote,
 * e a criação dos documentos individuais é feita separadamente pelo Prestador.
 * Esta é a função principal para a tela "Nova Chave" do Formalizador.
 *
 * @param {object} processData - Dados para criar o processo e o acesso do prestador.
 * @param {string} processData.numero_contrato - Número do contrato (login do prestador).
 * @param {string} processData.chave_acesso - Chave de acesso (senha do prestador).
 * @param {string} processData.tipo_processo - Tipo do processo (ex: 'Concorrência').
 * @param {string} [processData.data_apresentacao_proposta] - Data da apresentação da proposta (campo 1.1).
 * @param {number} [processData.num_meses_execucao_contratual] - Nº de meses da execução contratual (campo 1.4).
 * @param {Array<object>} processData.lotes - Array de objetos de lote.
 * @param {number} processData.lotes[].numero_lote - Número do lote (identificador regional, ex: 5).
 * @param {number} processData.lotes[].quantidade_profissionais - Quantidade de profissionais (total_documentos).
 * @param {number} formalizadorId - ID do usuário formalizador que está criando.
 * @returns {object} - O processo criado com prestador e lotes.
 */
export const createFullProcess = async (processData, formalizadorId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const {
      numero_contrato,
      chave_acesso,
      tipo_processo,
      data_apresentacao_proposta,
      num_meses_execucao_contratual,
      lotes,
    } = processData;

    // 1. Criar Prestador de Serviço
    const saltRounds = 10;
    const hashedChaveAcesso = await bcrypt.hash(chave_acesso, saltRounds);

    const [prestadorResult] = await connection.execute(
      `INSERT INTO prestadores_servico (
                numero_contrato,
                chave_acesso_hash,
                criado_por_formalizador_id,
                razao_social,
                cnpj
            ) VALUES (?, ?, ?, ?, ?)`,
      [numero_contrato, hashedChaveAcesso, formalizadorId, null, null]
    );
    const prestadorServicoId = prestadorResult.insertId;

    // 2. Criar o Processo
    const [processoResult] = await connection.execute(
      `INSERT INTO processos (
                prestador_servico_id,
                tipo_processo,
                status,
                criado_por_formalizador_id,
                data_apresentacao_proposta,
                num_meses_execucao_contratual
            ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        prestadorServicoId,
        tipo_processo,
        "pendente_formalizacao",
        formalizadorId,
        data_apresentacao_proposta
          ? new Date(data_apresentacao_proposta).toISOString().split("T")[0]
          : null,
        num_meses_execucao_contratual || null,
      ]
    );
    const newProcessoId = processoResult.insertId;

    // 3. Adicionar Lotes (NÃO VINCULA CCTs AQUI, NEM CRIA DOCUMENTOS)
    const createdLotes = [];
    if (lotes && lotes.length > 0) {
      for (const loteData of lotes) {
        const { numero_lote, quantidade_profissionais } = loteData;

        const [loteResult] = await connection.execute(
          `INSERT INTO lotes (
                        processo_id,
                        numero_lote,
                        total_documentos,
                        quantidade_profissionais,
                        status
                    ) VALUES (?, ?, ?, ?, ?)`,
          [
            newProcessoId,
            numero_lote,
            quantidade_profissionais,
            quantidade_profissionais,
            "pendente",
          ]
        );
        const newLoteId = loteResult.insertId;
        createdLotes.push({ id: newLoteId, ...loteData, status: "pendente" });
      }
    }

    await connection.commit();

    return {
      processo: {
        id: newProcessoId,
        tipo_processo,
        status: "pendente_formalizacao",
        data_apresentacao_proposta,
        num_meses_execucao_contratual,
      },
      prestador: { id: prestadorServicoId, numero_contrato },
      lotes: createdLotes,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar processo completo:", error);
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error(
        `Número de contrato ${processData.numero_contrato} já existe para outro prestador.`
      );
    }
    throw new Error("Erro interno ao criar processo completo.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Cria os registros de documentos (slots para preenchimento de ficha profissional)
 * para um lote específico. Esta função será chamada pelo Prestador.
 * @param {number} loteId - ID do lote para o qual os documentos serão criados.
 * @param {number} totalDocumentsToCreate - Quantidade de documentos a serem criados para este lote.
 * @returns {Array<object>} - Array dos documentos criados.
 */
export const createDocumentsForLote = async (
  loteId,
  totalDocumentsToCreate
) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const createdDocuments = [];

    if (totalDocumentsToCreate && totalDocumentsToCreate > 0) {
      const documentInsertValues = [];
      for (let i = 1; i <= totalDocumentsToCreate; i++) {
        documentInsertValues.push([
          loteId,
          String(i),
          "Ficha do Profissional",
          "pendente",
        ]);
      }
      if (documentInsertValues.length > 0) {
        const [result] = await connection.query(
          `INSERT INTO documentos (lote_id, numero_documento, tipo, status) VALUES ?`,
          [documentInsertValues]
        );
        const [newDocs] = await connection.execute(
          `SELECT id, numero_documento, tipo, status FROM documentos WHERE lote_id = ? AND id >= ?`,
          [loteId, result.insertId]
        );
        createdDocuments.push(...newDocs);
      }
    } else {
      throw new Error(
        "Quantidade de documentos a criar deve ser maior que zero."
      );
    }

    await connection.commit();
    return createdDocuments;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao criar documentos para o lote:", error);
    throw new Error("Erro interno ao criar documentos para o lote.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Formaliza um processo. Muda o status do processo para 'formalizado'.
 * @param {number} processoId - ID do processo a ser formalizado.
 * @param {number} formalizadorId - ID do formalizador que está formalizando (para auditoria).
 * @returns {boolean} - True se o processo foi formalizado com sucesso.
 */
export const formalizeProcesso = async (processoId, formalizadorId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar o status atual do processo
    const [processRows] = await connection.execute(
      `SELECT status FROM processos WHERE id = ?`,
      [processoId]
    );

    if (processRows.length === 0) {
      throw new Error("VALIDATION_ERROR: Processo não encontrado.");
    }

    const currentStatus = processRows[0].status;

    // 2. Validação: Só pode Formalizar se o processo estiver 'homologado'
    if (currentStatus !== "homologado") {
      throw new Error(
        `VALIDATION_ERROR: O processo deve estar com status 'homologado' para ser formalizado. Status atual: '${currentStatus}'.`
      );
    }

    // 3. Atualizar o status do processo para 'formalizado'
    const [updateResult] = await connection.execute(
      `UPDATE processos SET status = 'formalizado', ultima_atualizacao = NOW() WHERE id = ?`,
      [processoId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Falha ao formalizar processo. Nenhuma alteração realizada."
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao formalizar processo:", error);
    throw error; // Re-lança o erro para ser capturado pelo controller
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca processos detalhados.
 * Formalizadores/Homologadores podem ver todos. Prestadores veem os seus.
 * O numero_contrato do prestador é incluído no nível superior do objeto processo.
 * @param {object} [options] - Opções de filtro.
 * @param {number} [options.prestadorServicoId=null] - ID do prestador de serviço para filtrar (para prestadores logados).
 * @param {string} [options.statusFilter=null] - Status do processo para filtrar (ex: 'enviado_homologacao').
 * @param {string} [options.numeroContratoFilter=null] - Número do contrato do prestador para filtrar.
 * @returns {Array<object>} - Lista de processos (detalhada).
 */
export const getProcessos = async (options = {}) => {
  // Define um objeto vazio como padrão se 'options' for undefined
  let connection;
  try {
    connection = await pool.getConnection();

    // Desestruturar options com valores padrão explícitos
    const {
      prestadorServicoId = null,
      statusFilter = null,
      numeroContratoFilter = null,
    } = options;

    let query = `
          SELECT
              p.id AS processo_id,
              p.tipo_processo,
              p.status AS processo_status,
              p.data_criacao AS processo_data_criacao,
              p.data_apresentacao_proposta,
              p.num_meses_execucao_contratual,
              p.motivo_ultima_recusa, 
              ps.id AS prestador_id,
              ps.razao_social AS prestador_razao_social,
              ps.numero_contrato AS numero_contrato,
              l.id AS lote_id,
              l.numero_lote,
              l.status AS lote_status,
              l.total_documentos,
              l.quantidade_profissionais,
              d.id AS documento_id,
              d.numero_documento,
              d.tipo AS documento_tipo,
              d.status AS documento_status
          FROM processos p
          JOIN prestadores_servico ps ON p.prestador_servico_id = ps.id
          LEFT JOIN lotes l ON p.id = l.processo_id
          LEFT JOIN documentos d ON l.id = d.lote_id
      `;
    const params = [];
    const conditions = [];

    if (prestadorServicoId) {
      // Se for um prestador logado, filtra apenas pelos seus processos
      conditions.push(`p.prestador_servico_id = ?`);
      params.push(prestadorServicoId);
    } else {
      // Se for Formalizador/Homologador ou sem login específico
      // Filtro padrão: EXCLUI status 'formalizado' SOMENTE se NENHUM FILTRO ESPECÍFICO (status ou numeroContrato) foi dado
      if (!statusFilter && !numeroContratoFilter) {
        conditions.push(`p.status != 'formalizado'`);
      }
    }

    // Adicionar filtros de status e numeroContrato (sempre)
    if (statusFilter) {
      conditions.push(`p.status = ?`);
      params.push(statusFilter);
    }
    if (numeroContratoFilter) {
      conditions.push(`ps.numero_contrato = ?`);
      params.push(numeroContratoFilter);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY p.data_criacao DESC, l.numero_lote ASC, d.numero_documento ASC`;

    const [rows] = await connection.execute(query, params);

    const processosMap = new Map();

    for (const row of rows) {
      if (!processosMap.has(row.processo_id)) {
        processosMap.set(row.processo_id, {
          id: row.processo_id,
          tipo_processo: row.tipo_processo,
          status: row.processo_status,
          data_criacao: row.data_criacao,
          data_apresentacao_proposta: row.data_apresentacao_proposta,
          num_meses_execucao_contratual: row.num_meses_execucao_contratual,
          motivo_ultima_recusa: row.motivo_ultima_recusa, // Adicionado ao objeto de retorno
          numero_contrato: row.numero_contrato,
          prestador: {
            id: row.prestador_id,
            razao_social: row.prestador_razao_social,
          },
          lotes: [],
        });
      }

      const processo = processosMap.get(row.processo_id);

      let lote = null;
      if (row.lote_id) {
        lote = processo.lotes.find((l) => l.id === row.lote_id);
        if (!lote) {
          lote = {
            id: row.lote_id,
            numero_lote: row.numero_lote,
            status: row.lote_status,
            total_documentos: row.total_documentos,
            quantidade_profissionais: row.quantidade_profissionais,
            documentos: [],
          };
          processo.lotes.push(lote);
        }
      }

      if (row.lote_id && row.documento_id) {
        if (lote && !lote.documentos.some((d) => d.id === row.documento_id)) {
          lote.documentos.push({
            id: row.documento_id,
            numero_documento: row.numero_documento,
            tipo: row.documento_tipo,
            status: row.documento_status,
          });
        }
      }
    }

    return Array.from(processosMap.values());
  } catch (error) {
    console.error("Erro ao buscar processos:", error);
    throw new Error("Erro interno ao buscar processos.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca todas as CCTs ativas para uma determinada região (identificada pelo numero_lote).
 * Esta função será usada pelo Prestador ao preencher documentos para um lote.
 * @param {number} numeroLote - O numero_lote que representa a região.
 * @returns {Array<object>} - Lista de CCTs com seus conteúdos JSON.
 */
export const getCCTsByLoteRegion = async (numeroLote) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, nome, numero_regiao, nome_regiao, ano_vigencia, data_inicio_vigencia, data_fim_vigencia, conteudo_json
             FROM ccts
             WHERE numero_regiao = ?`,
      [String(numeroLote)] // Converte para string para garantir compatibilidade com VARCHAR
    );
    return rows;
  } catch (error) {
    console.error("Erro ao buscar CCTs por região do lote:", error);
    throw new Error("Erro interno ao buscar CCTs.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca os documentos (fichas) de um lote específico.
 * @param {number} loteId - ID do lote.
 * @returns {Array<object>} - Lista de documentos.
 */
export const getDocumentsForLote = async (loteId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, lote_id, numero_documento, tipo, status
             FROM documentos
             WHERE lote_id = ?
             ORDER BY numero_documento ASC`,
      [loteId]
    );
    return rows;
  } catch (error) {
    console.error("Erro ao buscar documentos para o lote:", error);
    throw new Error("Erro interno ao buscar documentos para o lote.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca a última versão do conteúdo JSON de um documento específico.
 * Inclui os dados de "Dados referentes à contratação" do Processo.
 * @param {number} documentoId - ID do documento.
 * @returns {object|null} - Objeto contendo o ID da versão (se houver) e o conteúdo JSON, com dados do processo mesclados.
 */
export const getDocumentLatestVersion = async (documentoId) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Obter o lote_id e processo_id do documento
    const [docLoteProcessoRows] = await connection.execute(
      `SELECT d.lote_id, l.processo_id
             FROM documentos d
             JOIN lotes l ON d.lote_id = l.id
             WHERE d.id = ?`,
      [documentoId]
    );

    if (docLoteProcessoRows.length === 0) {
      return null; // Documento não encontrado
    }
    const loteId = docLoteProcessoRows[0].lote_id;
    const processoId = docLoteProcessoRows[0].processo_id;

    // 2. Obter os dados de "Dados referentes à contratação" do Processo
    const [processDataRows] = await connection.execute(
      `SELECT
                p.data_apresentacao_proposta,
                p.num_meses_execucao_contratual
             FROM processos p
             WHERE p.id = ?`,
      [processoId]
    );
    const processData = processDataRows[0] || {}; // Se não encontrar, retorna objeto vazio

    // 3. Obter o conteúdo da última versão do documento (se existir)
    const [docVersionContentRows] = await connection.execute(
      `SELECT id AS versao_id, conteudo
             FROM documentos_versoes
             WHERE documento_id = ?
             ORDER BY versao DESC
             LIMIT 1`,
      [documentoId]
    );
    const docVersionContent = docVersionContentRows[0] || {
      versao_id: null,
      conteudo: null,
    }; // Se não há versão, usa nulls

    // 4. Mesclar os dados do processo com o conteúdo do documento
    let finalContent = docVersionContent.conteudo
      ? { ...docVersionContent.conteudo }
      : {};

    // Garante que a seção 'dados_contratacao' exista no JSON final
    if (!finalContent.dados_contratacao) {
      finalContent.dados_contratacao = {};
    }

    // Injetar os dados do processo no JSON do documento
    if (processData.data_apresentacao_proposta) {
      finalContent.dados_contratacao["data_apresentacao_proposta"] =
        processData.data_apresentacao_proposta;
    }
    if (processData.num_meses_execucao_contratual) {
      finalContent.dados_contratacao["num_meses_execucao_contratual"] =
        processData.num_meses_execucao_contratual;
    }

    return { versao_id: docVersionContent.versao_id, conteudo: finalContent };
  } catch (error) {
    console.error(
      "Erro ao buscar a última versão do documento (com dados do processo):",
      error
    );
    throw new Error("Erro interno ao buscar o conteúdo do documento.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Salva um novo conteúdo como uma nova versão para um documento.
 * Inclui validação para `quantidade_total_contratar`.
 * Realiza cálculos de custos com base na CCT e nos dados do usuário.
 * Atualiza também o status do documento para 'preenchido' se for a primeira versão.
 * Após salvar, ajusta a contagem de documentos pendentes no lote.
 * Não salva dados de processo (1.1, 1.4) no JSON do documento; esses dados ficam na tabela processos.
 * @param {number} documentoId - ID do documento.
 * @param {object} content - O conteúdo JSON a ser salvo.
 * @param {number} userId - ID do usuário (Prestador ou Formalizador) que está salvando.
 * @param {string} userType - Tipo de usuário ('prestador' ou 'usuario').
 * @returns {object} - A nova versão do documento criada.
 */
export const saveDocumentVersion = async (
  documentoId,
  content,
  userId,
  userType
) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obter o ID do lote, o totalProfissionaisNoLote (quantidade_profissionais) do lote
    // e também o processoId para possivelmente atualizar dados de processo.
    const [docInfoRows] = await connection.execute(
      `SELECT d.lote_id, l.quantidade_profissionais, l.processo_id, l.numero_lote
           FROM documentos d
           JOIN lotes l ON d.lote_id = l.id
           WHERE d.id = ?`,
      [documentoId]
    );
    if (docInfoRows.length === 0) {
      throw new Error("Documento não encontrado para salvar a versão.");
    }
    const loteId = docInfoRows[0].lote_id;
    const totalProfissionaisNoLote = docInfoRows[0].quantidade_profissionais;
    const processoId = docInfoRows[0].processo_id;
    const numeroLoteRegiao = docInfoRows[0].numero_lote; // Para buscar CCTs

    // 2. Validação da 'quantidade_total_contratar'
    const novaQuantidadeContratar =
      content?.identificacao_servico?.quantidade_total_contratar;

    if (
      typeof novaQuantidadeContratar !== "number" ||
      novaQuantidadeContratar <= 0
    ) {
      throw new Error(
        "VALIDATION_ERROR: A quantidade total a contratar deve ser um número positivo."
      );
    }

    // Calcular a soma das 'quantidade_total_contratar' dos OUTROS documentos preenchidos/em revisão (última versão de cada)
    const [latestOtherDocumentContents] = await connection.execute(
      `
          SELECT dv.conteudo
          FROM documentos_versoes dv
          INNER JOIN (
              SELECT documento_id, MAX(versao) AS max_versao
              FROM documentos_versoes
              GROUP BY documento_id
          ) AS latest_versions ON dv.documento_id = latest_versions.documento_id AND dv.versao = latest_versions.max_versao
          INNER JOIN documentos d ON dv.documento_id = d.id
          WHERE d.lote_id = ?
            AND d.id != ? -- Exclui o documento atual da soma
            AND d.status IN ('preenchido', 'em_revisao')
      `,
      [loteId, documentoId]
    );

    let currentFilledQuantityExcludingCurrentDocument = 0;
    for (const row of latestOtherDocumentContents) {
      try {
        const q =
          row.conteudo?.identificacao_servico?.quantidade_total_contratar;
        if (typeof q === "number" && q > 0) {
          currentFilledQuantityExcludingCurrentDocument += q;
        }
      } catch (e) {
        console.warn(
          `Erro ao parsear JSON de outro documento no lote ${loteId} (saveDocumentVersion):`,
          e
        );
      }
    }

    // Verifica se a nova soma total (incluindo o documento atual) excede o limite do lote
    const newTotalSum =
      currentFilledQuantityExcludingCurrentDocument + novaQuantidadeContratar;
    if (newTotalSum > totalProfissionaisNoLote) {
      throw new Error(
        `VALIDATION_ERROR: A soma total de profissionais (${newTotalSum}) excede o limite do lote (${totalProfissionaisNoLote}).`
      );
    }

    // --- INÍCIO DA LÓGICA DE CÁLCULO DE CUSTOS ---
    // 3. Obter a CCT relevante para esta região/lote
    const ccts = await getCCTsByLoteRegion(numeroLoteRegiao);
    let relevantCCTData = null;
    const categoriaProfissionalUsuario =
      content?.dados_mao_de_obra?.categoria_profissional;

    if (categoriaProfissionalUsuario) {
      for (const cct of ccts) {
        if (
          cct.conteudo_json?.categorias_profissionais?.some(
            (cat) => cat.nome_categoria === categoriaProfissionalUsuario
          )
        ) {
          relevantCCTData = cct.conteudo_json;
          break;
        }
      }
    }

    if (!relevantCCTData) {
      throw new Error(
        "VALIDATION_ERROR: Categoria profissional ou CCT relevante não encontrada para o cálculo de custos. Verifique a Categoria Profissional e as CCTs cadastradas para a região."
      );
    }

    // SALARIO_MINIMO_NACIONAL - Este é um dado que DEVERIA ser configurável no sistema (ex: tabela `configuracoes`)
    const SALARIO_MINIMO_NACIONAL = 1412.0; // Exemplo: SMN de 2024 (apenas para simulação)

    // Realizar os cálculos de custos e injetar no conteúdo
    const calculatedContent = calculateDocumentCosts(
      content,
      relevantCCTData,
      SALARIO_MINIMO_NACIONAL
    );
    // --- FIM DA LÓGICA DE CÁLCULO DE CUSTOS ---

    // 4. Atualizar campos de processo (1.1 e 1.4) SE ESTIVEREM NO 'content' (do usuário)
    const dataApresentacaoProposta =
      content?.dados_contratacao?.data_apresentacao_proposta;
    const numMesesExecucaoContratual =
      content?.dados_contratacao?.num_meses_execucao_contratual;

    if (
      dataApresentacaoProposta !== undefined ||
      numMesesExecucaoContratual !== undefined
    ) {
      const [currentProcessData] = await connection.execute(
        `SELECT data_apresentacao_proposta, num_meses_execucao_contratual
               FROM processos WHERE id = ?`,
        [processoId]
      );
      const currentDataProp = currentProcessData[0]?.data_apresentacao_proposta;
      const currentNumMeses =
        currentProcessData[0]?.num_meses_execucao_contratual;

      const shouldUpdateDataProp =
        dataApresentacaoProposta !== undefined &&
        dataApresentacaoProposta !== null &&
        currentDataProp === null;
      const shouldUpdateNumMeses =
        numMesesExecucaoContratual !== undefined &&
        numMesesExecucaoContratual !== null &&
        currentNumMeses === null;

      if (shouldUpdateDataProp || shouldUpdateNumMeses) {
        await connection.execute(
          `UPDATE processos SET
                      data_apresentacao_proposta = ?,
                      num_meses_execucao_contratual = ?,
                      ultima_atualizacao = NOW()
                   WHERE id = ?`,
          [
            shouldUpdateDataProp
              ? dataApresentacaoProposta
                ? new Date(dataApresentacaoProposta).toISOString().split("T")[0]
                : null
              : currentDataProp,
            shouldUpdateNumMeses ? numMesesExecucaoContratual : currentNumMeses,
            processoId,
          ]
        );
      }
    }

    // 5. Remover campos de processo do JSON que será salvo em documentos_versoes
    const contentToSave = { ...calculatedContent }; // Usa o conteúdo JÁ CALCULADO para salvar
    if (contentToSave.dados_contratacao) {
      delete contentToSave.dados_contratacao.data_apresentacao_proposta;
      delete contentToSave.dados_contratacao.num_meses_execucao_contratual;
    }

    // 6. Obter o número da próxima versão
    const [versionRows] = await connection.execute(
      `SELECT MAX(versao) AS max_versao FROM documentos_versoes WHERE documento_id = ?`,
      [documentoId]
    );
    const nextVersion = (versionRows[0].max_versao || 0) + 1;

    // Define o ID do criador da versão baseado no tipo de usuário
    let criadoPorUsuarioId = null;
    let criadoPorPrestadorId = null;
    if (userType === "prestador") {
      criadoPorPrestadorId = userId;
    } else if (userType === "usuario") {
      criadoPorUsuarioId = userId;
    }

    // 7. Inserir a nova versão
    const [result] = await connection.execute(
      `INSERT INTO documentos_versoes (documento_id, versao, conteudo, criado_por_usuario_id, criado_por_prestador_id)
           VALUES (?, ?, ?, ?, ?)`,
      [
        documentoId,
        nextVersion,
        JSON.stringify(contentToSave),
        criadoPorUsuarioId,
        criadoPorPrestadorId,
      ]
    );

    // 8. Atualizar o status do documento principal e data de atualização
    if (nextVersion === 1) {
      await connection.execute(
        `UPDATE documentos SET status = 'preenchido', ultima_atualizacao = NOW() WHERE id = ?`,
        [documentoId]
      );
    } else {
      await connection.execute(
        `UPDATE documentos SET ultima_atualizacao = NOW() WHERE id = ?`,
        [documentoId]
      );
    }

    // 9. Ajustar a contagem de documentos no lote
    await adjustLoteDocumentsCount(
      connection,
      loteId,
      totalProfissionaisNoLote
    );

    await connection.commit();

    return {
      versao_id: result.insertId,
      documento_id: documentoId,
      versao: nextVersion,
      conteudo: contentToSave,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao salvar versão do documento:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca os totais agregados para um processo completo.
 * Inclui "Total Quantidade", "Total Mensal" e "Total Anual".
 * Assume que 'Nº de meses da execução contratual' (campo 1.4) é um valor único para o processo
 * e reside na tabela `processos`.
 *
 * @param {number} processoId - ID do processo para calcular os totais.
 * @returns {object} - Objeto com os totais calculados.
 */
export const getProcessTotals = async (processoId) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // Obter 'Nº de meses da execução contratual' diretamente da tabela processos
    const [processInfoRows] = await connection.execute(
      `SELECT num_meses_execucao_contratual FROM processos WHERE id = ?`,
      [processoId]
    );
    const numMesesExecucaoContratual =
      processInfoRows[0]?.num_meses_execucao_contratual || 1; // Assume 1 se não encontrado

    // Obter todos os conteúdos de documentos preenchidos/em revisão para o processo
    const [allProcessDocumentsContents] = await connection.execute(
      `
          SELECT dv.conteudo
          FROM documentos_versoes dv
          INNER JOIN (
              SELECT documento_id, MAX(versao) AS max_versao
              FROM documentos_versoes
              GROUP BY documento_id
          ) AS latest_versions ON dv.documento_id = latest_versions.documento_id AND dv.versao = latest_versions.max_versao
          INNER JOIN documentos d ON dv.documento_id = d.id
          INNER JOIN lotes l ON d.lote_id = l.id
          WHERE l.processo_id = ? AND d.status IN ('preenchido', 'em_revisao')
      `,
      [processoId]
    );

    let totalQuantidade = 0;
    let totalMensal = 0.0;

    // Itera sobre os conteúdos dos documentos para somar
    for (const row of allProcessDocumentsContents) {
      try {
        const content = row.conteudo;

        // Soma 'quantidade_total_contratar'
        const qtdContratar =
          content?.identificacao_servico?.quantidade_total_contratar;
        if (typeof qtdContratar === "number" && qtdContratar > 0) {
          totalQuantidade += qtdContratar;
        }

        // Soma 'Valor Total Mensal(R$)' - AGORA ESTÁ EM `custos_calculados`
        const valorMensal = content?.custos_calculados?.valor_total_mensal; // <--- CAMINHO CORRIGIDO AQUI
        if (typeof valorMensal === "number") {
          totalMensal += valorMensal;
        }
      } catch (e) {
        console.warn(
          `Erro ao processar conteúdo JSON para totais do processo ${processoId}:`,
          e
        );
      }
    }

    const totalAnual = totalMensal * numMesesExecucaoContratual;

    return {
      total_quantidade: totalQuantidade,
      total_mensal: parseFloat(totalMensal.toFixed(2)),
      total_anual: parseFloat(totalAnual.toFixed(2)),
    };
  } catch (error) {
    console.error("Erro ao buscar totais do processo:", error);
    throw new Error("Erro interno ao buscar totais do processo.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca o próximo documento (ficha) pendente ou ativo a ser preenchido para um lote.
 * @param {number} loteId - ID do lote.
 * @param {number|null} [currentDocumentId=null] - ID do documento atual (se estiver vindo de "Salvar e Ir para o Próximo").
 * @returns {object|null} - O próximo documento a ser preenchido, ou null se não houver.
 */
export const getNextDocumentForLote = async (
  loteId,
  currentDocumentId = null
) => {
  let connection;
  try {
    connection = await pool.getConnection();

    let query = `
            SELECT id, lote_id, numero_documento, tipo, status
            FROM documentos
            WHERE lote_id = ?
              AND status IN ('pendente', 'preenchido', 'em_revisao') -- Considera ativos e pendentes
        `;
    const params = [loteId];

    if (currentDocumentId) {
      // Se um documento atual for fornecido, busca o próximo em ordem numérica
      query += ` AND CAST(numero_documento AS UNSIGNED) > (SELECT CAST(numero_documento AS UNSIGNED) FROM documentos WHERE id = ?)`;
      params.push(currentDocumentId);
    }

    query += ` ORDER BY CAST(numero_documento AS UNSIGNED) ASC LIMIT 1`; // Pega o próximo em ordem

    const [rows] = await connection.execute(query, params);
    return rows[0] || null;
  } catch (error) {
    console.error("Erro ao buscar próximo documento para o lote:", error);
    throw new Error("Erro interno ao buscar próximo documento.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Envia um processo para o estágio de homologação.
 * Valida se todos os lotes e documentos do processo estão completos antes de mudar o status do processo.
 * @param {number} processoId - ID do processo a ser enviado para homologação.
 * @param {number} prestadorId - ID do prestador de serviço que está enviando (para auditoria/segurança).
 * @returns {boolean} - True se o processo foi enviado com sucesso, false caso contrário.
 */
export const sendProcessToHomologation = async (processoId, prestadorId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar se o processo existe e pertence ao prestador
    const [processRows] = await connection.execute(
      `SELECT id, status, prestador_servico_id FROM processos WHERE id = ? AND prestador_servico_id = ?`,
      [processoId, prestadorId]
    );

    if (processRows.length === 0) {
      throw new Error(
        "VALIDATION_ERROR: Processo não encontrado ou não pertence a este prestador."
      );
    }

    const processo = processRows[0];

    // 2. Verificar o status dos lotes e documentos do processo
    // Buscamos todos os lotes e seus documentos para verificar se estão completos
    const processosComLotesDocs = await getProcessos(prestadorId); // Reutiliza a função que traz tudo
    const currentProcess = processosComLotesDocs.find(
      (p) => p.id === processoId
    );

    if (!currentProcess) {
      throw new Error(
        "VALIDATION_ERROR: Processo não encontrado ou detalhes incompletos."
      );
    }

    if (currentProcess.lotes.length === 0) {
      throw new Error(
        "VALIDATION_ERROR: O processo não possui lotes cadastrados."
      );
    }

    let allLotesCompleted = true;
    for (const lote of currentProcess.lotes) {
      // Um lote é considerado completo se seu status for 'completo'
      // E se a soma das quantidades total a contratar for igual à quantidade_profissionais do lote.
      // Para isso, precisaríamos recalcular a soma aqui ou ter um status mais granular.
      // Por simplicidade agora, vamos verificar o status do lote e dos documentos.
      if (
        lote.status !== "completo" &&
        lote.status !== "liberado_para_homologacao"
      ) {
        allLotesCompleted = false;
        break;
      }

      // Opcional: Verificação mais rigorosa se todos os documentos do lote estão preenchidos
      // (a lógica adjustLoteDocumentsCount já cuida disso, mas uma checagem final é boa)
      const [documentsInLote] = await connection.execute(
        `SELECT status FROM documentos WHERE lote_id = ? AND status != 'excluido'`,
        [lote.id]
      );
      const hasPendingDocuments = documentsInLote.some(
        (doc) => doc.status === "pendente" || doc.status === "em_revisao"
      );
      if (hasPendingDocuments) {
        allLotesCompleted = false; // Se ainda tem pendentes, não está pronto
        break;
      }
    }

    if (!allLotesCompleted) {
      throw new Error(
        "VALIDATION_ERROR: Nem todos os lotes/documentos do processo estão completos para envio. Verifique o status de cada lote."
      );
    }

    // 3. Atualizar o status do processo para 'enviado_homologacao'
    const [updateResult] = await connection.execute(
      `UPDATE processos SET status = 'enviado_homologacao', ultima_atualizacao = NOW() WHERE id = ?`,
      [processoId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Erro ao atualizar o status do processo. Processo não encontrado."
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao enviar processo para homologação:", error);
    throw error; // Re-lança o erro para ser capturado pelo controller
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Homologa um processo. Muda o status do processo para 'homologado'.
 * @param {number} processoId - ID do processo a ser homologado.
 * @param {number} homologadorId - ID do homologador que está homologando.
 * @returns {boolean} - True se o processo foi homologado com sucesso.
 */
export const homologateProcesso = async (processoId, homologadorId) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar o status atual do processo
    const [processRows] = await connection.execute(
      `SELECT status FROM processos WHERE id = ?`,
      [processoId]
    );

    if (processRows.length === 0) {
      throw new Error("VALIDATION_ERROR: Processo não encontrado.");
    }

    const currentStatus = processRows[0].status;

    // 2. Validação: Só pode homologar se o processo estiver 'enviado_homologacao'
    if (currentStatus !== "enviado_homologacao") {
      throw new Error(
        `VALIDATION_ERROR: O processo deve estar com status 'enviado_homologacao' para ser homologado. Status atual: '${currentStatus}'.`
      );
    }

    // 3. Atualizar o status do processo para 'homologado'
    const [updateResult] = await connection.execute(
      `UPDATE processos SET status = 'homologado', homologado_por_homologador_id = ?, ultima_atualizacao = NOW() WHERE id = ?`,
      [homologadorId, processoId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Falha ao homologar processo. Nenhuma alteração realizada."
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao homologar processo:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Recusa a homologação de um processo. Muda o status do processo para 'recusado' e registra o motivo.
 * @param {number} processoId - ID do processo a ser recusado.
 * @param {number} homologadorId - ID do homologador que está recusando.
 * @param {string} motivoRecusa - O motivo da recusa.
 * @returns {boolean} - True se a homologação foi recusada com sucesso.
 */
export const refuseHomologation = async (
  processoId,
  homologadorId,
  motivoRecusa
) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar o status atual do processo
    const [processRows] = await connection.execute(
      `SELECT status FROM processos WHERE id = ?`,
      [processoId]
    );

    if (processRows.length === 0) {
      throw new Error("VALIDATION_ERROR: Processo não encontrado.");
    }

    const currentStatus = processRows[0].status;

    // 2. Validação: Só pode recusar se o processo estiver 'enviado_homologacao' ou 'em_alteracao'
    if (
      currentStatus !== "enviado_homologacao" &&
      currentStatus !== "em_alteracao"
    ) {
      throw new Error(
        `VALIDATION_ERROR: O processo deve estar com status 'enviado_homologacao' ou 'em_alteracao' para ser recusado. Status atual: '${currentStatus}'.`
      );
    }

    // 3. Atualizar o status do processo para 'recusado', adicionar homologador e o motivo da recusa
    const [updateResult] = await connection.execute(
      `UPDATE processos SET
              status = 'recusado',
              homologado_por_homologador_id = ?,
              motivo_ultima_recusa = ?, -- NOVO: Salvando o motivo da recusa
              ultima_atualizacao = NOW()
           WHERE id = ?`,
      [homologadorId, motivoRecusa, processoId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error(
        "Falha ao recusar homologação. Nenhuma alteração realizada."
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao recusar homologação:", error);
    throw error; // Re-lança o erro para ser capturado pelo controller
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Exclui logicamente um documento (ficha), diminui a contagem total de documentos do lote,
 * e aciona o ajuste de slots do lote.
 * @param {number} documentoId - ID do documento a ser excluído.
 * @param {number} userId - ID do usuário (Homologador) que está excluindo.
 * @param {string} userType - Tipo de usuário ('usuario' para Homologador).
 * @returns {boolean} - True se o documento foi excluído com sucesso.
 */
export const deleteDocument = async (documentoId, userId, userType) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Obter informações do documento e do lote
    const [docLoteRows] = await connection.execute(
      `SELECT d.lote_id, l.total_documentos, l.quantidade_profissionais FROM documentos d JOIN lotes l ON d.lote_id = l.id WHERE d.id = ?`,
      [documentoId]
    );

    if (docLoteRows.length === 0) {
      throw new Error("VALIDATION_ERROR: Documento não encontrado.");
    }
    const loteId = docLoteRows[0].lote_id;
    let totalDocumentosLoteAtual = docLoteRows[0].total_documentos;
    // const quantidadeProfissionaisOriginal = docLoteRows[0].quantidade_profissionais; // total_profissionais_no_lote original - agora será atualizada

    // Validação: Não permitir que total_documentos seja menor que 1
    if (totalDocumentosLoteAtual <= 1) {
      throw new Error(
        "VALIDATION_ERROR: Não é possível excluir o último documento do lote. O lote deve ter pelo menos um documento."
      );
    }

    // 2. Diminuir o total_documentos E quantidade_profissionais do lote em 1
    totalDocumentosLoteAtual--; // Diminui em 1
    await connection.execute(
      `UPDATE lotes SET total_documentos = ?, quantidade_profissionais = ?, ultima_atualizacao = NOW() WHERE id = ?`,
      [totalDocumentosLoteAtual, totalDocumentosLoteAtual, loteId] // Sincroniza ambos
    );

    // 3. Marcar o documento como 'excluido'
    const [updateDocResult] = await connection.execute(
      `UPDATE documentos SET status = 'excluido', ultima_atualizacao = NOW() WHERE id = ?`,
      [documentoId]
    );

    if (updateDocResult.affectedRows === 0) {
      throw new Error(
        "Falha ao marcar documento como excluído. Nenhuma alteração realizada."
      );
    }

    // 4. Ajustar a contagem de documentos no lote
    // A adjustLoteDocumentsCount usará o NOVO total_documentos (que agora é o mesmo que quantidade_profissionais)
    await adjustLoteDocumentsCount(
      connection,
      loteId,
      totalDocumentosLoteAtual
    ); // Passa o novo total

    await connection.commit();
    return true;
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Erro ao excluir documento:", error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};
