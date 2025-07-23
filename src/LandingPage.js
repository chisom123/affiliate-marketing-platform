// SOCIALSTAR AFFILIATES LANDING PAGE
// Purpose: Convert visitors into affiliates, explain value proposition
// Features: Hero section, how it works, earnings calculator, social proof, FAQ

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [estimatedRatings, setEstimatedRatings] = useState(50);

  const handleGetStarted = (e) => {
    e.preventDefault();
    // Navigate to dashboard (which will show signup if not logged in)
    navigate('/dashboard');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      
      {/* Header */}
      <header style={{ 
        backgroundColor: 'white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '32px',
              height: '32px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              ⭐
            </div>
            <h1 style={{ margin: '0', fontSize: '24px', color: '#2c3e50' }}>
              SocialStar Affiliates
            </h1>
          </div>
          
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '8px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            marginBottom: '40px',
            opacity: 0.9
          }}>
            Earn £0.01 for every rating on your Instagram and Snapchat stories. 
            No followers required. Start earning today.
          </p>

          <div style={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '40px',
            backdropFilter: 'blur(10px)'
          }}>
            <h3 style={{ marginBottom: '15px', fontSize: '24px' }}>
              Quick Earnings Calculator
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>
                How many ratings do you think you'll get per story?
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={estimatedRatings}
                onChange={(e) => setEstimatedRatings(e.target.value)}
                style={{ width: '100%', marginBottom: '10px' }}
              />
              <div style={{ fontSize: '18px' }}>
                <strong>{estimatedRatings} ratings = £{(estimatedRatings * 0.01).toFixed(2)} per story</strong>
              </div>
            </div>
            <p style={{ margin: '0', opacity: '0.8' }}>
              Post 5 stories per week = <strong>£{(estimatedRatings * 0.01 * 5 * 4).toFixed(2)} per month</strong>
            </p>
          </div>

          <form onSubmit={handleGetStarted} style={{ 
            display: 'flex',
            gap: '15px',
            maxWidth: '500px',
            margin: '0 auto',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: '1',
                minWidth: '250px',
                padding: '15px 20px',
                border: 'none',
                borderRadius: '25px',
                fontSize: '16px'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '15px 30px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Start Earning Now
            </button>
          </form>
          
          <p style={{ 
            marginTop: '20px',
            fontSize: '14px',
            opacity: '0.8'
          }}>
            Free to join • No followers required • Instant payments
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '20px',
            color: '#2c3e50'
          }}>
            How It Works
          </h2>
          
          <p style={{ 
            fontSize: '18px',
            color: '#6c757d',
            marginBottom: '50px',
            maxWidth: '600px',
            margin: '0 auto 50px'
          }}>
            Turn your social content into income with 3 simple steps
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
                title: 'Create Your Rating Link',
                description: 'Sign up and generate a unique rating link for your Instagram or Snapchat story',
                icon: '🔗'
              },
              {
                step: '2', 
                title: 'Add Link to Your Story',
                description: 'Share your content and add the rating link. Friends can rate it 1-5 stars',
                icon: '📱'
              },
              {
                step: '3',
                title: 'Get Paid Instantly',
                description: 'Earn £0.01 for every rating you receive. Money is tracked in real-time',
                icon: '💰'
              }
            ].map((item, index) => (
              <div key={index} style={{
                backgroundColor: 'white',
                padding: '40px 30px',
                borderRadius: '15px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '20px'
                }}>
                  {item.icon}
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#007bff',
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
                  color: '#2c3e50'
                }}>
                  {item.title}
                </h3>
                <p style={{ 
                  color: '#6c757d',
                  lineHeight: '1.6'
                }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: 'white'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ 
            fontSize: '36px',
            marginBottom: '50px',
            color: '#2c3e50'
          }}>
            Join Creators Already Earning
          </h2>

          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '30px',
            marginBottom: '50px'
          }}>
            {[
              { name: 'Sarah M.', earnings: '£47.23', stories: '156 stories rated' },
              { name: 'Jake R.', earnings: '£32.10', stories: '89 stories rated' },
              { name: 'Emma L.', earnings: '£71.45', stories: '203 stories rated' }
            ].map((creator, index) => (
              <div key={index} style={{
                backgroundColor: '#f8f9fa',
                padding: '30px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#28a745',
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
                <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
                  {creator.name}
                </h4>
                <p style={{ 
                  margin: '0 0 5px 0',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  {creator.earnings}
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '14px',
                  color: '#6c757d'
                }}>
                  {creator.stories}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '40px',
            borderRadius: '15px',
            border: '2px solid #2196f3'
          }}>
            <h3 style={{ 
              color: '#1976d2',
              marginBottom: '15px',
              fontSize: '24px'
            }}>
              🚀 Limited Time: 2x Earnings!
            </h3>
            <p style={{ 
              color: '#1976d2',
              fontSize: '18px',
              margin: '0'
            }}>
              First 100 creators earn <strong>£0.02 per rating</strong> for their first month. 
              Join now before this offer ends!
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ 
        padding: '80px 20px',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ 
            fontSize: '36px',
            textAlign: 'center',
            marginBottom: '50px',
            color: '#2c3e50'
          }}>
            Frequently Asked Questions
          </h2>

          <div style={{ display: 'grid', gap: '20px' }}>
            {[
              {
                q: 'How much can I realistically earn?',
                a: 'Most creators earn £10-50 per month depending on their engagement. Active creators with engaged followers can earn £100+ monthly. You earn £0.01 per rating regardless of follower count.'
              },
              {
                q: 'When do I get paid?',
                a: 'Earnings are tracked in real-time. We process payouts weekly via PayPal for amounts over £5. No hidden fees or charges.'
              },
              {
                q: 'Do I need a minimum number of followers?',
                a: 'No! You can start earning immediately regardless of follower count. Even 10 engaged friends rating your stories can earn you money.'
              },
              {
                q: 'Is this legit? How do you make money?',
                a: 'Yes, completely legitimate. We make money when people download our main SocialStar app after rating. You get paid for driving high-quality user acquisition.'
              },
              {
                q: 'What platforms does this work on?',
                a: 'Instagram Stories, Snapchat Stories, and any platform where you can share links. The rating page works perfectly in all mobile browsers.'
              }
            ].map((faq, index) => (
              <div key={index} style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                <h4 style={{ 
                  color: '#2c3e50',
                  marginBottom: '10px',
                  fontSize: '18px'
                }}>
                  {faq.q}
                </h4>
                <p style={{ 
                  color: '#6c757d',
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
        background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
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
            Join hundreds of creators already monetizing their social content. 
            Free to start, no commitment required.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '20px 40px',
              backgroundColor: 'white',
              color: '#28a745',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
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
      <footer style={{ 
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0' }}>SocialStar Affiliates</h3>
              <p style={{ margin: '0', opacity: '0.8' }}>
                Turn your social content into cash
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
              <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Terms</a>
              <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Privacy</a>
              <a href="#" style={{ color: 'white', textDecoration: 'none' }}>Support</a>
            </div>
          </div>
          
          <div style={{ 
            borderTop: '1px solid rgba(255,255,255,0.2)',
            marginTop: '30px',
            paddingTop: '20px',
            opacity: '0.6'
          }}>
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