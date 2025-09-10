import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Analyze from './pages/Analyze.tsx';
import Chat from './pages/Chat.tsx';
import './index.css';

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/analyze', element: <Analyze /> },
  { path: '/chat', element: <Chat /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
