const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Ensure admin is initialized only once
if (!admin.apps.length) {
  admin.initializeApp();
}

const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

exports.migrateGroupVerseRanges = functions.https.onCall(async (data, context) => {
  // Security Check: Only authenticated users
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Security Check: Only Admins can run this
  const adminEmails = ["fatoomnoour@gmail.com", "admin@athar-ayah.com"];
  if (!adminEmails.includes(context.auth.token.email?.toLowerCase())) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can run this migration.'
    );
  }

  const db = admin.firestore();
  try {
    const groupsRef = db.collection('groups');
    const snapshot = await groupsRef.get();
    
    let updatedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    
    for (const docSnap of snapshot.docs) {
      const groupData = docSnap.data();
      let needsUpdate = false;
      const updates = {};
      
      if (groupData.verseRange && typeof groupData.verseRange === 'string') {
        // Convert Arabic numerals to English
        const arabicToEnglish = (str) => str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
        const engRange = arabicToEnglish(groupData.verseRange);
        
        const match = engRange.match(/(\d+)\s*-\s*(\d+)/);
        if (match && groupData.surahId) {
          const start = parseInt(match[1], 10);
          const end = parseInt(match[2], 10);
          const maxVerses = SURAH_VERSE_COUNTS[groupData.surahId - 1] || 7;
          
          let newStart = start;
          let newEnd = end;
          
          if (isNaN(newStart) || newStart < 1) newStart = 1;
          if (isNaN(newEnd) || newEnd > maxVerses) newEnd = maxVerses;
          if (newStart > newEnd) newStart = newEnd;
          
          const newRange = `${newStart} - ${newEnd}`;
          
          if (newRange !== groupData.verseRange) {
            updates.verseRange = newRange;
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        batch.update(docSnap.ref, updates);
        updatedCount++;
        batchCount++;
        
        // Firestore batch limit is 500
        if (batchCount === 450) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    return { success: true, updatedCount };
  } catch (error) {
    console.error('Migration error:', error);
    throw new functions.https.HttpsError('internal', 'An error occurred during migration.');
  }
});
