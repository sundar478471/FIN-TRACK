require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Common table names from prior schemas that might be locked
  const tables = [
    'User', 
    'audit_logs', 
    'categories', 
    'expenses', 
    'income', 
    'settings', 
    'transactions', 
    'users',
    'Account',
    'Category',
    'Transaction',
    'Budget',
    'SavingsGoal',
    'Bill',
    'Notification'
  ];
  
  console.log('🔓 Starting table schema unlock process...');
  for (const table of tables) {
    try {
      // Execute raw SQL alter table set schema_locked = false
      await prisma.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${table}" SET (schema_locked = false);`);
      console.log(`✅ Table "${table}" set to schema_locked = false`);
    } catch (err) {
      console.log(`❌ Table "${table}" unlock skipped: ${err.message}`);
    }
  }
}

main()
  .catch(err => {
    console.error('Fatal unlock error:', err);
  })
  .finally(() => {
    prisma.$disconnect();
  });
