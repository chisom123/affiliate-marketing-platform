// functions/index.js - Fixed Firebase Functions file with sourceCurrency

const { onCall } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// MAIN PAYOUT FUNCTION - Seamless Wise Integration
exports.processGlobalPayouts = onCall(
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    try {
      logger.info('Starting seamless payout process');

      // Get affiliates with Global Payouts setup and $5+ earnings
      const affiliatesSnapshot = await db.collection('affiliates')
        .where('paymentInfo.method', '==', 'global_payouts')
        .get();

      const results = [];
      const errors = [];
      const wiseCSVData = [];

      for (const affiliateDoc of affiliatesSnapshot.docs) {
        const affiliate = affiliateDoc.data();
        const affiliateId = affiliateDoc.id;

        try {
          // Calculate current earnings
          const linksSnapshot = await db.collection('rating_links')
            .where('affiliateId', '==', affiliateId)
            .get();

          const totalEarnings = linksSnapshot.docs.reduce((sum, linkDoc) => {
            return sum + (linkDoc.data().earnings || 0);
          }, 0);

          // Skip if less than $5
          if (totalEarnings < 5) {
            continue;
          }

          const country = affiliate.paymentInfo.details.country || 'US';
          const bankDetails = affiliate.paymentInfo.details.bankAccount;
          const address = affiliate.paymentInfo.details.address;
          const recipientCurrency = country === 'GB' ? 'GBP' : 'USD';

          // Create payout record
          const payoutId = `payout_${Date.now()}_${affiliateId.slice(0,8)}`;
          
          const payoutRecord = {
            id: payoutId,
            affiliateId: affiliateId,
            email: affiliate.paymentInfo.details.email,
            fullName: affiliate.paymentInfo.details.fullName,
            amount: totalEarnings,
            currency: recipientCurrency,
            country: country,
            bankAccount: bankDetails,
            address: address,
            status: 'processing', // Affiliates see "processing" 
            createdAt: new Date(),
            batchId: `batch_${Date.now()}`,
            estimatedArrival: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)) // 3 days from now
          };

          // Format for Wise CSV (exact template format with correct column names)
          const wiseRow = {
            // Wise template required fields (exact column names)
            'sourceCurrency': 'USD', // REQUIRED: Currency of your Wise account
            'targetCurrency': recipientCurrency, // Currency recipient receives
            'amount': totalEarnings.toFixed(2), // Amount (Wise uses 'amount', not 'targetAmount')
            'amountCurrency': 'target', // REQUIRED: Recipient gets exact amount, you pay fees
            'name': affiliate.paymentInfo.details.fullName,
            'email': affiliate.paymentInfo.details.email,
            'reference': `SocialStar earnings ${new Date().toISOString().split('T')[0]}`,
            'receiverType': 'PERSON', // Uppercase PERSON
            
            // US specific fields
            ...(country === 'US' && {
              'accountNumber': bankDetails.accountNumber,
              'abartn': bankDetails.routingNumber,
              'accountType': bankDetails.accountType === 'checking' ? 'CHECKING' : 'SAVINGS',
              'addressFirstLine': address.line1,
              'addressCity': address.city,
              'addressState': address.state || '', // 'addressState' not 'addressStateCode'
              'addressPostCode': address.postalCode,
              'addressCountryCode': 'US'
            }),
            
            // UK specific fields
            ...(country === 'GB' && {
              'accountNumber': bankDetails.accountNumber,
              'sortCode': bankDetails.sortCode.replace(/\D/g, ''),
              'addressFirstLine': address.line1,
              'addressCity': address.city,
              'addressPostCode': address.postalCode,
              'addressCountryCode': 'GB'
            })
          };

          wiseCSVData.push(wiseRow);

          // Save to admin payout queue
          await db.collection('payout_queue').doc(payoutId).set(payoutRecord);

          // Reset earnings to 0 (affiliate sees this immediately)
          const resetPromises = linksSnapshot.docs.map(linkDoc => 
            linkDoc.ref.update({ earnings: 0 })
          );
          await Promise.all(resetPromises);

          // Add to affiliate's payout history (they see "processing" status)
          await affiliateDoc.ref.update({
            payoutHistory: admin.firestore.FieldValue.arrayUnion({
              id: payoutId,
              amount: totalEarnings,
              currency: recipientCurrency,
              status: 'processing', // What affiliate sees
              processedAt: new Date(),
              estimatedArrival: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)),
              method: 'bank_transfer', // Generic term
              description: 'Direct bank transfer'
            }),
            lastPayoutDate: new Date(),
            lastPayoutAmount: totalEarnings,
            lastPayoutStatus: 'processing'
          });

          // Send confirmation notification to affiliate
          await db.collection('notifications').add({
            affiliateId: affiliateId,
            type: 'payout_initiated',
            title: 'Payout Processing',
            message: `Your ${totalEarnings.toFixed(2)} ${recipientCurrency} payout is being processed and will arrive in 1-3 business days.`,
            amount: totalEarnings,
            currency: recipientCurrency,
            payoutId: payoutId,
            createdAt: new Date(),
            read: false
          });

          results.push({
            affiliateId,
            email: affiliate.paymentInfo.details.email,
            amount: totalEarnings,
            currency: recipientCurrency,
            payoutId: payoutId,
            status: 'processing'
          });

          logger.info('Prepared seamless payout', { 
            affiliateId, 
            amount: totalEarnings,
            payoutId
          });

        } catch (error) {
          logger.error('Error processing affiliate', { 
            affiliateId, 
            error: error.message
          });
          errors.push({
            affiliateId,
            email: affiliate.paymentInfo?.details?.email || 'unknown',
            error: error.message
          });
        }
      }

      // Convert to CSV for admin with proper column order
      let csvContent = '';
      if (wiseCSVData.length > 0) {
        // Define the proper column order for Wise CSV (exact column names)
        const wiseColumnOrder = [
          'sourceCurrency',
          'targetCurrency', 
          'amount',
          'amountCurrency',
          'name',
          'email',
          'reference',
          'receiverType',
          'accountNumber',
          'abartn',
          'sortCode',
          'accountType',
          'addressFirstLine',
          'addressCity',
          'addressState',
          'addressPostCode',
          'addressCountryCode'
        ];

        // Create header row with only columns that exist in the data
        const availableHeaders = wiseColumnOrder.filter(header => 
          wiseCSVData.some(row => row.hasOwnProperty(header))
        );
        
        csvContent = availableHeaders.join(',') + '\n';
        
        // Add data rows
        wiseCSVData.forEach(row => {
          const values = availableHeaders.map(header => {
            const value = row[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          });
          csvContent += values.join(',') + '\n';
        });
      }

      // Save CSV for admin download
      const batchId = `batch_${Date.now()}`;
      if (csvContent) {
        await db.collection('admin_csv_exports').doc(batchId).set({
          csvData: csvContent,
          payoutCount: wiseCSVData.length,
          totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
          createdAt: new Date(),
          status: 'ready_for_wise_upload',
          payoutIds: results.map(r => r.payoutId)
        });
      }

      // Create admin task reminder
      await db.collection('admin_tasks').add({
        type: 'process_wise_payouts',
        batchId: batchId,
        payoutCount: results.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
        csvReady: true,
        status: 'pending',
        createdAt: new Date(),
        deadline: new Date(Date.now() + (24 * 60 * 60 * 1000)), // Process within 24 hours
        description: `Process ${results.length} payouts via Wise (${results.reduce((sum, r) => sum + r.amount, 0).toFixed(2)} total)`
      });

      logger.info('Seamless payouts initiated', { 
        processed: results.length, 
        errors: errors.length,
        batchId
      });

      return {
        success: true,
        payoutsProcessed: results.length,
        totalPaidOut: results.reduce((sum, r) => sum + r.amount, 0),
        payouts: results,
        errors,
        csvBatchId: batchId,
        message: `✅ ${results.length} payouts initiated! Affiliates will see "processing" status. Download CSV to complete via Wise.`,
        adminInstruction: `Download CSV with batch ID: ${batchId} and upload to Wise within 24 hours.`
      };

    } catch (error) {
      logger.error('Error processing seamless payouts', { error: error.message });
      throw new Error(error.message);
    }
  }
);

