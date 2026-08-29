import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Announcements from './pages/Announcements';
import Contents from './pages/Contents';
import Events from './pages/Events';
import Feed from './pages/Feed';
import Login from './pages/Login';
import PostDetail from './pages/PostDetail';
import Profile from './pages/Profile';
import Register from './pages/Register';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Feed />} />
        <Route path="posts/:id" element={<PostDetail />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="events" element={<Events />} />
        <Route path="contents" element={<Contents />} />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<div className="p-8">404 Not Found</div>} />
    </Routes>
  );
}
