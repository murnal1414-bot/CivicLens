import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sfzefiumdsbnzwhysbny.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmemVmaXVtZHNibnp3aHlzYm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzAzMDgsImV4cCI6MjEwMjkwNjMwOH0.0QKFy24jTnhyTQODL4eYqaVs0FyGMUEFqyOZLyAeSsw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking complaints table...');
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching complaints:', error.message);
  } else {
    console.log('Complaints table exists! Sample data:', data);
  }
}

check();
