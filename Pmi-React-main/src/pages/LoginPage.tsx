import React, { useState } from "react";
import { Box, Typography, TextField, Button, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    senha: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async () => {
    setError("");
    try {
      const response = await axios.post(
        "http://localhost:3006/api/auth/login/usuario",
        {
          email: formData.email,
          senha: formData.senha,
        }
      );

      // Se login for bem-sucedido
      const { token, usuario } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("usuarioId", usuario.id);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response && err.response.status === 401) {
        setError("Email ou senha incorretos");
      } else {
        setError("Erro ao conectar com o servidor");
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(90deg, #1CB5E0 0%, #000851 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        position: "relative",
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{
          color: "white",
          position: "absolute",
          left: "20px",
          top: "20px",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        Voltar
      </Button>

      {/* Logo */}
      <Box sx={{ display: "flex", alignItems: "center", mb: 4, mt: 4 }}>
        <Typography
          component="span"
          sx={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "black",
          }}
        >
          Calcule
        </Typography>
        <Typography
          component="span"
          sx={{
            fontSize: "24px",
            fontWeight: "bold",
            color: "white",
            ml: 1,
          }}
        >
          Fácil
        </Typography>
      </Box>

      {/* Formulário de Login */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: "8px",
          padding: "30px",
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography variant="h6" align="center">
          Login
        </Typography>

        <TextField
          name="email"
          label="Email"
          variant="outlined"
          fullWidth
          value={formData.email}
          onChange={handleChange}
          error={!!error}
        />

        <TextField
          name="senha"
          label="Senha"
          type="password"
          variant="outlined"
          fullWidth
          value={formData.senha}
          onChange={handleChange}
          error={!!error}
          helperText={error}
        />

        <Link
          component="button"
          variant="body2"
          onClick={() => navigate("/recuperar-senha")}
          sx={{
            textAlign: "right",
            color: "#1CB5E0",
            textDecoration: "none",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          Esqueceu sua senha?
        </Link>

        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          sx={{
            bgcolor: "#1CB5E0",
            color: "black",
            "&:hover": {
              bgcolor: "#1aa0c7",
            },
          }}
        >
          ENTRAR
        </Button>
      </Box>
    </Box>
  );
};

export default LoginPage;
