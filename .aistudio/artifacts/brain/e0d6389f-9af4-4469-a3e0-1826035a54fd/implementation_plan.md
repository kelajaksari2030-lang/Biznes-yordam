# BiznesYordam Loyihasini Bosqichma-Bosqich Qayta Tiklash va Refaktoring Rejasi

BiznesYordam loyihasini mavjud fayllarni saqlagan holda, tartibli, ishonchli va bosqichma-bosqich refaktoring qilish uchun batafsil reja.

---

## 1. Mavjud Loyiha Inventarizatsiyasi

### A. Root va Konfiguratsiya Fayllari
* **`package.json`**: Root va frontend bog‘liqliklari (React 19, Vite 8, Firebase 13, Tailwind CSS v4).
* **`tsconfig.json` & `vite.config.ts`**: TypeScript va Vite sozlamalari.
* **`firebase-applet-config.json`**: Firebase SDK ning asosiy konfiguratsiyasi (`gen-lang-client-0498548617`).
* **`firebase-blueprint.json`**: Firestore ma'lumotlar sxemasi (User, DailyUsage, AdDraft, SavedCalculation, CustomTemplate).
* **`firestore.rules`**: Firestore xavfsizlik va kirish qoidalari.
* **`.env.example`**: Muhit o'zgaruvchilari namunalari.

### B. Frontend Kori (`/src`)
* **`src/services/firebase.ts`**: Firebase App, Auth, Firestore va Functions SDK initsializatsiyasi.
* **`src/services/firestore.ts`**: Foydalanuvchi profili, kunlik foydalanish hisobi, qoralamalar va shablonlar bilan ishlash.
* **`src/services/adBackendService.ts`**: Backend serverga (`/api/generate-ad`) reklama yaratish so‘rovi va avto-retry mantiqi.
* **`src/services/payment.ts`**: Backend (`/api/payment/click/create-order`) orqali Click to‘lov buyurtmalarini yaratish.
* **`src/context/AuthContext.tsx`**: Firebase Auth autentifikatsiya holati va profil sinxronizatsiyasi.
* **`src/components/`**: `AdGenerator.tsx`, `PricingModal.tsx`, `Header.tsx`, `AuthModal.tsx`, `MarginCalculator.tsx`, `TemplateManager.tsx`.
* **`src/config/plans.ts`**: Free, Pro va Ultra tariflarining qat'iy cheklovlari (Free: 5/kun, Pro: 50/kun, Ultra: 200/kun).

### C. Backend Web Service (`/server`)
* **`server/src/index.ts`**: Express server entry point va API yo‘nalishlari (`/api/generate-ad`, `/api/payment/click/*`).
* **`server/src/firebaseAdmin.ts`**: Firebase Admin SDK va atrof-muhit sozlamalari.
* **`server/src/authMiddleware.ts`**: Bearer ID tokenlarini qat'iy tekshirish va xavfsiz diagnostika.
* **`server/src/quotaService.ts`**: Firestore tranzaksiyasi orqali kunlik kvotalarni tekshirish va oshirish.
* **`server/src/clickService.ts`**: Click Shop API Prepare/Complete callback'lari, MD5 imzo tekshiruvi va avtoritetli obuna berish.

---

## 2. Amaldagi Identifikatorlar va Manbalar

* **Firebase Project ID**: `gen-lang-client-0498548617`
  * *Manba*: `firebase-applet-config.json`, `server/src/firebaseAdmin.ts`, `.env.example`.
* **Firestore Database ID**: `ai-studio-biznesyordam-e0d6389f-9af4-4469-a3e0-1826035a54fd`
  * *Manba*: `firebase-applet-config.json`, `server/src/firebaseAdmin.ts`.
* **Backend API URL**: `VITE_BACKEND_API_URL` muhit o'zgaruvchisidan olinadi (masalan, `https://biznesyordam-58j9.onrender.com`).

---

## 3. Bosqichma-Bosqich Qayta Tiklash Rejasi

### Phase 1: Minimal Ishlaydigan Baza (Base Architecture)
* Frontend va Backend loyihalarining tip xavfsizligi va build holatini tekshirish.
* Environment o'zgaruvchilarini to'g'ri sanitizatsiya qilish.
* **Muvaffaqiyat Mezoni**: `compile_applet` va `npm run build:server` muvaffaqiyatli build bo'ladi. Backend `/health` endpointi 200 OK qaytaradi.

