import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/Header";
import { AuthProvider } from "@/lib/AuthContext";
import Home from "@/pages/Home";
import LocationDetail from "@/pages/LocationDetail";
import RiskMap from "@/pages/RiskMap";
import Alerts from "@/pages/Alerts";
import CitizenLogin from "@/pages/CitizenLogin";
import CitizenDashboard from "@/pages/CitizenDashboard";
import CitizenReport from "@/pages/CitizenReport";
import AdminDashboard from "@/pages/AdminDashboard";
import DataIngestion from "@/pages/DataIngestion";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/location/:slug" element={<LocationDetail />} />
            <Route path="/risk-map" element={<RiskMap />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/citizen/login" element={<CitizenLogin />} />
            <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
            <Route path="/citizen/report" element={<CitizenReport />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/data" element={<DataIngestion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
