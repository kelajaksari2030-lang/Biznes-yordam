# BiznesYordam - Bepul Render Web Xizmati va Firebase O'rnatish Qo'llanmasi

Ushbu qo'llanma **BiznesYordam** loyihasining backend qismini hech qanday boshlang'ich to'lovsiz (**$0/oy**, mutlaqo bepul) **Render** platformasida ishga tushirish uchun mo'ljallangan. Barcha amallarni telefon (Android / iPhone) yoki kompyuter brauzeri orqali bajarish mumkin.

---

## 🎯 Arxitektura va Imkoniyatlar

1. **Frontend**: Vite + React ilovasi (AI Studio yoki har qanday bepul hostingda ishlaydi).
2. **Backend**: Render Free Web Service (Node.js + Express).
3. **Ma'lumotlar bazasi**: Mavjud Firebase Firestore (`ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd`).
4. **Autentifikatsiya**: Google orqali Firebase Authentication (ID Token tekshiruvi).
5. **Xavfsiz kvota**: Bepul (5 ta), Pro (50 ta), Ultra (200 ta) kunlik limitlar server tranzaksiyasi orqali atomar tarzda nazorat qilinadi.

---

## 📱 1-QADAM: Firebase Xizmat Kalitini Olish (5 daqiqa)

1. Telefonda brauzerni oching va [console.firebase.google.com](https://console.firebase.google.com) manziliga kiring.
2. `gen-lang-client-0498548617` loyihangizni tanlang.
3. Yuqoridagi tishli g'ildirakcha ⚙️ belgisini bosing va **Project settings** (Loyiha sozlamalari) bo'limiga o'ting.
4. **Service accounts** (Xizmat hisoblari) yorlig'ini bosing.
5. Pastroqda joylashgan **Generate new private key** (Yangi shaxsiy kalit yaratish) ko'k tugmasini bosing.
6. Tasdiqlash oynasida **Generate key** tugmasini bosing. Telefonga bitta `.json` fayl yuklanadi (masalan: `gen-lang-client-0498548617-firebase-adminsdk-....json`).
7. Ushbu faylni istalgan matn muharririda oching. Undagi butun matn (barcha `{ ... }` qavslar bilan birga) Render uchun kerak bo'ladi.

> ⚠️ **Muhim eslatma:** Ushbu kalit maxfiy hisoblanadi. Uni hech qachon GitHub-ga yuklamang yoki frontend kodiga yozmang. U faqat Render maxfiy o'zgaruvchilarida saqlanadi.

---

## 🚀 2-QADAM: Render.com da Bepul Web Xizmat Ochish (5 daqiqa)

1. Brauzerda [render.com](https://render.com) saytiga kiring.
2. **Get Started** yoki **Sign Up** tugmasini bosib, GitHub yoki Google hisobingiz orqali ro'yxatdan o'ting (**Karta kiritish talab etilmaydi!**).
3. Asosiy sahifada **New +** tugmasini bosing va **Web Service** ni tanlang.
4. Loyiha kodi joylashgan GitHub repozitoriysini ulang (yoki public Git URL manzilini kiriting).
5. Sozlamalarni quyidagicha to'ldiring:
   - **Name**: `biznesyordam-backend` (yoki o'zingizga yoqqan nom)
   - **Region**: `Singapore (Southeast Asia)` (O'zbekistonga eng yaqin va tezkor)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free ($0/month)** ni tanlang.

---

## 🔐 3-QADAM: Render Maxfiy O'zgaruvchilarini Kiritish (Environment Variables)

Xuddi shu sahifada yoki ochilgan xizmatning **Environment** bo'limida quyidagi o'zgaruvchilarni qo'shing:

| O'zgaruvchi Nomi | Tavsifi / Namunaviy Qiymati | Majburiymi? |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ha |
| `PORT` | `10000` (Render o'zi avtomatik ham o'rnatadi) | Ha |
| `CORS_ORIGIN` | `*` (yoki frontend domeningiz manzili) | Ha |
| `FIREBASE_PROJECT_ID` | `gen-lang-client-0498548617` | Ha |
| `FIRESTORE_DATABASE_ID` | `ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd` | Ha |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | 1-qadamda yuklab olingan `.json` fayl ichidagi barcha matn | **Ha (A varianti)** |
| `ADMIN_UIDS` | Backend admin huquqi uchun Firebase Auth UID(lar), vergul bilan ajratiladi | Yo'q (ixtiyoriy) |

*(Agar telefoningizda butun JSON ni nusxalash qiyin bo'lsa, JSON ichidagi `client_email` ni `FIREBASE_CLIENT_EMAIL`, va `private_key` ni `FIREBASE_PRIVATE_KEY` o'zgaruvchilariga alohida ham kiritishingiz mumkin).*

Barcha o'zgaruvchilarni kiritgach, **Save Changes** yoki **Create Web Service** tugmasini bosing. Render loyihani avtomatik quradi va ishga tushiradi (taxminan 1-2 daqiqa).

Tayyor bo'lgach, Render sizga quyidagicha bepul havola beradi:
`https://biznesyordam-backend.onrender.com`

Brauzerda `https://sizning-servisingiz.onrender.com/health` manziliga kiring — `{"status":"healthy"}` yozuvi chiqsa, backend to'liq ishga tushgan bo'ladi!

---

## 🔗 4-QADAM: Frontendni Render Backendiga Ulash

Frontend loyihangizning `.env` fayliga (yoki hosting muhitiga) Render bergan havolani qo'shing:

```env
VITE_BACKEND_API_URL=https://sizning-servisingiz.onrender.com
```

Shundan so'ng frontenddagi "Reklama matnini yaratish" tugmasi avtomatik tarzda Render serveringiz orqali xavfsiz kvotani tekshirib matnlarni yaratadi.

---

## 💤 Render Bepul Tarifining Muhim Xususiyati (Cold Start)

- **Uyqu rejimi**: Render'ning bepul veb-xizmatlari 15 daqiqa davomida hech kim kirmasa, resurs tejash uchun avtomatik "uyqu" (spin down) holatiga o'tadi.
- **Uyg'onish vaqti**: 15 daqiqadan so'ng kimdir birinchi marta reklama yaratmoqchi bo'lsa, server uyg'onishi uchun taxminan **30-50 soniya** vaqt oladi.
- BiznesYordam frontendida ushbu holat uchun maxsus qulay bildirishnoma tayyorlangan — mijoz kutib tursa, server uyg'ongach so'rov muvaffaqiyatli bajariladi va keyingi barcha so'rovlar soniyaning ulushlarida tez ishlaydi.


### Admin huquqlarini xavfsiz sozlash

Admin vakolati endi email manziliga qarab berilmaydi. Firestore qoidalarida faqat Firebase Admin SDK tomonidan serverda berilgan `admin: true` custom claim qabul qilinadi. Backenddagi ixtiyoriy `ADMIN_UIDS` o'zgaruvchisi vergul bilan ajratilgan Firebase Authentication UID'lari orqali faqat backend kvota/simulyatsiya huquqini beradi; u Firestore Security Rules o'rnini bosmaydi. UID'ni Firebase Console → Authentication → Users bo'limidan olish mumkin. Hech qachon email yoki client-editable Firestore profil maydonidan admin huquqi sifatida foydalanmang.
