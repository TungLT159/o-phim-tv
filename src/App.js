import "swiper/css";
import "swiper/css/bundle";
import "./App.scss";

import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import UpdateNotification from "./components/update-notification/UpdateNotification";
import Routes from "./config/Routes";
import { useTvFocus } from './hooks/useTvFocus';
import { isTauri } from './tauri-bridge';

function App() {
  useTvFocus();

  const isTv = isTauri();

  return (
    <BrowserRouter>
      <div className={isTv ? 'tv-layout' : ''}>
        <Header />
        <UpdateNotification />
        <Routes />
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
