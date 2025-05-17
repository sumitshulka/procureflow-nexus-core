
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import ProductCatalog from "@/pages/ProductCatalog";
import ProductDetail from "@/pages/ProductDetail";
import InventoryItems from "@/pages/inventory/InventoryItems";
import InventoryTransactions from "@/pages/inventory/InventoryTransactions";
import InventoryIndex from "@/pages/inventory/InventoryIndex";
import ProcurementRequests from "@/pages/ProcurementRequests";
import ProcurementRequestDetail from "@/pages/ProcurementRequestDetail";
import Settings from "@/pages/Settings";
import Approvals from "@/pages/Approvals";
import UserManagement from "@/pages/UserManagement";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/catalog" element={<ProductCatalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/inventory" element={<InventoryIndex />}>
              <Route index element={<InventoryItems />} />
              <Route path="items" element={<InventoryItems />} />
              <Route path="transactions" element={<InventoryTransactions />} />
            </Route>
            <Route path="/requests" element={<ProcurementRequests />} />
            <Route path="/requests/:id" element={<ProcurementRequestDetail />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
