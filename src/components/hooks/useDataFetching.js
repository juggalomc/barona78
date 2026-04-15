import { useState } from 'react';

export function useDataFetching(supabase) {
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [waterConsumption, setWaterConsumption] = useState([]);
  const [waterTariffs, setWaterTariffs] = useState([]);
  const [hotWaterTariffs, setHotWaterTariffs] = useState([]);
  const [wasteTariffs, setWasteTariffs] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes, wcRes, wtRes, hwRes, wrRes, usersRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('hot_water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('waste_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('users').select('*').order('email', { ascending: true }),
        supabase.from('meter_readings').select('*').order('reading_date', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterConsumption(wcRes.data || []);
      setWaterTariffs(wtRes.data || []);
      setHotWaterTariffs(hwRes.data || []);
      setWasteTariffs(wrRes.data || []);
      setUsers(usersRes.data || []);
      setMeterReadings(mrRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot datus:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai ūdens tarifiem
  const fetchWaterTariffsOnly = async () => {
    try {
      const [wtRes, hwRes] = await Promise.all([
        supabase.from('water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('hot_water_tariffs').select('*').order('period', { ascending: false })
      ]);
      setWaterTariffs(wtRes.data || []);
      setHotWaterTariffs(hwRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot ūdens tarifus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai skaitītāju rādījumiem
  const fetchMeterReadingsOnly = async () => {
    try {
      const [mrRes, wcRes] = await Promise.all([
        supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false })
      ]);
      
      setMeterReadings(mrRes.data || []);
      setWaterConsumption(wcRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot skaitītāju rādījumus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai atkritumu tarifiem
  const fetchWasteTariffsOnly = async () => {
    try {
      const wrRes = await supabase
        .from('waste_tariffs')
        .select('*')
        .order('period', { ascending: false });
      setWasteTariffs(wrRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot atkritumu tarifus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai parastajiem tarifiem
  const fetchTariffsOnly = async () => {
    try {
      const tarRes = await supabase
        .from('tariffs')
        .select('*')
        .order('period', { ascending: false })
        .order('created_at', { ascending: false });
      setTariffs(tarRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot tarifus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai rēķiniem
  const fetchInvoicesOnly = async () => {
    try {
      const invRes = await supabase
        .from('invoices')
        .select('*')
        .order('period', { ascending: false });
      setInvoices(invRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot rēķinus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai dzīvokļiem
  const fetchApartmentsOnly = async () => {
    try {
      const aptRes = await supabase
        .from('apartments')
        .select('*')
        .order('number', { ascending: true });
      setApartments(aptRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot dzīvokļus:', error);
    }
  };

  // ✅ OPTIMIZĀCIJA: Selektīvi fetch tikai lietotājiem
  const fetchUsersOnly = async () => {
    try {
      const usersRes = await supabase
        .from('users')
        .select('*')
        .order('email', { ascending: true });
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot lietotājus:', error);
    }
  };

  const fetchUserData = async (apartmentId) => {
    try {
      setLoading(true);
      const [aptRes, invRes] = await Promise.all([
        supabase.from('apartments').select('*').eq('id', apartmentId).single(),
        supabase.from('invoices').select('*').eq('apartment_id', apartmentId).order('period', { ascending: false })
      ]);

      return { apartment: aptRes.data, invoices: invRes.data || [] };
    } catch (error) {
      console.error('Kļūda ielādējot lietotāja datus:', error);
      return { apartment: null, invoices: [] };
    } finally {
      setLoading(false);
    }
  };

  return {
    apartments, setApartments,
    tariffs, setTariffs,
    invoices, setInvoices,
    waterConsumption, setWaterConsumption,
    waterTariffs, setWaterTariffs,
    hotWaterTariffs, setHotWaterTariffs,
    wasteTariffs, setWasteTariffs,
    meterReadings, setMeterReadings,
    users, setUsers,
    loading, setLoading,
    fetchData,
    fetchUserData,
    // ✅ JAUNI SELEKTĪVIE FETCH PAŅĒMIENI
    fetchWaterTariffsOnly,
    fetchMeterReadingsOnly,
    fetchWasteTariffsOnly,
    fetchTariffsOnly,
    fetchInvoicesOnly,
    fetchApartmentsOnly,
    fetchUsersOnly
  };
}