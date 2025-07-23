// ADMIN PANEL COMPONENT - COMPLETE WITH PAYMENT PROCESSING
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit,
    where,
    doc,
    updateDoc,
    onSnapshot,
    addDoc,
    arrayUnion  // ADD THIS
  } from 'firebase/firestore';

const AdminPanel = () => {
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalRatings: 0,
    totalEarnings: 0,
    totalRevenue: 0,
    activeLinks: 0
  });
  
  const [affiliates, setAffiliates] = useState([]);
  const [recentRatings, setRecentRatings] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      try {
        // Get all affiliates
        const affiliatesQuery = query(collection(db, 'affiliates'), orderBy('createdAt', 'desc'));
        const affiliatesSnapshot = await getDocs(affiliatesQuery);
        const affiliatesData = affiliatesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAffiliates(affiliatesData);
  
        // Get recent ratings
        const ratingsQuery = query(
          collection(db, 'ratings'), 
          orderBy('createdAt', 'desc'), 
          limit(50)
        );
        const ratingsSnapshot = await getDocs(ratingsQuery);
        const ratingsData = ratingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentRatings(ratingsData);
  
        // ADD THIS: Load suspicious activity from the new collection
        const suspiciousQuery = query(
          collection(db, 'suspicious_activity'), 
          orderBy('timestamp', 'desc'), 
          limit(50)
        );
        const suspiciousSnapshot = await getDocs(suspiciousQuery);
        const suspiciousData = suspiciousSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSuspiciousActivity(suspiciousData);
  
        // Get rating links
        const linksSnapshot = await getDocs(collection(db, 'rating_links'));
        const linksData = linksSnapshot.docs.map(doc => doc.data());
  
        // Calculate stats
        const totalAffiliates = affiliatesData.length;
        const totalRatings = ratingsData.length;
        const totalEarnings = affiliatesData.reduce((sum, affiliate) => sum + (affiliate.totalEarnings || 0), 0);
        const activeLinks = linksData.filter(link => link.status === 'active').length;
  
        setStats({
          totalAffiliates,
          totalRatings,
          totalEarnings,
          totalRevenue: totalEarnings,
          activeLinks
        });
  
      } catch (error) {
        console.error('Error loading admin data:', error);
      }
      
      setLoading(false);
    };
  
    loadAdminData();
  }, []);

  // Get eligible affiliates for payout
  const getEligibleAffiliates = () => {
    return affiliates.filter(affiliate => 
      affiliate.totalEarnings >= 5 && 
      affiliate.status === 'active' &&
      affiliate.paymentInfo // Must have payment info set up
    );
  };

  // Group affiliates by payment method
  const groupAffiliatesByPaymentMethod = (eligibleAffiliates) => {
    const paypalAffiliates = eligibleAffiliates.filter(a => a.paymentInfo?.method === 'paypal');
    const bankAffiliates = eligibleAffiliates.filter(a => a.paymentInfo?.method === 'bank');
    
    return { paypalAffiliates, bankAffiliates };
  };

  // Suspend affiliate
  const suspendAffiliate = async (affiliateId) => {
    if (window.confirm('Are you sure you want to suspend this affiliate?')) {
      try {
        await updateDoc(doc(db, 'affiliates', affiliateId), {
          status: 'suspended',
          suspendedAt: new Date()
        });
        
        setAffiliates(affiliates.map(affiliate => 
          affiliate.id === affiliateId 
            ? { ...affiliate, status: 'suspended' }
            : affiliate
        ));
        
        alert('Affiliate suspended successfully');
      } catch (error) {
        alert('Error suspending affiliate: ' + error.message);
      }
    }
  };

