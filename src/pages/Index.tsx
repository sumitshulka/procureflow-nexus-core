
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

// This is the entry point page that redirects to the main dashboard
const Index = () => {
  useEffect(() => {
    document.title = "Procurement Management System";
  }, []);

  return <Navigate to="/" replace />;
};

export default Index;