// Download Wise CSV export
exports.downloadWiseCSV = onCall(
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { batchId } = request.data;
    
    if (!batchId) {
      throw new Error('Batch ID required');
    }

    try {
      const csvDoc = await db.collection('admin_csv_exports').doc(batchId).get();
      
      if (!csvDoc.exists) {
        throw new Error('CSV export not found');
      }

      const csvData = csvDoc.data();
      
      return {
        success: true,
        csvContent: csvData.csvData,
        filename: `wise_payouts_${batchId}.csv`,
        payoutCount: csvData.payoutCount,
        totalAmount: csvData.totalAmount
      };

    } catch (error) {
      logger.error('Error downloading CSV', { error: error.message, batchId });
      throw new Error(error.message);
    }
  }
);

// Complete payouts after Wise transfer
exports.completePayouts = onCall(
  async (request) => {
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    const { batchId, wiseTransferReference } = request.data;
    
    if (!batchId) {
      throw new Error('Batch ID required');
    }

    try {
      // Get the CSV export record
      const csvDoc = await db.collection('admin_csv_exports').doc(batchId).get();
      
      if (!csvDoc.exists) {
        throw new Error('Batch not found');
      }

      const batchData = csvDoc.data();
      const payoutIds = batchData.payoutIds || [];

      // Update all payouts in this batch to completed
      const updatePromises = [];
      
      for (const payoutId of payoutIds) {
        // Update payout queue
        updatePromises.push(
          db.collection('payout_queue').doc(payoutId).update({
            status: 'completed',
            completedAt: new Date(),
            wiseReference: wiseTransferReference || '',
            actualArrival: new Date()
          })
        );

        // Get payout details to update affiliate
        const payoutDoc = await db.collection('payout_queue').doc(payoutId).get();
        const payout = payoutDoc.data();
        
        if (payout) {
          // Update affiliate's payout history
          const affiliateDoc = await db.collection('affiliates').doc(payout.affiliateId).get();
          const affiliate = affiliateDoc.data();
          
          if (affiliate && affiliate.payoutHistory) {
            const updatedHistory = affiliate.payoutHistory.map(p => 
              p.id === payoutId 
                ? { ...p, status: 'completed', completedAt: new Date() }
                : p
            );
            
            updatePromises.push(
              db.collection('affiliates').doc(payout.affiliateId).update({
                payoutHistory: updatedHistory,
                lastPayoutStatus: 'completed'
              })
            );
          }

          // Send completion notification to affiliate
          updatePromises.push(
            db.collection('notifications').add({
              affiliateId: payout.affiliateId,
              type: 'payout_completed',
              title: 'Payout Completed! 💰',
              message: `Your ${payout.amount.toFixed(2)} ${payout.currency} payout has been sent to your bank account. It should arrive within 1-2 business days.`,
              amount: payout.amount,
              currency: payout.currency,
              payoutId: payoutId,
              createdAt: new Date(),
              read: false
            })
          );
        }
      }

      // Mark CSV as processed
      updatePromises.push(
        db.collection('admin_csv_exports').doc(batchId).update({
          status: 'completed',
          processedAt: new Date(),
          wiseReference: wiseTransferReference || ''
        })
      );

      // Mark admin task as complete
      const adminTasksSnapshot = await db.collection('admin_tasks')
        .where('batchId', '==', batchId)
        .where('type', '==', 'process_wise_payouts')
        .get();
      
      adminTasksSnapshot.docs.forEach(doc => {
        updatePromises.push(
          doc.ref.update({
            status: 'completed',
            completedAt: new Date(),
            wiseReference: wiseTransferReference || ''
          })
        );
      });

      await Promise.all(updatePromises);

      logger.info('Batch payouts completed', { 
        batchId, 
        payoutCount: payoutIds.length,
        wiseReference: wiseTransferReference 
      });

      return {
        success: true,
        batchId,
        payoutsCompleted: payoutIds.length,
        message: `✅ ${payoutIds.length} payouts marked as completed! Affiliates have been notified.`
      };

    } catch (error) {
      logger.error('Error completing payouts', { error: error.message, batchId });
      throw new Error(error.message);
    }
  }
);

