// PAYMENT SETUP MODAL COMPONENT
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>
            💰 Setup Payment Information
          </h2>
          <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
            We need your payment details to send you earnings. All information is stored securely.
          </p>
        </div>

        {/* Payment Method Selection */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Payment Method:
          </label>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={() => setPaymentMethod('paypal')}
              style={{
                flex: 1,
                padding: '15px',
                border: `2px solid ${paymentMethod === 'paypal' ? '#007bff' : '#dee2e6'}`,
                borderRadius: '8px',
                backgroundColor: paymentMethod === 'paypal' ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>PayPal</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Fastest & easiest</div>
            </button>
            <button
              onClick={() => setPaymentMethod('bank')}
              style={{
                flex: 1,
                padding: '15px',
                border: `2px solid ${paymentMethod === 'bank' ? '#007bff' : '#dee2e6'}`,
                borderRadius: '8px',
                backgroundColor: paymentMethod === 'bank' ? '#e3f2fd' : 'white',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 'bold' }}>Bank Transfer</div>
              <div style={{ fontSize: '12px', color: '#6c757d' }}>Direct to account</div>
            </button>
          </div>
        </div>

        {/* PayPal Form */}
        {paymentMethod === 'paypal' && (
          <div style={{ marginBottom: '25px' }}>
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px',
              border: '1px solid #2196f3'
            }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#1976d2' }}>
                💡 <strong>We pay via PayPal for fast, secure international transfers.</strong> Don't have PayPal? 
                Create a free account at <strong>paypal.com</strong> - it takes 2 minutes and works with any US bank account or debit card.
              </p>
            </div>
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              PayPal Email Address:
            </label>
            <input
              type="email"
              value={formData.paypalEmail}
              onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
              placeholder="your-paypal@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
              This must be the email address associated with your PayPal account
            </p>
          </div>
        )}

        {/* Bank Transfer Form */}
        {paymentMethod === 'bank' && (
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Account Holder Name:
                </label>
                <input
                  type="text"
                  value={formData.accountHolderName}
                  onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                  placeholder="Full name on account"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Bank Name:
                </label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  placeholder="e.g. Barclays, HSBC, Chase"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Account Number:
                  </label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                    placeholder="12345678"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
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
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Address Information */}
        <div style={{ marginBottom: '25px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>Address Information</h4>
          <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#6c757d' }}>
            Required for tax reporting and payment verification
          </p>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Full Legal Name"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px'
              }}
            />
            
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Street Address"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px'
              }}
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}
              />
              
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => handleInputChange('postcode', e.target.value)}
                placeholder="Postcode"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px'
                }}
              />
            </div>

            <select
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #dee2e6',
                borderRadius: '6px'
              }}
            >
              <option value="UK">United Kingdom</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="other">Other (contact support)</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <button
            onClick={savePaymentInfo}
            disabled={loading}
            style={{
              flex: 1,
              padding: '15px',
              backgroundColor: loading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : 'Save Payment Info'}
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '15px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#155724'
        }}>
          🔒 <strong>Your information is secure:</strong> All payment details are encrypted and stored securely. 
          We only use this information to send you earnings.
        </div>
      </div>
    </div>
  );
};

export default PaymentSetupModal;