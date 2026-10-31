import { Box, Typography, Button, Menu, MenuItem } from '@mui/material'
import { useState } from 'react'
import {
  PIPER_VOICES,
  type PiperLanguage,
  type PiperSelections,
} from '../../../shared/lib/tts/piper'

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

  const filteredVoices =
    selectedLanguage === null ? [] : PIPER_VOICES[selectedLanguage].voices

  return (
    <Box
      sx={{
        border: '2px #895a39 solid',
        borderRadius: '12px',
        bgcolor: '#fcf5f0',
        color: '#5d2c07',
        p: 2,
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
          color: '#f78811',
          border: '2px solid #f78811',
          borderRadius: '12px',
          mt: 1,
          '&:hover, &.Mui-focusVisible': { bgcolor: '#fff0df' },
        }}
        onClick={(event) => openMenu(event.currentTarget)}
      >
        Выбрать голос
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={anchorEl !== null}
        onClose={closeMenu}
        slotProps={{ paper: { sx: {
          bgcolor: '#fcf5f0',
          color: '#5d2c07',
          border: '1px solid #e7c4a7',
          borderRadius: 3,
          maxWidth: 'calc(100vw - 32px)',
          '& .MuiMenuItem-root': {
            whiteSpace: 'normal',
            '&:hover, &.Mui-focusVisible': { bgcolor: '#fff0df' },
            '&.Mui-selected': { bgcolor: '#ffe0b2', color: '#a64d00' },
            '&.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': { bgcolor: '#ffd19a' },
          },
        } } }}
      >
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
