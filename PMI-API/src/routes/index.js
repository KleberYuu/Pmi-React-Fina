import { Router } from "express"; // Importa o Router do Express para criar rotas modulares
import { loginUsuario, loginPrestador } from "../controllers/authController.js"; // Importa as funções do controlador de autenticação

// Importa as funções do controlador de prestadores
import {
  createPrestadorAccess,
  updatePrestadorProfile,
  getPrestador,
  resetPrestadorAccessKey,
} from "../controllers/prestadorController.js";
// Importa as funções do controlador de processos
import {
  createProcessoCompleto,
  getProcessos,
  createDocumentsInLote,
  getCCTsForLote,
  getDocumentsForLote,
  getDocumentContent,
  saveDocumentContent,
  getProcessTotals,
  getNextDocument,
  sendProcessToHomologation,
  formalizeProcesso,
  refuseHomologation,
  homologateProcesso,
  deleteDocument,
} from "../controllers/processoController.js";

// Importe o middleware de autenticação quando estiver pronto
// import { verifyToken, authorizeFormalizador, authorizePrestador } from '../middlewares/authMiddleware.js';

const router = Router(); // Cria uma nova instância do Router

// ===============================================
// Rotas de Autenticação
// ===============================================

// Rota para login de Formalizadores e Homologadores (usuários internos)
// Endpoint: /api/auth/login/usuario
router.post("/auth/login/usuario", loginUsuario);

// Rota para login de Prestadores de Serviço
// Endpoint: /api/auth/login/prestador
router.post("/auth/login/prestador", loginPrestador);

// ===============================================
// Rotas de Gestão de Prestadores de Serviço
// ===============================================

// Rota para Formalizador criar o acesso inicial de um Prestador (agora incluída aqui explicitamente)
// Endpoint: /api/prestadores/access
router.post(
  "/prestadores/access",
  // authorizeFormalizador, // Middleware de autorização para Formalizador (a ser implementado)
  createPrestadorAccess
);

// Rota para Prestador (logado) atualizar seu próprio perfil
// Endpoint: /api/prestadores/profile
router.put(
  "/prestadores/profile",
  // authorizePrestador, // Middleware de autorização para prestadores (a ser implementado)
  updatePrestadorProfile
);

// Rota para Formalizador buscar um prestador por ID específico
// Endpoint: GET /api/prestadores/:id
router.get(
  "/prestadores/:id",
  // verifyToken, // Formalizador precisaria de autenticação para buscar por ID
  getPrestador
);

// Rota para buscar todos os prestadores (pelo Formalizador) ou listar baseado em query params
// Endpoint: GET /api/prestadores (pode usar ?numeroContrato=XYZ)
router.get(
  "/prestadores",
  // verifyToken, // Formalizador precisaria de autenticação
  getPrestador
);

// Rota para Formalizador redefinir a chave de acesso de um prestador
// Endpoint: POST /api/prestadores/reset-access-key
router.post(
  "/prestadores/reset-access-key",
  // authorizeFormalizador, // Middleware de autorização para Formalizador (a ser implementado)
  resetPrestadorAccessKey
);

// ===============================================
// Rotas de Gestão de Processos e Lotes (com CCTs Dinâmicas)
// ===============================================

// Rota para Formalizador criar um processo completo
// Endpoint: /api/processos/full-creation
router.post(
  "/processos/full-creation",
  // authorizeFormalizador, // Middleware de autorização para Formalizador (a ser implementado)
  createProcessoCompleto
);

// Rota para buscar processos
// Endpoint: /api/processos
router.get(
  "/processos",
  // verifyToken, // Middleware de autenticação (a ser implementado)
  getProcessos
);

// Rota para Prestador criar documentos iniciais em um lote
// Endpoint: POST /api/lotes/:loteId/documents
router.post(
  "/lotes/:loteId/documents",
  // authorizePrestador, // Middleware de autorização para Prestador (a ser implementado)
  createDocumentsInLote
);

// Rota para Prestador buscar CCTs relevantes para um lote (região)
// Endpoint: GET /api/lotes/:loteId/ccts
router.get(
  "/lotes/:loteId/ccts",
  // verifyToken, // Middleware de autenticação (a ser implementado)
  getCCTsForLote
);

// Rota para Prestador buscar documentos para um lote
// Endpoint: GET /api/lotes/:loteId/documents
router.get(
  "/lotes/:loteId/documents",
  // verifyToken, // Futuramente, Prestador logado e autorizado a ver este lote
  getDocumentsForLote
);

// ROTAS: Para carregar e salvar conteúdo de documentos
// Rota para buscar a última versão do conteúdo de um documento
// Endpoint: GET /api/documentos/:documentoId/content
router.get(
  "/documentos/:documentoId/content",
  // verifyToken, // Futuramente, Prestador logado e autorizado a ver este documento
  getDocumentContent
);

// Rota para salvar o conteúdo de um documento (cria nova versão)
// Endpoint: POST /api/documentos/:documentoId/content
router.post(
  "/documentos/:documentoId/content",
  // verifyToken, // Futuramente, Prestador logado e autorizado a editar este documento
  saveDocumentContent
);

// Rota para buscar os totais agregados para um processo
// Endpoint: GET /api/processos/:processoId/totals
router.get(
  "/processos/:processoId/totals",
  // verifyToken,
  getProcessTotals
);

// ROTAS PARA BUSCAR O PRÓXIMO DOCUMENTO (AGORA SEPARADAS)
// Rota para buscar o PRIMEIRO documento pendente/ativo de um lote
// Endpoint: GET /api/lotes/:loteId/documents/next
router.get(
  "/lotes/:loteId/documents/next",
  // verifyToken,
  getNextDocument
);

// Rota para buscar o PRÓXIMO documento pendente/ativo de um lote, a partir de um documento atual
// Endpoint: GET /api/lotes/:loteId/documents/next/:currentDocumentId
router.get(
  "/lotes/:loteId/documents/next/:currentDocumentId",
  // verifyToken,
  getNextDocument
);

// Rota para Prestador enviar o processo para homologação
// Endpoint: POST /api/processos/:processoId/send-homologation
router.post(
  "/processos/:processoId/send-homologation",
  // authorizePrestador, // Middleware de autorização para Prestador (a ser implementado)
  sendProcessToHomologation
);

// Rota para Formalizador formalizar um processo
// Endpoint: POST /api/processos/:processoId/formalizar
router.post(
  "/processos/:processoId/formalizar",
  // authorizeFormalizador, // Middleware de autorização para Formalizador
  formalizeProcesso
);

// ROTAS PARA HOMOLOGADOR
// Rota para Homologador homologar um processo
// Endpoint: POST /api/processos/:processoId/homologar
router.post(
  "/processos/:processoId/homologar",
  // authorizeHomologador, // Middleware de autorização para Homologador
  homologateProcesso
);

// Rota para Homologador recusar a homologação de um processo
// Endpoint: POST /api/processos/:processoId/recusar
router.post(
  "/processos/:processoId/recusar",
  // authorizeHomologador,
  refuseHomologation
);

// ROTA: Rota para Homologador excluir logicamente um documento
// Endpoint: DELETE /api/documentos/:documentoId
router.delete(
  "/documentos/:documentoId",
  // authorizeHomologador, // Apenas Homologador pode excluir
  deleteDocument
);
// ===============================================
// Outras rotas serão adicionadas aqui no futuro
// ===============================================

export default router; // Exporta o router configurado para ser usado em app.js
