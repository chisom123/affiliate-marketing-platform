// PAYMENT SETUP MODAL COMPONENT - BANK TRANSFER ONLY
// Purpose: Collect affiliate bank transfer information for manual payouts
// Features: Bank details, validation, secure storage

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const PaymentSetupModal = ({ user, onClose, onPaymentInfoSaved }) => {
  const [formData, setFormData] = useState({
    // Bank Transfer
    bankName: '',
    accountNumber: '',
    sortCode: '', // UK
    routingNumber: '', // US
    accountType: 'checking', // US - checking or savings
    accountHolderName: '',
    
    // Address for tax purposes
    fullName: '',
    address: '',
    city: '',
    postcode: '',
    country: 'US'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [accountTypeDropdownOpen, setAccountTypeDropdownOpen] = useState(false);

  const countryOptions = [
    { value: 'US', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'CA', label: 'Canada' },
    { value: 'AU', label: 'Australia' },
    { value: 'other', label: 'Other (contact support)' }
  ];

  const accountTypeOptions = [
    { value: 'checking', label: 'Checking Account' },
    { value: 'savings', label: 'Savings Account' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Custom dropdown component
  const CustomDropdown = ({ value, options, onChange, placeholder, isOpen, setIsOpen }) => {
    const selectedOption = options.find(option => option.value === value);
    
    return (
      <div style={{ position: 'relative' }} data-dropdown>
        <div
          onClick={() => setIsOpen(!isOpen)}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#1A2245',
            border: `1px solid ${isOpen ? '#4169E1' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '10px',
            color: 'white',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            if (!isOpen) {
              e.target.style.borderColor = '#4169E1';
            }
          }}
          onMouseLeave={(e) => {
            if (!isOpen) {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)';
            }
          }}
        >
          <span style={{ color: selectedOption ? 'white' : 'rgba(255,255,255,0.5)' }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            style={{ 
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#1A2245',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '10px',
            marginTop: '4px',
            zIndex: 1000,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            {options.map((option, index) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '14px',
                  cursor: 'pointer',
                  borderBottom: index < options.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  backgroundColor: value === option.value ? 'rgba(65, 105, 225, 0.1)' : 'transparent',
                  color: value === option.value ? '#4169E1' : 'white',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (value !== option.value) {
                    e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option.value) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const validateForm = () => {
    // Bank details validation
    if (!formData.bankName || !formData.accountNumber || !formData.accountHolderName) {
      return 'Please fill in all required bank details';
    }
    
    // Country-specific banking requirements
    if (!formData.country) {
      return 'Please select your country';
    }
    
    if (formData.country === 'UK' && !formData.sortCode) {
      return 'Sort code is required for UK bank accounts';
    }
    
    if (formData.country === 'US') {
      if (!formData.routingNumber) {
        return 'Routing number is required for US bank accounts';
      }
      if (!formData.accountType) {
        return 'Please select your account type';
      }
    }
    
    // Address validation - all fields should be required for tax/legal purposes
    if (!formData.fullName || !formData.address || !formData.city || !formData.postcode) {
      return 'Please complete all address fields for tax reporting and payment verification';
    }
    
    // Additional validation for specific countries if needed
    if (formData.country === 'other') {
      return 'Please contact support to set up payments for your country';
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
          method: 'bank',
          details: {
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            sortCode: formData.sortCode,
            routingNumber: formData.routingNumber,
            accountType: formData.accountType,
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
      // Close any open dropdowns first
      setCountryDropdownOpen(false);
      setAccountTypeDropdownOpen(false);
      onClose();
    }
  };

  // Prevent click inside the modal from closing it
  const handleModalClick = (e) => {
    e.stopPropagation();
    // Close dropdowns when clicking elsewhere in the modal
    if (!e.target.closest('[data-dropdown]')) {
      setCountryDropdownOpen(false);
      setAccountTypeDropdownOpen(false);
    }
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
        padding: '60px 20px'
      }}
      onClick={handleOverlayClick}
    >
      <div 
        style={{
          backgroundColor: '#323862',
          borderRadius: '20px',
          padding: '40px 15px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)'
        }}
        onClick={handleModalClick}
      >
        {/* Header */}
        <div style={{ marginBottom: '30px', textAlign: 'center', position: 'relative' }}>
          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              position: 'absolute',
              top: '-10px',
              right: '0px',
              width: '32px',
              height: '32px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              padding: '0'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'scale(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <br></br>
          <h2 style={{ 
            margin: '10px 0 15px 0', 
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
          Setup Bank Transfer
          </h2>
          <p style={{ 
            margin: '0', 
            color: 'rgba(255,255,255,0.7)', 
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            We need your bank details to send you earnings. All information is stored securely.
          </p>
        </div>

        {/* Bank Transfer Form */}
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
                Account Holder Name
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
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="e.g. Chase, Barclays, HSBC"
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
                  Account Number
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
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}>
                  {formData.country === 'UK' ? 'Sort Code' : 'Routing No'}
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

            {/* Account Type - US only */}
            {formData.country === 'US' && (
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
                <CustomDropdown
                  value={formData.accountType}
                  options={accountTypeOptions}
                  onChange={(value) => handleInputChange('accountType', value)}
                  placeholder="Select account type"
                  isOpen={accountTypeDropdownOpen}
                  setIsOpen={setAccountTypeDropdownOpen}
                />
              </div>
            )}
          </div>
        </div>

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
                placeholder={formData.country === 'UK' ? 'Postcode' : 'Zip Code'}
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

            <CustomDropdown
              value={formData.country}
              options={countryOptions}
              onChange={(value) => handleInputChange('country', value)}
              placeholder="Select country"
              isOpen={countryDropdownOpen}
              setIsOpen={setCountryDropdownOpen}
            />
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

        {/* Action Button */}
        <div style={{ marginBottom: '25px' }}>
          <button
            onClick={savePaymentInfo}
            disabled={loading}
            style={{
              width: '100%',
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
              'Save Bank Details'
            )}
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
        <strong>Your information is stored securely</strong>
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