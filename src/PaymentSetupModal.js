// PAYMENT SETUP MODAL COMPONENT - UPDATED WITH DARK THEME
// Purpose: Collect affiliate payment information for manual payouts
// Features: PayPal email, bank details, validation, secure storage

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const PaymentSetupModal = ({ user, onClose, onPaymentInfoSaved }) => {
  const [paymentMethod, setPaymentMethod] = useState('paypal');
  const [formData, setFormData] = useState({
    // PayPal
    paypalEmail: '',
    
    // Bank Transfer
    bankName: '',
    accountNumber: '',
    sortCode: '', // UK
    routingNumber: '', // US
    accountHolderName: '',
    
    // Address for tax purposes
    fullName: '',
    address: '',
    city: '',
    postcode: '',
    country: 'UK'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (paymentMethod === 'paypal') {
      if (!formData.paypalEmail || !formData.paypalEmail.includes('@')) {
        return 'Please enter a valid PayPal email address';
      }
    } else if (paymentMethod === 'bank') {
      if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
        return 'Please fill in all required bank details';
      }
      if (formData.country === 'UK' && !formData.sortCode) {
        return 'Sort code is required for UK bank accounts';
      }
      if (formData.country === 'US' && !formData.routingNumber) {
        return 'Routing number is required for US bank accounts';
      }
    }
    
    if (!formData.fullName || !formData.address || !formData.city) {
      return 'Please complete your address information for tax purposes';
    }
    
    return null;
  };

  const savePaymentInfo = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Save payment information to affiliate document
      await updateDoc(doc(db, 'affiliates', user.uid), {
        paymentInfo: {
          method: paymentMethod,
          details: paymentMethod === 'paypal' ? {
            email: formData.paypalEmail
          } : {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            sortCode: formData.sortCode,
            routingNumber: formData.routingNumber,
            accountHolderName: formData.accountHolderName
          },
          address: {
            fullName: formData.fullName,
            address: formData.address,
            city: formData.city,
            postcode: formData.postcode,
            country: formData.country
          },
          setupAt: new Date(),
          verified: false // Will be verified by admin
        }
      });

      onPaymentInfoSaved();
      onClose();
    } catch (error) {
      console.error('Error saving payment info:', error);
      setError('Failed to save payment information. Please try again.');
    }

    setLoading(false);
  };

  // Handle click on the overlay background
  const handleOverlayClick = (e) => {
    // Check if the click is directly on the overlay (not a child element)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Prevent click inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleOverlayClick}
    >
      <div 
        style={{
          backgroundColor: '#323862',
          borderRadius: '20px',
          padding: '40px 30px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
        }}
        onClick={handleModalClick}
      >
        {/* Header */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <h2 style={{ 
            margin: '0 0 15px 0', 
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            💰 Setup Payment Information
          </h2>
          <p style={{ 
            margin: '0', 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            We need your payment details to send you earnings. All information is stored securely.
          </p>
        </div>

        {/* Payment Method Selection */}
        <div style={{ marginBottom: '35px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '15px', 
            fontWeight: '600',
            color: 'white',
            fontSize: '16px'
          }}>
            Payment Method:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={() => setPaymentMethod('paypal')}
              style={{
                flex: 1,
                padding: '20px 15px',
                border: `2px solid ${paymentMethod === 'paypal' ? '#4169E1' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                backgroundColor: paymentMethod === 'paypal' ? 'rgba(65, 105, 225, 0.1)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== 'paypal') {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== 'paypal') {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                color: paymentMethod === 'paypal' ? '#4169E1' : 'white',
                fontSize: '16px',
                marginBottom: '5px'
              }}>
                PayPal
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: paymentMethod === 'paypal' ? 'rgba(65, 105, 225, 0.8)' : 'rgba(255,255,255,0.6)'
              }}>
                Fastest & easiest
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('bank')}
              style={{
                flex: 1,
                padding: '20px 15px',
                border: `2px solid ${paymentMethod === 'bank' ? '#4169E1' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                backgroundColor: paymentMethod === 'bank' ? 'rgba(65, 105, 225, 0.1)' : 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                if (paymentMethod !== 'bank') {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (paymentMethod !== 'bank') {
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }
              }}
            >
              <div style={{ 
                fontWeight: 'bold', 
                color: paymentMethod === 'bank' ? '#4169E1' : 'white',
                fontSize: '16px',
                marginBottom: '5px'
              }}>
                Bank Transfer
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: paymentMethod === 'bank' ? 'rgba(65, 105, 225, 0.8)' : 'rgba(255,255,255,0.6)'
              }}>
                Direct to account
              </div>
            </button>
          </div>
        </div>

        {/* PayPal Form */}
        {paymentMethod === 'paypal' && (
          <div style={{ marginBottom: '35px' }}>
            <div style={{
              backgroundColor: 'rgba(65, 105, 225, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(65, 105, 225, 0.3)'
            }}>
              <p style={{ 
                margin: '0', 
                fontSize: '14px', 
                color: '#6B8AFF',
                lineHeight: '1.5'
              }}>
                💡 <strong>We pay via PayPal for fast, secure international transfers.</strong> Don't have PayPal? 
                Create a free account at <strong>paypal.com</strong> - it takes 2 minutes and works with any US bank account or debit card.
              </p>
            </div>
            
            <label style={{ 
              display: 'block', 
              marginBottom: '10px', 
              fontWeight: '600',
              color: 'white',
              fontSize: '14px'
            }}>
              PayPal Email Address:
            </label>
            <input
              type="email"
              value={formData.paypalEmail}
              onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
              placeholder="your-paypal@email.com"
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1A2245',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                fontSize: '16px',
                color: 'white',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4169E1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              }
            />
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '12px', 
              color: 'rgba(255,255,255,0.6)'
            }}>
              This must be the email address associated with your PayPal account
            </p>
          </div>
        )}

        {/* Bank Transfer Form */}
        {paymentMethod === 'bank' && (
          <div style={{ marginBottom: '35px' }}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>
                  Account Holder Name:
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                  placeholder="Full name on account"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#1A2245',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                  }
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'white',
                  fontSize: '14px'
                }}>
                  Bank Name:
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  placeholder="e.g. Barclays, HSBC, Chase"
                  style={{
                    width: '100%',
                    padding: '14px',
                    backgroundColor: '#1A2245',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '16px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                  }
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    Account Number:
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="12345678"
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1A2245',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    }
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    {formData.country === 'UK' ? 'Sort Code:' : 'Routing Number:'}
                  </label>
                  <input
                    type="text"
                    value={formData.country === 'UK' ? formData.sortCode : formData.routingNumber}
                    onChange={(e) => handleInputChange(
                      formData.country === 'UK' ? 'sortCode' : 'routingNumber', 
                      e.target.value
                    )}
                    placeholder={formData.country === 'UK' ? '12-34-56' : '123456789'}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1A2245',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Address Information */}
        <div style={{ marginBottom: '35px' }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: 'white',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Address Information
          </h4>
          <p style={{ 
            margin: '0 0 20px 0', 
            fontSize: '13px', 
            color: 'rgba(255,255,255,0.6)'
          }}>
            Required for tax reporting and payment verification
          </p>
          
          <div style={{ display: 'grid', gap: '20px' }}>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Full Legal Name"
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1A2245',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4169E1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              }
            />
            
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Street Address"
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1A2245',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4169E1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              }
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#1A2245',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                }
              />
              
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => handleInputChange('postcode', e.target.value)}
                placeholder="Postcode"
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#1A2245',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#4169E1'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                }
              />
            </div>

            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#1A2245',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4169E1'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              }
            >
              <option value="UK" style={{ backgroundColor: '#1A2245', color: 'white' }}>United Kingdom</option>
              <option value="US" style={{ backgroundColor: '#1A2245', color: 'white' }}>United States</option>
              <option value="CA" style={{ backgroundColor: '#1A2245', color: 'white' }}>Canada</option>
              <option value="AU" style={{ backgroundColor: '#1A2245', color: 'white' }}>Australia</option>
              <option value="other" style={{ backgroundColor: '#1A2245', color: 'white' }}>Other (contact support)</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            color: '#ff6b7a',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '25px',
            fontSize: '14px',
            border: '1px solid rgba(220, 53, 69, 0.3)',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <button
            onClick={savePaymentInfo}
            disabled={loading}
            style={{
              flex: 1,
              padding: '16px 20px',
              backgroundColor: loading ? '#666' : '#4169E1',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#3557C7';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#4169E1';
                e.target.style.transform = 'translateY(0px)';
              }
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Saving...
              </div>
            ) : (
              'Save Payment Info'
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '16px 20px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }
            }}
          >
            Cancel
          </button>
        </div>

        {/* Security Notice */}
        <div style={{
          padding: '20px',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderRadius: '12px',
          fontSize: '13px',
          color: '#28a745',
          border: '1px solid rgba(40, 167, 69, 0.3)',
          textAlign: 'center',
          lineHeight: '1.5'
        }}>
          🔒 <strong>Your information is stored securely</strong>
        </div>

        {/* Add CSS for loading animation */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input::placeholder, textarea::placeholder {
            color: rgba(255,255,255,0.5);
          }
        `}</style>
      </div>
    </div>
  );
};

export default PaymentSetupModal;