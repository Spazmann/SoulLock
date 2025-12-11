import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import RoomPage from './pages/RoomPage';

const App = () => (
  <Routes>
    <Route element={<Layout />}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/rooms/:roomId" element={<RoomPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
