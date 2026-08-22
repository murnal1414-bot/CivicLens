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
    console.log('Connected to Supabase PostgreSQL database via Tokyo Pooler (Recreating table).');

    // Drop table if exists to start fresh with new schema
    await client.query('DROP TABLE IF EXISTS complaints;');
    console.log('Dropped existing complaints table.');

    // Create complaints table with citizen identifier fields
    await client.query(`
      CREATE TABLE complaints (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        category TEXT NOT NULL,
        categoryIcon TEXT NOT NULL,
        location TEXT NOT NULL,
        density TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        slaRemaining TEXT NOT NULL,
        slaTotal TEXT NOT NULL,
        assignee TEXT,
        initials TEXT,
        description TEXT NOT NULL,
        voiceUrl TEXT,
        photoUrl TEXT,
        citizenEmail TEXT,
        citizenPhone TEXT
      );
    `);
    console.log('Table "complaints" recreated successfully with citizen fields.');

    // Disable RLS
    await client.query('ALTER TABLE complaints DISABLE ROW LEVEL SECURITY;');
    console.log('Row Level Security (RLS) disabled.');

  } catch (e) {
    console.error('Error setting up database:', e);
  } finally {
    await client.end();
  }
}

run();
