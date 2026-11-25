const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // ---------- Справочники линз ----------
  const lensBrands = ['Essilor', 'Zeiss', 'Hoya'];
  for (const name of lensBrands) {
    await prisma.lensBrand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const lensTypes = [
    'Прозрачные',
    'Компьютерные',
    'Фотохромные',
    'Солнцезащитные',
    'Для вождения',
  ];
  for (const name of lensTypes) {
    await prisma.lensType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const lensThicknesses = [
    'Базовый пластик 1.5',
    'Утончённый пластик 1.6',
    'Ультратонкие 1.67',
    'Ультратонкие 1.74',
    'Минеральные (стекло)',
  ];
  for (const name of lensThicknesses) {
    await prisma.lensThickness.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // ---------- Пользователи ----------
  const adminPassword = await bcrypt.hash('admin123', 10);
  const clientPassword = await bcrypt.hash('client123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@pvglasses.ru' },
    update: {},
    create: {
      email: 'admin@pvglasses.ru',
      password: adminPassword,
      name: 'Администратор',
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      password: clientPassword,
      name: 'Тестовый Клиент',
      role: 'client',
    },
  });

  // ---------- Оправа ----------
  const frames = [
    { brand: 'Ray-Ban', name: 'RB5154 Clubmaster', price: 8900, material: 'комбинированный', shape: 'квадратная', color: 'чёрный', isPopular: true, description: 'Классика в стиле ретро' },
    { brand: 'Ray-Ban', name: 'RB2140 Wayfarer', price: 9400, material: 'пластик', shape: 'квадратная', color: 'чёрный', isPopular: true, description: 'Легендарная модель' },
    { brand: 'Gucci', name: 'GG0396O', price: 24500, material: 'металл', shape: 'круглая', color: 'золотой', isPopular: false, description: 'Премиальная оправа' },
    { brand: 'Prada', name: 'PR 09WV', price: 19800, material: 'пластик', shape: 'кошачий глаз', color: 'коричневый', isPopular: true, description: 'Женственная модель' },
    { brand: 'Tom Ford', name: 'FT 5504', price: 22000, material: 'титан', shape: 'овальная', color: 'чёрный', isPopular: false, description: 'Титановая лёгкость' },
    { brand: 'Oakley', name: 'OX 8046', price: 12800, material: 'металл', shape: 'авиатор', color: 'голубой', isPopular: true, description: 'Спортивная модель' },
    { brand: 'Vogue', name: 'VO 5272', price: 6500, material: 'пластик', shape: 'круглая', color: 'прозрачный', isPopular: false, description: 'Лёгкая и стильная' },
    { brand: 'Dolce & Gabbana', name: 'DG 5021', price: 17500, material: 'пластик', shape: 'кошачий глаз', color: 'чёрный', isPopular: false, description: 'Эффектная оправа' },
    { brand: 'Polaroid', name: 'PLD D353', price: 5400, material: 'металл', shape: 'квадратная', color: 'коричневый', isPopular: false, description: 'Доступная классика' },
    { brand: 'Versace', name: 'VE 1245', price: 21000, material: 'металл', shape: 'овальная', color: 'золотой', isPopular: true, description: 'Роскошь в деталях' },
    { brand: 'Armani Exchange', name: 'AX 3051', price: 7200, material: 'пластик', shape: 'квадратная', color: 'голубой', isPopular: false, description: 'Молодёжный стиль' },
    { brand: 'Silhouette', name: 'SPX 5515', price: 16500, material: 'титан', shape: 'круглая', color: 'прозрачный', isPopular: false, description: 'Невесомая оправа' },
  ];

  for (const f of frames) {
    const exists = await prisma.frame.findFirst({
      where: { brand: f.brand, name: f.name },
    });
    if (!exists) {
      await prisma.frame.create({ data: f });
    }
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });