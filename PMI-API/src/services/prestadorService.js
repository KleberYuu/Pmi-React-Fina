import pool from "../config/database.js"; // Importa o pool de conexões do banco de dados
import bcrypt from "bcrypt"; // Importa bcrypt para hashear a chave de acesso

/**
 * Cria um novo registro de prestador de serviço (acesso) pelo Formalizador.
 * Inicialmente, apenas 'numero_contrato' e 'chave_acesso_hash' são fornecidos.
 * Os outros dados ('razao_social', 'cnpj', etc.) serão preenchidos pelo próprio prestador no primeiro login.
 * @param {object} accessData - Dados iniciais do acesso.
 * @param {string} accessData.numero_contrato - O número do contrato (que será o login).
 * @param {string} accessData.chave_acesso - A chave de acesso (que será a senha).
 * @param {number} formalizadorId - O ID do usuário formalizador que está criando o acesso.
 * @returns {object} - O novo registro do prestador de serviço (apenas com os dados iniciais).
 */
export const createPrestadorAccess = async (accessData, formalizadorId) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Obtém uma conexão do pool

    const { numero_contrato, chave_acesso } = accessData;

    // Hash da chave de acesso antes de armazenar
    const saltRounds = 10;
    const hashedChaveAcesso = await bcrypt.hash(chave_acesso, saltRounds);

    // Insere o novo prestador de serviço com os dados mínimos
    const [result] = await connection.execute(
      `INSERT INTO prestadores_servico (
                numero_contrato,
                chave_acesso_hash,
                criado_por_formalizador_id,
                razao_social,
                cnpj
            ) VALUES (?, ?, ?, ?, ?)`,
      [
        numero_contrato,
        hashedChaveAcesso,
        formalizadorId,
        null, // Passando null explicitamente para campos NULLABLE
        null, // Passando null explicitamente para campos NULLABLE
      ]
    );

    const newPrestadorId = result.insertId;

    // Retorna os dados iniciais do prestador
    return {
      id: newPrestadorId,
      numero_contrato,
      message:
        "Acesso de prestador criado com sucesso. Informações adicionais devem ser preenchidas no primeiro login.",
    };
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("Número de contrato ou CNPJ já existe.");
    }
    console.error("Erro ao criar acesso de prestador:", error);
    throw new Error("Erro interno ao criar acesso de prestador.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Atualiza os dados de perfil de um prestador de serviço.
 * Esta função seria usada pelo próprio prestador após o primeiro login.
 * @param {number} prestadorId - ID do prestador de serviço a ser atualizado.
 * @param {object} updateData - Os dados a serem atualizados.
 * @returns {boolean} - True se a atualização foi bem-sucedida, false caso contrário.
 */
export const updatePrestadorProfile = async (prestadorId, updateData) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const { razao_social, cnpj, regime_tributario, numero_licitacao, contato } =
      updateData;

    // Construir a query de atualização dinamicamente
    const fieldsToUpdate = [];
    const params = [];

    if (razao_social !== undefined) {
      fieldsToUpdate.push("razao_social = ?");
      params.push(razao_social);
    }
    if (cnpj !== undefined) {
      fieldsToUpdate.push("cnpj = ?");
      params.push(cnpj);
    }
    if (regime_tributario !== undefined) {
      fieldsToUpdate.push("regime_tributario = ?");
      params.push(regime_tributario);
    }
    if (numero_licitacao !== undefined) {
      fieldsToUpdate.push("numero_licitacao = ?");
      params.push(numero_licitacao);
    }
    if (contato !== undefined) {
      fieldsToUpdate.push("contato = ?");
      params.push(contato);
    }

    if (fieldsToUpdate.length === 0) {
      return false; // Nenhum campo para atualizar
    }

    params.push(prestadorId); // Adiciona o ID do prestador ao final dos parâmetros

    const [result] = await connection.execute(
      `UPDATE prestadores_servico SET ${fieldsToUpdate.join(
        ", "
      )} WHERE id = ?`,
      params
    );

    return result.affectedRows > 0; // Retorna true se alguma linha foi afetada (atualizada)
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw new Error("CNPJ já existe para outro prestador.");
    }
    console.error("Erro ao atualizar perfil do prestador:", error);
    throw new Error("Erro interno ao atualizar perfil do prestador.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Busca um prestador de serviço por ID ou número de contrato.
 * @param {object} options - Opções para busca.
 * @param {number} [options.prestadorId] - ID do prestador.
 * @param {string} [options.numeroContrato] - Número do contrato do prestador.
 * @returns {object|null} - Dados do prestador ou null se não encontrado.
 */
export const getPrestador = async ({ prestadorId, numeroContrato }) => {
  let connection;
  try {
    connection = await pool.getConnection();
    let query = `SELECT id, numero_contrato, razao_social, cnpj, regime_tributario, numero_licitacao, contato, criado_em FROM prestadores_servico WHERE 1=1`;
    const params = [];

    if (prestadorId) {
      query += ` AND id = ?`;
      params.push(prestadorId);
    }
    if (numeroContrato) {
      query += ` AND numero_contrato = ?`;
      params.push(numeroContrato);
    }

    const [rows] = await connection.execute(query, params);
    return rows[0] || null;
  } catch (error) {
    console.error("Erro ao buscar prestador:", error);
    throw new Error("Erro interno ao buscar prestador.");
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Redefine a chave de acesso de um prestador de serviço com base no número do contrato.
 * Gera uma nova chave e a retorna em texto puro (APENAS PARA USO INTERNO DO FORMALIZADOR).
 * @param {string} numeroContrato - O número do contrato do prestador.
 * @returns {string|null} - A nova chave de acesso em texto puro, ou null se o prestador não for encontrado.
 */
export const resetPrestadorAccessKey = async (numeroContrato) => {
  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Encontra o prestador pelo número do contrato
    const [rows] = await connection.execute(
      "SELECT id FROM prestadores_servico WHERE numero_contrato = ?",
      [numeroContrato]
    );
    const prestador = rows[0];

    if (!prestador) {
      return null; // Prestador não encontrado
    }

    // 2. Gera uma nova chave de acesso aleatória
    // Usaremos um UUID ou string aleatória mais robusta em uma aplicação real.
    // Por simplicidade, vamos gerar uma string aleatória simples aqui.
    const newRawKey =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // 3. Hasheia a nova chave
    const saltRounds = 10;
    const newHashedKey = await bcrypt.hash(newRawKey, saltRounds);

    // 4. Atualiza o prestador com a nova chave hash
    await connection.execute(
      "UPDATE prestadores_servico SET chave_acesso_hash = ? WHERE id = ?",
      [newHashedKey, prestador.id]
    );

    return newRawKey; // Retorna a nova chave em texto puro para o Formalizador
  } catch (error) {
    console.error("Erro ao redefinir chave de acesso do prestador:", error);
    throw new Error("Erro interno ao redefinir chave de acesso.");
  } finally {
    if (connection) connection.release();
  }
};
