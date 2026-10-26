import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

// Check if valid Supabase credentials exist
const hasValidSupabaseConfig = Boolean(
  SUPABASE_URL &&
  SUPABASE_KEY &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-project')
);

// Initial in-memory demo dataset
const INITIAL_DEMO_DATA = {
  users: [
    {
      id: 'user-admin',
      email: 'admin@barona78.lv',
      password: 'admin',
      role: 'admin',
      full_name: 'Mājas Pārvaldnieks'
    },
    {
      id: 'user-1',
      email: 'dzivoklis1@barona78.lv',
      password: 'user123',
      role: 'user',
      full_name: 'Jānis Bērziņš',
      apartment_id: 'apt-1'
    }
  ],
  apartments: [
    {
      id: 'apt-1',
      number: '1',
      area: 54.5,
      declared_persons: 2,
      owner_name: 'Jānis',
      owner_surname: 'Bērziņš',
      personal_code: '120580-12345',
      phone: '+371 20000001',
      email: 'dzivoklis1@barona78.lv',
      share: 0.32,
      registration_number: 'LV05016004137',
      apartment_address: 'Kr. Barona iela 78 - 1',
      is_residential: true
    },
    {
      id: 'apt-2',
      number: '2',
      area: 72.0,
      declared_persons: 3,
      owner_name: 'Anna',
      owner_surname: 'Liepiņa',
      personal_code: '250885-23456',
      phone: '+371 20000002',
      email: 'anna.liepina@example.lv',
      share: 0.43,
      registration_number: 'LV05016004138',
      apartment_address: 'Kr. Barona iela 78 - 2',
      is_residential: true
    },
    {
      id: 'apt-3',
      number: '3',
      area: 42.3,
      declared_persons: 1,
      owner_name: 'Pēteris',
      owner_surname: 'Ozols',
      personal_code: '140292-34567',
      phone: '+371 20000003',
      email: 'peteris.ozols@example.lv',
      share: 0.25,
      registration_number: 'LV05016004139',
      apartment_address: 'Kr. Barona iela 78 - 3',
      is_residential: true
    }
  ],
  settings: [
    { id: 'set-1', setting_key: 'building_name', setting_value: 'BIEDRĪBA "BARONA 78"' },
    { id: 'set-2', setting_key: 'building_code', setting_value: '40008325768' },
    { id: 'set-3', setting_key: 'building_address', setting_value: 'Kr. Barona iela 78-14, Rīga, LV-1001' },
    { id: 'set-4', setting_key: 'payment_iban', setting_value: 'LV62HABA0551064112797' },
    { id: 'set-5', setting_key: 'payment_bank', setting_value: 'Habib Bank' },
    { id: 'set-6', setting_key: 'payment_email', setting_value: 'info@barona78.lv' },
    { id: 'set-7', setting_key: 'payment_phone', setting_value: '+371 67800000' }
  ],
  tariffs: [
    {
      id: 'tar-1',
      name: 'Apsaimniekošana',
      period: '2024-05',
      price_per_m2: 0.65,
      is_per_m2: true,
      is_equal_split: false,
      is_fixed_amount: false,
      is_discount: false,
      total_amount: 109.72,
      created_at: '2024-05-01T08:00:00Z'
    },
    {
      id: 'tar-2',
      name: 'Uzkrājumu fonds',
      period: '2024-05',
      price_per_m2: 0.35,
      is_per_m2: true,
      is_equal_split: false,
      is_fixed_amount: false,
      is_discount: false,
      total_amount: 59.08,
      created_at: '2024-05-01T08:00:00Z'
    }
  ],
  water_tariffs: [
    {
      id: 'wt-1',
      period: '2024-05',
      price_per_m3: 2.10,
      vat_rate: 21,
      include_in_invoice: true,
      diff_m3: 0,
      diff_price: 0
    }
  ],
  hot_water_tariffs: [
    {
      id: 'hwt-1',
      period: '2024-05',
      price_per_m3: 6.50,
      vat_rate: 12,
      include_in_invoice: true,
      diff_m3: 0,
      diff_price: 0
    }
  ],
  waste_tariffs: [
    {
      id: 'wst-1',
      period: '2024-05',
      price_per_person: 4.50,
      total_amount: 27.00
    }
  ],
  water_consumption: [
    {
      id: 'wc-prev-1',
      apartment_id: 'apt-1',
      period: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`,
      meter_type: 'water',
      consumption_m3: 3.4
    },
    {
      id: 'wc-prev-2',
      apartment_id: 'apt-1',
      period: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`,
      meter_type: 'hot_water',
      consumption_m3: 1.8
    }
  ],
  meter_readings: [
    {
      id: 'mr-prev-1',
      apartment_id: 'apt-1',
      meter_type: 'water',
      reading_date: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}-26`,
      reading_value: 124.60,
      period: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`
    },
    {
      id: 'mr-prev-2',
      apartment_id: 'apt-1',
      meter_type: 'hot_water',
      reading_date: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}-26`,
      reading_value: 48.20,
      period: `${new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear()}-${String(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`
    }
  ],
  invoices: []
};

function getStorageData() {
  try {
    const raw = localStorage.getItem('barona78_mock_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      // Pārliecināmies, ka visas tabulas eksistē
      Object.keys(INITIAL_DEMO_DATA).forEach((key) => {
        if (!parsed[key]) {
          parsed[key] = INITIAL_DEMO_DATA[key];
        }
      });
      // Ja apt-1 nav iepriekšējo rādījumu, pievienojam tos
      if (Array.isArray(parsed.meter_readings) && parsed.meter_readings.length === 0) {
        parsed.meter_readings = [...INITIAL_DEMO_DATA.meter_readings];
      }
      return parsed;
    }
  } catch (e) {
    // ignore
  }
  return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
}

function saveStorageData(data) {
  try {
    localStorage.setItem('barona78_mock_db', JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

function createMockSupabaseClient() {
  console.warn('[AI Studio] Supabase environment variables not configured. Using local in-memory fallback client with seed data.');

  return {
    from: (tableName) => {
      const filters = [];
      const sortConfig = [];
      let isSingle = false;
      let limitCount = null;
      let isDelete = false;
      let isUpdate = false;
      let updatePayload = null;

      const builder = {
        select: (columns = '*') => {
          return builder;
        },
        eq: (field, val) => {
          filters.push((row) => String(row[field] ?? '') === String(val ?? ''));
          return builder;
        },
        neq: (field, val) => {
          filters.push((row) => String(row[field] ?? '') !== String(val ?? ''));
          return builder;
        },
        order: (field, { ascending = true } = {}) => {
          sortConfig.push({ field, ascending });
          return builder;
        },
        limit: (n) => {
          limitCount = n;
          return builder;
        },
        single: () => {
          isSingle = true;
          return builder;
        },
        delete: () => {
          isDelete = true;
          return builder;
        },
        update: (updates) => {
          isUpdate = true;
          updatePayload = updates;
          return builder;
        },
        then: (resolve, reject) => {
          try {
            const db = getStorageData();
            if (!db[tableName]) db[tableName] = [];

            // Apstrādājam DELETE vaicājumus ar filtriem
            if (isDelete) {
              const beforeCount = db[tableName].length;
              db[tableName] = db[tableName].filter((row) => {
                const matches = filters.every((filterFn) => filterFn(row));
                return !matches;
              });
              saveStorageData(db);
              resolve({ data: null, error: null, count: beforeCount - db[tableName].length });
              return;
            }

            // Apstrādājam UPDATE vaicājumus ar filtriem
            if (isUpdate) {
              let updatedCount = 0;
              db[tableName] = db[tableName].map((row) => {
                const matches = filters.every((filterFn) => filterFn(row));
                if (matches) {
                  updatedCount++;
                  return { ...row, ...updatePayload };
                }
                return row;
              });
              saveStorageData(db);
              resolve({ data: updatePayload, error: null, count: updatedCount });
              return;
            }

            // Standarta SELECT vaicājumi
            let rows = [...db[tableName]];

            for (const filterFn of filters) {
              rows = rows.filter(filterFn);
            }

            for (const { field, ascending } of sortConfig) {
              rows.sort((a, b) => {
                const va = a[field] ?? '';
                const vb = b[field] ?? '';
                if (va < vb) return ascending ? -1 : 1;
                if (va > vb) return ascending ? 1 : -1;
                return 0;
              });
            }

            if (limitCount !== null) {
              rows = rows.slice(0, limitCount);
            }

            if (isSingle) {
              if (rows.length === 0) {
                resolve({ data: null, error: { code: 'PGRST116', message: 'Row not found' } });
              } else {
                resolve({ data: rows[0], error: null });
              }
            } else {
              resolve({ data: rows, error: null });
            }
          } catch (err) {
            resolve({ data: null, error: err });
          }
        },
        insert: async (items) => {
          const db = getStorageData();
          if (!db[tableName]) db[tableName] = [];
          const inserted = (Array.isArray(items) ? items : [items]).map((item) => ({
            id: item.id || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            created_at: item.created_at || new Date().toISOString(),
            ...item
          }));
          db[tableName].push(...inserted);
          saveStorageData(db);
          return { data: inserted, error: null };
        },
        upsert: async (itemOrItems, options = {}) => {
          const db = getStorageData();
          if (!db[tableName]) db[tableName] = [];
          const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
          const conflictKeys = (options?.onConflict || 'id').split(',').map((s) => s.trim());

          for (const item of items) {
            const idx = db[tableName].findIndex((row) =>
              conflictKeys.every((key) => String(row[key] ?? '') === String(item[key] ?? ''))
            );
            if (idx >= 0) {
              db[tableName][idx] = { ...db[tableName][idx], ...item };
            } else {
              db[tableName].push({
                id: item.id || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                created_at: new Date().toISOString(),
                ...item
              });
            }
          }
          saveStorageData(db);
          return { data: items, error: null };
        }
      };

      return builder;
    }
  };
}

export const supabase = hasValidSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : createMockSupabaseClient();
