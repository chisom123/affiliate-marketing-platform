import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [imageLoading, setImageLoading] = useState({});
  const navigate = useNavigate();
  
  const [followers, setFollowers] = useState(5000);
  const [engagementRate, setEngagementRate] = useState(1.5);

  const minFollowers = 1000;
  const maxFollowers = 50000;
  const followerStepSize = 1000;

  const minEngagement = 0.5;
  const maxEngagement = 5;
  const engagementStepSize = 0.5;

  const estimatedRatings = Math.round((followers * engagementRate) / 100);
  
  const nextStep = () => {
    if (currentStep < 2) {
      if (currentStep === 0) {
        const nextImageKey = `step_2`;
        setImageLoading(prev => ({ ...prev, [nextImageKey]: true }));
      }
      
      setCurrentStep(currentStep + 1);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // New function to handle resetting the view to the first slide.
  const goToStart = () => {
    setCurrentStep(0);
    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, 50);
  };


  const handleImageLoad = (imageKey) => {
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
  };

  const handleImageError = (imageKey) => {
    setImageLoading(prev => ({ ...prev, [imageKey]: false }));
  };

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

  const steps = [
    {
      title: "Add Rating Link",
      subtitle: "Simply add our link to your Instagram story",
      content: "addLink"
    },
    {
      title: "Get Ratings",
      subtitle: "Your followers tap the link and rate",
      content: "getRatings"
    },
    {
      title: "How much could you earn?",
      subtitle: "Get paid based on ratings",
      content: "getPaid"
    }
  ];

  const renderImageWithPlaceholder = (src, alt, imageKey, maxWidth = '250px') => {
    const isLoading = imageLoading[imageKey];
    
    return (
      <div style={{ 
        maxWidth: '300px', 
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        {isLoading && (
          <div style={{
            width: '100%',
            maxWidth: maxWidth,
            height: '444px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Spinner />
          </div>
        )}
        
        <img 
          src={src}
          alt={alt}
          onLoad={() => handleImageLoad(imageKey)}
          onError={() => handleImageError(imageKey)}
          style={{
            width: '100%',
            maxWidth: maxWidth,
            height: 'auto',
            borderRadius: '8px',
            display: isLoading ? 'none' : 'block'
          }}
        />
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={{ textAlign: 'center' }}>
            {renderImageWithPlaceholder(
              "https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4128%202.PNG?alt=media&token=89ecbb80-8e3d-4c0a-9ed8-35552ccf70d0",
              "Instagram story with rating link",
              "step_1",
              "250px"
            )}
          </div>
        );

      case 1:
        return (
          <div style={{ textAlign: 'center' }}>
            {renderImageWithPlaceholder(
              "https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4200.PNG?alt=media&token=b6d48305-034f-40f5-8c10-69fc52c56a6e",
              "Rating interface on mobile",
              "step_2",
              "250px"
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '24px'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    {followers.toLocaleString()} Followers
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
                    const thumb = e.currentTarget.querySelector('[data-followers-thumb]');
                    const track = e.currentTarget.querySelector('[data-followers-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxFollowers - minFollowers) + minFollowers) / followerStepSize) * followerStepSize;
                        setFollowers(newValue);
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
                    const thumb = e.currentTarget.querySelector('[data-followers-thumb]');
                    const track = e.currentTarget.querySelector('[data-followers-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxFollowers - minFollowers) + minFollowers) / followerStepSize) * followerStepSize;
                        setFollowers(newValue);
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
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div 
                      data-followers-track
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        height: '100%',
                        width: `${((followers - minFollowers) / (maxFollowers - minFollowers)) * 100}%`,
                        background: 'linear-gradient(90deg, #FFFFFF 0%, #F8F9FA 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.1s ease'
                      }} 
                    />
                  </div>
                  
                  <div 
                    data-followers-thumb
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: `calc(${((followers - minFollowers) / (maxFollowers - minFollowers)) * 100}% - 10px)`,
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
      
              <div style={{ marginBottom: '10px' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: 'white'
                  }}>
                    {engagementRate}% Engagement
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: 'rgba(255,255,255,0.6)',
                    marginTop: '4px'
                  }}>
                    {estimatedRatings} ratings per story
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
                    const thumb = e.currentTarget.querySelector('[data-engagement-thumb]');
                    const track = e.currentTarget.querySelector('[data-engagement-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxEngagement - minEngagement) + minEngagement) / engagementStepSize) * engagementStepSize;
                        setEngagementRate(newValue);
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
                    const thumb = e.currentTarget.querySelector('[data-engagement-thumb]');
                    const track = e.currentTarget.querySelector('[data-engagement-track]');
                    
                    thumb.style.transition = 'none';
                    track.style.transition = 'none';
                    
                    let animationId;
                    const updateValue = (clientX) => {
                      if (animationId) cancelAnimationFrame(animationId);
                      animationId = requestAnimationFrame(() => {
                        const x = clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newValue = Math.round((percentage * (maxEngagement - minEngagement) + minEngagement) / engagementStepSize) * engagementStepSize;
                        setEngagementRate(newValue);
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
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div 
                      data-engagement-track
                      style={{
                        position: 'absolute',
                        left: '0',
                        top: '0',
                        height: '100%',
                        width: `${((engagementRate - minEngagement) / (maxEngagement - minEngagement)) * 100}%`,
                        background: 'linear-gradient(90deg, #FFFFFF 0%, #F8F9FA 100%)',
                        borderRadius: '4px',
                        transition: 'width 0.1s ease'
                      }} 
                    />
                  </div>
                  
                  <div 
                    data-engagement-thumb
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: `calc(${((engagementRate - minEngagement) / (maxEngagement - minEngagement)) * 100}% - 10px)`,
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
                    ${(estimatedRatings * 0.50).toFixed(2)}
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
        </div>
      </header>

      <main style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
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

        <div style={{ 
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 20px',
          marginTop: (currentStep === 2) && window.innerWidth <= 768 ? '-70px' : '0'
        }}>
          <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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

            <div style={{ marginBottom: '80px' }}>
              {renderStepContent()}
            </div>

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
                {currentStep < 2 ? (
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
                    Next
                  </button>
                ) : (
                  // The text and onClick action of this button have been updated.
                  <button
                    onClick={goToStart}
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
                    Back to Start
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