import React from 'react';
import ReactDOM from 'react-dom/client';
import './SupabaseCutoverProxy';
import './index.css';
import './reports-pdf-v2.css';
import './mesario-compact.css';
import App from './App';
import PresenceDashboardBridge from './PresenceDashboardBridge';
import ReportsDashboardBridge from './ReportsDashboardBridge';
import ReportsPdfBridgeV2 from './ReportsPdfBridgeV2';
import ReportsRankingCompactBridge from './ReportsRankingCompactBridge';
import ReportsLegacyRankingHider from './ReportsLegacyRankingHider';
import MesarioDashboardBridge from './MesarioDashboardBridge';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <>
      <App />
      <PresenceDashboardBridge />
      <ReportsDashboardBridge />
      <ReportsPdfBridgeV2 />
      <ReportsRankingCompactBridge />
      <ReportsLegacyRankingHider />
      <MesarioDashboardBridge />
    </>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
