import DeleteIcon from '@mui/icons-material/Delete'
import { deleteWord } from '../api/deleteWord'

function DeleteWordButton({
  el,
  onDeleted,
}: {
  el: { _id: string }
  onDeleted: (wordId: string) => void
}) {
  const handleDeletePost = async (wordId: string) => {
    try {
      await deleteWord(wordId)
      onDeleted(wordId)
    } catch {}
  }
  return <DeleteIcon sx={{ color: '#895a39' }} onClick={() => handleDeletePost(el._id)} />
}
export default DeleteWordButton
