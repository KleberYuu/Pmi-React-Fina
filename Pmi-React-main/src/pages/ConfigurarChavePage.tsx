import React, { useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface LoteConfig {
  lote: string;
  quantidade: string;
}

const ConfigurarChavePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contractNumber = location.state?.contractNumber;
  const [lotes, setLotes] = useState<LoteConfig[]>([
    { lote: '', quantidade: '' }
  ]);

  const handleAddLote = () => {
    setLotes([...lotes, { lote: '', quantidade: '' }]);
  };

  const handleLoteChange = (index: number, field: keyof LoteConfig, value: string) => {
    const newLotes = [...lotes];
    newLotes[index][field] = value;
    setLotes(newLotes);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(90deg, #1CB5E0 0%, #000851 100%)',
      p: 2
    }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{
          color: 'white',
          mb: 2,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        Voltar
      </Button>

      <Box sx={{
        maxWidth: '800px',
        mx: 'auto',
        bgcolor: 'white',
        borderRadius: '8px',
        p: 3
      }}>
        <Typography variant="h6" sx={{ mb: 3, color: '#000851' }}>
          Configurar chave de acesso
        </Typography>

        {lotes.map((lote, index) => (
          <Box key={index} sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Informar lote"
                  value={lote.lote}
                  onChange={(e) => handleLoteChange(index, 'lote', e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Quantidade de documentos"
                  value={lote.quantidade}
                  onChange={(e) => handleLoteChange(index, 'quantidade', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Button
                variant="contained"
                sx={{
                  bgcolor: '#1CB5E0',
                  '&:hover': { bgcolor: '#19a3c9' }
                }}
              >
                Upload CCT
              </Button>
            </Box>
          </Box>
        ))}

        <Button
          onClick={handleAddLote}
          variant="outlined"
          sx={{
            color: '#1CB5E0',
            borderColor: '#1CB5E0',
            mb: 3,
            '&:hover': {
              borderColor: '#19a3c9',
              bgcolor: 'rgba(28, 181, 224, 0.1)'
            }
          }}
        >
          Adicionar Lote
        </Button>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#000851' }}>
            Gerar chave de acesso
          </Typography>
          <TextField
            fullWidth
            value={contractNumber || ''}
            label="Número do contrato vinculado a chave"
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            fullWidth
            sx={{
              bgcolor: '#1CB5E0',
              py: 1.5,
              '&:hover': { bgcolor: '#19a3c9' }
            }}
          >
            Gerar
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ConfigurarChavePage; 