// Payout Modal Component - UPDATED WITH DATABASE OPERATIONS
const PayoutModal = () => {
    const [processing, setProcessing] = useState(false);
    const eligibleAffiliates = getEligibleAffiliates();
    const { paypalAffiliates, bankAffiliates } = groupAffiliatesByPaymentMethod(eligibleAffiliates);
    
    const paypalTotal = paypalAffiliates.reduce((sum, a) => sum + a.totalEarnings, 0);
    const bankTotal = bankAffiliates.reduce((sum, a) => sum + a.totalEarnings, 0);

    // Process PayPal payments
    const processPayPalPayments = async () => {
      if (!window.confirm(`Mark ${paypalAffiliates.length} PayPal payments as processed?`)) return;
      
      setProcessing(true);
      try {
        // Create payout batch record
        const payoutBatch = {
          batchId: `paypal_${Date.now()}`,
          processedBy: 'admin',
          processedAt: new Date(),
          totalAmount: paypalTotal,
          affiliatesCount: paypalAffiliates.length,
          paymentMethod: 'paypal',
          status: 'completed',
          affiliates: paypalAffiliates.map(a => ({
            id: a.id,
            name: a.name,
            email: a.paymentInfo.details.email,
            amount: a.totalEarnings
          }))
        };
        
        await addDoc(collection(db, 'payouts'), payoutBatch);

        // Update each affiliate
        for (const affiliate of paypalAffiliates) {
          await updateDoc(doc(db, 'affiliates', affiliate.id), {
            totalEarnings: 0, // Reset balance
            lastPayoutAmount: affiliate.totalEarnings,
            lastPayoutDate: new Date(),
            payoutHistory: arrayUnion({
              batchId: payoutBatch.batchId,
              amount: affiliate.totalEarnings,
              method: 'paypal',
              processedAt: new Date(),
              status: 'completed'
            })
          });
        }

        alert(`✅ ${paypalAffiliates.length} PayPal payments processed successfully!`);
        setShowPayoutModal(false);
        
        // Refresh data
        window.location.reload();
        
      } catch (error) {
        alert('Error processing PayPal payments: ' + error.message);
      }
      setProcessing(false);
    };

    // Process bank transfers
    const processBankTransfers = async () => {
      if (!window.confirm(`Mark ${bankAffiliates.length} bank transfers as processed?`)) return;
      
      setProcessing(true);
      try {
        // Create payout batch record
        const payoutBatch = {
          batchId: `wise_${Date.now()}`,
          processedBy: 'admin',
          processedAt: new Date(),
          totalAmount: bankTotal,
          affiliatesCount: bankAffiliates.length,
          paymentMethod: 'bank_transfer',
          status: 'completed',
          affiliates: bankAffiliates.map(a => ({
            id: a.id,
            name: a.name,
            bankName: a.paymentInfo.details.bankName,
            accountHolder: a.paymentInfo.details.accountHolderName,
            amount: a.totalEarnings
          }))
        };
        
        await addDoc(collection(db, 'payouts'), payoutBatch);

        // Update each affiliate
        for (const affiliate of bankAffiliates) {
          await updateDoc(doc(db, 'affiliates', affiliate.id), {
            totalEarnings: 0, // Reset balance
            lastPayoutAmount: affiliate.totalEarnings,
            lastPayoutDate: new Date(),
            payoutHistory: arrayUnion({
              batchId: payoutBatch.batchId,
              amount: affiliate.totalEarnings,
              method: 'bank_transfer',
              processedAt: new Date(),
              status: 'completed'
            })
          });
        }

        alert(`✅ ${bankAffiliates.length} bank transfers processed successfully!`);
        setShowPayoutModal(false);
        
        // Refresh data
        window.location.reload();
        
      } catch (error) {
        alert('Error processing bank transfers: ' + error.message);
      }
      setProcessing(false);
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
            💰 Process Payouts
          </h2>

          {eligibleAffiliates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>
                No affiliates eligible for payout
              </p>
              <p style={{ color: '#6c757d' }}>
                Minimum £5 earnings required
              </p>
            </div>
          ) : (
            <div>
              {/* PayPal Payments */}
              {paypalAffiliates.length > 0 && (
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  border: '1px solid #2196f3'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>
                    💙 PayPal Payments ({paypalAffiliates.length} affiliates)
                  </h3>
                  <p style={{ margin: '0 0 15px 0', color: '#1976d2' }}>
                    Total: £{paypalTotal.toFixed(2)}
                  </p>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Recipients:</h4>
                    {paypalAffiliates.map(affiliate => (
                      <div key={affiliate.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        fontSize: '12px'
                      }}>
                        <span>{affiliate.paymentInfo.details.email}</span>
                        <span>£{affiliate.totalEarnings.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    backgroundColor: 'white',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Instructions:</h4>
                    <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
                      <li>Log into your PayPal business account</li>
                      <li>Go to "Send & Request" → "Send money to friends/family"</li>
                      <li>Send individual payments to each email above</li>
                      <li>Use note: "SocialStar affiliate earnings"</li>
                      <li>Click "Mark as Processed" below when complete</li>
                    </ol>
                  </div>

                  <button
                    onClick={processPayPalPayments}
                    disabled={processing}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: processing ? '#6c757d' : '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: processing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {processing ? 'Processing...' : 'Mark PayPal Payments as Processed'}
                  </button>
                </div>
              )}

              {/* Bank Transfers */}
              {bankAffiliates.length > 0 && (
                <div style={{ 
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#e8f5e8',
                  borderRadius: '8px',
                  border: '1px solid #28a745'
                }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#155724' }}>
                    🏦 Bank Transfers via Wise ({bankAffiliates.length} affiliates)
                  </h3>
                  <p style={{ margin: '0 0 15px 0', color: '#155724' }}>
                    Total: £{bankTotal.toFixed(2)} (~${(bankTotal * 1.27).toFixed(2)} USD)
                  </p>
                  
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Recipients:</h4>
                    {bankAffiliates.map(affiliate => (
                      <div key={affiliate.id} style={{ 
                        marginBottom: '10px',
                        padding: '10px',
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {affiliate.paymentInfo.details.accountHolderName}
                        </div>
                        <div>
                          {affiliate.paymentInfo.details.bankName} - 
                          {affiliate.paymentInfo.details.accountNumber.slice(-4)}
                        </div>
                        <div>
                          Routing: {affiliate.paymentInfo.details.routingNumber} - 
                          £{affiliate.totalEarnings.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    backgroundColor: 'white',
                    padding: '15px',
                    borderRadius: '6px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Instructions:</h4>
                    <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
                      <li>Log into your Wise business account</li>
                      <li>Create batch payment to USD (United States)</li>
                      <li>Upload recipient details or enter manually</li>
                      <li>Review exchange rate (usually ~£1 = $1.27)</li>
                      <li>Total fee: ~£3-5 per batch (not per recipient)</li>
                      <li>Click "Mark as Processed" when sent</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => window.open('https://wise.com/gb/business/', '_blank')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Open Wise
                    </button>
                    
                    <button
                      onClick={processBankTransfers}
                      disabled={processing}
                      style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: processing ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: processing ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {processing ? 'Processing...' : 'Mark as Processed'}
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div style={{ 
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                <h4 style={{ margin: '0 0 10px 0' }}>Payout Summary</h4>
                <p style={{ margin: '0', fontSize: '14px' }}>
                  <strong>Total Affiliates:</strong> {eligibleAffiliates.length} <br/>
                  <strong>Total Amount:</strong> £{(paypalTotal + bankTotal).toFixed(2)} <br/>
                  <strong>Est. Fees:</strong> £{(paypalAffiliates.length * 0.5 + 4).toFixed(2)} <br/>
                  <strong>Payment Methods:</strong> {paypalAffiliates.length} PayPal, {bankAffiliates.length} Bank
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowPayoutModal(false)}
            disabled={processing}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif'
      }}>
        Loading admin panel...
      </div>
    );
  }

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0' }}>SocialStar Admin Panel</h1>
          <p style={{ margin: '5px 0 0 0', opacity: '0.8' }}>
            System monitoring and payment processing
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ 
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6'
      }}>
        <div style={{ 
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '0'
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'affiliates', label: 'Affiliates' },
            { id: 'payouts', label: 'Payout History' },
            { id: 'ratings', label: 'Recent Ratings' },
            { id: 'fraud', label: 'Fraud Detection' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              style={{
                padding: '15px 25px',
                border: 'none',
                backgroundColor: selectedTab === tab.id ? '#007bff' : 'transparent',
                color: selectedTab === tab.id ? 'white' : '#495057',
                cursor: 'pointer',
                borderBottom: selectedTab === tab.id ? '3px solid #007bff' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Affiliates</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
                  {stats.totalAffiliates}
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Ratings</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#28a745' }}>
                  {stats.totalRatings}
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Earnings Owed</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                  £{stats.totalEarnings.toFixed(2)}
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Eligible for Payout</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#ffc107' }}>
                  {getEligibleAffiliates().length}
                </p>
              </div>
            </div>

            {/* Payment Processing Section */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>Payment Processing</h3>
              
              {getEligibleAffiliates().length === 0 ? (
                <p style={{ color: '#6c757d', margin: '0' }}>
                  No affiliates ready for payout (minimum £5 required)
                </p>
              ) : (
                <div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '15px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#e3f2fd',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1976d2' }}>
                        {groupAffiliatesByPaymentMethod(getEligibleAffiliates()).paypalAffiliates.length}
                      </div>
                      <div style={{ fontSize: '12px', color: '#1976d2' }}>PayPal Payments</div>
                    </div>
                    
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '6px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#155724' }}>
                        {groupAffiliatesByPaymentMethod(getEligibleAffiliates()).bankAffiliates.length}
                      </div>
                      <div style={{ fontSize: '12px', color: '#155724' }}>Bank Transfers</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPayoutModal(true)}
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Process All Payouts ({getEligibleAffiliates().length} affiliates)
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>Quick Actions</h3>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedTab('fraud')}
                  style={{
                    padding: '12px 25px',
                    backgroundColor: suspiciousActivity.length > 0 ? '#dc3545' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Review Suspicious Activity ({suspiciousActivity.length})
                </button>

                <button
                  onClick={() => window.open('https://console.firebase.google.com', '_blank')}
                  style={{
                    padding: '12px 25px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Firebase Console
                </button>

                <button
                  onClick={() => window.open('https://wise.com/gb/business/', '_blank')}
                  style={{
                    padding: '12px 25px',
                    backgroundColor: '#00b9ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Open Wise
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>Recent Activity</h3>
              
              {recentRatings.slice(0, 5).map((rating, index) => (
                <div key={index} style={{ 
                  padding: '15px',
                  borderBottom: index < 4 ? '1px solid #eee' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                      {rating.rating} star rating
                    </p>
                    <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                      Affiliate: {rating.affiliateId?.substring(0, 8)}... • 
                      Earnings: £{(rating.earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                      {rating.createdAt?.toDate?.()?.toLocaleString() || 'Recent'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Affiliates Tab */}
        {selectedTab === 'affiliates' && (
        <div>
            <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
            }}>
            <h2 style={{ margin: '0', color: '#495057' }}>All Affiliates</h2>
            <p style={{ margin: '0', color: '#6c757d' }}>
                {affiliates.length} total • {getEligibleAffiliates().length} ready for payout
            </p>
            </div>

            <div style={{ 
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            overflow: 'hidden'
            }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Affiliate
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Ratings
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Current Balance
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Payment Method
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Last Payout
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Status
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Actions
                    </th>
                </tr>
                </thead>
                <tbody>
                {affiliates.map((affiliate, index) => (
                    <tr key={affiliate.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '15px' }}>
                        <div>
                        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                            {affiliate.name || 'Unknown'}
                        </p>
                        <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                            {affiliate.email}
                        </p>
                        <p style={{ margin: '0', fontSize: '10px', color: '#adb5bd' }}>
                            ID: {affiliate.id.substring(0, 8)}...
                        </p>
                        </div>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        <strong>{affiliate.totalRatings || 0}</strong>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        <strong style={{ 
                        color: (affiliate.totalEarnings || 0) >= 5 ? '#28a745' : '#6c757d'
                        }}>
                        £{(affiliate.totalEarnings || 0).toFixed(2)}
                        </strong>
                        {affiliate.payoutHistory && affiliate.payoutHistory.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                            Total paid: £{affiliate.payoutHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                        </div>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        {affiliate.paymentInfo ? (
                        <div>
                            <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: affiliate.paymentInfo.method === 'paypal' ? '#e3f2fd' : '#e8f5e8',
                            color: affiliate.paymentInfo.method === 'paypal' ? '#1976d2' : '#155724'
                            }}>
                            {affiliate.paymentInfo.method === 'paypal' ? '💙 PayPal' : '🏦 Bank'}
                            </span>
                            <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                            {affiliate.paymentInfo.method === 'paypal' 
                                ? affiliate.paymentInfo.details.email.substring(0, 15) + '...'
                                : affiliate.paymentInfo.details.bankName
                            }
                            </div>
                        </div>
                        ) : (
                        <span style={{ color: '#dc3545', fontSize: '12px' }}>Not Set</span>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        {affiliate.lastPayoutDate ? (
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                            £{affiliate.lastPayoutAmount.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '10px', color: '#6c757d' }}>
                            {affiliate.lastPayoutDate.toDate().toLocaleDateString()}
                            </div>
                            <div style={{ fontSize: '9px', color: '#adb5bd' }}>
                            ({affiliate.payoutHistory?.length || 0} total)
                            </div>
                        </div>
                        ) : (
                        <span style={{ color: '#6c757d', fontSize: '12px' }}>No payouts</span>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: affiliate.status === 'active' ? '#d4edda' : '#f8d7da',
                        color: affiliate.status === 'active' ? '#155724' : '#721c24'
                        }}>
                        {affiliate.status || 'active'}
                        </span>
                        {(affiliate.totalEarnings || 0) >= 5 && affiliate.paymentInfo && (
                        <div style={{ fontSize: '10px', color: '#28a745', marginTop: '2px' }}>
                            Ready for payout
                        </div>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        {affiliate.status !== 'suspended' && (
                        <button
                            onClick={() => suspendAffiliate(affiliate.id)}
                            style={{
                            padding: '5px 10px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                            }}
                        >
                            Suspend
                        </button>
                        )}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
        )}

        {/* Recent Ratings Tab */}
        {selectedTab === 'ratings' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#495057' }}>Recent Ratings</h2>
            
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              padding: '20px'
            }}>
              {recentRatings.map((rating, index) => (
                <div key={rating.id} style={{ 
                  padding: '15px',
                  borderBottom: index < recentRatings.length - 1 ? '1px solid #eee' : 'none',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: '15px',
                  alignItems: 'center'
                }}>
                  <div>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                      {rating.rating} ⭐ Rating
                    </p>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>
                      {rating.createdAt?.toDate?.()?.toLocaleString() || 'Recent'}
                    </p>
                  </div>
                  
                  <div>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Affiliate</p>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                      {rating.affiliateId?.substring(0, 8)}...
                    </p>
                  </div>
                  
                  <div>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Earnings</p>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#28a745' }}>
                      £{(rating.earnings || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Status</p>
                    <p style={{ margin: '0', fontSize: '12px' }}>
                      {rating.validated ? '✅ Valid' : '⚠️ Pending'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fraud Detection Tab */}
        {selectedTab === 'fraud' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#495057' }}>
              Fraud Detection ({suspiciousActivity.length} items)
            </h2>
            
            {suspiciousActivity.length === 0 ? (
              <div style={{ 
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: '#28a745', fontSize: '18px', margin: '0' }}>
                  ✅ No suspicious activity detected
                </p>
                <p style={{ color: '#6c757d', fontSize: '14px', marginTop: '10px' }}>
                  Enhanced fraud prevention is actively monitoring all rating attempts.
                </p>
              </div>
            ) : (
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                padding: '20px'
              }}>
                {/* Fraud Summary Stats */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  marginBottom: '30px',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                      {suspiciousActivity.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Total Blocked</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
                      {suspiciousActivity.filter(a => a.reason?.includes('device')).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Device Duplicates</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#17a2b8' }}>
                      {suspiciousActivity.filter(a => a.reason?.includes('rapid')).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>Rapid Attempts</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
                      {suspiciousActivity.filter(a => a.confidence >= 90).length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>High Confidence</div>
                  </div>
                </div>

                {/* Fraud Activity List */}
                {suspiciousActivity.map((activity, index) => (
                  <div key={activity.id} style={{ 
                    padding: '15px',
                    borderBottom: index < suspiciousActivity.length - 1 ? '1px solid #eee' : 'none',
                    backgroundColor: activity.confidence >= 90 ? '#f8d7da' : '#fff3cd',
                    borderLeft: `4px solid ${activity.confidence >= 90 ? '#dc3545' : '#ffc107'}`,
                    marginBottom: '10px',
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                          <span style={{ 
                            backgroundColor: activity.confidence >= 90 ? '#dc3545' : '#ffc107',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            marginRight: '10px'
                          }}>
                            {activity.confidence}% confidence
                          </span>
                          <p style={{ margin: '0', fontWeight: 'bold', color: activity.confidence >= 90 ? '#721c24' : '#856404' }}>
                            ⚠️ {activity.type}: {activity.reason}
                          </p>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Affiliate:</p>
                            <p style={{ margin: '0', fontSize: '14px' }}>{activity.affiliateId?.substring(0, 8)}...</p>
                          </div>
                          
                          <div>
                            <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Time:</p>
                            <p style={{ margin: '0', fontSize: '14px' }}>
                              {activity.timestamp?.toDate?.()?.toLocaleString() || 'Recent'}
                            </p>
                          </div>
                          
                          <div>
                            <p style={{ margin: '0', fontSize: '12px', color: '#6c757d' }}>Link ID:</p>
                            <p style={{ margin: '0', fontSize: '14px' }}>{activity.linkId}</p>
                          </div>
                        </div>
                        
                        {activity.fingerprint && (
                          <div style={{ marginTop: '10px' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Device Info:</p>
                            <div style={{ 
                              backgroundColor: 'white',
                              padding: '8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}>
                              <div>Screen: {activity.fingerprint.screen}</div>
                              <div>Platform: {activity.fingerprint.platform}</div>
                              <div>Browser: {activity.fingerprint.userAgent?.substring(0, 60)}...</div>
                              {activity.fingerprint.audio && <div>Audio: {activity.fingerprint.audio}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ marginLeft: '15px' }}>
                        {!activity.reviewed && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Mark this fraud attempt as reviewed?')) {
                                try {
                                  await updateDoc(doc(db, 'suspicious_activity', activity.id), {
                                    reviewed: true,
                                    reviewedAt: new Date(),
                                    reviewedBy: 'admin'
                                  });
                                  // Refresh the suspicious activity list
                                  setSuspiciousActivity(suspiciousActivity.map(a => 
                                    a.id === activity.id ? { ...a, reviewed: true } : a
                                  ));
                                } catch (error) {
                                  alert('Error updating activity: ' + error.message);
                                }
                              }
                            }}
                            style={{
                              padding: '5px 10px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Mark Reviewed
                          </button>
                        )}
                        
                        {activity.reviewed && (
                          <span style={{
                            padding: '5px 10px',
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            ✅ Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {suspiciousActivity.length > 10 && (
                  <div style={{ 
                    textAlign: 'center',
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px'
                  }}>
                    <p style={{ margin: '0', color: '#6c757d', fontSize: '14px' }}>
                      Showing latest {Math.min(suspiciousActivity.length, 50)} fraud attempts
                    </p>
                    <p style={{ margin: '5px 0 0 0', color: '#6c757d', fontSize: '12px' }}>
                      Enhanced protection is blocking {((suspiciousActivity.length / (suspiciousActivity.length + recentRatings.length)) * 100).toFixed(1)}% of attempts
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payout Processing Modal */}
      {showPayoutModal && <PayoutModal />}
    </div>
  );
};

export default AdminPanel;