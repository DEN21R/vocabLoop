import { Box, Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  return (
    <Box sx={{ color: '#5d2c07' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Настройки</Typography>
      <Typography sx={{ mb: 3 }}>Здесь скоро появятся настройки приложения.</Typography>
      <Button component={Link} to="/user/profile" sx={{ color: '#c97539', border: '2px solid #f78811', borderRadius: '12px' }}>В профиль</Button>
    </Box>
  )
}
