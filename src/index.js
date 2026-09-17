import React from 'react';
import ReactDOM from 'react-dom/client';
import './SupabaseCutoverProxy';
import './index.css';
import './reports-pdf-v2.css';
import './mesario-compact.css';
import App from './App';
import PresenceDashboardBridge from './PresenceDashboardBridge';
import ReportsDashboardBridge from './ReportsDashboardBridge';
import ReportsStatsByDateBridge from './ReportsStatsByDateBridge';
import './ReportsStatsLayoutFix';
import ReportsPdfBridgeV2 from './ReportsPdfBridgeV2';
import AnnualReportMedicalBridge from './AnnualReportMedicalBridge';
import ReportsRankingCompactBridge from './ReportsRankingCompactBridge';
import ReportsLegacyRankingHider from './ReportsLegacyRankingHider';
import MesarioDashboardBridge from './MesarioDashboardBridge';
import SorteioDashboardBridge from './SorteioDashboardBridge';
import DmDashboardBridge from './DmDashboardBridge';
import AdminDashboardBridge from './AdminDashboardBridge.runtime';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <>
      <App />
      <PresenceDashboardBridge />
      <ReportsDashboardBridge />
      <ReportsStatsByDateBridge />
      <ReportsPdfBridgeV2 />
      <AnnualReportMedicalBridge />
      <ReportsRankingCompactBridge />
      <ReportsLegacyRankingHider />
      <MesarioDashboardBridge />
      <SorteioDashboardBridge />
      <DmDashboardBridge />
      <AdminDashboardBridge />
    </>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to the results analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
