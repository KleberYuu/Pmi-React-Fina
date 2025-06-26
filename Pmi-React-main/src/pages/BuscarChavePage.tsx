import React, { useState } from 'react';
import { Box, Button, Typography, TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import '../styles/BuscarChavePage.css';

export const BuscarChavePage: React.FC = () => {
  const [contractNumber, setContractNumber] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!contractNumber.trim()) {
      alert('Por favor, informe um número de contrato válido.');
      return;
    }
    // Simula a busca da chave
    setAccessKey('uf/7ece4fgd4vt4848');
  };

  const handleGenerate = () => {
    if (!contractNumber.trim()) {
      alert('Por favor, informe um número de contrato válido.');
      return;
    }
    console.log('Gerando chave para o contrato:', contractNumber);
    navigate('/relatorio');
  };

  return (
    <Box className="calcule-facil-container">
      {/* Logo Calcule Fácil */}
      <Box className="logo-container">
        <Typography variant="h4" className="logo-calcule">Calcule</Typography>
        <Typography variant="h4" className="logo-facil">Fácil</Typography>
      </Box>

      {/* Container principal com fundo branco */}
      <Box className="main-container">
        {/* Navegação por abas */}
        <Box className="tabs-container">
          <Button className="tab-button" onClick={() => navigate('/dashboard')}>Nova Chave</Button>
          <Button className="tab-button" onClick={() => navigate('/historico-chaves')}>Histórico de chaves</Button>
          <Button className="tab-button" onClick={() => navigate('/relatorio')}>Relatório</Button>
        </Box>

        {/* Conteúdo principal */}
        <Box className="search-content">
          {/* Input do número de contrato */}
          <Box className="contract-input-container">
            <Box className="contract-label">Informe o número do contrato vinculado à chave</Box>
            <TextField
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              variant="outlined"
              className="contract-input"
              placeholder="Digite o número do contrato"
            />
          </Box>

          {/* Botões de ação */}
          <Button variant="contained" className="buscar-chave-button" onClick={handleSearch}>
            Buscar chave
          </Button>
          <Button variant="contained" className="pesquisar-button" onClick={handleGenerate}>
            Gerar Chave
          </Button>

          {/* Exibição da chave encontrada */}
          {accessKey && (
            <Box className="key-result-container">
              <Box className="key-label">Chave de acesso</Box>
              <TextField value={accessKey} InputProps={{ readOnly: true }} variant="outlined" className="key-value" />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default BuscarChavePage;
