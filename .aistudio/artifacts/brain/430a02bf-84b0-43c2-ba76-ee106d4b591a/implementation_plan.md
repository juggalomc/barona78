# Modernizing Login Screen and Navigation Menu

## Proposed Changes

### 1. Login Screen (`src/components/LoginScreen.jsx`)
- **Visual Design**: Upgrade from basic card to a modern split or centered glassmorphism card with soft gradient background, subtle shadows, refined typography (`Plus Jakarta Sans`), and elegant branding for "BARONA 78".
- **UX**: Add smooth focus states, clear helper text, quick demo login buttons styled as clean badges/pills, and clean input icons or borders.

### 2. Sidebar Navigation & Layout (`src/components/PropertyManagerWithAuth.jsx` & `src/components/shared/styles.js`)
- **Logical Grouping**: Reorganize tabs into clear logical sections in the sidebar:
  - **Pārskats (Overview)**: Pārskats, Maksājumi, Finanses
  - **Pārvaldība (Management)**: Dzīvokļi, Lietotāji, Tarifi, Ūdens, Atkritumi
  - **Sistēma (System)**: Rēķini, Iestatījumi
- **Modern Styling**: Sleeker dark slate sidebar with subtle hover effects, active pill indicators, section headers with muted typography, and smooth transitions.

## Verification Plan
- Verify compilation with `compile_applet`.
- Test login screen rendering and demo login buttons.
- Test sidebar navigation between grouped sections and tabs.
