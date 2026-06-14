/**
 * Database seed script.
 * Creates the initial users from the CSV data so the app is demo-ready.
 * 
 * Users: Aisha, Rohan, Priya, Meera, Dev, Sam, Kabir
 * Default password for all: "password123"
 * 
 * Also creates the "Flat Expenses" group with correct membership dates.
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USERS = [
  { name: 'Aisha', email: 'aisha@splitease.com' },
  { name: 'Rohan', email: 'rohan@splitease.com' },
  { name: 'Priya', email: 'priya@splitease.com' },
  { name: 'Meera', email: 'meera@splitease.com' },
  { name: 'Dev', email: 'dev@splitease.com' },
  { name: 'Sam', email: 'sam@splitease.com' },
  { name: 'Kabir', email: 'kabir@splitease.com' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the default password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // Create users
  const users = {};
  for (const userData of USERS) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
      },
    });
    users[userData.name] = user;
    console.log(`  ✅ User: ${user.name} (${user.email})`);
  }

  // Create the Flat Expenses group
  const group = await prisma.group.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Flat Expenses',
      description: 'Shared expenses for our flat — rent, groceries, bills, and trips.',
      createdBy: users['Aisha'].id,
    },
  });
  console.log(`  ✅ Group: ${group.name}`);

  // Add members with correct temporal membership
  const memberships = [
    // Original flatmates — from Feb 1, 2026
    { userId: users['Aisha'].id, joinedAt: '2026-02-01', leftAt: null, role: 'ADMIN' },
    { userId: users['Rohan'].id, joinedAt: '2026-02-01', leftAt: null, role: 'MEMBER' },
    { userId: users['Priya'].id, joinedAt: '2026-02-01', leftAt: null, role: 'MEMBER' },
    // Meera: Feb 1 – March 29 (moved out end of March)
    { userId: users['Meera'].id, joinedAt: '2026-02-01', leftAt: '2026-03-29', role: 'MEMBER' },
    // Dev: joined for the Goa trip (March 8-14)
    { userId: users['Dev'].id, joinedAt: '2026-03-08', leftAt: '2026-03-14', role: 'MEMBER' },
    // Sam: moved in mid-April
    { userId: users['Sam'].id, joinedAt: '2026-04-08', leftAt: null, role: 'MEMBER' },
    // Kabir: ad-hoc for parasailing only
    { userId: users['Kabir'].id, joinedAt: '2026-03-11', leftAt: '2026-03-11', role: 'MEMBER' },
  ];

  for (const m of memberships) {
    await prisma.groupMember.upsert({
      where: {
        groupId_userId_joinedAt: {
          groupId: group.id,
          userId: m.userId,
          joinedAt: new Date(m.joinedAt),
        },
      },
      update: {},
      create: {
        groupId: group.id,
        userId: m.userId,
        joinedAt: new Date(m.joinedAt),
        leftAt: m.leftAt ? new Date(m.leftAt) : null,
        role: m.role,
      },
    });
  }
  console.log('  ✅ Group members added with temporal membership');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials (all accounts):');
  console.log('   Password: password123');
  USERS.forEach(u => console.log(`   ${u.name}: ${u.email}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
