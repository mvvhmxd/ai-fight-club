import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { User } from '../../../shared/schema'
import '../styles/auth.css'

interface LoginPageProps {
  onLogin: (user: User, token: string) => void
}

function getErrorMessage(err: any, fallback: string) {
  const error = err.response?.data?.error
  if (typeof error === 'string') return error
  if (error?.message && typeof error.message === 'string') return error.message
  if (err.message && typeof err.message === 'string') return err.message
  return fallback
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      })

      onLogin(response.data.user, response.data.token)
      navigate('/')
    } catch (err: any) {
      setError(getErrorMessage(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>AI Fight Club</h1>
        <p className="subtitle">Accountability platform for AI engineering students</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
