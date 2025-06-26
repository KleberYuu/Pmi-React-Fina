import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('/calculator-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'grayscale(90%)',
          opacity: '0.3',
          zIndex: 0
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, #1CB5E0 0%, #000851 100%)',
          opacity: '0.9',
          zIndex: 1
        }
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: 'black',
            mr: 0.5,
          }}
        >
          Calcule
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          Fácil
        </Typography>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '100%',
          maxWidth: '800px',
          padding: '0 20px',
          zIndex: 2
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: 'white',
            mb: 2,
            fontSize: '1.2rem',
          }}
        >
          Bem vindo ao Calcule Fácil
        </Typography>
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            mb: 4,
          }}
        >
          Cadastre-se e usufrua da
          <br />
          melhor ferramenta de cálculos
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/login')}
          sx={{
            bgcolor: 'white',
            color: '#1CB5E0',
            padding: '12px 40px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            borderRadius: '25px',
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              transform: 'scale(1.05)',
              transition: 'all 0.2s ease-in-out'
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Começar Agora
        </Button>
      </Box>
    </Box>
  );
};

export default LandingPage; 