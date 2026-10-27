import { Box, Button, Typography, TextField, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { register } from '../../../shared/api/auth'
import riglogFoto from '../../../shared/assets/riglogFoto.png'

function Register() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitError('')
    if (formData.password !== confirmPassword) {
      return setError('passwords dont match')
    }
    try {
      await register(formData)
      navigate('/login')
    } catch {
      setSubmitError('Registration failed')
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
        Создание аккаунта
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
          type="text"
          name="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          label="Имя"
          required
        />
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
        <TextField
          type="password"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          label="Подтвердите пароль"
          required
          error={Boolean(error)}
          helperText={error}
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ borderRadius: '50px', backgroundColor: '#5d322e' }}
        >
          Зарегистрироваться
        </Button>
      </Box>

      <Typography
        variant="body2"
        sx={{ mt: 3, textAlign: 'center', color: '#fff' }}
      >
        Уже есть аккаунт?{' '}
        <Button
          sx={{ color: '#5d322e', fontWeight: 800 }}
          size="small"
          onClick={() => navigate('/login')}
        >
          Войти
        </Button>
      </Typography>
    </Box>
  )
}

export default Register
