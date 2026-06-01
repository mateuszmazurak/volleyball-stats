import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from 'hooks/useAuth'
import Layout from 'components/layout/Layout'
import LoginPage from 'pages/auth/LoginPage'
import DashboardPage from 'pages/DashboardPage'
import { TeamsPage, CreateTeamPage, EditTeamPage } from 'pages/teams/TeamsPage'
import TeamDetailPage from 'pages/teams/TeamDetailPage'
import { PlayersPage, CreatePlayerPage, EditPlayerPage } from 'pages/players/PlayersPage'
import PlayerStatsPage from 'pages/players/PlayerStatsPage'
import MatchesPage from 'pages/matches/MatchesPage'
import CreateMatchPage from 'pages/matches/CreateMatchPage'
import EditMatchPage from 'pages/matches/EditMatchPage'
import MatchDetailPage from 'pages/matches/MatchDetailPage'
import MatchRecordingPage from 'pages/matches/MatchRecordingPage'
import MatchStatsPage from 'pages/matches/MatchStatsPage'
import HelpPage from 'pages/HelpPage'

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
              <Route path="/druzyny/:id" element={<TeamDetailPage />} />
              <Route path="/druzyny/:id/edytuj" element={<EditTeamPage />} />
              <Route path="/zawodnicy" element={<PlayersPage />} />
              <Route path="/zawodnicy/nowy" element={<CreatePlayerPage />} />
              <Route path="/zawodnicy/:id/statystyki" element={<PlayerStatsPage />} />
              <Route path="/zawodnicy/:id/edytuj" element={<EditPlayerPage />} />
              <Route path="/mecze" element={<MatchesPage />} />
              <Route path="/mecze/nowy" element={<CreateMatchPage />} />
              <Route path="/mecze/:id" element={<MatchDetailPage />} />
              <Route path="/mecze/:id/edytuj" element={<EditMatchPage />} />
              <Route path="/mecze/:id/statystyki" element={<MatchStatsPage />} />
              <Route path="/pomoc" element={<HelpPage />} />
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
