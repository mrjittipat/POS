import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { DialogProvider } from './context/DialogContext';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Checkout from './pages/Checkout';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import ArchivedProducts from './pages/ArchivedProducts';
import ProductImages from './pages/ProductImages';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';

function GlobalBarcodeHandler() {
  const navigate = useNavigate();

  useBarcodeScanner({
    onScan: (barcode) => {
      // Navigate to POS and pass barcode via state
      navigate('/pos', { state: { scannedBarcode: barcode } });
    },
    minLength: 3,
    timeout: 100,
  });

  return null;
}

export default function App() {
  return (
    <DialogProvider>
    <BrowserRouter>
      <GlobalBarcodeHandler />
      <Routes>
        {/* Auth routes (public) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/product-images" element={<ProductImages />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/archived" element={<ArchivedProducts />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Full-screen checkout (own layout, no app chrome) */}
        <Route path="/pos/checkout" element={<Checkout />} />

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
    </DialogProvider>
  );
}
