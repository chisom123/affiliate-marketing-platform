import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [estimatedRatings, setEstimatedRatings] = useState(50);
  const navigate = useNavigate();
  
  // Define min/max values here - change these to update the slider range
  const minRatings = 10;
  const maxRatings = 500;
  const stepSize = 10;
  
  const handleDashboard = (mode = 'signup') => {
    navigate('/dashboard', { state: { authMode: mode } });
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
      // Multiple scroll methods to ensure it works
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Fallback method
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    {
      title: "Turn your stories into income",
      subtitle: "Get paid every time your friends rate your story",
      content: "welcome"
    },
    {
      title: "Add Rating Link",
      subtitle: "Simply add our link to your Instagram or Snapchat story",
      content: "addLink"
    },
    {
      title: "Get Ratings",
      subtitle: "Your friends tap the link and rate your story",
      content: "getRatings"
    },
    {
      title: "Estimate Earnings",
      subtitle: "How many ratings do you think you'll get per story?",
      content: "getPaid"
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Welcome
        return (
          <div style={{ textAlign: 'center' }}>
          </div>
        );

      case 1: // Add Link
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              maxWidth: '300px', 
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4128%202.PNG?alt=media&token=89ecbb80-8e3d-4c0a-9ed8-35552ccf70d0"
                alt="Instagram story with rating link"
                style={{
                  width: '100%',
                  maxWidth: '250px',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                }}
              />
            </div>
          </div>
        );

      case 2: // Get Ratings
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              maxWidth: '300px', 
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4200.PNG?alt=media&token=b6d48305-034f-40f5-8c10-69fc52c56a6e"
                alt="Rating interface on mobile"
                style={{
                  width: '100%',
                  maxWidth: '250px',
                  height: 'auto',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                }}
              />
            </div>
          </div>
        );

      case 3: // Get Paid
        return (
          <div>
            {/* Custom Slider */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '24px'
            }}>
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
                  const thumb = e.currentTarget.querySelector('[data-thumb]');
                  const track = e.currentTarget.querySelector('[data-track]');
                  
                  thumb.style.transition = 'none';
                  track.style.transition = 'none';
                  
                  let animationId;
                  const updateValue = (clientX) => {
                    if (animationId) cancelAnimationFrame(animationId);
                    animationId = requestAnimationFrame(() => {
                      const x = clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      const newValue = Math.round((percentage * (maxRatings - minRatings) + minRatings) / stepSize) * stepSize;
                      setEstimatedRatings(newValue);
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
                  const thumb = e.currentTarget.querySelector('[data-thumb]');
                  const track = e.currentTarget.querySelector('[data-track]');
                  
                  thumb.style.transition = 'none';
                  track.style.transition = 'none';
                  
                  let animationId;
                  const updateValue = (clientX) => {
                    if (animationId) cancelAnimationFrame(animationId);
                    animationId = requestAnimationFrame(() => {
                      const x = clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      const newValue = Math.round((percentage * (maxRatings - minRatings) + minRatings) / stepSize) * stepSize;
                      setEstimatedRatings(newValue);
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
                {/* Slider Track */}
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
                    data-track
                    style={{
                      position: 'absolute',
                      left: '0',
                      top: '0',
                      height: '100%',
                      width: `${((estimatedRatings - minRatings) / (maxRatings - minRatings)) * 100}%`,
                      background: 'linear-gradient(90deg, #4169E1 0%, #6B8AFF 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.1s ease'
                    }} 
                  />
                </div>
                
                {/* Custom Thumb */}
                <div 
                  data-thumb
                  style={{
                    position: 'absolute',
                    top: '7px',
                    left: `calc(${((estimatedRatings - minRatings) / (maxRatings - minRatings)) * 100}% - 10px)`,
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#4169E1',
                    border: '3px solid white',
                    borderRadius: '50%',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transition: 'left 0.1s ease',
                    cursor: 'grab',
                    pointerEvents: 'none'
                  }}
                />
                
                {/* Hidden input for accessibility */}
                <input
                  type="range"
                  min={minRatings}
                  max={maxRatings}
                  step={stepSize}
                  value={estimatedRatings}
                  onChange={(e) => setEstimatedRatings(e.target.value)}
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    pointerEvents: 'none'
                  }}
                  tabIndex="0"
                />
              </div>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: 'white',
                  marginBottom: '8px'
                }}>
                  {estimatedRatings} ratings <span style={{ fontSize: '16px', fontWeight: 'normal', color: 'rgba(255,255,255,0.8)' }}>per story</span>
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '16px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '16px', 
                    color: 'rgba(255,255,255,0.8)',
                    marginBottom: '5px'
                  }}>
                    Per Story
                  </div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    ${(estimatedRatings * 0.1).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
            <h1 style={{ 
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              marginTop: '6px',
              margin: '0'
            }}>
              
            </h1>
          </div>
          
          <button
            onClick={() => handleDashboard('login')}
            style={{
              color: 'white',
              background: 'transparent',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseOver={(e) => e.target.style.color = '#60a5fa'}
            onMouseOut={(e) => e.target.style.color = 'white'}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
        {/* Progress Bar */}
        <div style={{ 
          background: 'rgba(30, 41, 59, 0.5)',
          padding: '12px 20px'
        }}>
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ 
              height: '6px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  height: '100%',
                  backgroundColor: '#4169E1',
                  transition: 'width 0.5s ease',
                  width: `${((currentStep + 1) / steps.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div style={{ 
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 20px',
          marginTop: (currentStep === 0 || currentStep === 3) && window.innerWidth <= 768 ? '-70px' : '0'
        }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
            {/* Step Header */}
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              {currentStep === 0 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '32px'
                }}>
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                    alt="Star icon"
                    style={{
                      width: '32px',
                      height: '32px'
                    }}
                  />
                  <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginTop: '5px'
                  }}>
                    SocialStar Partners
                  </span>
                </div>
              )}
              <h1 style={{ 
                fontSize: window.innerWidth > 768 ? '28px' : '24px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '12px',
                margin: '0 0 12px 0'
              }}>
                {steps[currentStep].title}
              </h1>
              <p style={{ 
                fontSize: '18px',
                color: 'rgba(255,255,255,0.8)',
                margin: '0'
              }}>
                {steps[currentStep].subtitle}
              </p>
            </div>

            {/* Step Content */}
            <div style={{ marginBottom: '80px' }}>
              {renderStepContent()}
            </div>

            {/* Navigation */}
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
                {currentStep < 3 ? (
                  <button
                    onClick={nextStep}
                    style={{
                      width: '100%',
                      padding: '16px 32px',
                      backgroundColor: '#4169E1',
                      color: 'white',
                      borderRadius: '200px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      boxShadow: '0 4px 20px rgba(65, 105, 225, 0.3)'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#3b5de6'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#4169E1'}
                  >
                    {currentStep === 0 ? 'Learn More' : 'Next'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleDashboard('signup')}
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
                )}
              </div>
            </div>
          </div>
        </div>
      </main>


    </div>
  );
};

export default LandingPage;