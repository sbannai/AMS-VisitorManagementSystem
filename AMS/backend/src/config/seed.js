require('dotenv').config();
const connect = require('./db');
const User = require('../models/User');

const USERS = [
  { name:'Admin User',         email:'admin@school.com',      passwordHash:'demo123', role:'admin',        avatarInitials:'AU', phone:'9000000001' },
  { name:'Priya Sharma',       email:'reception@school.com',  passwordHash:'demo123', role:'receptionist', avatarInitials:'PS', phone:'9000000002' },
  { name:'Rajan Kumar',        email:'gate@school.com',       passwordHash:'demo123', role:'gatekeeper',   avatarInitials:'RK', phone:'9000000003' },
  { name:'Ramesh Gupta',       email:'ramesh@school.com',     passwordHash:'demo123', role:'teacher', subject:'Mathematics', classSection:'10-A', avatarInitials:'RG', phone:'9000000004' },
  { name:'Sunita Patel',       email:'sunita@school.com',     passwordHash:'demo123', role:'teacher', subject:'Science',     classSection:'9-B',  avatarInitials:'SP', phone:'9000000005' },
  { name:'Arjun Menon',        email:'arjun@school.com',      passwordHash:'demo123', role:'teacher', subject:'English',     classSection:'8-C',  avatarInitials:'AM', phone:'9000000006' },
  { name:'Ravi Kumar',         email:'ravi@parent.com',       passwordHash:'demo123', role:'parent', childName:'Ananya Kumar', childClass:'10-A', avatarInitials:'RK2', phone:'9000000007' },
  { name:'Meena Reddy',        email:'meena@parent.com',      passwordHash:'demo123', role:'parent', childName:'Vikram Reddy', childClass:'9-B',  avatarInitials:'MR', phone:'9000000008' },
  { name:'Suresh Nair',        email:'suresh@parent.com',     passwordHash:'demo123', role:'parent', childName:'Kavya Nair',   childClass:'8-C',  avatarInitials:'SN', phone:'9000000009' },
];

async function seed() {
  await connect();
  await User.deleteMany({});
  for (const u of USERS) {
    await User.create(u);
  }
  console.log(`✅ Seeded ${USERS.length} users`);
  console.log('\nDemo accounts (password: demo123):');
  USERS.forEach(u => console.log(`  ${u.role.padEnd(14)} ${u.email}`));
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
