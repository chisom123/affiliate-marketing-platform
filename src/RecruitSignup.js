import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  collection,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';

const RecruitSignup = () => {
  const { recruiterId } = useParams();
  const navigate = useNavigate();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [error, setError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterExists, setRecruiterExists] = useState(false);
  
  // Hover states
  const [hoverStates, setHoverStates] = useState({
    primaryButton: false,
    secondaryButton: false,
    appStoreButton: false,
    logoContainer: false,
    downloadButton: false
  });
  
  // After signup state
  const [userId, setUserId] = useState('');
  
  useEffect(() => {
    // Validate recruiter exists and get their name
    const validateRecruiter = async () => {
      try {
        setIsLoading(true);
        
        if (!recruiterId) {
          setError('Invalid recruiter link');
          setIsLoading(false);
          return;
        }
        
        // Fetch recruiter info from Firebase
        const recruiterDoc = await getDoc(doc(db, 'affiliates', recruiterId));
        
        if (!recruiterDoc.exists()) {
          setError('Invalid recruiter link');
          setRecruiterExists(false);
          setIsLoading(false);
          return;
        }
        
        const recruiterData = recruiterDoc.data();
        setRecruiterName(recruiterData.firstName || 'Your Friend');
        setRecruiterExists(true);
        
      } catch (err) {
        console.error('Error fetching recruiter:', err);
        setError('Failed to validate recruiter link');
        setRecruiterExists(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    validateRecruiter();
  }, [recruiterId]);
  
  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (!recruiterExists) {
      setError('Invalid recruiter link');
      return;
    }
    
    setIsSigningUp(true);
    setError('');
    
    try {
      // 1. Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = userCredential.user.uid;
      setUserId(newUserId);
      
      // 2. Create affiliate document in Firestore
      const affiliateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        recruitedBy: recruiterId, // Track who recruited them
        balance: 0.0,
        totalEarnings: 0.0,
        totalWithdrawn: 0.0,
        status: 'active',
        createdAt: serverTimestamp(),
        canCreateLinks: true,
      };
      
      await setDoc(doc(db, 'affiliates', newUserId), affiliateData);
      
      // 3. Add to recruiter's recruits subcollection
      const recruitData = {
        recruitId: newUserId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        joinedAt: serverTimestamp(),
        recruiterEarnings: 0.0,
        totalRatings: 0
      };
      
      await setDoc(doc(db, 'affiliates', recruiterId, 'recruits', newUserId), recruitData);
      
      // 4. Update recruiter's totalRecruits count
      await updateDoc(doc(db, 'affiliates', recruiterId), {
        totalRecruits: arrayUnion(newUserId)
      });
      
      // 5. Sign out the user (they'll sign in via app)
      await signOut(auth);
      
      // 6. Show success state
      setSignupSuccess(true);
      
    } catch (err) {
      console.error('Signup error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password');
      } else {
        setError('Signup failed. Please try again');
      }
    } finally {
      setIsSigningUp(false);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div 
              style={{
                ...styles.logoContainer,
                opacity: hoverStates.logoContainer ? 0.8 : 1
              }}
              onClick={() => navigate('/')}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, logoContainer: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, logoContainer: false }))}
            >
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={styles.logo}
              />
              <h1 style={styles.logoText}>SocialStar Partners</h1>
            </div>
          </div>
        </header>
        
        <div style={styles.authContainer}>
          <div style={styles.authCard}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #323862',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          input::placeholder {
            color: rgba(255,255,255,0.5);
          }
        `}</style>
      </div>
    );
  }
  
  // Error state (invalid recruiter link)
  if (error && !recruiterExists && !isLoading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div 
              style={{
                ...styles.logoContainer,
                opacity: hoverStates.logoContainer ? 0.8 : 1
              }}
              onClick={() => navigate('/')}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, logoContainer: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, logoContainer: false }))}
            >
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={styles.logo}
              />
              <h1 style={styles.logoText}>SocialStar Partners</h1>
            </div>
          </div>
        </header>
        
        <div style={styles.authContainer}>
          <div style={styles.authCard}>
            <h2 style={styles.title}>Invalid Link</h2>
            <p style={styles.errorText}>{error}</p>
            <button 
              onClick={() => navigate('/')} 
              style={{
                ...styles.primaryButton,
                transform: hoverStates.primaryButton ? 'translateY(-1px)' : 'translateY(0)',
                backgroundColor: hoverStates.primaryButton ? '#3557C7' : '#4169E1'
              }}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, primaryButton: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, primaryButton: false }))}
            >
              Go to Homepage
            </button>
          </div>
        </div>
        
        <style>{`input::placeholder { color: rgba(255,255,255,0.5); }`}</style>
      </div>
    );
  }
  
  // Success state (after signup)
  if (signupSuccess) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div 
              style={{
                ...styles.logoContainer,
                opacity: hoverStates.logoContainer ? 0.8 : 1
              }}
              onClick={() => navigate('/')}
              onMouseEnter={() => setHoverStates(prev => ({ ...prev, logoContainer: true }))}
              onMouseLeave={() => setHoverStates(prev => ({ ...prev, logoContainer: false }))}
            >
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
                alt="Star icon"
                style={styles.logo}
              />
              <h1 style={styles.logoText}>SocialStar Partners</h1>
            </div>
          </div>
        </header>
        
        <div style={styles.authContainer}>
          <div style={styles.authCard}>
            <h2 style={styles.title}>Account Created!</h2>
            <p style={styles.subtitle}>
              Your account has been created successfully
            </p>
            
            <div style={styles.successContent}>
              <h3 style={styles.successTitle}>Next Steps</h3>
              <ol style={styles.stepsList}>
                <li style={styles.step}>
                  <strong>Download Partner App</strong>
                  <p style={styles.stepDescription}>
                    Available on the App Store
                  </p>
                </li>
                <li style={styles.step}>
                  <strong>Sign In</strong>
                  <p style={styles.stepDescription}>
                    Use the email and password you just created
                  </p>
                </li>
                <li style={styles.step}>
                  <strong>Start Earning</strong>
                  <p style={styles.stepDescription}>
                    Post your first story and start earning!
                  </p>
                </li>
              </ol>
              
              <a
                href="https://apps.apple.com/us/app/socialstar-partners/id6751140592"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...styles.primaryButton,
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'block',
                  boxSizing: 'border-box', // Add this line
                  transform: hoverStates.downloadButton ? 'translateY(-1px)' : 'translateY(0)',
                  backgroundColor: hoverStates.downloadButton ? '#3557C7' : '#4169E1'
                }}
                onMouseEnter={() => setHoverStates(prev => ({ ...prev, downloadButton: true }))}
                onMouseLeave={() => setHoverStates(prev => ({ ...prev, downloadButton: false }))}
              >
                Continue
              </a>
            </div>
            
          </div>
        </div>
        
        <style>{`input::placeholder { color: rgba(255,255,255,0.5); }`}</style>
      </div>
    );
  }
  
  // Signup form (default state)
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div 
            style={{
              ...styles.logoContainer,
              opacity: hoverStates.logoContainer ? 0.8 : 1
            }}
            onClick={() => navigate('/')}
            onMouseEnter={() => setHoverStates(prev => ({ ...prev, logoContainer: true }))}
            onMouseLeave={() => setHoverStates(prev => ({ ...prev, logoContainer: false }))}
          >
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/ss-web-rate.firebasestorage.app/o/star-filled-fiveointed-shape-3.png?alt=media&token=a90a8c97-594c-49f0-82f0-a00519fbbd3a"
              alt="Star icon"
              style={styles.logo}
            />
            <h1 style={styles.logoText}>SocialStar Partners</h1>
          </div>
        </div>
      </header>
      
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={styles.headerSection}>
            <h2 style={styles.title}>Get Started</h2>
            <p style={styles.recruiterNote}>
              You're joining with <strong>{recruiterName}'s</strong> invite
            </p>
          </div>
          
          <form onSubmit={handleSignup} style={styles.form}>
            <div style={styles.nameRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                  style={styles.input}
                />
              </div>
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={styles.input}
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                minLength="6"
                required
                style={styles.input}
              />
            </div>
            
            {error && (
              <div style={styles.errorBox}>
                <p style={styles.errorText}>{error}</p>
              </div>
            )}
            
            <button 
              type="submit" 
              style={{
                ...(isSigningUp ? styles.loadingButton : styles.primaryButton),
                transform: hoverStates.primaryButton ? 'translateY(-1px)' : 'translateY(0)',
                backgroundColor: hoverStates.primaryButton && !isSigningUp ? '#3557C7' : 
                                 (isSigningUp ? '#666' : '#4169E1')
              }}
              disabled={isSigningUp}
              onMouseEnter={() => !isSigningUp && setHoverStates(prev => ({ ...prev, primaryButton: true }))}
              onMouseLeave={() => !isSigningUp && setHoverStates(prev => ({ ...prev, primaryButton: false }))}
            >
              {isSigningUp ? (
                <div style={styles.buttonLoading}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
            

          </form>
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#10183C',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    backgroundColor: '#1A2245'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '17px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease'
  },
  logo: {
    width: '30px',
    height: '30px'
  },
  logoText: {
    margin: '2px 0px 0px 0px',
    fontSize: '18px',
    color: 'white'
  },
  authContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px'
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#1A2245',
    borderRadius: '5px',
    padding: '40px'
  },
  headerSection: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    color: 'white',
    fontSize: '25px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    textAlign: 'center'
  },
  recruiterNote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '16px',
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '16px',
    margin: '0 0 32px 0',
    textAlign: 'center'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  nameRow: {
    display: 'flex',
    gap: '12px'
  },
  formGroup: {
    flex: 1
  },
  label: {
    display: 'block',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#323862',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '5px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box'
  },
  errorBox: {
    marginTop: '20px',
    padding: '12px 16px',
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    border: '1px solid rgba(220, 53, 69, 0.3)',
    borderRadius: '5px',
    textAlign: 'center'
  },
  errorText: {
    color: '#ff6b7a',
    fontSize: '14px',
    margin: 0
  },
  primaryButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#4169E1',
    color: 'white',
    border: 'none',
    borderRadius: '200px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '8px'
  },
  loadingButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '200px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    transition: 'all 0.2s ease',
    marginTop: '8px'
  },
  buttonLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    padding: '8px 0'
  },
  successContent: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '5px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  successTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 22px 0'
  },
  stepsList: {
    marginBottom: '30px',
    paddingLeft: '20px'
  },
  step: {
    marginBottom: '16px',
    fontSize: '16px',
    color: '#fff'
  },
  stepDescription: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '4px 0 0 0'
  },
  appStoreSection: {
    marginBottom: '24px'
  },
  appStoreButton: {
    display: 'block',
    backgroundColor: '#000000',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    marginBottom: '16px',
    transition: 'all 0.2s ease'
  },
  appStoreContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  appStoreIcon: {
    fontSize: '24px',
    marginRight: '12px'
  },
  appStoreText: {
    textAlign: 'left'
  },
  appStoreSmall: {
    fontSize: '10px',
    opacity: 0.8
  },
  appStoreLarge: {
    fontSize: '21px',
    fontWeight: '600'
  },
  emailNote: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    marginTop: '16px',
    textAlign: 'center'
  },
  secondaryButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '200px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export default RecruitSignup;