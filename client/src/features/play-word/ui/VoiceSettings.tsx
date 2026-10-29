import { Box, Typography, Button, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import { PIPER_VOICES, type PiperLanguage, type PiperSelections } from '../../../shared/lib/tts/piper'

type VoiceSettingsProps = {
  selectedVoices: PiperSelections
  onVoiceChange: (language: PiperLanguage, voiceId: string) => void
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
  const [selectedLanguage, setSelectedLanguage] = useState<
    'en' | 'ru' | 'de' | 'uk' | null
  >(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  function openMenu(button: HTMLElement) {
    setAnchorEl(button)
    setSelectedLanguage(null)
  }

  function closeMenu() {
    setAnchorEl(null)
    setSelectedLanguage(null)
  }

  function selectVoice(voiceId: string) {
    if (selectedLanguage === null) return

    onVoiceChange(selectedLanguage, voiceId)
    closeMenu()
  }

  const filteredVoices = selectedLanguage === null ? [] : PIPER_VOICES[selectedLanguage].voices

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
          <MenuItem onClick={() => setSelectedLanguage(null)}>
            ← Назад к языкам
          </MenuItem>
        )}

        {selectedLanguage !== null &&
          filteredVoices.map((voice) => (
            <MenuItem
              key={voice.id}
              onClick={() => selectVoice(voice.id)}
              selected={selectedVoices[selectedLanguage] === voice.id}
            >
              {voice.label}
            </MenuItem>
          ))}
      </Menu>
    </Box>
  )
}
