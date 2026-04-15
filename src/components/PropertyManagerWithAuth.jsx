import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Komponentes
import { LoginScreen } from './LoginScreen';
import { UserPortal } from './UserPortal';
import { Toast } from './shared/Toast';
import { OverviewTab } from './tabs/OverviewTab';
import { ApartmentsTab } from './tabs/ApartmentsTab';
import { UsersTab } from './tabs/UsersTab';
import { TariffsTab } from './tabs/TariffsTab';
import { WaterTab } from './tabs/WaterTab';
import { WasteTab } from './tabs/WasteTab';
import { InvoicesTab } from './tabs/InvoicesTab';
import { SettingsTab } from './tabs/SettingsTab';

// Konstantes un stili
import { styles } from './shared/styles';

// Hooks
import { useDataFetching } from './hooks/useDataFetching';
import { useApartmentHandlers } from './hooks/useApartmentHandlers';
import { useUserHandlers } from './hooks/useUserHandlers';
import { useTariffHandlers } from './hooks/useTariffHandlers';
import { useWaterHandlers } from './hooks/useWaterHandlers';
import { useWasteHandlers } from './hooks/useWasteHandlers';
import { useInvoiceHandlers } from './hooks/useInvoiceHandlers';
import { useSettings } from './hooks/useSettings';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Definējam tabus lokāli, lai pievienotu Atkritumu sadaļu
const TABS = [
  { id: 'overview', label: 'Pārskats' },
  { id: 'apartments', label: 'Dzīvokļi' },
  { id: 'users', label: 'Lietotāji' },
  { id: 'tariffs', label: 'Tarifi' },
  { id: 'water', label: 'Ūdens' },
  { id: 'waste', label: 'Atkritumi' },
  { id: 'invoices', label: 'Rēķini' },
  { id: 'settings', label: 'Iestatījumi' }
];

