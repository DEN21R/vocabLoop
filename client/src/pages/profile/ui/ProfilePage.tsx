import { useEffect, useState } from 'react'
import { Avatar, Box, Button, TextField, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import { getMe, updateProfile, type AuthUser } from '../../../shared/api/auth'

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        const side = Math.min(image.naturalWidth, image.naturalHeight)
        context.fillStyle = '#fcf5f0'
        context.fillRect(0, 0, 256, 256)
        context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256)
        const photo = canvas.toDataURL('image/jpeg', 0.85)
        if (photo.length > 90000) throw new Error('Image too large')
        resolve(photo)
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image unavailable'))
    }
    image.src = url
  })
}

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMe().then(({ user }) => {
      if (cancelled) return
      setUser(user)
      setName(user.name)
      setAvatar(user.avatar || '')
    }).catch(() => {
      if (!cancelled) setError('Не удалось загрузить профиль. Обновите страницу.')
    })
    return () => { cancelled = true }
  }, [])

  const choosePhoto = async (file: File) => {
    setSaved(false)
    setError('')
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setError('Выберите изображение размером до 10 МБ.')
      return
    }
    setBusy(true)
    try {
      setAvatar(await readPhoto(file))
    } catch {
      setError('Не удалось открыть фото. Попробуйте изображение JPG или PNG.')
    } finally {
      setBusy(false)
    }
  }

  const save = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const { user } = await updateProfile({ name: name.trim(), avatar })
      setUser(user)
      setName(user.name)
      setSaved(true)
    } catch {
      setError('Не удалось сохранить профиль. Попробуйте ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ color: '#5d2c07', maxWidth: 520 }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Профиль</Typography>
      {error && <Typography role="alert" sx={{ mb: 2, color: '#9b3d24' }}>{error}</Typography>}
      {!user && !error && <Typography role="status">Загружаем профиль…</Typography>}
      {user && (
        <Box component="form" onSubmit={save} sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#fcf5f0', borderRadius: '12px', boxShadow: '1px 2px 5px #9a8c79' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar src={avatar || undefined} alt={name} sx={{ width: 112, height: 112, bgcolor: '#e9dccb', color: '#895a39', fontSize: 44 }}>
              {name.trim().charAt(0).toUpperCase()}
            </Avatar>
            <Button component="label" disabled={busy} sx={{ color: '#c97539' }}>
              Выбрать фото
              <input type="file" accept="image/*" hidden disabled={busy} onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void choosePhoto(file)
              }} />
            </Button>
            {avatar && <Button disabled={busy} onClick={() => { setAvatar(''); setSaved(false) }} sx={{ color: '#895a39' }}>Использовать аватар с буквой</Button>}
          </Box>
          <Typography sx={{ mb: 3, color: '#895a39', overflowWrap: 'anywhere' }}>{user.email}</Typography>
          <TextField
            label="Имя" value={name} required fullWidth disabled={busy}
            slotProps={{ htmlInput: { maxLength: 80 } }}
            onChange={(event) => { setName(event.target.value); setSaved(false) }}
            sx={{ mb: 3, '& .MuiInputBase-input': { color: '#5d2c07' }, '& .MuiInputLabel-root': { color: '#895a39' } }}
          />
          <Button type="submit" disabled={busy || !name.trim()} fullWidth sx={{ border: '2px solid #f78811', borderRadius: '12px', color: '#c97539', '&:hover': { bgcolor: '#ffead1' } }}>
            {busy ? 'Подождите…' : 'Сохранить'}
          </Button>
          {saved && <Typography role="status" sx={{ mt: 2, color: '#66713f' }}>Профиль сохранён</Typography>}
        </Box>
      )}
      <Button component={Link} to="/user/settings" sx={{ mt: 3, color: '#c97539', border: '2px solid #f78811', borderRadius: '12px' }}>Настройки</Button>
    </Box>
  )
}
