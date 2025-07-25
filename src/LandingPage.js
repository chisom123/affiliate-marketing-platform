import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'lucide-react';
import { CircleDollarSign } from 'lucide-react';
import { CircleFadingPlus } from 'lucide-react';

const LandingPage = () => {
  const [estimatedRatings, setEstimatedRatings] = useState(100);

  const navigate = useNavigate();

  const handleDashboard = (mode = 'signup') => {
    navigate('/dashboard', { state: { authMode: mode } });
  };
  
  const handleGetStarted = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      
      {/* Header */}
      <header style={{ 
        backgroundColor: '#1A2245',
        position: 'sticky',
        top: '0',
        zIndex: 100
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={{
                  width: '30px',
                  height: '30px'
                }}
              />
            </div>
            <h1 style={{ margin: '2px 0px 0px 0px', fontSize: '20px', color: 'white' }}>
              SocialStar Partners
            </h1>
          </div>
          
          <button
            onClick={() => handleDashboard('login')}
            style={{
              fontSize: '16px',
              backgroundColor: 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, #10183C 0%, #1A2245 100%)',
        color: 'white',
        padding: '80px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ 
            fontSize: '48px',
            fontWeight: 'bold',
            marginBottom: '20px',
            lineHeight: '1.2'
          }}>
            Turn Your Instagram Stories Into Cash
          </h1>
          
          <p style={{ 
            fontSize: '22px',
            marginBottom: '20px',
            opacity: 0.9
          }}>
            Get paid every time your friends rate your story
          </p>

          <a
            href="#earnings-calculator"
            style={{
              display: 'inline-block',
              color: 'rgba(255,255,255,0.9)',
              textDecoration: 'underline',
              fontSize: '18px',
              fontWeight: 'bold',
              marginBottom: '20px',
              cursor: 'pointer',
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = 'white'}
            onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.9)'}
          >
            How Much Can I Make?
          </a>

          <br></br>

          <button
            onClick={() => handleDashboard('signup')}
            style={{
              padding: '20px 40px',
              backgroundColor: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Start Earning Now
          </button>
        </div>
      </section>

      {/* See It In Action */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#1A2245'
      }}>
        <div style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '20px',
            color: 'white'
          }}>
            See It In Action
          </h2>
          
          <p style={{ 
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '50px',
            maxWidth: '600px',
            margin: '0 auto 50px'
          }}>
            Here's exactly how it looks when you add a rating link to your story
          </p>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            marginBottom: '80px'
          }}>
            <div style={{

            }}>
              <h3 style={{ 
                fontSize: '24px',
                marginBottom: '20px',
                color: 'white'
              }}>
                Add Rating Link
              </h3>
              <div style={{

              }}>
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4128%202.PNG?alt=media&token=89ecbb80-8e3d-4c0a-9ed8-35552ccf70d0"
                  alt="Instagram story with rating link"
                  style={{
                    maxWidth: '250px',
                    height: 'auto',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>

            <div style={{

            }}>
              <h3 style={{ 
                fontSize: '24px',
                marginBottom: '20px',
                color: 'white'
              }}>
                Get Ratings
              </h3>
              <div style={{
  
              }}>
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/unnamed.png?alt=media&token=bb05e516-c903-4143-8ee4-035f6d0a0b15"
                  alt="Rating interface on mobile"
                  style={{
                    maxWidth: '250px',
                    height: 'auto',
                    borderRadius: '8px'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#10183C'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '20px',
            color: 'white'
          }}>
            How It Works
          </h2>

          <p style={{ 
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '50px',
            maxWidth: '600px',
            margin: '0 auto 50px'
          }}>
            Turn your story posts into income with 3 simple steps
          </p>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            marginBottom: '50px'
          }}>
            {[
              {
                step: '1',
                title: 'Create Rating Link',
                description: 'Sign up and generate a unique rating link for your Instagram or Snapchat story',
                icon: Link
              },
              {
                step: '2', 
                title: 'Add Link to Your Story',
                description: 'Share your content and add the rating link. Friends can rate it 1-5 stars',
                icon: CircleFadingPlus
              },
              {
                step: '3',
                title: 'Get Paid',
                description: 'Earn money every time you receive a rating. Money is tracked in real-time',
                icon: CircleDollarSign
              }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} style={{
                  backgroundColor: '#323862',
                  padding: '40px 30px',
                  borderRadius: '15px',
                  textAlign: 'center'
                }}>
                  <div style={{
                    marginBottom: '20px',
                    display: 'flex',
                    justifyContent: 'center'
                  }}>
                    <IconComponent 
                      size={48} 
                      color="#4169E1" 
                      strokeWidth={1.5}
                    />
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#4169E1',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {item.step}
                  </div>
                  <h3 style={{ 
                    fontSize: '20px',
                    marginBottom: '15px',
                    color: 'white'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ 
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: '1.6'
                  }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section id="earnings-calculator" style={{ 
        padding: '80px 20px',
        backgroundColor: '#1A2245'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '20px',
            color: 'white'
          }}>
            Calculate Your Potential Earnings
          </h2>
          
          <p style={{ 
            fontSize: '18px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '50px'
          }}>
            Now that you understand how it works, see how much you could earn based on your typical story engagement
          </p>

          <div style={{ 
            background: 'linear-gradient(135deg, #323862 0%, #3B4374 100%)',
            color: 'white',
            borderRadius: '20px',
            padding: '40px',
            marginBottom: '40px'
          }}>
            <h3 style={{ marginBottom: '25px', fontSize: '24px' }}>
              Earnings Calculator
            </h3>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '15px', fontSize: '18px' }}>
                How many ratings do you think you'll get per story?
              </label>
              
              {/* Custom Slider Container */}
              <div 
                style={{ 
                  position: 'relative', 
                  marginBottom: '15px',
                  padding: '15px 0',
                  cursor: 'pointer',
                  touchAction: 'none'
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const thumb = e.currentTarget.querySelector('[data-thumb]');
                  const track = e.currentTarget.querySelector('[data-track]');
                  
                  // Disable transitions during drag
                  thumb.style.transition = 'none';
                  track.style.transition = 'none';
                  
                  let animationId;
                  const updateValue = (clientX) => {
                    if (animationId) cancelAnimationFrame(animationId);
                    animationId = requestAnimationFrame(() => {
                      const x = clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      const newValue = Math.round((percentage * (1000 - 10) + 10) / 10) * 10;
                      setEstimatedRatings(newValue);
                    });
                  };
                  
                  updateValue(e.clientX);
                  
                  const handleMouseMove = (e) => updateValue(e.clientX);
                  const handleMouseUp = () => {
                    // Re-enable transitions
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
                  
                  // Disable transitions during drag
                  thumb.style.transition = 'none';
                  track.style.transition = 'none';
                  
                  let animationId;
                  const updateValue = (clientX) => {
                    if (animationId) cancelAnimationFrame(animationId);
                    animationId = requestAnimationFrame(() => {
                      const x = clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, x / rect.width));
                      const newValue = Math.round((percentage * (1000 - 10) + 10) / 10) * 10;
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
                    // Re-enable transitions
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
                      width: `${((estimatedRatings - 10) / (1000 - 10)) * 100}%`,
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
                    left: `calc(${((estimatedRatings - 10) / (1000 - 10)) * 100}% - 10px)`,
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
                  min="10"
                  max="1000"
                  step="10"
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
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                {estimatedRatings} ratings
              </div>
            </div>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '15px',
              padding: '25px'
            }}>
              <div>
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Story</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  ${(estimatedRatings * 0.02).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Week (7 stories)</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  ${(estimatedRatings * 0.02 * 7).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Month</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  ${(estimatedRatings * 0.02 * 7 * 4).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleDashboard('signup')}
            style={{
              padding: '18px 40px',
              background: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Start Earning ${(estimatedRatings * 0.02).toFixed(2)} Per Story
          </button>
        </div>
      </section>
      
      {/* Social Proof */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#10183C'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '50px',
            color: 'white'
          }}>
            Join Partners Already Earning
          </h2>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
            marginBottom: '50px'
          }}>
            {[
              { name: 'Sarah M.', earnings: '$840', stories: '84 stories', profilePicUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/ab303d043a6752eb7cd84e876d8473df.jpg?alt=media&token=f04af6a3-5810-43d9-94a5-c9e23f2936cc' },
              { name: 'Adam R.', earnings: '$120', stories: '30 stories', profilePicUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/2cd7110ecfc67073dedd2df843d51e4a.jpg?alt=media&token=2ec56d63-e822-463b-8bbf-55add7a05353' },
              { name: 'Toni W.', earnings: '$95', stories: '24 stories', profilePicUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/760021cb5694f81ebcc6755ab82458ed.jpg?alt=media&token=080fe6f7-2182-493d-befc-31fac793e627' },
              { name: 'Emma L.', earnings: '$530', stories: '67 stories', profilePicUrl: 'https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/f60206a67b75c9bdac4f5f7640d4ebde.jpg?alt=media&token=68a37d63-9049-492d-9d55-53d51c20c950' }
            ].map((creator, index) => (
              <div key={index} style={{
                backgroundColor: '#323862',
                padding: '30px',
                borderRadius: '12px',
                textAlign: 'center',
              }}>
                {creator.profilePicUrl ? (
                  <img 
                    src={creator.profilePicUrl} 
                    alt={creator.name} 
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      margin: '0 auto 15px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#4169E1',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 15px',
                    fontSize: '24px',
                    fontWeight: 'bold'
                  }}>
                    {creator.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>
                  {creator.name}
                </h4>
                <p style={{ 
                  margin: '0 0 5px 0',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#fff'
                }}>
                  {creator.earnings}
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  {creator.stories}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* FAQ */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#1A2245'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '36px',
            textAlign: 'center',
            marginBottom: '50px',
            color: 'white'
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            {[
              {
                q: 'When do I get paid?',
                a: 'Earnings are tracked in real-time. We process payouts weekly via direct bank transfer or PayPal.'
              },
              {
                q: 'How does SocialStar make money?',
                a: 'SocialStar makes money when people download our main SocialStar app after rating. You get paid for driving high-quality user acquisition.'
              },
              {
                q: 'What platforms does this work on?',
                a: 'Instagram Stories and Snapchat Stories.'
              }
            ].map((faq, index) => (
              <div key={index} style={{
                backgroundColor: '#323862',
                padding: '25px',
                borderRadius: '12px',
                border: '1px solid #3B4374'
              }}>
                <h4 style={{ 
                  color: 'white',
                  margin: '0 0 10px 0',
                  fontSize: '18px'
                }}>
                  {faq.q}
                </h4>
                <p style={{ 
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0',
                  lineHeight: '1.6'
                }}>
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ 
        padding: '80px 20px',
        background: '#4169E1',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '20px'
          }}>
            Ready to Start Earning?
          </h2>
          
          <p style={{ 
            fontSize: '18px',
            marginBottom: '40px',
            opacity: '0.9'
          }}>
            Join hundreds of partners already monetizing their story posts. 
            Free to start, no commitment required.
          </p>

          <button
            onClick={() => handleDashboard('signup')}
            style={{
              padding: '20px 40px',
              backgroundColor: 'white',
              color: '#4169E1',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Create Your First Rating Link
          </button>
          
          <p style={{ 
            marginTop: '20px',
            fontSize: '14px',
            opacity: '0.8'
          }}>
            Setup takes less than 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#10183C', color: 'white', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
            <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={{
                  width: '30px',
                  height: '30px'
                }}
              />
            </div>
            <div>
              <a 
                href="mailto:pingbearapp@gmail.com"
                style={{ 
                  fontSize: '16px',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textDecoration: 'none'
                }}
              >
                Contact
              </a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '30px', paddingTop: '20px', opacity: '0.6' }}>
            <p style={{ margin: '0' }}>
              © 2025 SocialStar. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;