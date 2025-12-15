import { Header } from "@/components/Header";
import { HomePage } from "@/pages/HomePage";
import { ListingPage } from "@/pages/ListingPage";
import { NewListingPage } from "@/pages/NewListingPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SlideshowPage } from "@/pages/SlideshowPage";
import { Route, Routes } from "react-router-dom"; // Import routing components

function App() {
  return (
    <div className="flex-1 font-sans flex flex-col items-center justify-start min-h-screen pb-8">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/listings/new" element={<NewListingPage />} />
        <Route path="/listings/:id" element={<ListingPage />} />
        <Route path="/slideshow" element={<SlideshowPage />} />
      </Routes>
    </div>
  );
}

export default App;
