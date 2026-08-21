const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// جدولة إرسال التنبيهات يومياً الساعة 8 مساءً بتوقيت مكة المكرمة (توقيت جرينتش +3)
exports.dailyProgressReminder = functions.pubsub.schedule('0 17 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const messaging = admin.messaging();
    
    // الحصول على تاريخ اليوم لبدء اليوم (بتوقيت مكة)
    const today = new Date();
    today.setHours(today.getHours() + 3); // تعديل مبسط للوقت
    today.setHours(0, 0, 0, 0);
    
    try {
      // 1. استرجاع جميع المستخدمين
      const usersSnapshot = await db.collection('users').get();
      
      let tokensToAlert = [];
      let inactiveUsersCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // 2. التحقق من إنجاز المستخدم اليوم
        const progressDoc = await db.collection('users').doc(userId).collection('readingProgress').doc('current').get();
        let hasReadToday = false;
        
        if (progressDoc.exists) {
          const progressData = progressDoc.data();
          if (progressData.lastReadDate) {
            const lastRead = progressData.lastReadDate.toDate ? progressData.lastReadDate.toDate() : new Date(progressData.lastReadDate);
            // إذا كان آخر قراءة اليوم
            if (lastRead >= today) {
              hasReadToday = true;
            }
          }
        }
        
        // 3. إذا لم يقرأ، نجمع التوكنز الخاصة به
        if (!hasReadToday) {
          inactiveUsersCount++;
          const tokensSnapshot = await db.collection('users').doc(userId).collection('fcmTokens').get();
          
          tokensSnapshot.forEach(tokenDoc => {
            if (tokenDoc.data().token) {
              tokensToAlert.push(tokenDoc.data().token);
            }
          });
        }
      }
      
      // 4. إرسال الإشعارات
      if (tokensToAlert.length > 0) {
        // رسائل تحفيزية عشوائية
        const messages = [
          "لم تقرأ وردك اليوم بعد. قليل دائم خير من كثير منقطع، ابدأ الآن!",
          "شجرتك الإيمانية تنتظر السقيا.. لا تنسَ وردك اليوم.",
          "دقائق قليلة مع القرآن تصنع فارقاً كبيراً في يومك، افتح مصحفك الآن.",
          "خطوتك الأولى اليوم: ابدأ وردك لفتح أبواب الإنجاز."
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const payload = {
          notification: {
            title: 'أثر آية - تذكير الورد اليومي',
            body: randomMessage,
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            type: 'daily_reminder'
          }
        };
        
        // Firebase Admin يسمح بإرسال 500 توكن كحد أقصى في الدفعة الواحدة
        const batches = [];
        for (let i = 0; i < tokensToAlert.length; i += 500) {
          const batchTokens = tokensToAlert.slice(i, i + 500);
          batches.push(messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: payload.notification,
            data: payload.data
          }));
        }
        
        const results = await Promise.all(batches);
        console.log(`Successfully sent daily reminders to ${inactiveUsersCount} inactive users.`);
      } else {
        console.log('All users have read their daily wird today! No reminders sent.');
      }
      
      return null;
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      return null;
    }
  });
