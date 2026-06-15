import "swiper/css";
import "swiper/css/bundle";
import "./App.scss";

import { BrowserRouter } from "react-router-dom";
import Header from "./components/header/Header";
import Footer from "./components/footer/Footer";
import UpdateNotification from "./components/update-notification/UpdateNotification";
import Routes from "./config/Routes";
import { useTvFocus } from './hooks/useTvFocus';

function App() {
  useTvFocus();
  return (
    <BrowserRouter>
      <Header />
      <UpdateNotification />
      <Routes />
      <Footer />
    </BrowserRouter>
  );
}

export default App;