### Phase 2: Firebase Autentifikatsiyasi va Profil Sinxronizatsiyasi
* Google OAuth orqali kirish oqimini Preview hamda Production uchun bir xil, barqaror holatga keltirish.
* `currentUser.getIdToken(true)` orqali har doim eng yangi ID token olinishini ta'minlash.
* **Muvaffaqiyat Mezoni**: Foydalanuvchi Google orqali kiradi, UID va e-mail to'g'ri shakllanadi, `auth/unauthorized-domain` yoki `auth/api-key-not-valid` xatolari chiqmaydi.

### Phase 3: Firestore Xavfsizlik Qoidalari va Ma'lumotlar Saqlanishi
* `firestore.rules` qoidalarini `isOwner(userId)` tamoyili bo'yicha mustahkamlash.
* `/users/{userId}` profilini yaratish va yangilash qoidalarida `currentPlan` yoki `subscriptionStatus` miqdorlarini mijoz tomondan o'zgartirishni taqiqlash.
* Qoidalarni Firebase serveriga `DeployRules` RPC orqali yuklash.
* **Muvaffaqiyat Mezoni**: Foydalanuvchi o'z profili, qoralamalari (`adDrafts`) va hisob-kitoblarini xatosiz o'qiydi va saqlaydi. "Missing or insufficient permissions" xatolari kelmaydi.

### Phase 4: Reklama Yaratish Backend API va Kvota Nazorati
* `POST /api/generate-ad` so'rovida `requireFirebaseAuth` orqali ID tokenni tekshirish.
* Kunlik kvotani `adminDb.runTransaction` orqali atomar ravishda oshirish.
* Client tomonda 401 xatosi kelganda 1 marta avtomatik token yangilash va qayta urinish (seamless retry) mexanizmini tasdiqlash.
* **Muvaffaqiyat Mezoni**: Reklama matni hosil bo'ladi, kunlik foydalanish soni Firestore'da ortadi, limit to'lganda HTTP 429 beriladi.

### Phase 5: Tariflar va Cheklovlar Nazorati
* Free (5/kun), Pro (50/kun), Ultra (200/kun) limitlarini Firestore profildan o'qib tatbiq etish.
* **Muvaffaqiyat Mezoni**: Mijoz o'z tarifini soxtalashtira olmaydi, muddati o'tgan tariflar avtomatik Free rejimiga o'tadi.

### Phase 6: Click To'lov Tizimi Integratsiyasi
* `POST /api/payment/click/create-order` orqali buyurtma yaratish.
* Click Prepare/Complete callback'larida MD5 imzo va summani qat'iy tekshirish.
* `GET /api/payment/click/status/:orderId` orqali buyurtma holatini polling qilish va UI da ko'rsatish.
* **Muvaffaqiyat Mezoni**: To'lov muvaffaqiyatli o'tgach, Firestore foydalanuvchi profili avtomatik Pro/Ultra rejimiga o'tadi.

---

## 4. GitHub va Render Sozlamalari

* **GitHub Repozitoriyasi**: Root papkada Vite SPA frontend, `/server` papkasida Node.js Express backend joylashgan.
* **Render Static Site (Frontend)**:
  * **Build Command**: `npm install && npm run build`
  * **Publish Directory**: `dist`
  * **Env Vars**: `VITE_BACKEND_API_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`
* **Render Web Service (Backend)**:
  * **Build Command**: `npm run build:server`
  * **Start Command**: `node server/dist/index.js`
  * **Env Vars**: `FIREBASE_PROJECT_ID`, `FIRESTORE_DATABASE_ID`, `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`, `CLICK_MERCHANT_USER_ID`

---

## 5. Foydalanuvchi Bajarishi Kerak Bo‘lgan Amallar Ro‘yxati

1. **Firebase Console**:
   * `gen-lang-client-0498548617` loyihasida **Authentication** ➔ **Settings** ➔ **Authorized domains** bo'limiga `biznesyordam-58j9.onrender.com` va AI Studio preview domenlarini qo'shish.
2. **Render Environment Variables**:
   * Render Static Site uchun `VITE_BACKEND_API_URL` va `VITE_FIREBASE_PROJECT_ID=gen-lang-client-0498548617` ni o'rnatish.
   * Render Backend Web Service uchun `FIREBASE_PROJECT_ID=gen-lang-client-0498548617` hamda Click maxfiy kalitlarini kiritish.
