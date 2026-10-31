import './styles/App.css'
import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import Box from '@mui/material/Box'
import RegisterPage from '../pages/register'
import LoginPage from '../pages/login'
import ProtectedRoute from './router/ProtectedRoute'
import HomePage from '../pages/home'
import TitlePage from '../pages/title/titlePage'
import Navigation from '../widgets/navigation'
import SessionsPage from '../pages/sessions'
import ListeningSessionPage from '../pages/listening-session'
import StatisticsPage from '../pages/statistics'
import ProfilePage from '../pages/profile'

function App() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        maxWidth: '1440px',
        width: '100%',
        mx: 'auto',
        backgroundColor: '#F9EDE5',
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/title" replace />} />
        <Route path="/title" element={<TitlePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/user"
          element={
            <ProtectedRoute>
              <Box sx={{ display: 'flex', flex: 1 }}>
                <Box sx={{ width: { xs: 0, sm: 250 }, flexShrink: 0 }}>
                  <Navigation />
                </Box>

                <Box
                  component="main"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    p: 3,
                    pb: {
                      xs: 'calc(80px + env(safe-area-inset-bottom))',
                      sm: 3,
                    },
                  }}
                >
                  <Outlet />
                </Box>
              </Box>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/:id" element={<ListeningSessionPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </Box>
  )
}

export default App
