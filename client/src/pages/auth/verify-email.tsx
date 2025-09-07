import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');
  const [error, setError] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) return;

      try {
        const response = await apiRequest('GET', `/api/auth/verify-email?token=${token}`);
        
        if (response.success) {
          setStatus('success');
          toast({
            title: 'Email Verified',
            description: 'Your email has been successfully verified!',
          });
        }
      } catch (err: any) {
        console.error('Email verification error:', err);
        setStatus('error');
        setError(err.message || 'Failed to verify email. Please try again.');
        
        if (err.message?.includes('expired')) {
          setStatus('expired');
        }
      }
    };

    verifyEmail();
  }, [token, toast]);

  const handleResendEmail = async () => {
    try {
      await apiRequest('POST', '/api/auth/resend-verification', { token });
      toast({
        title: 'Verification Email Sent',
        description: 'A new verification link has been sent to your email.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to resend verification email',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-green-100">
          {status === 'verifying' ? (
            <Icons.spinner className="h-8 w-8 text-orange-600 animate-spin" />
          ) : status === 'success' ? (
            <Icons.check className="h-8 w-8 text-green-600" />
          ) : (
            <Icons.alertCircle className="h-8 w-8 text-red-600" />
          )}
        </div>

        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          {status === 'verifying' && 'Verifying your email...'}
          {status === 'success' && 'Email Verified!'}
          {status === 'expired' && 'Verification Link Expired'}
          {status === 'error' && 'Verification Failed'}
        </h2>

        <div className="mt-4 text-gray-600">
          {status === 'verifying' && (
            <p>Please wait while we verify your email address...</p>
          )}
          
          {status === 'success' && (
            <>
              <p>Your email has been successfully verified. You can now enjoy all the features of Makubang!</p>
              <div className="mt-6">
                <Link href="/feed">
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    Go to Feed
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'expired' && (
            <>
              <p className="mb-4">The verification link has expired. Please request a new one.</p>
              <Button 
                onClick={handleResendEmail}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Resend Verification Email
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-red-600 mb-4">{error}</p>
              <Button 
                onClick={handleResendEmail}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Resend Verification Email
              </Button>
            </>
          )}
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Having trouble? <Link href="/contact" className="text-orange-600 hover:text-orange-500">Contact support</Link></p>
        </div>
      </div>
    </div>
  );
}
