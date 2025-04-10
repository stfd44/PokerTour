// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from './components/layout/ScrollToTop'; // Import ScrollToTop

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ScrollToTop /> {/* Add ScrollToTop component here */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
