/**
 * Utilitário para geração e gerenciamento de chaves de acesso
 */

// Interface para armazenar informações de contrato
export interface ContratoInfo {
  numero: string;
  chave: string;
  status: 'Em trânsito' | 'Esperando Homologação' | 'Pronto para emissão';
}

// Função para gerar uma chave aleatória
export const generateRandomKey = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'uf/';
  let result = prefix;
  
  // Gera uma string aleatória de 16 caracteres
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Função para salvar um contrato com sua chave
export const saveContractKey = (contractNumber: string, key: string): void => {
  // Recupera contratos existentes ou inicializa array vazio
  const existingContracts = getContracts();
  
  // Verifica se o contrato já existe
  const existingIndex = existingContracts.findIndex(
    contract => contract.numero === contractNumber
  );
  
  // Define um status aleatório para demonstração
  const statuses: Array<ContratoInfo['status']> = [
    'Em trânsito', 
    'Esperando Homologação', 
    'Pronto para emissão'
  ];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
  
  if (existingIndex >= 0) {
    // Atualiza contrato existente
    existingContracts[existingIndex] = {
      ...existingContracts[existingIndex],
      chave: key
    };
  } else {
    // Adiciona novo contrato
    existingContracts.push({
      numero: contractNumber,
      chave: key,
      status: randomStatus
    });
  }
  
  // Salva no localStorage
  localStorage.setItem('contracts', JSON.stringify(existingContracts));
};

// Função para recuperar todos os contratos
export const getContracts = (): ContratoInfo[] => {
  const contractsJson = localStorage.getItem('contracts');
  return contractsJson ? JSON.parse(contractsJson) : [];
};

// Função para buscar um contrato específico
export const getContractByNumber = (contractNumber: string): ContratoInfo | undefined => {
  const contracts = getContracts();
  return contracts.find(contract => contract.numero === contractNumber);
};

// Função para buscar uma chave por número de contrato
export const getKeyByContractNumber = (contractNumber: string): string | null => {
  const contract = getContractByNumber(contractNumber);
  return contract ? contract.chave : null;
};
