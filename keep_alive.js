// Šis skripts nolasa vienu rindu no datubāzes, lai novērstu Supabase "pausing" (iemigšanu) bezdarbības dēļ.
// Nepieciešamās bibliotēkas (jābūt instalētām projektā):
// npm install @supabase/supabase-js dotenv

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Mēģinām ielādēt .env failu no projekta saknes (viena līmeņa augstāk)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  console.warn('Brīdinājums: .env fails netika atrasts vai dotenv nav instalēts.');
}

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Kļūda: Nav atrasti SUPABASE_URL vai SUPABASE_KEY vides mainīgie.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function pingDatabase() {
  console.log(`[${new Date().toISOString()}] Pārbauda Supabase aktivitāti...`);

  const { data, error } = await supabase
    .from('apartments')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Kļūda:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Veiksmīgi nolasīts. DB ir aktīva.');
  }
}

pingDatabase();