import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import SchoolIcon from '@mui/icons-material/School'
import BarChartIcon from '@mui/icons-material/BarChart'
import PersonIcon from '@mui/icons-material/Person'

const MenuItem = [
  { label: 'Слова', path: '/user/home', icon: MenuBookIcon },
  { label: 'Сессии', path: '/user/sessions', icon: SchoolIcon },
  { label: 'Статистика', path: '/user/statistics', icon: BarChartIcon },
  { label: 'Профиль', path: '/user/profile', icon: PersonIcon },
]

function Navigation() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const activePath = pathname.startsWith('/user/sessions/') ? '/user/sessions' : pathname
  return (
    <Box
      sx={{
        width: { xs: '100%', sm: '250px' },
        bgcolor: '#fbefe4',
        height: { xs: 'auto', sm: '100vh' },
        position: { xs: 'fixed', sm: 'static' },
        bottom: 0,
        left: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: { xs: 'flex', sm: 'block' },
        alignItems: 'center',
        borderTop: { xs: '1px solid', sm: 'none' },
        borderColor: 'divider',
        pb: { xs: 'env(safe-area-inset-bottom)', sm: 0 },
      }}
    >
      <List component="nav" aria-label="Основная навигация" sx={{ display: { xs: 'flex', sm: 'block' }, flex: 1, py: { xs: 0, sm: 1 } }}>
        {MenuItem.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => navigate(item.path)}
            selected={activePath === item.path}
            aria-current={activePath === item.path ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
            sx={{ justifyContent: { xs: 'center', sm: 'flex-start' }, minHeight: 56, px: { xs: 1, sm: 2 } }}
          >
            <ListItemIcon sx={{ display: { xs: 'flex', sm: 'none' }, minWidth: 0, color: activePath === item.path ? 'primary.main' : 'inherit' }}>
              <item.icon />
            </ListItemIcon>
            <ListItemText sx={{ display: { xs: 'none', sm: 'block' } }}>{item.label}</ListItemText>
          </ListItemButton>
        ))}
      </List>
      <IconButton
        sx={{ mt: { sm: 'auto' }, ml: { xs: 0, sm: 2 }, mx: { xs: 1 }, minWidth: 44, minHeight: 44 }}
        onClick={() => {
          localStorage.removeItem('token')

          navigate('/login', { replace: true })
        }}
        aria-label="Logout"
      >
        <LogoutIcon />
      </IconButton>
    </Box>
  )
}
export default Navigation
