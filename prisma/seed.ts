import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Bills',
  'Shopping',
  'Health',
  'Entertainment',
  'Other',
];

async function main() {
  for (const name of DEFAULT_CATEGORIES) {
    // NULLs are distinct in a Postgres unique index, so upsert on (userId, name)
    // cannot be used for global categories: find first, then create.
    const existing = await prisma.category.findFirst({
      where: { userId: null, name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { name, isDefault: true, userId: null },
      });
    }
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
