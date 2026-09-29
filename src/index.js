import React from 'react';
import ReactDOM from 'react-dom/client';
import './tailwind.generated.css';
import './index.css';
import './mesario-compact.css';
import App from './App';
import './ReportsStatsLayoutFix';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to the results analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
