// src/controllers/authController.js

import * as authService from "../services/authService.js"; // Importa todas as funções exportadas do authService

/**
 * Lida com a requisição de login para usuários (Formalizador/Homologador).
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const loginUsuario = async (req, res) => {
  // Extrai email e senha do corpo da requisição
  const { email, senha } = req.body;

  // Verifica se ambos email e senha foram fornecidos
  if (!email || !senha) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    // Chama a função de autenticação do serviço
    const result = await authService.authenticateUsuario(email, senha);

    // Se a autenticação falhou (usuário não encontrado ou senha inválida)
    if (!result) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Se a autenticação foi bem-sucedida, retorna o token e os dados do usuário
    return res.status(200).json({
      message: "Login de usuário bem-sucedido!",
      token: result.token,
      usuario: result.usuario,
    });
  } catch (error) {
    // Loga o erro detalhado no console do servidor
    console.error("Erro no controlador de login de usuário:", error);
    // Retorna uma mensagem de erro genérica para o cliente
    return res
      .status(500)
      .json({ message: "Erro interno do servidor ao tentar logar." });
  }
};

/**
 * Lida com a requisição de login para Prestadores de Serviço.
 * @param {object} req - Objeto de requisição do Express.
 * @param {object} res - Objeto de resposta do Express.
 */
export const loginPrestador = async (req, res) => {
  // Extrai numeroContrato e chaveAcesso do corpo da requisição
  const { numeroContrato, chaveAcesso } = req.body;

  // Verifica se ambos os campos foram fornecidos
  if (!numeroContrato || !chaveAcesso) {
    return res
      .status(400)
      .json({
        message: "Número do contrato e chave de acesso são obrigatórios.",
      });
  }

  try {
    // Chama a função de autenticação do serviço
    const result = await authService.authenticatePrestador(
      numeroContrato,
      chaveAcesso
    );

    // Se a autenticação falhou (prestador não encontrado ou chave inválida)
    if (!result) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    // Se a autenticação foi bem-sucedida, retorna o token e os dados do prestador
    return res.status(200).json({
      message: "Login de prestador bem-sucedido!",
      token: result.token,
      prestador: result.prestador,
    });
  } catch (error) {
    // Loga o erro detalhado no console do servidor
    console.error("Erro no controlador de login de prestador:", error);
    // Retorna uma mensagem de erro genérica para o cliente
    return res
      .status(500)
      .json({ message: "Erro interno do servidor ao tentar logar." });
  }
};
