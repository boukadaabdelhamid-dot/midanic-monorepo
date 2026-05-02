import { db, schema } from "./lib/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding Midanic database...");

  // Categories
  const categories = await db.insert(schema.categoriesTable).values([
    { nameAr: "عناية بالشعر", nameEn: "Hair Care" },
    { nameAr: "عناية بالبشرة", nameEn: "Skin Care" },
    { nameAr: "أدوات الحلاقة", nameEn: "Shaving" },
    { nameAr: "مكياج", nameEn: "Makeup" },
  ]).returning();
  console.log("Categories created:", categories.length);

  const [hairCare, skinCare, shaving, makeup] = categories;

  // Products
  const products = await db.insert(schema.productsTable).values([
    // Hair Care
    { nameAr: "شامبو مغذي بزيت الأرغان", nameEn: "Argan Oil Nourishing Shampoo", descriptionAr: "شامبو فاخر مغذي للشعر الجاف والتالف بزيت الأرغان المغربي", descriptionEn: "Luxury nourishing shampoo for dry and damaged hair with Moroccan argan oil", price: "85.00", stock: 45, categoryId: hairCare.id, imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400" },
    { nameAr: "بلسم الكيراتين للشعر", nameEn: "Keratin Hair Conditioner", descriptionAr: "بلسم قوي يعيد الحيوية والنعومة للشعر بتقنية الكيراتين", descriptionEn: "Powerful conditioner that restores vitality and smoothness with keratin technology", price: "72.00", stock: 38, categoryId: hairCare.id, imageUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400" },
    { nameAr: "ماسك الشعر بالعسل والحليب", nameEn: "Honey & Milk Hair Mask", descriptionAr: "ماسك مكثف للعناية العميقة بالشعر بالعسل الطبيعي وحليب الشوفان", descriptionEn: "Intensive deep care hair mask with natural honey and oat milk", price: "95.00", stock: 28, categoryId: hairCare.id, imageUrl: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400" },
    { nameAr: "زيت الشعر متعدد الاستخدام", nameEn: "Multi-Use Hair Oil", descriptionAr: "زيت خفيف غني بالفيتامينات لتغذية وتلميع الشعر", descriptionEn: "Lightweight vitamin-rich oil to nourish and shine hair", price: "110.00", stock: 55, categoryId: hairCare.id, imageUrl: "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400" },

    // Skin Care
    { nameAr: "كريم مرطب للبشرة الجافة", nameEn: "Intensive Moisturizing Cream", descriptionAr: "كريم مرطب عميق للبشرة الجافة والحساسة بخلاصة الصبار والفيتامين E", descriptionEn: "Deep moisturizing cream for dry and sensitive skin with aloe vera and vitamin E", price: "120.00", stock: 60, categoryId: skinCare.id, imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400" },
    { nameAr: "سيروم فيتامين سي المضيء", nameEn: "Vitamin C Brightening Serum", descriptionAr: "سيروم مضيء ومعادل لتلون البشرة بتركيبة فيتامين سي المستقرة", descriptionEn: "Brightening and even-toning serum with stabilized vitamin C formula", price: "185.00", stock: 30, categoryId: skinCare.id, imageUrl: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=400" },
    { nameAr: "واقي شمس SPF 50", nameEn: "Sunscreen SPF 50", descriptionAr: "واقي شمس خفيف لا يترك أثراً أبيض مناسب للاستخدام اليومي", descriptionEn: "Lightweight sunscreen with no white cast, suitable for daily use", price: "98.00", stock: 75, categoryId: skinCare.id, imageUrl: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400" },
    { nameAr: "منظف الوجه بالفحم النشط", nameEn: "Activated Charcoal Face Cleanser", descriptionAr: "منظف عميق بالفحم النشط لإزالة الشوائب وتضييق المسام", descriptionEn: "Deep cleanser with activated charcoal to remove impurities and minimize pores", price: "65.00", stock: 42, categoryId: skinCare.id, imageUrl: "https://images.unsplash.com/photo-1556228852-6d35a585d566?w=400" },

    // Shaving
    { nameAr: "موس الحلاقة بالألوة فيرا", nameEn: "Aloe Vera Shaving Foam", descriptionAr: "موس حلاقة مرطب وهادئ للبشرة بخلاصة الألوة فيرا الطبيعية", descriptionEn: "Moisturizing and soothing shaving foam with natural aloe vera extract", price: "45.00", stock: 80, categoryId: shaving.id, imageUrl: "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=400" },
    { nameAr: "ماكينة حلاقة بخمس شفرات", nameEn: "5-Blade Precision Razor", descriptionAr: "ماكينة حلاقة احترافية بخمس شفرات دقيقة لحلاقة سلسة وقريبة", descriptionEn: "Professional 5-blade razor for a smooth and close shave", price: "220.00", stock: 25, categoryId: shaving.id, imageUrl: "https://images.unsplash.com/photo-1621607512214-68297480165e?w=400" },
    { nameAr: "بلسم ما بعد الحلاقة", nameEn: "After-Shave Balm", descriptionAr: "بلسم مهدئ ومرطب بعد الحلاقة لتخفيف الاحمرار والحرقة", descriptionEn: "Soothing and moisturizing post-shave balm to reduce redness and burning", price: "58.00", stock: 50, categoryId: shaving.id, imageUrl: "https://images.unsplash.com/photo-1564463836146-4e30522c2984?w=400" },

    // Makeup
    { nameAr: "أحمر شفاه مات طويل الأمد", nameEn: "Long-Lasting Matte Lipstick", descriptionAr: "أحمر شفاه مات فاخر يدوم طوال اليوم بألوان زاهية ومميزة", descriptionEn: "Premium matte lipstick that lasts all day in vibrant and distinctive colors", price: "55.00", stock: 65, categoryId: makeup.id, imageUrl: "https://images.unsplash.com/photo-1586495777744-4e6232bf2176?w=400" },
    { nameAr: "كريم أساس تغطية كاملة", nameEn: "Full Coverage Foundation", descriptionAr: "كريم أساس بتغطية كاملة ومثبت طويل الأمد لبشرة مثالية", descriptionEn: "Full coverage foundation with long-lasting formula for flawless skin", price: "145.00", stock: 35, categoryId: makeup.id, imageUrl: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400" },
    { nameAr: "مسكرة تكثيف وتطويل", nameEn: "Volume & Length Mascara", descriptionAr: "مسكرة تمنح الرموش الكثافة والطول الفائق بلا تكتلات", descriptionEn: "Mascara that gives lashes extreme volume and length without clumping", price: "75.00", stock: 48, categoryId: makeup.id, imageUrl: "https://images.unsplash.com/photo-1631214524020-3c69b3b92462?w=400" },
    { nameAr: "باليت ظلال العيون (12 لون)", nameEn: "Eyeshadow Palette 12 Colors", descriptionAr: "باليت احترافي بـ12 لوناً متناسقاً من الظلال المعتمة والمضيئة", descriptionEn: "Professional palette with 12 coordinated matte and shimmer eyeshadow shades", price: "195.00", stock: 22, categoryId: makeup.id, imageUrl: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400" },
    { nameAr: "هايلايتر لمعان طبيعي", nameEn: "Natural Glow Highlighter", descriptionAr: "هايلايتر ناعم يضفي لمعاناً طبيعياً ومشرقاً على الوجه", descriptionEn: "Smooth highlighter that adds a natural and radiant glow to the face", price: "88.00", stock: 40, categoryId: makeup.id, imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400" },
  ]).returning();
  console.log("Products created:", products.length);

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  await db.insert(schema.usersTable).values({
    name: "Midanic Admin",
    email: "admin@midanic.com",
    passwordHash: adminHash,
    role: "admin",
    preferredLang: "ar",
  }).onConflictDoNothing();

  // Test customer
  const customerHash = await bcrypt.hash("customer123", 10);
  await db.insert(schema.usersTable).values({
    name: "أحمد محمد",
    email: "ahmed@example.com",
    passwordHash: customerHash,
    role: "customer",
    preferredLang: "ar",
  }).onConflictDoNothing();

  // Coupons
  await db.insert(schema.couponsTable).values([
    { code: "MIDANIC10", type: "percent", value: "10", minOrder: "100", usageLimit: 100 },
    { code: "WELCOME20", type: "percent", value: "20", minOrder: "200", usageLimit: 50 },
    { code: "SAVE50", type: "fixed", value: "50", minOrder: "300", usageLimit: 30 },
  ]).onConflictDoNothing();

  // Sample employees
  await db.insert(schema.employeesTable).values([
    { name: "سارة أحمد", email: "sara@midanic.com", phone: "0501234567", position: "مدير المبيعات", salary: "8000", hireDate: "2022-01-15" },
    { name: "محمد علي", email: "mohammed@midanic.com", phone: "0509876543", position: "موظف مخزن", salary: "5000", hireDate: "2022-06-01" },
    { name: "فاطمة حسن", email: "fatima@midanic.com", phone: "0555551234", position: "خدمة العملاء", salary: "6000", hireDate: "2023-03-10" },
  ]).onConflictDoNothing();

  // Sample supplier
  const [supplier] = await db.insert(schema.suppliersTable).values([
    { name: "شركة الجمال للتوزيع", contactName: "خالد يوسف", email: "khalid@beauty-dist.com", phone: "0112345678", address: "الرياض، حي الصناعية" },
    { name: "مستورد الأزياء العالمية", contactName: "ريم السعد", email: "reem@fashion-import.com", phone: "0126789012", address: "جدة، الكورنيش" },
  ]).returning();

  // Sample transactions
  await db.insert(schema.transactionsTable).values([
    { type: "income", category: "sales", amount: "12500", description: "مبيعات الأسبوع الأول", date: "2024-01-01", reference: "WEEK-1" },
    { type: "expense", category: "rent", amount: "3500", description: "إيجار المخزن - يناير", date: "2024-01-05" },
    { type: "expense", category: "salary", amount: "19000", description: "رواتب الموظفين - يناير", date: "2024-01-31" },
    { type: "income", category: "sales", amount: "18200", description: "مبيعات الأسبوع الثاني", date: "2024-02-01", reference: "WEEK-2" },
    { type: "expense", category: "purchase", amount: "8500", description: "مشتريات منتجات جديدة", date: "2024-02-10" },
    { type: "expense", category: "marketing", amount: "2000", description: "حملة إعلانية سوشيال ميديا", date: "2024-02-15" },
  ]);

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
