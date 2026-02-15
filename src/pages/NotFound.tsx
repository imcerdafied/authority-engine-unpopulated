import { useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-sm text-muted-foreground uppercase tracking-widest">Route not found</p>
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors">
          Return to Overview
        </a>
      </div>
    </div>
  );
};

export default NotFound;
