import { useEffect, useState } from 'react'
import { Box, Button, LinearProgress, Typography } from '@mui/material'
import { getWordStatistics, type WordStatistics } from '../../../entities/word'

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<WordStatistics | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getWordStatistics(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setStatistics(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true)
      })
    return () => controller.abort()
  }, [attempt])

  const progress = statistics?.total
    ? Math.round(statistics.learned / statistics.total * 100)
    : 0

  return (
    <Box sx={{ color: '#5d2c07' }}>
      <Typography variant="h5" sx={{ mb: 3 }}>Статистика</Typography>
      {!statistics && !error && <Typography role="status">Загружаем статистику…</Typography>}
      {error && (
        <Box>
          <Typography role="alert">Не удалось загрузить статистику.</Typography>
          <Button
            onClick={() => { setError(false); setAttempt((value) => value + 1) }}
            sx={{ mt: 2, color: '#f78811', border: '2px solid #f78811', borderRadius: '12px' }}
          >
            Повторить
          </Button>
        </Box>
      )}
      {statistics && (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
            {[
              { label: 'Всего слов', value: statistics.total },
              { label: 'Выучено английских слов', value: statistics.learnedEnglish },
              { label: 'Выучено немецких слов', value: statistics.learnedGerman },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ p: 3, bgcolor: '#fcf5f0', borderRadius: '12px', boxShadow: '1px 2px 5px #9a8c79' }}>
                <Typography sx={{ color: '#895a39', mb: 1 }}>{label}</Typography>
                <Typography component="p" variant="h4" sx={{ fontWeight: 'bold' }}>{value}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 3, bgcolor: '#fcf5f0', borderRadius: '12px', boxShadow: '1px 2px 5px #9a8c79' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
              <Typography sx={{ fontWeight: 'bold' }}>Прогресс изучения</Typography>
              <Typography sx={{ color: '#66713f', fontWeight: 'bold' }}>{progress}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              aria-label="Доля выученных слов в словаре"
              sx={{ height: 12, borderRadius: 6, bgcolor: '#e9dccb', '& .MuiLinearProgress-bar': { bgcolor: '#788447', borderRadius: 6 } }}
            />
            <Typography sx={{ mt: 2 }}>Выучено {statistics.learned} из {statistics.total} слов</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#895a39' }}>
              Выученными считаются слова, отмеченные кнопкой «Выучил».
            </Typography>
          </Box>
        </>
      )}
    </Box>
  )
}
