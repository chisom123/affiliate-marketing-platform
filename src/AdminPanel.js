// ADMIN PANEL COMPONENT - UPDATED WITH WISE PAYOUTS (FIXED FLASH ISSUE)
import React, { useState, useEffect } from 'react';
import { db, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
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
    arrayUnion
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

  // Firebase Functions
  const processGlobalPayouts = httpsCallable(functions, 'processGlobalPayouts');
  const downloadWiseCSV = httpsCallable(functions, 'downloadWiseCSV');
  const completePayouts = httpsCallable(functions, 'completePayouts');

  // Download CSV after payout processing
  const downloadCSV = async (batchId) => {
    try {
      const result = await downloadWiseCSV({ batchId });
      
      // Create and download CSV file
      const blob = new Blob([result.data.csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      alert('Error downloading CSV: ' + error.message);
    }
  };

  // Mark payouts as completed
  const markPayoutsCompleted = async (batchId) => {
    const wiseReference = prompt('Enter Wise transfer reference (optional):');
    
    try {
      const result = await completePayouts({ 
        batchId, 
        wiseTransferReference: wiseReference 
      });
      
      alert(result.data.message);
      // Refresh data
      loadAdminData();
      
    } catch (error) {
      alert('Error completing payouts: ' + error.message);
    }
  };

  // Load admin data
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

      // Load suspicious activity
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

      // Get rating links for current earnings calculation
      const linksSnapshot = await getDocs(collection(db, 'rating_links'));
      const linksData = linksSnapshot.docs.map(doc => doc.data());

      // Calculate stats - use live earnings from rating links
      const totalAffiliates = affiliatesData.length;
      const totalRatings = ratingsData.length;
      
      // Calculate current unpaid earnings from rating links
      const affiliateEarnings = {};
      linksData.forEach(link => {
        if (!affiliateEarnings[link.affiliateId]) {
          affiliateEarnings[link.affiliateId] = 0;
        }
        affiliateEarnings[link.affiliateId] += (link.earnings || 0);
      });
      
      const totalEarnings = Object.values(affiliateEarnings).reduce((sum, earnings) => sum + earnings, 0);
      const activeLinks = linksData.filter(link => link.status === 'active').length;

      setStats({
        totalAffiliates,
        totalRatings,
        totalEarnings,
        totalRevenue: totalEarnings,
        activeLinks
      });

      // Update affiliates with current earnings
      const updatedAffiliates = affiliatesData.map(affiliate => ({
        ...affiliate,
        currentEarnings: affiliateEarnings[affiliate.id] || 0
      }));
      setAffiliates(updatedAffiliates);

    } catch (error) {
      console.error('Error loading admin data:', error);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Get eligible affiliates for payout (Wise Payouts only, $5+ minimum)
  const getEligibleAffiliates = () => {
    return affiliates.filter(affiliate => 
      (affiliate.currentEarnings || 0) >= 5 && 
      affiliate.status === 'active' &&
      affiliate.paymentInfo?.method === 'global_payouts'
    );
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

// Wise Payouts Modal Component
const WisePayoutsModal = () => {
    const [processing, setProcessing] = useState(false);
    const [payoutResult, setPayoutResult] = useState(null);
    const eligibleAffiliates = getEligibleAffiliates();
    
    const totalAmount = eligibleAffiliates.reduce((sum, a) => sum + (a.currentEarnings || 0), 0);
    const estimatedFees = eligibleAffiliates.length * 1.5; // ~$1.50 per payout

    // Process Wise Payouts - FIXED: Removed immediate loadAdminData() call
    const processPayouts = async () => {
      if (!window.confirm(`Process ${eligibleAffiliates.length} Wise Payouts totaling ${totalAmount.toFixed(2)}?`)) {
        return;
      }
      
      setProcessing(true);
      setPayoutResult(null);
      
      try {
        const result = await processGlobalPayouts();
        
        setPayoutResult({
          success: true,
          ...result.data
        });
        
        // DON'T refresh data here - let the user complete the workflow first
        // This prevents the success message from flashing and disappearing
        
      } catch (error) {
        console.error('Payout error:', error);
        setPayoutResult({
          success: false,
          error: error.message
        });
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
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>
            💰 Wise Payouts (Seamless)
          </h2>

          {payoutResult ? (
            // Show result
            <div style={{
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: payoutResult.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${payoutResult.success ? '#28a745' : '#dc3545'}`,
              marginBottom: '20px'
            }}>
              {payoutResult.success ? (
                <div>
                  <h3 style={{ color: '#155724', margin: '0 0 15px 0' }}>
                    ✅ Payouts Initiated Successfully!
                  </h3>
                  <div style={{ fontSize: '14px', color: '#155724' }}>
                    <p><strong>Affiliates Processing:</strong> {payoutResult.payoutsProcessed}</p>
                    <p><strong>Total Amount:</strong> ${payoutResult.totalPaidOut.toFixed(2)}</p>
                    <p><strong>Batch ID:</strong> {payoutResult.csvBatchId}</p>
                    {payoutResult.errors.length > 0 && (
                      <p><strong>Errors:</strong> {payoutResult.errors.length} failed</p>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => downloadCSV(payoutResult.csvBatchId)}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      📥 Download Wise CSV
                    </button>
                    
                    <button
                      onClick={() => markPayoutsCompleted(payoutResult.csvBatchId)}
                      style={{
                        padding: '12px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ✅ Mark as Completed
                    </button>
                  </div>
                  
                  {payoutResult.errors.length > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      <h4 style={{ color: '#721c24', fontSize: '14px' }}>Failed Payouts:</h4>
                      {payoutResult.errors.map((error, index) => (
                        <div key={index} style={{ 
                          fontSize: '12px', 
                          backgroundColor: '#f8d7da',
                          padding: '8px',
                          marginBottom: '5px',
                          borderRadius: '4px'
                        }}>
                          {error.email}: {error.error}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ 
                    marginTop: '15px',
                    padding: '15px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#1976d2'
                  }}>
                    <strong>Next steps:</strong>
                    <ol style={{ margin: '5px 0', paddingLeft: '15px' }}>
                      <li>Download the CSV file</li>
                      <li>Upload to Wise batch payments</li>
                      <li>Process transfers in Wise</li>
                      <li>Click "Mark as Completed" to notify affiliates</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ color: '#721c24', margin: '0 0 15px 0' }}>
                    ❌ Payout Failed
                  </h3>
                  <p style={{ color: '#721c24', fontSize: '14px' }}>
                    {payoutResult.error}
                  </p>
                </div>
              )}
            </div>
          ) : eligibleAffiliates.length === 0 ? (
            // No eligible affiliates
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>
                No affiliates eligible for payout
              </p>
              <p style={{ color: '#6c757d' }}>
                Requirements: $5+ earnings, active status, Wise setup
              </p>
            </div>
          ) : (
            // Show payout details
            <div>
              <div style={{ 
                marginBottom: '25px',
                padding: '20px',
                backgroundColor: '#ff6b00',
                borderRadius: '8px',
                color: 'white'
              }}>
                <h3 style={{ margin: '0 0 15px 0' }}>
                  🏦 Wise Bulk Transfers
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      {eligibleAffiliates.length}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Affiliates</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      ${totalAmount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Amount</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      ~${estimatedFees.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Est. Fees</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                      1-3 days
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Delivery Time</div>
                  </div>
                </div>
              </div>

              {/* Eligible Affiliates List */}
              <div style={{ 
                marginBottom: '25px',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #dee2e6',
                borderRadius: '8px'
              }}>
                <div style={{ 
                  padding: '10px 15px',
                  backgroundColor: '#f8f9fa',
                  borderBottom: '1px solid #dee2e6',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>
                  Affiliates Ready for Wise Payout
                </div>
                {eligibleAffiliates.map((affiliate, index) => (
                  <div key={affiliate.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    borderBottom: index < eligibleAffiliates.length - 1 ? '1px solid #eee' : 'none',
                    fontSize: '13px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {affiliate.firstName} {affiliate.lastName}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '11px' }}>
                        {affiliate.email}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '10px' }}>
                        {affiliate.paymentInfo?.details?.country || 'US'} • 
                        {affiliate.paymentInfo?.details?.bankAccount?.accountNumber?.slice(-4) || 'Bank'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#28a745' }}>
                        ${(affiliate.currentEarnings || 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6c757d' }}>
                        Wise Transfer
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Process Button */}
              <button
                onClick={processPayouts}
                disabled={processing}
                style={{
                  width: '100%',
                  padding: '15px',
                  backgroundColor: processing ? '#6c757d' : '#ff6b00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  marginBottom: '15px'
                }}
              >
                {processing ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Processing Payouts...
                  </div>
                ) : (
                  `💰 Process ${eligibleAffiliates.length} Wise Payouts`
                )}
              </button>

              {/* Info Box */}
              <div style={{ 
                backgroundColor: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '6px',
                padding: '15px',
                fontSize: '12px',
                color: '#1976d2'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>How it works:</h4>
                <ul style={{ margin: '0', paddingLeft: '15px' }}>
                  <li>Affiliates immediately see "Processing" status and earnings reset to $0</li>
                  <li>You download a CSV file formatted for Wise batch uploads</li>
                  <li>Upload CSV to Wise and process transfers manually</li>
                  <li>Mark as completed to notify affiliates automatically</li>
                  <li>Much cheaper than automated solutions (~$1.50 vs $5+ per transfer)</li>
                </ul>
              </div>
            </div>
          )}

          {/* FIXED: Close button now refreshes data when modal closes after successful payout */}
          <button
            onClick={() => {
              setShowPayoutModal(false);
              // Refresh data when modal closes (especially if payouts were processed)
              if (payoutResult?.success) {
                loadAdminData();
              }
            }}
            disabled={processing}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: processing ? 'not-allowed' : 'pointer',
              marginTop: '15px'
            }}
          >
            Close
          </button>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#10183C',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #323862',
              borderTop: '4px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
          </div>
        </div>
      </>
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
            Seamless payouts powered by Wise bulk transfers
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
            { id: 'ratings', label: 'Recent Ratings' },
            { id: 'fraud', label: 'Fraud Detection' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              style={{
                padding: '15px 25px',
                border: 'none',
                backgroundColor: selectedTab === tab.id ? '#ff6b00' : 'transparent',
                color: selectedTab === tab.id ? 'white' : '#495057',
                cursor: 'pointer',
                borderBottom: selectedTab === tab.id ? '3px solid #ff6b00' : 'none'
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
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#ff6b00' }}>
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
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Unpaid Earnings</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#dc3545' }}>
                  ${stats.totalEarnings.toFixed(2)}
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>Ready for Payout</h3>
                <p style={{ margin: '0', fontSize: '32px', fontWeight: 'bold', color: '#ff6b00' }}>
                  {getEligibleAffiliates().length}
                </p>
              </div>
            </div>

            {/* Wise Payout Section */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginBottom: '30px'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>
                💰 Wise Bulk Payouts
              </h3>
              
              {getEligibleAffiliates().length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <p style={{ color: '#6c757d', margin: '0 0 10px 0', fontSize: '18px' }}>
                    No affiliates ready for payout
                  </p>
                  <p style={{ color: '#6c757d', margin: '0', fontSize: '14px' }}>
                    Weekly payouts require $5+ earnings and Wise setup
                  </p>
                </div>
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
                      backgroundColor: '#ff6b00',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {getEligibleAffiliates().length}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Wise Transfers</div>
                    </div>
                    
                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#28a745',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        ${getEligibleAffiliates().reduce((sum, a) => sum + (a.currentEarnings || 0), 0).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Total Amount</div>
                    </div>

                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#17a2b8',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        ~${(getEligibleAffiliates().length * 1.5).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Est. Fees</div>
                    </div>

                    <div style={{ 
                      padding: '15px',
                      backgroundColor: '#6f42c1',
                      borderRadius: '6px',
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        1-3 days
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Delivery</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPayoutModal(true)}
                    style={{
                      width: '100%',
                      padding: '15px',
                      backgroundColor: '#ff6b00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    🏦 Process {getEligibleAffiliates().length} Wise Payouts
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
                  onClick={() => window.open('https://wise.com', '_blank')}
                  style={{
                    padding: '12px 25px',
                    backgroundColor: '#ff6b00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Wise Dashboard
                </button>

                <button
                  onClick={() => window.open('https://console.firebase.google.com', '_blank')}
                  style={{
                    padding: '12px 25px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Firebase Console
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
                      Earnings: ${(rating.earnings || 0).toFixed(2)}
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
                {affiliates.length} total • {getEligibleAffiliates().length} ready for Wise Payouts ($5+ minimum)
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
                    Current Balance
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Payment Method
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                    Wise Status
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
                            {(affiliate.firstName && affiliate.lastName) ? `${affiliate.firstName} ${affiliate.lastName}` : 'Unknown'}
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
                        <strong style={{ 
                        color: (affiliate.currentEarnings || 0) >= 5 ? '#28a745' : '#6c757d'
                        }}>
                        ${(affiliate.currentEarnings || 0).toFixed(2)}
                        </strong>
                        {affiliate.payoutHistory && affiliate.payoutHistory.length > 0 && (
                        <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                            Total paid: ${affiliate.payoutHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
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
                            backgroundColor: affiliate.paymentInfo.method === 'global_payouts' ? '#ff6b00' : '#6c757d',
                            color: 'white'
                            }}>
                            {affiliate.paymentInfo.method === 'global_payouts' ? '🏦 Wise' : '💳 Manual'}
                            </span>
                            {affiliate.paymentInfo.details?.country && (
                              <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '2px' }}>
                                {affiliate.paymentInfo.details.country}
                              </div>
                            )}
                        </div>
                        ) : (
                        <span style={{ color: '#dc3545', fontSize: '12px' }}>Not Set</span>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        {affiliate.paymentInfo?.method === 'global_payouts' ? (
                        <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            backgroundColor: '#d4edda',
                            color: '#155724'
                        }}>
                            ✅ Ready
                        </span>
                        ) : (
                        <span style={{ color: '#6c757d', fontSize: '12px' }}>N/A</span>
                        )}
                    </td>
                    <td style={{ padding: '15px', textAlign: 'center' }}>
                        {affiliate.lastPayoutDate ? (
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                            ${affiliate.lastPayoutAmount.toFixed(2)}
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
                        {(affiliate.currentEarnings || 0) >= 5 && 
                         affiliate.paymentInfo?.method === 'global_payouts' && (
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
                      ${(rating.earnings || 0).toFixed(2)}
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

      {/* Wise Payouts Modal */}
      {showPayoutModal && <WisePayoutsModal />}
    </div>
  );
};

export default AdminPanel;