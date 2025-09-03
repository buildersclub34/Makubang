import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, CheckCircle } from "lucide-react";

interface NotificationPopupProps {
  isVisible: boolean;
  message: string;
  type?: "success" | "info" | "warning" | "error";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function NotificationPopup({ 
  isVisible, 
  message, 
  type = "success", 
  onClose,
  autoClose = true,
  duration = 5000 
}: NotificationPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(onClose, 300); // Wait for animation to complete
        }, duration);
        
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, autoClose, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-accent" />;
      case "info":
        return <ShoppingBag className="w-5 h-5 text-primary" />;
      case "warning":
        return <ShoppingBag className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <X className="w-5 h-5 text-destructive" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-primary" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-accent/10 border-accent/20";
      case "info":
        return "bg-primary/10 border-primary/20";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "error":
        return "bg-destructive/10 border-destructive/20";
      default:
        return "bg-card border-border";
    }
  };

  return (
    <div 
      className={`fixed top-20 right-4 z-50 max-w-sm transition-all duration-300 ${
        show ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <Card className={`shadow-lg ${getBackgroundColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {getIcon()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {type === "success" ? "Order Confirmed!" : "Notification"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {message}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 flex-shrink-0"
              onClick={() => {
                setShow(false);
                setTimeout(onClose, 300);
              }}
              data-testid="button-close-notification"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
