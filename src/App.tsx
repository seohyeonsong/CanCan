import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './lib/auth'
import { Login } from './pages/Login/Login'
import { MyMeetings } from './pages/MyMeetings/MyMeetings'
import { CreateMeeting } from './pages/CreateMeeting/CreateMeeting'
import { ShareLink } from './pages/ShareLink/ShareLink'
import { ParticipantResponse } from './pages/ParticipantResponse/ParticipantResponse'
import { OrganizerDashboard } from './pages/OrganizerDashboard/OrganizerDashboard'
import { Confirmation } from './pages/Confirmation/Confirmation'

function RequireAuth({ children }: { children: React.ReactNode }) {
  return getUser() ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/meetings" replace />} />
        <Route path="/meetings" element={<RequireAuth><MyMeetings /></RequireAuth>} />
        <Route path="/create" element={<RequireAuth><CreateMeeting /></RequireAuth>} />
        <Route path="/meeting/:id/share" element={<RequireAuth><ShareLink /></RequireAuth>} />
        <Route path="/meeting/:id/dashboard" element={<RequireAuth><OrganizerDashboard /></RequireAuth>} />
        <Route path="/meeting/:id/confirmed" element={<RequireAuth><Confirmation /></RequireAuth>} />
        {/* 응답 페이지는 로그인 없이도 접근 가능 (외부 초대) */}
        <Route path="/meeting/:id/respond" element={<ParticipantResponse />} />
        {/* 알 수 없는 주소 → 홈으로 (빈 화면 방지) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
