import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        height: "calc(100vh - 64px)", // Altura total menos o Header
        background: "linear-gradient(90deg, #1CB5E0 0%, #000851 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        color: "white",
      }}
    >
      <Typography variant="h4" style={{ marginBottom: "10px", color: "#00c6ff" }}>
        Bem vindo ao Calcule Fácil
      </Typography>
      <Typography variant="h5" style={{ maxWidth: "600px", lineHeight: "1.5", marginBottom: "20px" }}>
        Faça login para acessar as melhores ferramentas de cálculo
      </Typography>
      <Button
        variant="contained"
        style={{
          backgroundColor: "black",
          color: "white",
          fontWeight: "bold",
        }}
        onClick={() => navigate("/login")}
      >
        Começar Agora
      </Button>
    </Box>
  );
};

export default HeroSection;