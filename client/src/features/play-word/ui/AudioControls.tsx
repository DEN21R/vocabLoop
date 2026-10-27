import { Box, IconButton } from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'

type AudioControlsProps = {
  isPlaying: boolean
  playDisabled: boolean
  onPlay: () => void
  onStop: () => void
}

export const AudioControls = ({
  isPlaying,
  playDisabled,
  onPlay,
  onStop,
}: AudioControlsProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      {/* Левая звуковая волна */}
      <SoundWave active={isPlaying} />

      {/* PLAY */}
      <IconButton
        onClick={onPlay}
        disabled={playDisabled}
        aria-label="Воспроизвести"
        sx={{
          width: 72,
          height: 72,

          color: '#FFF8F2',
          background: 'linear-gradient(145deg, #9F493A, #672A21)',

          boxShadow:
            isPlaying ?
              '0 0 0 8px rgba(190, 92, 73, 0.12)'
            : '0 6px 18px rgba(80, 35, 28, 0.22)',

          transition: 'all 0.25s ease',

          '&:hover': {
            background: 'linear-gradient(145deg, #B25544, #763127)',
            transform: 'scale(1.06)',
            boxShadow: '0 8px 22px rgba(80, 35, 28, 0.28)',
          },

          '&:active': {
            transform: 'scale(0.96)',
          },
        }}
      >
        <PlayArrowRoundedIcon sx={{ fontSize: 42 }} />
      </IconButton>

      {/* Правая звуковая волна */}
      <SoundWave active={isPlaying} />

      {/* STOP */}
      <IconButton
        onClick={onStop}
        disabled={!isPlaying}
        aria-label="Остановить"
        sx={{
          width: 48,
          height: 48,

          ml: 1,

          color: '#8F382C',
          backgroundColor: '#FFF7F1',

          border: '1px solid rgba(143, 56, 44, 0.15)',
          boxShadow: '0 4px 14px rgba(80, 35, 28, 0.12)',

          transition: 'all 0.2s ease',

          '&:hover': {
            backgroundColor: '#FBE9E1',
            transform: 'scale(1.06)',
          },

          '&:active': {
            transform: 'scale(0.92)',
          },
        }}
      >
        <StopRoundedIcon sx={{ fontSize: 24 }} />
      </IconButton>
    </Box>
  )
}

type SoundWaveProps = {
  active: boolean
}

const SoundWave = ({ active }: SoundWaveProps) => {
  const bars = [16, 30, 22]

  return (
    <Box
      sx={{
        height: 36,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      {bars.map((height, index) => (
        <Box
          key={index}
          sx={{
            width: 3,
            height,
            borderRadius: 10,
            backgroundColor: '#C96E5A',

            animation:
              active ?
                `voiceWave 0.8s ease-in-out ${index * 0.12}s infinite alternate`
              : 'none',

            '@keyframes voiceWave': {
              from: {
                transform: 'scaleY(0.45)',
                opacity: 0.45,
              },
              to: {
                transform: 'scaleY(1)',
                opacity: 1,
              },
            },
          }}
        />
      ))}
    </Box>
  )
}
