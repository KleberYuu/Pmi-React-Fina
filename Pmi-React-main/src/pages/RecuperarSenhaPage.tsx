import React, { useState } from "react";
import { Box, Typography, TextField, Button } from "@mui/material";

interface FormData {
  nome: string;
  email: string;
  senha: string;
}

interface RecuperarSenhaPageProps {
  onNavigate: (page: string) => void;
}

const RecuperarSenhaPage: React.FC<RecuperarSenhaPageProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    email: "",
    senha: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({
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
    <Box className="recuperar-senha-container">
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
      <Box className="recuperar-senha-field">
        <Typography variant="h6" align="center" sx={{ mb: 2 }}>
          Recuperar Senha
        </Typography>

        <TextField
          name="nome"
          label="Nome Completo"
          value={formData.nome}
          onChange={handleChange}
          fullWidth
          className="recuperar-senha-field"
        />

        <TextField
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          fullWidth
          className="recuperar-senha-field"
        />

        <TextField
          name="senha"
          label="Nova Senha"
          type="password"
          value={formData.senha}
          onChange={handleChange}
          fullWidth
          className="recuperar-senha-field"
        />

        <Button
          variant="contained"
          onClick={handleSubmit}
          fullWidth
          className="recuperar-senha-button"
          sx={{ mt: 2 }}
        >
          Recuperar Senha
        </Button>

        <Button
          variant="text"
          onClick={() => onNavigate("login")}
          className="recuperar-senha-back-button"
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Box>
    </Box>
  );
};

export default RecuperarSenhaPage; 