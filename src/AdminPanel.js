import React, { useState, useEffect } from 'react';
import { getFirestore, collection, onSnapshot, query, where, orderBy, doc, updateDoc, getDocs } from 'firebase/firestore';
import { decryptBankAccount } from './utils/encryptionUtils'; // Import the encryption utilities

// Use your existing Firebase instance
const db = getFirestore();

const AdminDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [withdrawals, setWithdrawals] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);
  const [decryptionErrors, setDecryptionErrors] = useState(new Set());

  // Real-time data loading
  useEffect(() => {
    const unsubscribeWithdrawals = onSnapshot(
      query(collection(db, 'withdrawals'), orderBy('requestedAt', 'desc')),
      (snapshot) => {
        const withdrawalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date(),
          processedAt: doc.data().processedAt?.toDate() || null
        }));
        setWithdrawals(withdrawalsData);
        setLoading(false);
      }
    );

    const unsubscribeAffiliates = onSnapshot(
      collection(db, 'affiliates'),
      (snapshot) => {
        const affiliatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        setAffiliates(affiliatesData);
      }
    );

    return () => {
      unsubscribeWithdrawals();
      unsubscribeAffiliates();
    };
  }, []);

  // Update withdrawal status
  const updateWithdrawalStatus = async (withdrawalId, newStatus, rejectionReason = null) => {
    setProcessingAction(true);
    try {
      const updateData = {
        status: newStatus,
        processedAt: new Date()
      };
      
      if (rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }

      await updateDoc(doc(db, 'withdrawals', withdrawalId), updateData);
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      alert('Error updating withdrawal: ' + error.message);
    }
    setProcessingAction(false);
  };

  // Bulk approve/reject
  const bulkUpdateWithdrawals = async (withdrawalIds, newStatus) => {
    setProcessingAction(true);
    try {
      const promises = withdrawalIds.map(id => 
        updateDoc(doc(db, 'withdrawals', id), {
          status: newStatus,
          processedAt: new Date()
        })
      );
      await Promise.all(promises);
      setSelectedWithdrawals([]);
    } catch (error) {
      console.error('Error bulk updating withdrawals:', error);
      alert('Error updating withdrawals: ' + error.message);
    }
    setProcessingAction(false);
  };

  // Decrypt bank account with error handling
  const getDecryptedBankAccount = async (withdrawal) => {
    try {
      // Check if it's using old format (bankAccount) or new format (encryptedBankAccount)
      if (withdrawal.encryptedBankAccount) {
        console.log('🔓 Decrypting bank account for withdrawal:', withdrawal.id);
        const decrypted = await decryptBankAccount(withdrawal.encryptedBankAccount);
        console.log('✅ Successfully decrypted bank account');
        return decrypted;
      } else if (withdrawal.bankAccount) {
        // Legacy unencrypted data
        console.log('📦 Using legacy unencrypted bank account data');
        return withdrawal.bankAccount;
      } else {
        throw new Error('No bank account data found');
      }
    } catch (error) {
      console.error('❌ Failed to decrypt bank account for withdrawal:', withdrawal.id, error);
      setDecryptionErrors(prev => new Set([...prev, withdrawal.id]));
      
      // Return a placeholder for display
      return {
        accountHolderName: '[Decryption Failed]',
        bankName: '[Decryption Failed]',
        accountNumber: '0000',
        routingNumber: '000000000',
        accountType: 'checking',
        addressLine1: '[Decryption Failed]',
        city: '[Decryption Failed]',
        state: 'XX',
        zipCode: '00000'
      };
    }
  };

  // Generate CSV for approved withdrawals with decryption
  const generateWiseCSV = async () => {
    const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
    
    if (approvedWithdrawals.length === 0) {
      alert('No approved withdrawals to export');
      return;
    }

    setProcessingAction(true);
    
    try {
      const wiseCSVData = [];
      const failedDecryptions = [];
      const successfulDecryptions = [];

      console.log(`🔓 Starting decryption of ${approvedWithdrawals.length} withdrawals...`);

      // Process each withdrawal with decryption
      for (const withdrawal of approvedWithdrawals) {
        const affiliate = affiliates.find(a => a.id === withdrawal.userId);
        
        if (!affiliate) {
          console.warn('Affiliate not found for withdrawal:', withdrawal.id);
          continue;
        }

        try {
          // Decrypt bank account details
          const bankDetails = await getDecryptedBankAccount(withdrawal);
          
          // Skip if decryption failed (check for placeholder values)
          if (bankDetails.accountHolderName === '[Decryption Failed]') {
            failedDecryptions.push(withdrawal.id);
            continue;
          }
          
          // Validate required address fields
          if (!bankDetails.addressLine1 || !bankDetails.city || !bankDetails.state || !bankDetails.zipCode) {
            console.warn('Missing address data for withdrawal:', withdrawal.id);
            continue;
          }
          
          // Create Wise row with decrypted data
          const wiseRow = {
            'sourceCurrency': 'GBP',
            'targetCurrency': 'USD',
            'amount': withdrawal.amount.toFixed(2),
            'amountCurrency': 'target',
            'name': bankDetails.accountHolderName,
            'email': affiliate.email,
            'reference': `SocialStar earnings ${new Date().toISOString().split('T')[0]}`,
            'receiverType': 'PERSON',
            'accountNumber': bankDetails.accountNumber,
            'abartn': bankDetails.routingNumber,
            'accountType': (bankDetails.accountType === 'checking') ? 'CHECKING' : 'SAVINGS',
            'addressFirstLine': bankDetails.addressLine1,
            'addressCity': bankDetails.city,
            'addressState': bankDetails.state,
            'addressPostCode': bankDetails.zipCode,
            'addressCountryCode': 'US'
          };

          wiseCSVData.push(wiseRow);
          successfulDecryptions.push(withdrawal.id);
          
        } catch (error) {
          console.error('Error processing withdrawal:', withdrawal.id, error);
          failedDecryptions.push(withdrawal.id);
        }
      }

      console.log(`✅ Successfully decrypted ${successfulDecryptions.length} withdrawals`);
      
      if (failedDecryptions.length > 0) {
        console.warn(`⚠️ Failed to decrypt ${failedDecryptions.length} withdrawals:`, failedDecryptions);
        alert(`Warning: ${failedDecryptions.length} withdrawals could not be decrypted and were skipped.\n\nSuccessfully processed: ${successfulDecryptions.length}\nFailed: ${failedDecryptions.length}\n\nCheck console for details.`);
      }

      if (wiseCSVData.length === 0) {
        alert('No valid withdrawals to export (decryption failures or missing data)');
        return;
      }

      // Convert to CSV
      const wiseColumnOrder = [
        'sourceCurrency', 'targetCurrency', 'amount', 'amountCurrency', 'name', 'email', 
        'reference', 'receiverType', 'accountNumber', 'abartn', 'accountType', 
        'addressFirstLine', 'addressCity', 'addressState', 'addressPostCode', 'addressCountryCode'
      ];

      let csvContent = wiseColumnOrder.join(',') + '\n';
      
      wiseCSVData.forEach(row => {
        const values = wiseColumnOrder.map(header => {
          const value = row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvContent += values.join(',') + '\n';
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wise_payouts_decrypted_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      console.log('📥 Generated Wise CSV with', wiseCSVData.length, 'decrypted withdrawals');
      
      if (failedDecryptions.length === 0) {
        alert(`🎉 Successfully generated CSV with ${wiseCSVData.length} decrypted withdrawals!`);
      }
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Error generating CSV: ' + error.message);
    } finally {
      setProcessingAction(false);
    }
  };

  // Mark batch as completed
  const markBatchCompleted = async () => {
    const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved');
    
    if (approvedWithdrawals.length === 0) {
      alert('No approved withdrawals to mark as completed');
      return;
    }

    if (!window.confirm(`Mark ${approvedWithdrawals.length} withdrawals as completed?`)) {
      return;
    }

    await bulkUpdateWithdrawals(approvedWithdrawals.map(w => w.id), 'completed');
  };

  // Statistics
  const stats = {
    pendingCount: withdrawals.filter(w => w.status === 'pending').length,
    pendingAmount: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0),
    approvedCount: withdrawals.filter(w => w.status === 'approved').length,
    approvedAmount: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0),
    todayRequests: withdrawals.filter(w => {
      const today = new Date();
      const requestDate = w.requestedAt;
      return requestDate.toDateString() === today.toDateString();
    }).length,
    totalAffiliates: affiliates.length
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading SocialStar Dashboard...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#2c3e50',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>
            SocialStar Admin Dashboard
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: '0.8', fontSize: '14px' }}>
            Withdrawal management & payout processing • 🔒 Bank details encrypted & auto-decrypted
          </p>
        </div>
      </header>

      {/* Navigation */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'withdrawals', label: '💸 Withdrawals' },
            { id: 'affiliates', label: '👥 Affiliates' },
            { id: 'analytics', label: '📈 Analytics' }
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
                fontSize: '14px',
                fontWeight: selectedTab === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
        
        {/* Decryption Error Alert */}
        {decryptionErrors.size > 0 && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
              ⚠️ Decryption Issues Detected
            </h4>
            <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>
              {decryptionErrors.size} withdrawal(s) have bank details that cannot be decrypted.
            </p>
          </div>
        )}
        
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
                <h3 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Pending Review</h3>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#dc3545' }}>
                  {stats.pendingCount}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                  ${stats.pendingAmount.toFixed(2)} total
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Ready for Batch</h3>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#28a745' }}>
                  {stats.approvedCount}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                  ${stats.approvedAmount.toFixed(2)} total
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Today's Requests</h3>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#007bff' }}>
                  {stats.todayRequests}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                  requests submitted
                </p>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057', fontSize: '16px' }}>Total Affiliates</h3>
                <p style={{ margin: '0', fontSize: '28px', fontWeight: 'bold', color: '#6f42c1' }}>
                  {stats.totalAffiliates}
                </p>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
                  active users
                </p>
              </div>
            </div>

            {/* Batch Processing */}
            {stats.approvedCount > 0 && (
              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginBottom: '20px', color: '#495057' }}>
                  🚀 Ready for Batch Processing
                </h3>
                <div style={{ 
                  backgroundColor: '#e7f3ff',
                  border: '1px solid #007bff',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#007bff' }}>
                    {stats.approvedCount} withdrawals ready • ${stats.approvedAmount.toFixed(2)} total
                  </p>
                  <p style={{ margin: '0', fontSize: '14px', color: '#495057' }}>
                    🔓 Download CSV with automatically decrypted bank details and upload to Wise
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button
                    onClick={generateWiseCSV}
                    disabled={processingAction}
                    style={{
                      padding: '12px 25px',
                      backgroundColor: processingAction ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {processingAction ? '🔓 Decrypting...' : '📥 Download Decrypted CSV'}
                  </button>
                  
                  <button
                    onClick={markBatchCompleted}
                    disabled={processingAction}
                    style={{
                      padding: '12px 25px',
                      backgroundColor: processingAction ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✅ Mark Batch as Completed
                  </button>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '20px', color: '#495057' }}>Recent Withdrawals</h3>
              
              {withdrawals.slice(0, 5).map((withdrawal) => {
                const affiliate = affiliates.find(a => a.id === withdrawal.userId);
                return (
                  <div key={withdrawal.id} style={{ 
                    padding: '15px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                        {affiliate?.firstName} {affiliate?.lastName} • ${withdrawal.amount.toFixed(2)}
                      </p>
                      <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                        {withdrawal.requestedAt.toLocaleString()}
                      </p>
                    </div>
                    
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: 
                        withdrawal.status === 'pending' ? '#fff3cd' :
                        withdrawal.status === 'approved' ? '#d1ecf1' :
                        withdrawal.status === 'completed' ? '#d4edda' : '#f8d7da',
                      color:
                        withdrawal.status === 'pending' ? '#856404' :
                        withdrawal.status === 'approved' ? '#0c5460' :
                        withdrawal.status === 'completed' ? '#155724' : '#721c24'
                    }}>
                      {withdrawal.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Withdrawals Tab */}
        {selectedTab === 'withdrawals' && (
          <div>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0', color: '#495057' }}>Withdrawal Requests</h2>
              
              {selectedWithdrawals.length > 0 && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => bulkUpdateWithdrawals(selectedWithdrawals, 'approved')}
                    disabled={processingAction}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ✅ Bulk Approve ({selectedWithdrawals.length})
                  </button>
                  
                  <button
                    onClick={() => bulkUpdateWithdrawals(selectedWithdrawals, 'rejected')}
                    disabled={processingAction}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: processingAction ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ❌ Bulk Reject ({selectedWithdrawals.length})
                  </button>
                </div>
              )}
            </div>

            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              {withdrawals.map((withdrawal) => {
                const affiliate = affiliates.find(a => a.id === withdrawal.userId);
                const isSelected = selectedWithdrawals.includes(withdrawal.id);
                
                return (
                  <div key={withdrawal.id} style={{ 
                    padding: '20px',
                    borderBottom: '1px solid #eee',
                    backgroundColor: isSelected ? '#f8f9fa' : 'white'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px' }}>
                      
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedWithdrawals([...selectedWithdrawals, withdrawal.id]);
                          } else {
                            setSelectedWithdrawals(selectedWithdrawals.filter(id => id !== withdrawal.id));
                          }
                        }}
                        style={{ marginTop: '2px' }}
                      />
                      
                      {/* Main Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                          <div>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>
                              {affiliate?.firstName} {affiliate?.lastName}
                            </h4>
                            <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                              {affiliate?.email}
                            </p>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                              ${withdrawal.amount.toFixed(2)}
                            </p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                              {withdrawal.requestedAt.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Bank Details - Encrypted Notice */}
                        <div style={{ 
                          backgroundColor: '#f8f9fa',
                          padding: '10px',
                          borderRadius: '6px',
                          marginBottom: '15px'
                        }}>
                          <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                            🔒 Bank details encrypted • Will be decrypted during CSV export
                          </p>
                        </div>
                        
                        {/* Status and Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            backgroundColor: 
                              withdrawal.status === 'pending' ? '#fff3cd' :
                              withdrawal.status === 'approved' ? '#d1ecf1' :
                              withdrawal.status === 'completed' ? '#d4edda' : '#f8d7da',
                            color:
                              withdrawal.status === 'pending' ? '#856404' :
                              withdrawal.status === 'approved' ? '#0c5460' :
                              withdrawal.status === 'completed' ? '#155724' : '#721c24'
                          }}>
                            {withdrawal.status.toUpperCase()}
                          </span>
                          
                          {withdrawal.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => updateWithdrawalStatus(withdrawal.id, 'approved')}
                                disabled={processingAction}
                                style={{
                                  padding: '6px 16px',
                                  backgroundColor: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: processingAction ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ✅ APPROVE
                              </button>
                              
                              <button
                                onClick={() => {
                                  const reason = prompt('Rejection reason (optional):');
                                  updateWithdrawalStatus(withdrawal.id, 'rejected', reason);
                                }}
                                disabled={processingAction}
                                style={{
                                  padding: '6px 16px',
                                  backgroundColor: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: processingAction ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                ❌ REJECT
                              </button>
                            </div>
                          )}
                          
                          {withdrawal.status === 'approved' && (
                            <div style={{ 
                              padding: '6px 12px',
                              backgroundColor: '#d1ecf1',
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: '#0c5460'
                            }}>
                              Ready for batch processing
                            </div>
                          )}
                        </div>
                        
                        {withdrawal.rejectionReason && (
                          <div style={{ 
                            marginTop: '10px',
                            padding: '8px',
                            backgroundColor: '#f8d7da',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#721c24'
                          }}>
                            <strong>Rejection reason:</strong> {withdrawal.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {withdrawals.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                  No withdrawal requests yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Affiliates Tab */}
        {selectedTab === 'affiliates' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#495057' }}>All Affiliates</h2>
            
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
                      Name
                    </th>
                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                      Email
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                      Balance
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                      Total Earned
                    </th>
                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((affiliate) => (
                    <tr key={affiliate.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px' }}>
                        <div>
                          <p style={{ margin: '0', fontWeight: 'bold' }}>
                            {affiliate.firstName} {affiliate.lastName}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <p style={{ margin: '0', fontSize: '14px' }}>
                          {affiliate.email}
                        </p>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <strong style={{ color: '#28a745' }}>
                          ${(affiliate.balance || 0).toFixed(2)}
                        </strong>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ color: '#6c757d' }}>
                          ${(affiliate.totalEarnings || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6c757d' }}>
                          {affiliate.createdAt.toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {affiliates.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                  No affiliates yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {selectedTab === 'analytics' && (
          <div>
            <h2 style={{ marginBottom: '20px', color: '#495057' }}>Analytics & Reports</h2>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px'
            }}>
              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Withdrawal Summary</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Withdrawals:</span>
                    <strong>{withdrawals.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Completed:</span>
                    <strong style={{ color: '#28a745' }}>
                      {withdrawals.filter(w => w.status === 'completed').length}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pending:</span>
                    <strong style={{ color: '#dc3545' }}>
                      {withdrawals.filter(w => w.status === 'pending').length}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Amount:</span>
                    <strong>
                      ${withdrawals.reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Quick Export</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const csvData = withdrawals.map(w => {
                        const affiliate = affiliates.find(a => a.id === w.userId);
                        return {
                          name: `${affiliate?.firstName} ${affiliate?.lastName}`,
                          email: affiliate?.email,
                          amount: w.amount,
                          status: w.status,
                          requestedAt: w.requestedAt.toISOString(),
                          encrypted: w.encryptedBankAccount ? 'Yes' : 'No'
                        };
                      });
                      
                      const csv = [
                        Object.keys(csvData[0] || {}).join(','),
                        ...csvData.map(row => Object.values(row).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `all_withdrawals_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '10px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    📊 Export All Withdrawals
                  </button>
                  
                  <button
                    onClick={() => {
                      const csvData = affiliates.map(a => ({
                        name: `${a.firstName} ${a.lastName}`,
                        email: a.email,
                        balance: a.balance || 0,
                        totalEarnings: a.totalEarnings || 0,
                        totalRatings: a.totalRatings || 0,
                        joinedAt: a.createdAt.toISOString()
                      }));
                      
                      const csv = [
                        Object.keys(csvData[0] || {}).join(','),
                        ...csvData.map(row => Object.values(row).join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `all_affiliates_${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    style={{
                      padding: '10px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    👥 Export All Affiliates
                  </button>
                </div>
              </div>

              <div style={{ 
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ marginBottom: '20px' }}>Daily Stats</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Today's Requests:</span>
                    <strong>{stats.todayRequests}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Today's Amount:</span>
                    <strong>
                      ${withdrawals.filter(w => {
                        const today = new Date();
                        return w.requestedAt.toDateString() === today.toDateString();
                      }).reduce((sum, w) => sum + w.amount, 0).toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Avg. Withdrawal:</span>
                    <strong>
                      ${withdrawals.length > 0 ? 
                        (withdrawals.reduce((sum, w) => sum + w.amount, 0) / withdrawals.length).toFixed(2) : 
                        '0.00'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🔒 Encrypted:</span>
                    <strong style={{ color: '#28a745' }}>
                      {withdrawals.filter(w => w.encryptedBankAccount).length} / {withdrawals.length}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Encryption Status Chart */}
            <div style={{ 
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              marginTop: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ marginBottom: '20px' }}>Security Status</h3>
              <div style={{ 
                height: '200px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c757d',
                flexDirection: 'column'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔒</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  {withdrawals.filter(w => w.encryptedBankAccount).length} of {withdrawals.length} withdrawals encrypted
                </div>
                <div style={{ fontSize: '14px', marginTop: '5px' }}>
                  Bank details are secured with AES-256-GCM encryption
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {processingAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p style={{ margin: '0', fontSize: '16px' }}>
              {processingAction ? 'Decrypting bank details & processing...' : 'Processing...'}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;