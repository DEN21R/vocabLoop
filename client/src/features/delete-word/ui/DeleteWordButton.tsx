import DeleteIcon from '@mui/icons-material/Delete'
import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import { deleteWord } from '../api/deleteWord'
import ramImage from '../../../shared/assets/ramDel.png'

function DeleteWordButton({
  el,
  onDeleted,
}: {
  el: { _id: string }
  onDeleted: (wordId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDeletePost = async (wordId: string) => {
    if (deleting) return
    setDeleting(true)
    setError('')
    try {
      await deleteWord(wordId)
      setOpen(false)
      onDeleted(wordId)
    } catch {
      setError('Не удалось удалить слово. Попробуйте ещё раз.')
    } finally {
      setDeleting(false)
    }
  }
  return (
    <>
      <IconButton
        aria-label="Удалить слово"
        size="small"
        sx={{ color: '#895a39', '&:hover': { bgcolor: '#fff0df' } }}
        onClick={() => {
          setError('')
          setOpen(true)
        }}
      >
        <DeleteIcon />
      </IconButton>
      <Dialog
        open={open}
        onClose={deleting ? undefined : () => setOpen(false)}
        aria-labelledby={`delete-word-${el._id}`}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#fcf5f0',
              color: '#5d2c07',
              borderRadius: 3,
              border: '1px solid #e7c4a7',
              width: 360,
              m: 2,
              maxWidth: 'calc(100% - 32px)',
            },
          },
        }}
      >
        <DialogContent
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          <Box
            component="img"
            src={ramImage}
            alt=""
            aria-hidden="true"
            sx={{
              width: 100,
              height: 100,
              objectFit: 'contain',
              flexShrink: 0,
              pointerEvents: 'none',
            }}
          />
          <DialogTitle
            id={`delete-word-${el._id}`}
            sx={{ p: 0, fontSize: '1rem', lineHeight: 1.5 }}
          >
            Ты действительно собрался удалить это слово?
          </DialogTitle>
        </DialogContent>
        {error && (
          <Typography role="alert" color="error" sx={{ px: 2 }}>
            {error}
          </Typography>
        )}
        <DialogActions
          sx={{
            px: 2,
            pb: 2,
            gap: 1,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Button
            disabled={deleting}
            onClick={() => {
              void handleDeletePost(el._id)
            }}
            sx={{
              minWidth: 72,
              bgcolor: '#895a39',
              color: '#fcf5f0',
              borderRadius: '12px',
              '&:hover': { bgcolor: '#5d2c07' },
            }}
          >
            Да
          </Button>
          <Button
            autoFocus
            disabled={deleting}
            onClick={() => setOpen(false)}
            sx={{
              minWidth: 72,
              color: '#895a39',
              border: '1px solid #895a39',
              borderRadius: '12px',
              '&:hover': { bgcolor: '#fff0df' },
            }}
          >
            Нет
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
export default DeleteWordButton
