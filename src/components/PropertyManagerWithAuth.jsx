import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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
import { PaymentSummaryTab } from './tabs/PaymentSummaryTab';
import { ApartmentFinancialsTab } from './tabs/ApartmentFinancialsTab';

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

// Ikonas
import { 
  LayoutDashboard, 
  CreditCard, 
  TrendingUp, 
  Building2, 
  Users, 
  FileText, 
  Droplets, 
  Trash2, 
  Receipt, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  Building,
  Calendar,
  ShieldCheck,
  Bell
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Galvenais',
    items: [
      { id: 'overview', label: 'Pārskats', icon: LayoutDashboard },
      { id: 'payments', label: 'Maksājumi', icon: CreditCard },
      { id: 'financials', label: 'Finanses', icon: TrendingUp }
    ]
  },
  {
    title: 'Pārvaldība',
    items: [
      { id: 'apartments', label: 'Dzīvokļi', icon: Building2, badgeKey: 'apartments' },
      { id: 'users', label: 'Lietotāji', icon: Users, badgeKey: 'users' },
      { id: 'invoices', label: 'Rēķini', icon: FileText, badgeKey: 'unpaid' }
    ]
  },
  {
    title: 'Skaitītāji & Tarifi',
    items: [
      { id: 'water', label: 'Ūdens', icon: Droplets },
      { id: 'waste', label: 'Atkritumi', icon: Trash2 },
      { id: 'tariffs', label: 'Tarifi', icon: Receipt }
    ]
  },
  {
    title: 'Sistēma',
    items: [
      { id: 'settings', label: 'Iestatījumi', icon: Settings }
    ]
  }
];

