import { useState, useEffect } from 'react';

export function useSettings(supabase) {
  const [settings, setSettings] = useState({
    building_name: 'BIEDRĪBA "BARONA 78"',
    building_code: '40008325768',
    building_address: 'Kr. Barona iela 78-14, Rīga, LV-1001',
    payment_iban: 'LV62HABA0551064112797',
    payment_bank: 'Habib Bank',
    payment_email: 'info@barona78.lv',
    payment_phone: '+371 67800000'
  });
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Kļūda ielādējot iestatījumus:', error);
        return;
      }

      if (data && data.length > 0) {
        const settingsObj = {};
        data.forEach(item => {
          settingsObj[item.setting_key] = item.setting_value;
        });
        console.log('✓ Iestatījumi ielādēti:', settingsObj);
        setSettings(settingsObj);
        setEditForm(settingsObj);
      } else {
        console.log('ℹ️ Nav iestatījumu datubāzē');
      }
    } catch (error) {
      console.error('Kļūda ielādējot iestatījumus:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert([{
          setting_key: key,
          setting_value: value
        }]);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      setEditForm(prev => ({ ...prev, [key]: value }));
      return true;
    } catch (error) {
      console.error(`Kļūda atjauninot ${key}:`, error);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    settings,
    editForm,
    setEditForm,
    loading,
    fetchSettings,
    updateSetting
  };
}