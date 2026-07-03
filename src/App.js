import "swiper/css";
import "swiper/css/bundle";
import "./App.scss";

import { BrowserRouter } from "react-router-dom";
import IntroSplash from "./components/intro-splash/IntroSplash";
import TvSidebar from "./components/header/TvSidebar";
import Routes from "./config/Routes";
import { FocusProvider } from "./context/FocusContext";

function App() {
  return (
    <FocusProvider>
      <IntroSplash>
        <BrowserRouter>
          <div className="tv-layout">
            <TvSidebar />
            <Routes />
          </div>
        </BrowserRouter>
      </IntroSplash>
    </FocusProvider>
  );
}

export default App;
