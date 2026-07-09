import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import axios from 'axios'
import {
  BarChart3, BookOpen, ClipboardCheck, LayoutDashboard,
  LogOut, Settings2, ShieldCheck,
} from 'lucide-react'
import { User } from '../../shared/schema'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './pages/Dashboard'
import Curriculum from './pages/Curriculum'
import MyReviews from './pages/MyReviews'
import Progress from './pages/Progress'
import AdminPanel from './pages/AdminPanel'
import './App.css'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

function SoapBarLogo() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" width="24" height="24" fill="none">
    <rect x="3.5" y="9" width="25" height="17" rx="6" fill="currentColor" opacity=".18" />
    <rect x="5.5" y="10.5" width="21" height="13.5" rx="5" stroke="currentColor" strokeWidth="1.6" />
    <text x="16" y="19.3" textAnchor="middle" fill="currentColor" fontSize="6" fontWeight="800" letterSpacing=".5">SOAP</text>
    <circle cx="23.5" cy="7" r="2" fill="currentColor" opacity=".85" />
    <circle cx="28" cy="3.5" r="1.4" fill="currentColor" opacity=".6" />
  </svg>
}

function App() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token') || null,
    loading: true,
  })

  // Initialize auth from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      verifyToken(token)
    } else {
      setAuth(prev => ({ ...prev, loading: false }))
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAuth({
        user: response.data.user,
        token,
        loading: false,
      })
    } catch (error) {
      localStorage.removeItem('token')
      setAuth({ user: null, token: null, loading: false })
    }
  }

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem('token', token)
    setAuth({ user, token, loading: false })
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setAuth({ user: null, token: null, loading: false })
  }

  if (auth.loading) {
    return <div className="loading">Loading...</div>
  }

  if (!auth.user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/signup" element={<SignupPage onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    )
  }

  return (
    <Router>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="app-layout">
        <nav className="sidebar" aria-label="Primary navigation">
          <div className="sidebar-header">
            <div className="brand-mark"><SoapBarLogo /></div>
            <div>
              <span className="brand-name">AI Fight Club</span>
              <span className="brand-caption">Training console</span>
            </div>
          </div>
          <ul className="nav-links">
            <li><NavLink to="/" end><LayoutDashboard size={18} /> <span>Dashboard</span></NavLink></li>
            <li><NavLink to="/curriculum"><BookOpen size={18} /> <span>Curriculum</span></NavLink></li>
            <li><NavLink to="/reviews"><ClipboardCheck size={18} /> <span>{auth.user.role === 'admin' ? 'Reviews' : 'My Reviews'}</span></NavLink></li>
            <li><NavLink to="/progress"><BarChart3 size={18} /> <span>Progress</span></NavLink></li>
            {auth.user.role === 'admin' && <li><NavLink to="/admin"><Settings2 size={18} /> <span>Admin</span></NavLink></li>}
          </ul>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="avatar">{auth.user.name.charAt(0).toUpperCase()}</div>
              <div className="user-copy">
                <p>{auth.user.name}</p>
                <p className="role"><ShieldCheck size={12} /> {auth.user.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn"><LogOut size={17} /> <span>Log out</span></button>
          </div>
        </nav>

        <main className="main-content" id="main-content">
          <div className="content-frame">
          <Routes>
            <Route path="/" element={<Dashboard user={auth.user} token={auth.token!} />} />
            <Route path="/curriculum" element={<Curriculum user={auth.user} token={auth.token!} />} />
            <Route path="/reviews" element={<MyReviews user={auth.user} token={auth.token!} />} />
            <Route path="/progress" element={<Progress user={auth.user} token={auth.token!} />} />
            {auth.user.role === 'admin' && (
              <Route path="/admin" element={<AdminPanel user={auth.user} token={auth.token!} />} />
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
