import { Box, Button } from '@mui/material'
import titleFoto from '../../shared/assets/titleFoto.png'
import { useNavigate } from 'react-router-dom'

function TitlePage() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <Box
        sx={{
          width: '100%',
          minHeight: '100vh',

          backgroundImage: `url(${titleFoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '600px',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Button
          variant="contained"
          sx={{ borderRadius: '50px', backgroundColor: '#db7f77' }}
          onClick={() => navigate('/login')}
        >
          Войти
        </Button>
        <Button
          variant="contained"
          sx={{ borderRadius: '50px', backgroundColor: '#5d322e' }}
          onClick={() => navigate('/register')}
        >
          Создать аккаунт
        </Button>
      </Box>
    </Box>
  )
}
export default TitlePage
