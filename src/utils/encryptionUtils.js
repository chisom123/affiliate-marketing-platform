// encryptionUtils.js
class EncryptionManager {
    static ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY;
    
    static async getKey() {
      if (!this.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY not found in environment variables');
      }
      
      // Convert base64 key to CryptoKey
      const keyData = Uint8Array.from(atob(this.ENCRYPTION_KEY), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
    }
    
    static async encrypt(object) {
      try {
        const key = await this.getKey();
        
        // Convert object to JSON string then to bytes
        const jsonString = JSON.stringify(object);
        const data = new TextEncoder().encode(jsonString);
        
        // Generate random IV (12 bytes for GCM)
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        );
        
        // Combine IV + encrypted data (same format as iOS)
        const combined = new Uint8Array(iv.length + encryptedData.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encryptedData), iv.length);
        
        return {
          data: btoa(String.fromCharCode.apply(null, combined)),
          algorithm: 'AES-256-GCM'
        };
      } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
      }
    }
    
    static async decrypt(encryptedData) {
      try {
        const key = await this.getKey();
        
        // Decode base64 data
        const combinedData = Uint8Array.from(atob(encryptedData.data), c => c.charCodeAt(0));
        
        // Extract IV (first 12 bytes) and encrypted data
        const iv = combinedData.slice(0, 12);
        const encrypted = combinedData.slice(12);
        
        // Decrypt the data
        const decryptedData = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          encrypted
        );
        
        // Convert back to object
        const jsonString = new TextDecoder().decode(decryptedData);
        return JSON.parse(jsonString);
      } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data');
      }
    }
    
    // Test function to verify encryption/decryption works
    static async testEncryption() {
      console.log('🔐 Testing React Encryption System...');
      
      const testData = {
        accountHolderName: "John Doe",
        bankName: "Test Bank",
        accountNumber: "1234567890",
        routingNumber: "987654321",
        accountType: "checking",
        addressLine1: "123 Main St",
        city: "New York",
        state: "NY",
        zipCode: "10001"
      };
      
      try {
        // Test encryption
        const encrypted = await this.encrypt(testData);
        console.log('✅ React encryption successful');
        console.log('   Encrypted data preview:', encrypted.data.substring(0, 20) + '...');
        
        // Test decryption
        const decrypted = await this.decrypt(encrypted);
        console.log('✅ React decryption successful');
        console.log('   Account holder:', decrypted.accountHolderName);
        console.log('   Bank:', decrypted.bankName);
        console.log('   Account: ****' + decrypted.accountNumber.slice(-4));
        
        // Verify data integrity
        if (testData.accountHolderName === decrypted.accountHolderName &&
            testData.accountNumber === decrypted.accountNumber) {
          console.log('✅ React data integrity verified - encryption/decryption working perfectly!');
          return true;
        } else {
          console.log('❌ React data integrity failed');
          return false;
        }
        
      } catch (error) {
        console.log('❌ React encryption test failed:', error);
        return false;
      }
    }
  }
  
  // Helper function to decrypt bank account from Firestore data
  export const decryptBankAccount = async (encryptedBankAccount) => {
    return await EncryptionManager.decrypt(encryptedBankAccount);
  };
  
  // Helper function to encrypt bank account (if needed for testing)
  export const encryptBankAccount = async (bankAccount) => {
    return await EncryptionManager.encrypt(bankAccount);
  };
  
  // Test function that can be called from anywhere
  export const testReactEncryption = async () => {
    return await EncryptionManager.testEncryption();
  };
  
  export default EncryptionManager;