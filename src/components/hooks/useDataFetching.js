import { useState } from 'react';

export function useDataFetching(supabase) {
  const [apartments, setApartments] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [waterConsumption, setWaterConsumption] = useState([]);
  const [waterTariffs, setWaterTariffs] = useState([]);
  const [wasteTariffs, setWasteTariffs] = useState([]);
  const [meterReadings, setMeterReadings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [aptRes, tarRes, invRes, wcRes, wtRes, wrRes, usersRes, mrRes] = await Promise.all([
        supabase.from('apartments').select('*').order('number', { ascending: true }),
        supabase.from('tariffs').select('*').order('period', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('invoices').select('*').order('period', { ascending: false }),
        supabase.from('water_consumption').select('*').order('period', { ascending: false }),
        supabase.from('water_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('waste_tariffs').select('*').order('period', { ascending: false }),
        supabase.from('users').select('*').order('email', { ascending: true }),
        supabase.from('meter_readings').select('*').order('reading_date', { ascending: false })
      ]);

      setApartments(aptRes.data || []);
      setTariffs(tarRes.data || []);
      setInvoices(invRes.data || []);
      setWaterConsumption(wcRes.data || []);
      setWaterTariffs(wtRes.data || []);
      setWasteTariffs(wrRes.data || []);
      setUsers(usersRes.data || []);
      setMeterReadings(mrRes.data || []);
    } catch (error) {
      console.error('Kļūda ielādējot datus:', error);
    } finally {
      setLoading(false);
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
    wasteTariffs, setWasteTariffs,
    meterReadings, setMeterReadings,
    users, setUsers,
    loading, setLoading,
    fetchData,
    fetchUserData
  };
}