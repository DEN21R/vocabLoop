import { Box, Typography } from '@mui/material'
import type { IWord } from '../model/types'

function WordCard({ el }: { el: IWord }) {
  return (
    <Box key={el._id}>
      <Typography>
        {el.original} - {el.translation}
      </Typography>
      <Typography>
        {el.sourceLanguage} - {el.targetLanguage}
      </Typography>
    </Box>
  )
}
export default WordCard
