import React, { useState } from 'react';

const EarningsCalculator = () => {
  const [stories, setStories] = useState(4);
  const [ratings, setRatings] = useState(100);

  // Define min/max values for stories and ratings
  const minStories = 1;
  const maxStories = 10;
  const storiesStepSize = 1;

  const minRatings = 10;
  const maxRatings = 500;
  const ratingsStepSize = 10;

  // Calculate total earnings (assuming $0.25 per rating)
  const totalEarnings = stories * ratings * 0.25;

  // Spinner component
  const Spinner = () => (
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(255, 255, 255, 0.3)',
      borderTop: '3px solid #FFF',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  );

  // Add keyframes for spinner animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #1e3a8a 50%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: '0',
        zIndex: 50,
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
              alt="Star icon"
              style={{ width: '32px', height: '32px' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ 
        flex: '1', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '32px 20px 120px 20px'
      }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 style={{ 
              fontSize: window.innerWidth > 768 ? '28px' : '24px',
              fontWeight: 'bold',
              color: 'white',
              marginBottom: '12px',
              margin: '0 0 12px 0'
            }}>
              How much could you earn as a SocialStar Partner?
            </h1>
          </div>

          {/* Earnings Calculator */}
          <div>
            {/* Custom Dual Slider */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '24px'
            }}>
              {/* Stories Slider */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    {stories} {stories === 1 ? 'Story' : 'Stories'}
                  </div>
                </div>
                
                <div 
                  style={{ 
                    position: 'relative', 
                    marginBottom: '16px',
                    padding: '16px 0',
                    cursor: 'pointer',
                    touchAction: 'none'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const thumb = e.currentTarget.querySelector('[data-stories-thumb]');
                    const track = e.currentTarget.querySelector('[data-stories-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxStories - minStories) + minStories) / storiesStepSize) * storiesStepSize;
                        setStories(newValue);
                      });
                    };
                    
                    updateValue(e.clientX);
                    
                    const handleMouseMove = (e) => updateValue(e.clientX);
                    const handleMouseUp = () => {
                      thumb.style.transition = 'left 0.1s ease';
                      track.style.transition = 'width 0.1s ease';
                      
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                      if (animationId) cancelAnimationFrame(animationId);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const thumb = e.currentTarget.querySelector('[data-stories-thumb]');
                    const track = e.currentTarget.querySelector('[data-stories-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxStories - minStories) + minStories) / storiesStepSize) * storiesStepSize;
                        setStories(newValue);
                      });
                    };
                    
                    const touch = e.touches[0];
                    updateValue(touch.clientX);
                    
                    const handleTouchMove = (e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      updateValue(touch.clientX);
                    };
                    
                    const handleTouchEnd = () => {
                      thumb.style.transition = 'left 0.1s ease';
                      track.style.transition = 'width 0.1s ease';
                      
                      document.removeEventListener('touchmove', handleTouchMove);
                      document.removeEventListener('touchend', handleTouchEnd);
                      if (animationId) cancelAnimationFrame(animationId);
                    };
                    
                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                    document.addEventListener('touchend', handleTouchEnd);
                  }}
                >
                  {/* Stories Slider Track */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    {/* Filled Track */}
                    <div 
                      data-stories-track
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        height: '100%',
                        width: `${((stories - minStories) / (maxStories - minStories)) * 100}%`,
                        background: 'linear-gradient(90deg, #FFFFFF 0%, #F8F9FA 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.1s ease'
                      }} 
                    />
                  </div>
                  
                  {/* Custom Thumb */}
                  <div 
                    data-stories-thumb
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: `calc(${((stories - minStories) / (maxStories - minStories)) * 100}% - 10px)`,
                      width: '18px',
                      height: '18px',
                      backgroundColor: '#FFFFFF',
                      border: '3px solid white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'left 0.1s ease',
                      cursor: 'grab',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
      
              {/* Ratings Slider */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    {ratings} Ratings{stories > 1 ? ' per Story' : ''}
                  </div>
                </div>
                
                <div 
                  style={{ 
                    position: 'relative', 
                    marginBottom: '16px',
                    padding: '16px 0',
                    cursor: 'pointer',
                    touchAction: 'none'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const thumb = e.currentTarget.querySelector('[data-ratings-thumb]');
                    const track = e.currentTarget.querySelector('[data-ratings-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxRatings - minRatings) + minRatings) / ratingsStepSize) * ratingsStepSize;
                        setRatings(newValue);
                      });
                    };
                    
                    updateValue(e.clientX);
                    
                    const handleMouseMove = (e) => updateValue(e.clientX);
                    const handleMouseUp = () => {
                      thumb.style.transition = 'left 0.1s ease';
                      track.style.transition = 'width 0.1s ease';
                      
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                      if (animationId) cancelAnimationFrame(animationId);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const thumb = e.currentTarget.querySelector('[data-ratings-thumb]');
                    const track = e.currentTarget.querySelector('[data-ratings-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxRatings - minRatings) + minRatings) / ratingsStepSize) * ratingsStepSize;
                        setRatings(newValue);
                      });
                    };
                    
                    const touch = e.touches[0];
                    updateValue(touch.clientX);
                    
                    const handleTouchMove = (e) => {
                      e.preventDefault();
                      const touch = e.touches[0];
                      updateValue(touch.clientX);
                    };
                    
                    const handleTouchEnd = () => {
                      thumb.style.transition = 'left 0.1s ease';
                      track.style.transition = 'width 0.1s ease';
                      
                      document.removeEventListener('touchmove', handleTouchMove);
                      document.removeEventListener('touchend', handleTouchEnd);
                      if (animationId) cancelAnimationFrame(animationId);
                    };
                    
                    document.addEventListener('touchmove', handleTouchMove, { passive: false });
                    document.addEventListener('touchend', handleTouchEnd);
                  }}
                >
                  {/* Ratings Slider Track */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    {/* Filled Track */}
                    <div 
                      data-ratings-track
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        height: '100%',
                        width: `${((ratings - minRatings) / (maxRatings - minRatings)) * 100}%`,
                        background: 'linear-gradient(90deg, #FFFFFF 0%, #F8F9FA 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.1s ease'
                      }} 
                    />
                  </div>
                  
                  {/* Custom Thumb */}
                  <div 
                    data-ratings-thumb
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: `calc(${((ratings - minRatings) / (maxRatings - minRatings)) * 100}% - 10px)`,
                      width: '18px',
                      height: '18px',
                      backgroundColor: '#FFFFFF',
                      border: '3px solid white',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'left 0.1s ease',
                      cursor: 'grab',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>
              
              {/* Single Earnings Display */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '24px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '18px', 
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: '8px'
                  }}>
                    Total Earnings
                  </div>
                  <div style={{ 
                    fontSize: '36px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    ${totalEarnings.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Button */}
        <div style={{ 
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          padding: '20px',
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 50
        }}>
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <button
              onClick={() => {
                // Open App Store URL
                window.open('https://apps.apple.com/app/socialstar-partners/id6751140592', '_blank');
              }}
              style={{
                width: '100%',
                padding: '16px 24px',
                backgroundColor: '#4169E1',
                color: 'white',
                borderRadius: '200px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 4px 20px rgba(65, 105, 225, 0.3)'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#3b5de6'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4169E1'}
            >
              Get Started
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EarningsCalculator;