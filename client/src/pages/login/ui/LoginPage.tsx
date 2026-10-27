import { Box, Button, Typography, TextField, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { login } from '../../../shared/api/auth'
import riglogFoto from '../../../shared/assets/riglogFoto.png'

function Login() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')

    try {
      const result = await login(formData)

      localStorage.setItem('token', result.token)

      navigate('/user/home')
    } catch {
      setSubmitError('Не удалось войти.')
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        backgroundImage: `url(${riglogFoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h5" sx={{ mb: 2 }}>
        Вход в аккаунт
      </Typography>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          width: '300px',
          margin: '0 auto',
        }}
      >
        <TextField
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          label="Email"
          required
        />
        <TextField
          type="password"
          name="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          label="Пароль"
          required
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ borderRadius: '50px', backgroundColor: '#5d322e' }}
        >
          Войти
        </Button>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: 'center', color: '#fff' }}
      >
        Нет аккаунта?{' '}
        <Button
          size="small"
          sx={{ color: '#5d322e', fontWeight: 800 }}
          onClick={() => navigate('/register')}
        >
          Регистрация
        </Button>
      </Typography>
    </Box>
  )
}

export default Login
