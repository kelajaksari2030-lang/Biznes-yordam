/**
 * Customer reply templates in authentic Uzbek language with customizable placeholders
 */

import { ReplyTemplate } from '../types';

export const INITIAL_REPLY_TEMPLATES: ReplyTemplate[] = [
  {
    id: 'price-inquiry-polite',
    category: 'price',
    title: 'Narx so\'ragan mijozga muloyim va to\'liq javob',
    description: 'Narxni aytish bilan birga mahsulot qulayligi va xizmatlarni tushuntiradi',
    template: `Assalomu alaykum! {productName} narxi {price} so'm.

Ushbu narx ichiga quyidagilar kiradi:
• Asl va sifatli mahsulot
• Kafolat xizmati
• Tezkor konsultatsiya

Hozirda buyurtma berasizmi yoki qo'shimcha ma'lumot jo'nataylikmi?`,
    usageTip: 'Faqat raqamni aytish o\'rniga, mijozga nima uchun bu narx arzirli ekanligini ko\'rsatadi.',
  },
  {
    id: 'price-with-discount',
    category: 'price',
    title: 'Chegirmali narx va maxsus taklif',
    description: 'Aksiya va chegirma orqali tezroq xarid qilishga undovchi javob',
    template: `Assalomu alaykum! {productName} odatdagi narxi {price} so'm, lekin hozirda {discount} tufayli yanada qulay narxda taklif qilyapmiz!

Ushbu narxda mahsulotlar soni kam qolgan. Siz uchun band qilib qo'yaylikmi?`,
    usageTip: 'Tez qaror qabul qilishi uchun cheklangan muddat yoki miqdorni eslatadi.',
  },
  {
    id: 'product-availability',
    category: 'product',
    title: 'Mahsulot borligi va parametrlarini tasdiqlash',
    description: 'Mavjud ranglar, o\'lchamlar va tayyor holat haqida',
    template: `Assalomu alaykum! Ha, {productName} hozirda omborimizda mavjud.

Barcha talab va standartlarga javob beradi. Sizga qaysi rang yoki o'lchami ma'qul? Tanlashda yordam bera olaman.`,
    usageTip: 'Mijoz bilan darhol muloqotni davom ettirishga sabab bo\'ladi.',
  },
  {
    id: 'delivery-tashkent-regions',
    category: 'delivery',
    title: 'Yetkazib berish shartlari (Toshkent va viloyatlar)',
    description: 'Yetkazib berish muddati va narxi haqida to\'liq ma\'lumot',
    template: `Assalomu alaykum! Yetkazib berish shartlarimiz:

🛵 Toshkent shahri bo'ylab: {deliveryTime} ichida kuryer orqali yetkaziladi (Yetkazish narxi: 20 000 - 30 000 so'm yoki aksiya doirasida bepul).
🚚 Barcha viloyatlarga: BTS yoki Fargo pochtasi orqali 1-2 ish kunida yetib boradi.

To'liq manzilingizni yozsangiz, eng tez yetkazish vaqtini aniqlab beramiz!`,
    usageTip: 'Viloyat mijozlariga pochta xizmatini aniq ko\'rsatish ishonchni oshiradi.',
  },
  {
    id: 'payment-card-details',
    category: 'payment',
    title: 'To\'lov rekvizitlari va to\'lash tartibi',
    description: 'Payme / Click / UZCARD / HUMO karta rekvizitlari',
    template: `To'lov uchun rekvizitlar:

💳 Karta raqami: {cardNumber}
👤 Qabul qiluvchi: {shopName}
💰 To'lov summasi: {price} so'm

Iltimos, to'lovni amalga oshirgach, chek (skrinshot)ni shu yerga yuborsangiz, buyurtmangizni darhol qadoqlashga topshiramiz. Rahmat!`,
    usageTip: 'Chek yuborishni so\'rash buyurtma adashib ketmasligini ta\'minlaydi.',
  },
  {
    id: 'followup-gentle-reminder',
    category: 'followup',
    title: 'Ikkilangan yoki javob bermagan mijozga eslatma',
    description: 'Xushmuomala tarzda muloqotni tiklash va yordam taklif qilish',
    template: `Assalomu alaykum! Kecha {productName} haqida qiziqqan edingiz. 

Sizda mahsulot yoki yetkazib berish bo'yicha biror tushunarsiz savollar qoldimi? Siz uchun eng yaxshi variantni tanlashda mamnuniyat bilan yordam beramiz!`,
    usageTip: 'Bosim o\'tkazmasdan, samimiy g\'amxo\'rlik ohangida yozilgan.',
  },
  {
    id: 'order-confirmed',
    category: 'product',
    title: 'Buyurtma qabul qilinganligini tasdiqlash',
    description: 'Mijozga buyurtma rasmiylashtirilgani haqida xabar',
    template: `Buyurtmangiz muvaffaqiyatli qabul qilindi! 🎉

📦 Mahsulot: {productName}
💰 To'lov: {price} so'm
⏱ Yetkazish muddati: {deliveryTime}

Kuryerimiz yo'lga chiqishdan oldin siz bilan bog'lanadi. Xaridingiz uchun tashakkur!`,
    usageTip: 'Mijozda xotirjamlik va professional taassurot uyg\'otadi.',
  },
  {
    id: 'complaint-resolution',
    category: 'complaint',
    title: 'E\'tiroz yoki kechikish holatida uzr so\'rash va yechim',
    description: 'Noqulaylikni darhol bartaraf etish va mijozni rozi qilish',
    template: `Assalomu alaykum, hurmatli mijoz!

Keltirilgan noqulaylik uchun sizdan chin dildan uzr so'raymiz. Biz uchun har bir mijozimizning mamnuniyati eng birinchi o'rinda.

Ushbu masalani zudlik bilan hal qilamiz. Iltimos, telefon raqamingizni yozib yuborsangiz, mas'ul mutaxassisimiz 10 daqiqa ichida siz bilan bog'lanib, masalani ijobiy yechadi.`,
    usageTip: 'Bunday muloyim va tezkor yondashuv norozi mijozni doimiy xaridorga aylantiradi.',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'Barcha javoblar',
  price: 'Narx so\'rovlari',
  product: 'Mahsulot haqida',
  delivery: 'Yetkazib berish',
  payment: 'To\'lov rekviziti',
  followup: 'Qayta aloqa (Follow-up)',
  complaint: 'E\'tiroz va uzr',
};
