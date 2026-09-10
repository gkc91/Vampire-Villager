import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n';
import './index.css';
import { initAds } from './monetization/adGate';
import { restorePremium } from './monetization/billing';
import { listenForDeepLinks } from './util/deepLink';
import { loadStrategy } from './net/strategy';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

void listenForDeepLinks();

// Ağ modülünü kullanıcı ismini yazarken arka planda indir; "Odaya Katıl"a
// basıldığında yükleme beklemesi kalmasın.
void loadStrategy().catch(() => {});

// PWA: service worker yalnız üretim derlemesinde kaydedilir.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  });
}

// Reklam SDK'sı arka planda hazırlansın; webde hiçbir şey yapmaz.
void initAds();
// Cihaz değiştiren ya da uygulamayı silip kuran kişi hakkını kaybetmesin.
void restorePremium();
