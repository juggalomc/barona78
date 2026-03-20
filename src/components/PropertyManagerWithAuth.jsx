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
import { InvoicesTab } from './tabs/InvoicesTab';
import { SettingsTab } from './tabs/SettingsTab';

// Konstantes un stili
import { TABS } from './shared/constants';
import { styles } from './shared/styles';

// Hooks
import { useDataFetching } from './hooks/useDataFetching';
import { useApartmentHandlers } from './hooks/useApartmentHandlers';
import { useUserHandlers } from './hooks/useUserHandlers';
import { useTariffHandlers } from './hooks/useTariffHandlers';
import { useWaterHandlers } from './hooks/useWaterHandlers';
import { useInvoiceHandlers } from './hooks/useInvoiceHandlers';
import { useSettings } from './hooks/useSettings';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function PropertyManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userApartment, setUserApartment] = useState(null);
  const [userInvoices, setUserInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);

  // Data hooks
  const {
    apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, users, loading,
    fetchData, fetchUserData
  } = useDataFetching(supabase);

  const { settings, editForm, setEditForm, updateSetting } = useSettings(supabase);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Handler hooks
  const apartmentHandlers = useApartmentHandlers(supabase, fetchData, showToast);
  const userHandlers = useUserHandlers(supabase, fetchData, showToast);
  const tariffHandlers = useTariffHandlers(supabase, fetchData, showToast);
  const waterHandlers = useWaterHandlers(supabase, apartments, fetchData, showToast);
  const invoiceHandlers = useInvoiceHandlers(supabase, apartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings, waterHandlers.enabledMeters);

  useEffect(() => {
    fetchData();
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
    setUserApartment(null);
    setUserInvoices([]);
    setActiveTab('overview');
    showToast('✓ Izrakstīts');
  };

  const getInvoiceStatus = (invoice) => {
    if (invoice.paid) {
      return { status: 'Apmaksāts', color: '#10b981', emoji: '✓' };
    }
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
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
          onSaveWaterMeterReading={waterHandlers.saveWaterMeterReading}
          onSaveHotWaterMeterReading={waterHandlers.saveHotWaterMeterReading}
          toast={toast}
          onCloseToast={() => setToast(null)}
          currentPeriod={waterHandlers.tariffPeriod}
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
                wasteTariffs={wasteTariffs}
                uniqueTariffPeriods={uniqueTariffPeriods}
                tariffPeriod={waterHandlers.tariffPeriod}
                setTariffPeriod={waterHandlers.setTariffPeriod}
                {...waterHandlers}
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
                updateSetting={updateSetting}
                showToast={showToast}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}