import "swiper/css";
import "swiper/css/bundle";
import "./App.scss";

import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import IntroSplash from "./components/intro-splash/IntroSplash";
import UpdateNotification from "./components/update-notification/UpdateNotification";
import Routes from "./config/Routes";
import { isTauri } from './tauri-bridge';
import { FocusProvider } from './context/FocusContext';

function App() {
  const isTv = isTauri();
  const content = (
    <IntroSplash>
      <BrowserRouter>
        <div className={isTv ? 'tv-layout' : ''}>
          <Header />
          <UpdateNotification />
          <Routes />
          <Footer />
        </div>
      </BrowserRouter>
    </IntroSplash>
  );

  return isTv ? <FocusProvider>{content}</FocusProvider> : content;
}

export default App;
