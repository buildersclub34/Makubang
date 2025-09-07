import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/resend-verification', { email: user.email });
      
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox for the verification link.',
      });
    } catch (error: any) {
      console.error('Failed to resend verification email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend verification email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.isVerified) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <Icons.alertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            Please verify your email address to access all features. Check your inbox for the verification email.
            <Button
              variant="link"
              className="ml-2 p-0 h-auto text-sm font-medium text-yellow-700 hover:text-yellow-600"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend verification email'
              )}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
