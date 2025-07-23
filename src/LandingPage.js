import React, { useState } from 'react';

const LandingPage = () => {
  const [estimatedRatings, setEstimatedRatings] = useState(50);

  const handleGetStarted = () => {
    // In a real app, this would navigate to dashboard
    alert('In a real app, this would navigate to the dashboard!');
  };

  const handleDashboard = () => {
    // In a real app, this would navigate to dashboard
    alert('In a real app, this would navigate to the dashboard!');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      
      {/* Header */}
      <header style={{ 
        backgroundColor: '#1A2245',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
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
            onClick={handleDashboard}
            style={{
              padding: '8px 20px',
              backgroundColor: '#4169E1',
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
            marginBottom: '40px',
            opacity: 0.9
          }}>
            Earn £0.01 for every rating on your Instagram and Snapchat stories. 
            No followers required. Start earning today.
          </p>

          <button
            onClick={handleGetStarted}
            style={{
              padding: '20px 40px',
              backgroundColor: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(65, 105, 225, 0.3)'
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
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
              backgroundColor: '#323862',
              padding: '30px',
              borderRadius: '15px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '24px',
                marginBottom: '20px',
                color: 'white'
              }}>
                1. Your Instagram Story
              </h3>
              <div style={{
                backgroundColor: '#1A2245',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4128%202.PNG?alt=media&token=89ecbb80-8e3d-4c0a-9ed8-35552ccf70d0"
                  alt="Instagram story with rating link"
                  style={{
                    maxWidth: '200px',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
                  }}
                />
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)',
                lineHeight: '1.6'
              }}>
                Add your rating link to any Instagram story. Friends see your content with an easy "Rate this" button.
              </p>
            </div>

            <div style={{
              backgroundColor: '#323862',
              padding: '30px',
              borderRadius: '15px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '24px',
                marginBottom: '20px',
                color: 'white'
              }}>
                2. They Rate Your Story
              </h3>
              <div style={{
                backgroundColor: '#1A2245',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/IMG_4145.PNG?alt=media&token=5ab1a099-0799-4b89-9b95-ffcafd9467ea"
                  alt="Rating interface on mobile"
                  style={{
                    maxWidth: '200px',
                    height: 'auto',
                    borderRadius: '8px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
                  }}
                />
              </div>
              <p style={{ 
                color: 'rgba(255,255,255,0.8)',
                lineHeight: '1.6'
              }}>
                When they tap the link, they see this simple rating screen. One tap = £0.01 in your pocket!
              </p>
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
                backgroundColor: '#323862',
                padding: '40px 30px',
                borderRadius: '15px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
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
            ))}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section style={{ 
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
              Your Earnings Calculator
            </h3>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '15px', fontSize: '18px' }}>
                How many ratings do you think you'll get per story?
              </label>
              <input
                type="range"
                min="10"
                max="200"
                value={estimatedRatings}
                onChange={(e) => setEstimatedRatings(e.target.value)}
                style={{ 
                  width: '100%', 
                  marginBottom: '15px',
                  height: '8px',
                  borderRadius: '4px'
                }}
              />
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                {estimatedRatings} ratings = £{(estimatedRatings * 0.01).toFixed(2)} per story
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
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Week (5 stories)</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  £{(estimatedRatings * 0.01 * 5).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Month</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  £{(estimatedRatings * 0.01 * 5 * 4).toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '18px', opacity: '0.9' }}>Per Year</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
                  £{(estimatedRatings * 0.01 * 5 * 52).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleDashboard}
            style={{
              padding: '18px 40px',
              background: '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(65, 105, 225, 0.3)'
            }}
          >
            Start Earning £{(estimatedRatings * 0.01).toFixed(2)} Per Story
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
                backgroundColor: '#323862',
                padding: '30px',
                borderRadius: '12px',
                textAlign: 'center',
                boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
              }}>
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
                <h4 style={{ margin: '0 0 10px 0', color: 'white' }}>
                  {creator.name}
                </h4>
                <p style={{ 
                  margin: '0 0 5px 0',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: '#4169E1'
                }}>
                  {creator.earnings}
                </p>
                <p style={{ 
                  margin: '0',
                  fontSize: '14px',
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
                backgroundColor: '#323862',
                padding: '25px',
                borderRadius: '12px',
                border: '1px solid #3B4374'
              }}>
                <h4 style={{ 
                  color: 'white',
                  marginBottom: '10px',
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
        background: 'linear-gradient(135deg, #4169E1 0%, #3B4374 100%)',
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
            onClick={handleDashboard}
            style={{
              padding: '20px 40px',
              backgroundColor: 'white',
              color: '#4169E1',
              border: 'none',
              borderRadius: '30px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 5px 15px rgba(0,0,0,0.3)'
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
        backgroundColor: '#10183C',
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