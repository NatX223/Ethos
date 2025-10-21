import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
let CREDENTIALS;
try {
  const credBase64 = process.env.CRED;
  if (!credBase64) {
    throw new Error('CRED environment variable is not set');
  }
  
  CREDENTIALS = JSON.parse(
    Buffer.from(credBase64, 'base64').toString('utf-8')
  );
} catch (error) {
  console.error('❌ Failed to parse Firebase credentials:', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(CREDENTIALS),
});

const db = admin.firestore();

// Sample goal addresses (these would be real deployed contract addresses in production)
const sampleGoalAddresses = [
  '0x1234567890123456789012345678901234567890',
  '0x2345678901234567890123456789012345678901',
  '0x3456789012345678901234567890123456789012',
  '0x4567890123456789012345678901234567890123',
  '0x5678901234567890123456789012345678901234',
  '0x6789012345678901234567890123456789012345',
  '0x7890123456789012345678901234567890123456',
  '0x8901234567890123456789012345678901234567',
  '0x9012345678901234567890123456789012345678',
  '0xa123456789012345678901234567890123456789',
];

async function populateGoalAddresses() {
  try {
    console.log('🚀 Starting to populate goal addresses...');

    const batch = db.batch();

    for (const address of sampleGoalAddresses) {
      const docRef = db.collection('goalAddresses').doc();
      batch.set(docRef, {
        address: address,
        isUsed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    console.log(`✅ Successfully added ${sampleGoalAddresses.length} goal addresses to the database`);
    console.log('📋 Added addresses:');
    sampleGoalAddresses.forEach((addr, index) => {
      console.log(`   ${index + 1}. ${addr}`);
    });

  } catch (error) {
    console.error('❌ Error populating goal addresses:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
populateGoalAddresses();