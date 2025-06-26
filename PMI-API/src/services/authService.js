import bcrypt from "bcrypt"; // Importa a biblioteca bcrypt para hash de senhas
import jwt from "jsonwebtoken"; // Importa a biblioteca jsonwebtoken para gerar JWTs
import pool from "../config/database.js"; // Importa o pool de conexões do banco de dados

// Chave secreta para assinar e verificar JWTs
// IMPORTANTE: Em produção, esta chave deve ser uma variável de ambiente segura e complexa.
const JWT_SECRET = process.env.JWT_SECRET || "segredo-super-seguro";

/**
 * Autentica um usuário Formalizador ou Homologador.
 * @param {string} email - O email do usuário.
 * @param {string} senha - A senha do usuário.
 * @returns {object|null} - Um objeto contendo o token JWT e dados do usuário, ou null se a autenticação falhar.
 */
export const authenticateUsuario = async (email, senha) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Obtém uma conexão do pool

    // Busca o usuário pelo email na tabela 'usuarios'
    const [rows] = await connection.execute(
      "SELECT id, nome, email, senha, tipo_usuario FROM usuarios WHERE email = ?",
      [email]
    );

    const usuario = rows[0]; // Pega o primeiro (e único, se existir) resultado

    // Verifica se o usuário existe
    if (!usuario) {
      console.warn(
        `Tentativa de login falha: Usuário com email ${email} não encontrado.`
      );
      return null; // Usuário não encontrado
    }

    // Compara a senha fornecida com o hash armazenado no banco de dados
    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);

    // Se a senha não for válida
    if (!isPasswordValid) {
      console.warn(
        `Tentativa de login falha: Senha inválida para o email ${email}.`
      );
      return null; // Senha inválida
    }

    // Se a autenticação for bem-sucedida, gera um token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
      },
      JWT_SECRET,
      { expiresIn: "1h" } // O token expira em 1 hora
    );

    // Retorna o token e os dados básicos do usuário (sem a senha)
    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
      },
    };
  } catch (error) {
    console.error("Erro no serviço de autenticação de usuário:", error);
    throw new Error("Erro interno ao autenticar usuário."); // Lança um erro para ser tratado no controller
  } finally {
    if (connection) connection.release(); // Sempre libera a conexão de volta para o pool
  }
};

/**
 * Autentica um Prestador de Serviço.
 * O login é feito com numero_contrato (como usuário) e chave_acesso (como senha).
 * @param {string} numeroContrato - O número do contrato (usuário).
 * @param {string} chaveAcesso - A chave de acesso (senha).
 * @returns {object|null} - Um objeto contendo o token JWT e dados do prestador, ou null se a autenticação falhar.
 */
export const authenticatePrestador = async (numeroContrato, chaveAcesso) => {
  let connection;
  try {
    connection = await pool.getConnection(); // Obtém uma conexão do pool

    // Busca o prestador pelo numero_contrato na tabela 'prestadores_servico'
    const [rows] = await connection.execute(
      `SELECT
                id as prestador_id,
                numero_contrato,
                chave_acesso_hash,
                razao_social,
                cnpj
            FROM prestadores_servico
            WHERE numero_contrato = ?`,
      [numeroContrato]
    );

    const prestador = rows[0]; // Pega o primeiro (e único, se existir) resultado

    // Verifica se o prestador/contrato foi encontrado
    if (!prestador) {
      console.warn(
        `Tentativa de login falha: Prestador com número de contrato ${numeroContrato} não encontrado.`
      );
      return null; // Prestador/contrato não encontrado
    }

    // Compara a chave de acesso fornecida com o hash armazenado no banco de dados
    const isChaveValid = await bcrypt.compare(
      chaveAcesso,
      prestador.chave_acesso_hash
    );

    // Se a chave não for válida
    if (!isChaveValid) {
      console.warn(
        `Tentativa de login falha: Chave de acesso inválida para o contrato ${numeroContrato}.`
      );
      return null; // Chave inválida
    }

    // Se a autenticação for bem-sucedida, gera um token JWT para o prestador
    const token = jwt.sign(
      {
        id: prestador.prestador_id,
        razao_social: prestador.razao_social,
        numero_contrato: prestador.numero_contrato,
        role: "prestador", // Define um role específico para prestadores no token
      },
      JWT_SECRET,
      { expiresIn: "1h" } // O token expira em 1 hora
    );

    // Retorna o token e os dados básicos do prestador (sem a chave)
    return {
      token,
      prestador: {
        id: prestador.prestador_id,
        razao_social: prestador.razao_social,
        cnpj: prestador.cnpj,
        numero_contrato: prestador.numero_contrato,
      },
    };
  } catch (error) {
    console.error("Erro no serviço de autenticação de prestador:", error);
    throw new Error("Erro interno ao autenticar prestador de serviço."); // Lança um erro
  } finally {
    if (connection) connection.release(); // Sempre libera a conexão
  }
};
