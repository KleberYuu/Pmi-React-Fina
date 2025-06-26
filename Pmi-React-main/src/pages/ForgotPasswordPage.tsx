import React, { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "../styles/ForgotPasswordPage.css";

interface ForgotPasswordPageProps {
  onNavigate: (page: string) => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    if (formData.nome && formData.email && formData.senha) {
      // Aqui você pode adicionar a lógica de mudança de senha
      onNavigate("login");
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      pt: 4
    }}>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" fontWeight="bold">
          Calcule
        </Typography>
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          sx={{ 
            bgcolor: 'white',
            px: 1,
            borderRadius: 1,
            ml: 1
          }}
        >
          Fácil
        </Typography>
      </Box>

      {/* Formulário de Mudança de Senha */}
      <Box sx={{ 
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        px: 2
      }}>
        <Typography variant="h6" align="center" sx={{ mb: 2 }}>
          Mudar Senha
        </Typography>

        <TextField
          name="nome"
          label="Nome Completo"
          value={formData.nome}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
        />

        <TextField
          name="senha"
          label="Senha"
          type="password"
          value={formData.senha}
          onChange={handleChange}
          fullWidth
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          sx={{ mt: 2 }}
        >
          Mudar Senha
        </Button>

        <Button
          variant="text"
          onClick={() => onNavigate("login")}
          sx={{ mt: 2 }}
        >
          voltar
        </Button>
      </Box>
    </Box>
  );
};

export default ForgotPasswordPage;