// Claim win code from Swift app (cross-Firebase bridge)
exports.claimWinCode = onCall(
  async (request) => {
    const { code, swiftUserId } = request.data;
    
    // Validate inputs
    if (!code || !swiftUserId) {
      throw new Error('Code and userId required');
    }
    
    try {
      // QUERY by code field instead of using code as document ID
      const winQuery = await db.collection('pending_wins')
        .where('code', '==', code)
        .limit(1)
        .get();
      
      // Check if code exists
      if (winQuery.empty) {
        throw new Error('Invalid win code');
      }
      
      const winDoc = winQuery.docs[0];
      const winData = winDoc.data();
      
      // Check if already claimed
      if (winData.claimed) {
        throw new Error('Code already claimed');
      }
      
      // Mark as claimed and update link stats in a transaction
      await db.runTransaction(async (transaction) => {
        // Update win code (use the actual document reference)
        transaction.update(winDoc.ref, {
          claimed: true,
          claimedBy: swiftUserId,
          claimedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Increment rating link's claimed count
        const linkRef = db.collection('rating_links').doc(winData.linkId);
        transaction.update(linkRef, {
          totalCodesClaimed: admin.firestore.FieldValue.increment(1)
        });
      });
      
      logger.info('Win code claimed', { 
        code, 
        swiftUserId, 
        points: winData.points,
        linkId: winData.linkId 
      });
      
      // Return points to Swift app
      return {
        success: true,
        points: winData.points,
        affiliateId: winData.affiliateId,
        linkId: winData.linkId
      };
      
    } catch (error) {
      logger.error('Error claiming win code', { 
        code, 
        swiftUserId, 
        error: error.message 
      });
      throw new Error(error.message);
    }
  }
);

exports.submitRating = onCall({ minInstances: 1 }, async (request) => {
  const { linkId, affiliateId, stars, fingerprint, points, spins, spinEarnings } = request.data;

  if (!linkId || !affiliateId || !stars || !fingerprint) {
    throw new Error('Missing required fields');
  }

  if (stars < 1 || stars > 5) {
    throw new Error('Invalid rating');
  }

  try {
    // 1. Get the rating link document
    const linksQuery = await db.collection('rating_links')
      .where('linkId', '==', linkId)
      .limit(1)
      .get();

    if (linksQuery.empty) {
      throw new Error('Rating link not found');
    }

    const linkDoc = linksQuery.docs[0];

    // 2. Check for duplicate fingerprint (skip in development)
    const isDevelopment = fingerprint.startsWith('dev_');

    if (!isDevelopment) {
      const existingRatingQuery = await db.collection('ratings')
        .where('linkId', '==', linkDoc.id)
        .where('fingerprint', '==', fingerprint)
        .limit(1)
        .get();

      if (!existingRatingQuery.empty) {
        throw new Error('Already rated');
      }
    }

    // 3. Get earnings per rating from config
    const configDoc = await db.collection('app_config')
      .doc('affiliate_pricing')
      .get();
    const earningsPerRating = configDoc.exists 
      ? (configDoc.data().earnings_per_rating || 0.25) 
      : 0.25;

    // 4. Calculate total points from all spins
    const totalPoints = points || 0;

    // 5. Get recruiter if exists
    const affiliateDoc = await db.collection('affiliates').doc(affiliateId).get();
    const recruiterId = affiliateDoc.exists 
      ? affiliateDoc.data()?.recruitedBy 
      : null;

    // 6. Run everything in a transaction
    const ratingRef = db.collection('ratings').doc();
    const winCodeDocId = `${linkDoc.id}_${fingerprint}`;

    await db.runTransaction(async (transaction) => {
      // ALL READS FIRST
      const recruiterSubDoc = recruiterId 
        ? await transaction.get(db.collection('affiliates').doc(recruiterId).collection('recruits').doc(affiliateId))
        : null;
      
      const recruitLinkDoc = recruiterId
        ? await transaction.get(db.collection('affiliates').doc(recruiterId).collection('recruits').doc(affiliateId).collection('recruitLinkStats').doc(linkDoc.id))
        : null;
    
      // THEN ALL WRITES
      transaction.set(ratingRef, {
        linkId: linkDoc.id,
        linkIdString: linkId,
        affiliateId: affiliateId,
        rating: stars,
        points: totalPoints,
        earnings: earningsPerRating,
        fingerprint: fingerprint,
        spins: spins || [],
        spinEarnings: spinEarnings || [],
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
      transaction.update(linkDoc.ref, {
        totalRatings: admin.firestore.FieldValue.increment(1),
        earnings: admin.firestore.FieldValue.increment(earningsPerRating),
        lastRatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
      transaction.update(db.collection('affiliates').doc(affiliateId), {
        totalRatings: admin.firestore.FieldValue.increment(1),
        totalEarnings: admin.firestore.FieldValue.increment(earningsPerRating),
        balance: admin.firestore.FieldValue.increment(earningsPerRating)
      });
    
      if (recruiterId) {
        const recruiterSubRef = db.collection('affiliates').doc(recruiterId)
          .collection('recruits').doc(affiliateId);
        
        const recruitLinkRef = db.collection('affiliates').doc(recruiterId)
          .collection('recruits').doc(affiliateId)
          .collection('recruitLinkStats').doc(linkDoc.id);
    
        const previousLinkRatings = recruitLinkDoc.exists ? (recruitLinkDoc.data()?.totalRatings || 0) : 0;
        const currentLinkRatings = previousLinkRatings + 1;
        const crossesThreshold = previousLinkRatings < 10 && currentLinkRatings >= 10;
    
        transaction.set(recruiterSubRef, {
          totalRatings: admin.firestore.FieldValue.increment(1),
          lastRatingAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(crossesThreshold && { storiesCompleted: admin.firestore.FieldValue.increment(1) })
        }, { merge: true });
    
        if (recruitLinkDoc.exists) {
          transaction.update(recruitLinkRef, {
            totalRatings: admin.firestore.FieldValue.increment(1),
            lastRatingAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(crossesThreshold && { 
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              storiesCompleted: admin.firestore.FieldValue.increment(1),
              earnings: admin.firestore.FieldValue.increment(1.00)
            })
          });
        } else {
          transaction.set(recruitLinkRef, {
            linkId: linkDoc.id,
            affiliateId: affiliateId,
            title: linkDoc.data().title || '',
            photoUrl: linkDoc.data().photoUrl || null,
            theme: linkDoc.data().theme || null,
            linkUrl: linkDoc.data().url || '',
            totalRatings: 1,
            storiesCompleted: 0,
            earnings: 0.0,
            linkCreatedAt: linkDoc.data().createdAt || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastRatingAt: admin.firestore.FieldValue.serverTimestamp(),
            completedAt: null
          });
        }
    
        if (crossesThreshold) {
          transaction.update(db.collection('affiliates').doc(recruiterId), {
            balance: admin.firestore.FieldValue.increment(1.00),
            totalEarnings: admin.firestore.FieldValue.increment(1.00),
            recruiterEarnings: admin.firestore.FieldValue.increment(1.00)
          });
        }
      }
    
      const winCode = `SS${fingerprint.substring(0, 3).toUpperCase()}${linkId.substring(0, 3).toUpperCase()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
      transaction.set(db.collection('pending_wins').doc(winCodeDocId), {
        code: winCode,
        points: totalPoints,
        affiliateId: affiliateId,
        linkId: linkDoc.id,
        fingerprint: fingerprint,
        rating: stars,
        totalSpins: spins || [],
        claimed: false,
        claimedBy: null,
        claimedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    logger.info('Rating submitted', { linkId, affiliateId, stars, totalPoints });

    return {
      success: true,
      ratingId: ratingRef.id,
      winCodeDocId: winCodeDocId,
      totalPoints: totalPoints
    };

  } catch (error) {
    logger.error('Error submitting rating', { error: error.message, linkId, affiliateId });
    throw new Error(error.message);
  }
});

// Test function
const {onRequest: onRequestV2} = require("firebase-functions/v2/https");
exports.helloWorld = onRequestV2((req, res) => {
  res.send("Hello from Firebase! Wise payouts ready with sourceCurrency! 🎉");
});