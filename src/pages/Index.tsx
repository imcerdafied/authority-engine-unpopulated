// Redirects to Overview — this page is not used in the application routing.
import { Navigate } from "react-router-dom";

const Index = () => {
  return <Navigate to="/" replace />;
};

export default Index;
