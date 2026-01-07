// MAIN APP COMPONENT WITH ROUTING
// Purpose: Handle routing between affiliate dashboard and rating pages
// Routes: / (dashboard), /rate/:affiliateId/:linkId (rating page), /recruit/:recruiterId (recruit signup)

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import RatingPage from './RatingPage';
import AdminPanel from './AdminPanel';
import InfoPage from './InfoPage';
import RecruitSignup from './RecruitSignup'; // NEW: Import recruit signup component

function App() {
  return (
    <Router>
      <Routes>
        {/* Landing Page - Main marketing page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Rating Page - Public rating interface */}
        <Route path="/rate/:affiliateId/:linkId" element={<RatingPage />} />
        
        {/* NEW: Recruit Signup Page - For users joining via recruiter link */}
        <Route path="/recruit/:recruiterId" element={<RecruitSignup />} />
        
        {/* Info Page - For users who don't have the app */}
        <Route path="/info/:affiliateId/:linkId" element={<InfoPage />} />
        
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
              <h1 style={{ color: '#FFF' }}>Page Not Found</h1>
              <a 
                href="/" 
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  border: '2px solid white',
                  borderRadius: '200px',
                  color: 'white',
                  backgroundColor: 'transparent',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Go to Homepage
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;