export default function PropertyManager() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });
  const [userApartment, setUserApartment] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  // Data hooks
  const {
    apartments, tariffs, invoices, waterConsumption, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, users, loading,
    fetchData, fetchUserData, fetchMeterReadingsOnly
  } = useDataFetching(supabase);

  const { settings, editForm, setEditForm, updateSetting } = useSettings(supabase);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Handler hooks
  const apartmentHandlers = useApartmentHandlers(supabase, fetchData, showToast);
  const userHandlers = useUserHandlers(supabase, fetchData, showToast);
  const tariffHandlers = useTariffHandlers(supabase, fetchData, showToast);
  const waterHandlers = useWaterHandlers(supabase, apartments, waterTariffs, hotWaterTariffs, fetchData, showToast, fetchMeterReadingsOnly, meterReadings);
  const wasteHandlers = useWasteHandlers(supabase, apartments, wasteTariffs, fetchData, showToast);
  const invoiceHandlers = useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings, waterHandlers.enabledMeters, waterConsumption);

  useEffect(() => {
    // Ja lietotājs ir ielādēts no localStorage, ielādējam viņa datus
    const initialFetch = async () => {
      if (currentUser) {
        if (currentUser.role === 'admin') {
          await fetchData();
        } else if (currentUser.apartment_id) {
          const userData = await fetchUserData(currentUser.apartment_id);
          setUserApartment(userData.apartment);
          setUserInvoices(userData.invoices);
        }
      }
    };
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      if (data.password !== password) {
        showToast('Nepareizs email vai parole', 'error');
        return;
      }

      setCurrentUser(data);
      localStorage.setItem('currentUser', JSON.stringify(data));
      
      if (data.role === 'admin') {
        fetchData();
      } else {
        const userData = await fetchUserData(data.apartment_id);
        setUserApartment(userData.apartment);
        setUserInvoices(userData.invoices);
      }
      
      showToast('✓ Pierakstīts!');
    } catch (error) {
      showToast('Kļūda: ' + error.message, 'error');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setUserApartment(null);
    setUserInvoices([]);
    setActiveTab('overview');
    showToast('✓ Izrakstīts');
  };

  const handleChangePassword = async (newPassword) => {
    try {
      if (!currentUser) return;
      
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('id', currentUser.id);

      if (error) throw error;
      showToast('✓ Parole veiksmīgi nomainīta');
    } catch (error) {
      showToast('Kļūda mainot paroli: ' + error.message, 'error');
    }
  };

  const resetUserPassword = async (userId, email) => {
    const defaultPass = 'barona123';
    if (!window.confirm(`Vai tiešām atiestatīt paroli lietotājam ${email} uz "${defaultPass}"?`)) return;
    
    try {
      const { error } = await supabase.from('users').update({ password: defaultPass }).eq('id', userId);
      if (error) throw error;
      showToast(`✓ Parole atiestatīta uz "${defaultPass}"`);
    } catch (error) {
      showToast('Kļūda atiestatot paroli: ' + error.message, 'error');
    }
  };

  const getInvoiceStatus = (invoice) => {
    if (invoice.paid) {
      return { status: 'Apmaksāts', color: '#10b981', emoji: '✓' };
    }
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    // Jebkurš neapmaksāts rēķins, kam pagājis termiņš vai kas ir no iepriekšēja perioda
    if (today > dueDate) {
      return { status: 'Parāds', color: '#ef4444', emoji: '⚠️' };
    } else {
      return { status: 'Gaida atmaksu', color: '#f59e0b', emoji: '⏳' };
    }
  };

  const uniqueTariffPeriods = [...new Set(tariffs.map(t => t.period))].sort().reverse();

  // ===== LOGIN SCREEN =====
  if (!currentUser) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
          @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
        <LoginScreen onLogin={handleLogin} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ===== USER PORTAL =====
  if (currentUser && currentUser.role === 'user') {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        `}</style>
        <UserPortal 
          userApartment={userApartment}
          userInvoices={userInvoices}
          meterReadings={meterReadings}
          waterTariffs={waterTariffs}
          hotWaterTariffs={hotWaterTariffs}
          onLogout={handleLogout}
          onDownloadPDF={invoiceHandlers.downloadPDF}
          onViewAsHTML={invoiceHandlers.viewAsHTML}
          onSaveWaterMeterReading={waterHandlers.saveWaterMeterReading}
          onSaveHotWaterMeterReading={waterHandlers.saveHotWaterMeterReading}
          toast={toast}
          onCloseToast={() => setToast(null)}
          onChangePassword={handleChangePassword}
          settings={settings}
          showToast={showToast}
        />
      </>
    );
  }

  // ===== ADMIN PANEL =====
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <div style={styles.app}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <div style={styles.logo}>🏢 BARONA 78</div>
          <nav style={styles.nav}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={activeTab === tab.id ? {...styles.navBtn, ...styles.navBtnActive} : styles.navBtn}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <div style={styles.main}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.h1}>Rēķinu Vadības Sistēma</h1>
              <p style={styles.subtitle}>Inteligenta mājas apsaimniekošana</p>
            </div>
            <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Izrakstīties</button>
          </header>

          <div style={styles.content}>
            {loading ? (
              <div style={styles.loading}>⏳ Ielāde...</div>
            ) : activeTab === 'overview' ? (
              <OverviewTab apartments={apartments} tariffs={tariffs} invoices={invoices} />
            ) : activeTab === 'apartments' ? (
              <ApartmentsTab
                apartments={apartments}
                invoices={invoices}
                {...apartmentHandlers}
              />
            ) : activeTab === 'users' ? (
              <UsersTab
                users={users}
                apartments={apartments}
                {...userHandlers}
                resetUserPassword={resetUserPassword}
              />
            ) : activeTab === 'tariffs' ? (
              <TariffsTab
                tariffs={tariffs}
                uniqueTariffPeriods={uniqueTariffPeriods}
                {...tariffHandlers}
              />
            ) : activeTab === 'water' ? (
              <WaterTab
                apartments={apartments}
                meterReadings={meterReadings}
                waterTariffs={waterTariffs}
                hotWaterTariffs={hotWaterTariffs}
                uniqueTariffPeriods={uniqueTariffPeriods}
                tariffPeriod={waterHandlers.tariffPeriod}
                setTariffPeriod={waterHandlers.setTariffPeriod}
                {...waterHandlers}
                settings={settings}
                updateSetting={updateSetting}
              />
            ) : activeTab === 'waste' ? (
              <WasteTab
                wasteTariffs={wasteTariffs}
                uniqueTariffPeriods={uniqueTariffPeriods}
                {...wasteHandlers}
              />
            ) : activeTab === 'invoices' ? (
              <InvoicesTab
                invoices={invoices}
                apartments={apartments}
                tariffs={tariffs}
                waterTariffs={waterTariffs}
                meterReadings={meterReadings}
                uniqueTariffPeriods={uniqueTariffPeriods}
                getInvoiceStatus={getInvoiceStatus}
                showToast={showToast}
                generateInvoiceForApartment={invoiceHandlers.generateInvoiceForApartment}
                sendInvoicesByEmail={invoiceHandlers.sendInvoicesByEmail}
                regenerateInvoice={invoiceHandlers.regenerateInvoice}
                {...invoiceHandlers}
              />
            ) : activeTab === 'settings' ? (
              <SettingsTab
                settings={settings}
                editForm={editForm}
                setEditForm={setEditForm}
                apartments={apartments}
                updateSetting={updateSetting}
                sendEmailViaAppsScript={invoiceHandlers.sendEmailViaAppsScript}
                showToast={showToast}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}