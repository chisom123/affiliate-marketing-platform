// MAIN APP COMPONENT WITH ROUTING
// Purpose: Handle routing between affiliate dashboard and rating pages
// Routes: / (dashboard), /rate/:affiliateId/:linkId (rating page)

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import AffiliateDashboard from './AffiliateDashboard';
import RatingPage from './RatingPage';
import AdminPanel from './AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - Main marketing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Affiliate Dashboard */}
        <Route path="/dashboard" element={<AffiliateDashboard />} />
        
        {/* Rating Page - Public rating interface */}
        <Route path="/rate/:affiliateId/:linkId" element={<RatingPage />} />
        
        {/* Admin Panel - Business management */}
        <Route path="/admin" element={<AdminPanel />} />
        
        {/* Catch-all route for invalid URLs */}
        <Route path="*" element={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center'
          }}>
            <div>
              <h1>Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
              <a href="/" style={{ color: '#007bff' }}>Go to Dashboard</a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;