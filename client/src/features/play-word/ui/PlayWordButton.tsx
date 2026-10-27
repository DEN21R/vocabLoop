import { Button } from '@mui/material'

type Props = {
  onPlay: () => void
  disabled: boolean
}

export function PlayWordButton({ onPlay, disabled }: Props) {
  return (
    <Button onClick={onPlay} disabled={disabled}>
      Слушать
    </Button>
  )
}
