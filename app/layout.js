import './globals.css';
import { I18nProvider } from './I18n';

export const metadata = {
  title: 'Approvals',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0A0A0A' };

const boot = `(function(){try{var t=localStorage.getItem('aprob.theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('aprob.lang');if(l!=='es'&&l!=='en'){var n=(navigator.language||'en').toLowerCase();l=n.indexOf('es')===0?'es':'en';}document.documentElement.lang=l;}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
