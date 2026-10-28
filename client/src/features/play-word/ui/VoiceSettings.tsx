import { Box, Typography, Button, Menu, MenuItem } from '@mui/material'
import { useEffect, useState } from 'react'
import { getAvailableVoices, getVoicesByLanguage } from '../../../shared/lib/tts/speech'

type VoiceSettingsProps = {
  selectedVoices: {
    en: string
    ru: string
    de: string
    uk: string
  }
  onVoiceChange: (language: 'en' | 'ru' | 'de' | 'uk', voiceURI: string) => void
}

const languages = [
  { code: 'en', label: 'Английский' },
  { code: 'ru', label: 'Русский' },
  { code: 'de', label: 'Немецкий' },
  { code: 'uk', label: 'Украинский' },
] as const

export function VoiceSettings({
  selectedVoices,
  onVoiceChange,
}: VoiceSettingsProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voicesLoading, setVoicesLoading] = useState(() => 'speechSynthesis' in window && getAvailableVoices().length === 0)
  const [selectedLanguage, setSelectedLanguage] = useState<
    'en' | 'ru' | 'de' | 'uk' | null
  >(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const menuOpen = anchorEl !== null

  function openMenu(button: HTMLElement) {
    const available = getAvailableVoices()
    setVoices(available)
    setVoicesLoading('speechSynthesis' in window && available.length === 0)
    setAnchorEl(button)
    setSelectedLanguage(null)
  }

  function closeMenu() {
    setAnchorEl(null)
    setSelectedLanguage(null)
  }

  function selectVoice(voiceURI: string) {
    if (selectedLanguage === null) return

    onVoiceChange(selectedLanguage, voiceURI)
    closeMenu()
  }

  useEffect(() => {
    if (!('speechSynthesis' in window)) return

    const updateVoices = () => {
      const available = getAvailableVoices()
      setVoices(available)
      if (available.length > 0) setVoicesLoading(false)
    }

    window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    // Android may initialize TTS without delivering voiceschanged reliably.
    const poll = setInterval(updateVoices, 500)
    const timeout = setTimeout(() => {
      clearInterval(poll)
      updateVoices()
      setVoicesLoading(false)
    }, 10000)
    updateVoices()

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
      clearInterval(poll)
      clearTimeout(timeout)
    }
  }, [menuOpen])

  let filteredVoices: SpeechSynthesisVoice[] = []

  if (selectedLanguage !== null) {
    filteredVoices = getVoicesByLanguage(voices, selectedLanguage)
  }

  return (
    <Box
      sx={{
        border: '2px #895a39 solid',
        borderRadius: '12px',
        mb: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Typography variant="h6">Здесь можно выбрать голос</Typography>

      <Button
        sx={{
          color: '#895a39',
        }}
        onClick={(event) => openMenu(event.currentTarget)}
      >
        Выбрать голос
      </Button>

      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={closeMenu}>
        {voices.length === 0 && (
          <MenuItem disabled>
            {voicesLoading ? 'Голоса загружаются…' : 'Браузер не предоставил голоса. Проверьте системный TTS.'}
          </MenuItem>
        )}
        {selectedLanguage !== null && voices.length > 0 && filteredVoices.length === 0 && (
          <MenuItem disabled>Нет голосов выбранного языка</MenuItem>
        )}
        {selectedLanguage === null &&
          languages.map((language) => (
            <MenuItem
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
            >
              {language.label}
            </MenuItem>
          ))}

        {selectedLanguage !== null && (
          <MenuItem
            onClick={() => selectVoice('')}
            selected={selectedVoices[selectedLanguage] === ''}
          >
            Автоматически
          </MenuItem>
        )}

        {selectedLanguage !== null && (
          <MenuItem onClick={() => setSelectedLanguage(null)}>
            ← Назад к языкам
          </MenuItem>
        )}

        {selectedLanguage !== null &&
          filteredVoices.map((voice) => (
            <MenuItem
              key={voice.voiceURI}
              onClick={() => selectVoice(voice.voiceURI)}
              selected={selectedVoices[selectedLanguage] === voice.voiceURI}
            >
              {voice.name}
            </MenuItem>
          ))}
      </Menu>
    </Box>
  )
}