const TAB_INFO = {
  overview: {
    title: 'Pārskats',
    subtitle: 'Mājas kopsavilkums, finanšu rādītāji un rēķinu statusi'
  },
  payments: {
    title: 'Maksājumu saņemšana',
    subtitle: 'Faktiskā apmaksa pa pakalpojumu pozīcijām un procentuālais izpildījums'
  },
  financials: {
    title: 'Dzīvokļu finanšu pārskats',
    subtitle: 'Katra dzīvokļa rēķinu, maksājumu un atlikušo parādu analīze'
  },
  apartments: {
    title: 'Dzīvokļu pārvaldība',
    subtitle: 'Dzīvokļu saraksts, platības, iedzīvotāji un paziņojumu e-pasti'
  },
  users: {
    title: 'Lietotāju konti',
    subtitle: 'Iedzīvotāju un administratoru piekļuves tiesības un paroles'
  },
  water: {
    title: 'Ūdens skaitītāji',
    subtitle: 'Aukstā un karstā ūdens rādījumi, starpības un patēriņa bilance'
  },
  waste: {
    title: 'Atkritumu apsaimniekošana',
    subtitle: 'Atkritumu izvešanas tarifi un sadalījums pa dzīvokļiem'
  },
  tariffs: {
    title: 'Apsaimniekošanas tarifi',
    subtitle: 'Mājas pakalpojumu bāzes likmes un aprēķina formulas'
  },
  invoices: {
    title: 'Rēķinu vadība',
    subtitle: 'Rēķinu ģenerēšana, sūtīšana e-pastos, PDF un statusu maiņa'
  },
  settings: {
    title: 'Sistēmas iestatījumi',
    subtitle: 'Ēkas rekvizīti, bankas konts un paziņojumu parametri'
  }
};

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Data hooks
  const {
    apartments, tariffs, invoices, waterConsumption, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, users, loading,
    fetchData, fetchUserData, fetchMeterReadingsOnly
  } = useDataFetching(supabase);

  // Svarīgi: Nodrošinām, ka handleri redz dzīvokli arī parastam lietotājam.
  const displayApartments = currentUser?.role === 'admin' ? apartments : (userApartment ? [userApartment] : []);

  const { settings, editForm, setEditForm, updateSetting } = useSettings(supabase);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Handler hooks
  const apartmentHandlers = useApartmentHandlers(supabase, fetchData, showToast);
  const userHandlers = useUserHandlers(supabase, fetchData, showToast);
  const tariffHandlers = useTariffHandlers(supabase, displayApartments, fetchData, showToast);
  const waterHandlers = useWaterHandlers(supabase, displayApartments, waterTariffs, hotWaterTariffs, fetchData, showToast, fetchMeterReadingsOnly, meterReadings);
  const wasteHandlers = useWasteHandlers(supabase, displayApartments, wasteTariffs, fetchData, showToast);
  const invoiceHandlers = useInvoiceHandlers(supabase, displayApartments, tariffs, invoices, waterTariffs, hotWaterTariffs, wasteTariffs, meterReadings, fetchData, showToast, settings, waterHandlers.enabledMeters, waterConsumption, waterHandlers.syncWaterConsumption);

  useEffect(() => {
    const initialFetch = async () => {
      try {
        if (currentUser) {
          const { data: latestUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (!error && latestUser) {
            setCurrentUser(latestUser);
            localStorage.setItem('currentUser', JSON.stringify(latestUser));
            
            if (latestUser.role === 'admin') {
              await fetchData();
            } else if (latestUser.apartment_id) {
              const userData = await fetchUserData(latestUser.apartment_id);
              setUserApartment(userData.apartment);
              setUserInvoices(userData.invoices);
            }
          }
        }
      } catch (err) {
        console.error("Kļūda ielādējot datus:", err);
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
        showToast('Nepareizs e-pasts vai parole', 'error');
        return;
      }

      if (data.password !== password) {
        showToast('Nepareizs e-pasts vai parole', 'error');
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
      
      showToast('✓ Veiksmīgi pierakstījies');
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
    if (today > dueDate) {
      return { status: 'Parāds', color: '#ef4444', emoji: '⚠️' };
    } else {
      return { status: 'Gaida atmaksu', color: '#f59e0b', emoji: '⏳' };
    }
  };

  const uniqueTariffPeriods = [...new Set([
    ...tariffs.map(t => t.period),
    waterHandlers.tariffPeriod
  ])].filter(Boolean).sort().reverse();

  // Badges calculation
  const unpaidInvoicesCount = invoices.filter(i => !i.paid).length;
  const badges = {
    apartments: apartments.length,
    users: users.length,
    unpaid: unpaidInvoicesCount > 0 ? unpaidInvoicesCount : null
  };

  // Date formatting for Latvian header
  const todayFormatted = new Date().toLocaleDateString('lv-LV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // ===== LOGIN SCREEN =====
  if (!currentUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ===== USER PORTAL =====
  if (currentUser && currentUser.role === 'user') {
    return (
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
    );
  }

  const currentTabMeta = TAB_INFO[activeTab] || { title: activeTab, subtitle: '' };

  // ===== ADMIN PANEL =====
  return (
    <div style={styles.app}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(2px)',
            zIndex: 45
          }}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside 
        style={{
          ...styles.sidebar,
          transform: mobileMenuOpen ? 'translateX(0)' : undefined,
          transition: 'transform 0.25s ease-in-out'
        }}
        className={mobileMenuOpen ? 'sidebar-open' : 'sidebar-normal'}
      >
        {/* Brand / Building Lockup */}
        <div style={{ padding: '0 8px 18px 8px', borderBottom: '1px solid #1e293b', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
              }}>
                <Building2 size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#ffffff', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
                  {settings?.building_name || 'BARONA 78'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Rēķinu Vadības Sistēma
                </div>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'none'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', background: '#1e293b', padding: '6px 10px', borderRadius: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: '#10b981' }}></span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Kr. Barona iela 78, Rīga
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav style={styles.nav}>
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '10.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                padding: '4px 12px 6px 12px'
              }}>
                {group.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const badgeValue = tab.badgeKey ? badges[tab.badgeKey] : null;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      style={{
                        ...styles.navBtn,
                        ...(isActive ? styles.navBtnActive : {}),
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Icon size={17} style={{ color: isActive ? '#60a5fa' : '#94a3b8', shrink: 0 }} />
                        <span>{tab.label}</span>
                      </div>
                      {badgeValue !== null && badgeValue !== undefined && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontVariantNumeric: 'tabular-nums',
                          background: tab.badgeKey === 'unpaid' ? '#ef4444' : '#334155',
                          color: '#ffffff'
                        }}>
                          {badgeValue}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Card & Logout at Sidebar Bottom */}
        <div style={{
          marginTop: 'auto',
          paddingTop: '16px',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#334155',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '12px'
            }}>
              AD
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Administrators
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.email || 'admin@barona78.lv'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              ...styles.navBtn,
              color: '#f87171',
              background: 'rgba(239, 68, 68, 0.08)',
              justifyContent: 'center',
              fontWeight: '600'
            }}
          >
            <LogOut size={16} />
            <span>Izrakstīties</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main style={styles.main}>
        {/* TOP BAR CONTRACT */}
        <header style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a'
              }}
              className="mobile-hamburger-btn"
              aria-label="Atvērt izvēlni"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb Trail & Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                <span>Mājas pārvaldība</span>
                <ChevronRight size={13} />
                <span>Kr. Barona 78</span>
                <ChevronRight size={13} />
                <span style={{ color: '#0f172a', fontWeight: '600' }}>{currentTabMeta.title}</span>
              </div>
              <h1 style={styles.h1}>{currentTabMeta.title}</h1>
              <p style={styles.subtitle}>{currentTabMeta.subtitle}</p>
            </div>
          </div>

          {/* Quick Info & User Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12.5px',
              color: '#475569'
            }}>
              <Calendar size={15} style={{ color: '#64748b' }} />
              <span style={{ textTransform: 'capitalize' }}>{todayFormatted}</span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #dbeafe',
              fontSize: '12px',
              fontWeight: '600',
              color: '#1d4ed8'
            }}>
              <ShieldCheck size={15} />
              <span>Pārvaldnieka režīms</span>
            </div>

            <button 
              onClick={handleLogout} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#ffffff',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
            >
              <LogOut size={15} />
              <span>Izrakstīties</span>
            </button>
          </div>
        </header>

        {/* CONTENT VIEW */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>
              <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '500' }}>
                Ielādē datus...
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            <OverviewTab 
              apartments={apartments} 
              tariffs={tariffs} 
              invoices={invoices} 
              waterTariffs={waterTariffs}
              hotWaterTariffs={hotWaterTariffs}
              wasteTariffs={wasteTariffs}
              waterConsumption={waterConsumption}
            />
          ) : activeTab === 'payments' ? (
            <PaymentSummaryTab 
              invoices={invoices} 
              uniqueTariffPeriods={uniqueTariffPeriods} 
            />
          ) : activeTab === 'financials' ? (
            <ApartmentFinancialsTab 
              invoices={invoices} 
              apartments={apartments} 
            />
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
              apartments={apartments}
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
              waterConsumption={waterConsumption}
              fetchMeterReadingsOnly={fetchMeterReadingsOnly}
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
      </main>

      {/* Media query styling for responsive mobile navigation */}
      <style>{`
        @media (max-width: 900px) {
          .mobile-hamburger-btn {
            display: inline-flex !important;
          }
          aside {
            transform: translateX(-100%);
          }
          aside.sidebar-open {
            transform: translateX(0) !important;
          }
          main {
            margin-left: 0 !important;
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}