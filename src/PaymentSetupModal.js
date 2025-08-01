import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const PaymentSetupModal = ({ user, onClose, onPaymentInfoSaved }) => {
  const [formData, setFormData] = useState({
    // Personal Info
    fullName: '',
    email: user?.email || '',
    // Address
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    // Bank Details (US)
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking',
    // Bank Details (UK)
    sortCode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // US States with 2-letter codes (required for Wise)
  const US_STATES = [
    { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.address || !formData.city || !formData.postalCode) {
      return 'Please complete all address fields';
    }
    if (!formData.accountNumber) {
      return 'Please provide account number';
    }
    if (formData.country === 'US') {
      if (!formData.routingNumber) {
        return 'Please provide routing number';
      }
      if (formData.routingNumber.length !== 9) {
        return 'Routing number must be 9 digits';
      }
      if (!formData.state) {
        return 'Please select a state';
      }
    }
    if (formData.country === 'GB') {
      if (!formData.sortCode) {
        return 'Please provide sort code';
      }
      if (formData.sortCode.replace(/\D/g, '').length !== 6) {
        return 'Sort code must be 6 digits';
      }
    }
    return null;
  };

  const isFormValid = () => {
    if (!formData.fullName || !formData.address || !formData.city || !formData.postalCode) {
      return false;
    }
    if (!formData.accountNumber) {
      return false;
    }
    if (formData.country === 'US') {
      if (!formData.routingNumber || formData.routingNumber.length !== 9 || !formData.state) {
        return false;
      }
    }
    if (formData.country === 'GB') {
      if (!formData.sortCode || formData.sortCode.replace(/\D/g, '').length !== 6) {
        return false;
      }
    }
    return true;
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
      console.log('Saving payment info...', { uid: user?.uid, formData });
      
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const bankAccountData = formData.country === 'GB'
        ? {
            accountNumber: formData.accountNumber,
            sortCode: formData.sortCode.replace(/\D/g, '')
          }
        : {
            accountNumber: formData.accountNumber,
            routingNumber: formData.routingNumber,
            accountType: formData.accountType
          };

      const paymentData = {
        paymentInfo: {
          method: 'global_payouts',
          details: {
            fullName: formData.fullName,
            email: formData.email,
            country: formData.country,
            address: {
              line1: formData.address,
              city: formData.city,
              ...(formData.country === 'US' && formData.state && { state: formData.state }),
              postalCode: formData.postalCode,
              country: formData.country
            },
            bankAccount: bankAccountData
          },
          setupAt: new Date(),
          verified: false
        }
      };

      console.log('Payment data to save:', paymentData);
      await updateDoc(doc(db, 'affiliates', user.uid), paymentData);
      console.log('Payment info saved successfully');
      onPaymentInfoSaved();
      onClose();

    } catch (error) {
      console.error('Detailed error saving payment info:', error);
      setError(`Failed to save: ${error.message || 'Unknown error'}`);
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 24, 60, 0.95)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#1A2245',
          borderRadius: '5px',
          width: '100%',
          maxWidth: '560px',
          margin: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '32px 32px 24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              background: 'transparent',
              border: 'none',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              color: 'rgba(255,255,255,0.7)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}
          >
            ×
          </button>
          <br></br>
          
          <div style={{ textAlign: 'center', paddingRight: '0px' }}>
            
            <h2 style={{ 
              margin: '0 0 8px 0',
              color: 'white',
              fontSize: '24px',
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}>
              Setup Bank Account
            </h2>

          </div>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1,
          overflowY: 'auto',
          padding: '32px'
        }}>
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Country Selection */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: 'white',
                fontSize: '14px'
              }}>
                Country
              </label>
              <select
                value={formData.country}
                onChange={(e) => {
                  handleInputChange('country', e.target.value);
                  if (e.target.value !== 'US') {
                    handleInputChange('state', '');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '5px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4169E1';
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                  e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <option value="US">🇺🇸 United States</option>
              </select>
            </div>

            {/* Personal Information Section */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '5px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#4169E1" strokeWidth="2"/>
                  <circle cx="12" cy="7" r="4" stroke="#4169E1" strokeWidth="2"/>
                </svg>
                Personal Information
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Full Name */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    Full Name (as on bank account)
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '5px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>

                {/* Address */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '600',
                    color: 'white',
                    fontSize: '14px'
                  }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder={formData.country === 'GB' ? '123 High Street' : '123 Main Street'}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '5px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>

                {/* City, State/County, Postal Code */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: formData.country === 'US' ? '2fr 1fr 1fr' : '1fr 1fr', 
                  gap: '16px' 
                }} className="payment-grid-address">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '5px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                  
                  {formData.country === 'US' && (
                    <select
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '5px',
                        color: 'white',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#4169E1';
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                      }}
                    >
                      <option value="">State</option>
                      {US_STATES.map(state => (
                        <option key={state.code} value={state.code}>
                          {state.code} - {state.name}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder={formData.country === 'GB' ? 'SW1A 1AA' : '12345'}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '5px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#4169E1';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>
              </div>
            </div>
  
            {/* Bank Details Section */}
            <div style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: '5px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                color: 'white',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="#28a745" strokeWidth="2"/>
                  <line x1="1" y1="10" x2="23" y2="10" stroke="#28a745" strokeWidth="2"/>
                </svg>
                Bank Account Details
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {formData.country === 'US' ? (
                  // US Bank Fields
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }} className="payment-grid-bank">
                      <div>
                        <label style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontWeight: '600',
                          color: 'white',
                          fontSize: '14px'
                        }}>
                          Account Number
                        </label>
                        <input
                          type="text"
                          value={formData.accountNumber}
                          onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                          placeholder="123456789"
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '5px',
                            color: 'white',
                            fontSize: '15px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#4169E1';
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                          }}
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
                          Routing Number
                        </label>
                        <input
                          type="text"
                          value={formData.routingNumber}
                          onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                          placeholder="123456789"
                          maxLength="9"
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '5px',
                            color: 'white',
                            fontSize: '15px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s ease'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#4169E1';
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                            e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        Account Type
                      </label>
                      <select
                        value={formData.accountType}
                        onChange={(e) => handleInputChange('accountType', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '5px',
                          color: 'white',
                          fontSize: '15px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4169E1';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                        }}
                      >
                        <option value="checking">Checking Account</option>
                        <option value="savings">Savings Account</option>
                      </select>
                    </div>
                  </>
                ) : (
                  // UK Bank Fields
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }} className="payment-grid-bank">
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: '600',
                        color: 'white',
                        fontSize: '14px'
                      }}>
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                        placeholder="12345678"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '5px',
                          color: 'white',
                          fontSize: '15px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4169E1';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                        }}
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
                        Sort Code
                      </label>
                      <input
                        type="text"
                        value={formData.sortCode}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, '');
                          if (value.length >= 2) value = value.slice(0,2) + '-' + value.slice(2);
                          if (value.length >= 5) value = value.slice(0,5) + '-' + value.slice(5,7);
                          handleInputChange('sortCode', value);
                        }}
                        placeholder="12-34-56"
                        maxLength="8"
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: '5px',
                          color: 'white',
                          fontSize: '15px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#4169E1';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(255,255,255,0.12)';
                          e.target.style.backgroundColor = 'rgba(255,255,255,0.06)';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                color: '#ff6b7a',
                padding: '16px 20px',
                borderRadius: '5px',
                fontSize: '14px',
                border: '1px solid rgba(220, 53, 69, 0.2)',
                textAlign: 'center',
                lineHeight: '1.5'
              }}>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '24px 32px 32px 32px',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}>
          <button
            onClick={savePaymentInfo}
            disabled={loading || !isFormValid()}
            style={{
              width: '100%',
              padding: '16px 24px',
              backgroundColor: loading ? 'rgba(255,255,255,0.1)' : 
                            !isFormValid() ? 'rgba(255,255,255,0.1)' : '#28a745',
              color: loading ? 'rgba(255,255,255,0.5)' : 
                    !isFormValid() ? 'rgba(255,255,255,0.5)' : 'white',
              border: 'none',
              borderRadius: '200px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !isFormValid() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!loading && isFormValid()) {
                e.target.style.backgroundColor = '#218838';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && isFormValid()) {
                e.target.style.backgroundColor = '#28a745';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                Saving Bank Details...
              </>
            ) : (
              'Save Bank Details'
            )}
          </button>
        </div>

        {/* Styles */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          input::placeholder, select option {
            color: rgba(255,255,255,0.5);
          }
          
          @media (max-width: 640px) {
            .payment-modal-content {
              margin: 8px;
              border-radius: 20px;
            }
            .payment-modal-header {
              padding: 24px 24px 20px 24px;
            }
            .payment-modal-body {
              padding: 24px;
            }
            .payment-modal-footer {
              padding: 20px 24px 24px 24px;
            }
            .payment-grid-address {
              grid-template-columns: 1fr !important;
            }
            .payment-grid-bank {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default PaymentSetupModal;