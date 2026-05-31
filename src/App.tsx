import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from 'hooks/useAuth'
import Layout from 'components/layout/Layout'
import LoginPage from 'pages/auth/LoginPage'
import DashboardPage from 'pages/DashboardPage'
import { TeamsPage, CreateTeamPage } from 'pages/teams/TeamsPage'
import { PlayersPage, CreatePlayerPage } from 'pages/players/PlayersPage'
import MatchesPage from 'pages/matches/MatchesPage'
import CreateMatchPage from 'pages/matches/CreateMatchPage'
import MatchDetailPage from 'pages/matches/MatchDetailPage'
import MatchRecordingPage from 'pages/matches/MatchRecordingPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-400 flex flex-col items-center gap-3">
        <div className="text-3xl animate-spin">🏐</div>
        <div>Ładowanie...</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const AppRoutes: React.FC = () => {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/mecze/:id/rejestracja" element={
        <ProtectedRoute><MatchRecordingPage /></ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/druzyny" element={<TeamsPage />} />
              <Route path="/druzyny/nowa" element={<CreateTeamPage />} />
              <Route path="/zawodnicy" element={<PlayersPage />} />
              <Route path="/zawodnicy/nowy" element={<CreatePlayerPage />} />
              <Route path="/mecze" element={<MatchesPage />} />
              <Route path="/mecze/nowy" element={<CreateMatchPage />} />
              <Route path="/mecze/:id" element={<MatchDetailPage />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
)

export default App
