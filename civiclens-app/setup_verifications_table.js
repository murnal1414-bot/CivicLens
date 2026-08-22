import pg from 'pg';

const connectionString = 'postgresql://postgres.sfzefiumdsbnzwhysbny:mZ0x1WHxtYFRk1eK@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // Create table complaint_verifications with double-quoted camelCase columns
    await client.query(`
      CREATE TABLE IF NOT EXISTS complaint_verifications (
        id TEXT PRIMARY KEY,
        "complaintId" TEXT NOT NULL,
        "imageUrl" TEXT,
        "detectedCategory" TEXT,
        "selectedCategory" TEXT,
        "imageConfidence" DOUBLE PRECISION,
        "imageMatch" BOOLEAN,
        "gpsVerified" TEXT,
        "gpsDistance" DOUBLE PRECISION,
        "timestampVerified" BOOLEAN,
        "riskLevel" TEXT,
        "verificationStatus" TEXT,
        "verificationReason" TEXT,
        "verifiedBy" TEXT,
        "verifiedAt" TEXT,
        "createdAt" TEXT NOT NULL
      );
    `);
    console.log('Table "complaint_verifications" created successfully.');

    // Disable RLS
    await client.query('ALTER TABLE complaint_verifications DISABLE ROW LEVEL SECURITY;');
    console.log('Row Level Security (RLS) disabled for complaint_verifications.');

  } catch (e) {
    console.error('Error setting up table complaint_verifications:', e);
  } finally {
    await client.end();
  }
}

run();
