
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Share2, Copy, Users, Gift, DollarSign } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  pendingRewards: number;
  earnedRewards: number;
  referralLink: string;
}

interface Referral {
  id: string;
  referredUser: {
    name: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'paid';
  reward: number;
  createdAt: Date;
  completedAt?: Date;
}

export default function ReferralProgram() {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const [dataRes, referralsRes] = await Promise.all([
        fetch('/api/referrals/data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/referrals/list', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const data = await dataRes.json();
      const referralsData = await referralsRes.json();

      setReferralData(data);
      setReferrals(referralsData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferral = async () => {
    if (navigator.share && referralData) {
      try {
        await navigator.share({
          title: 'Join Makubang with my referral!',
          text: `Use my referral code ${referralData.referralCode} to get ₹100 off your first order!`,
          url: referralData.referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const claimRewards = async () => {
    try {
      const response = await fetch('/api/referrals/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadReferralData();
        alert('Rewards claimed successfully!');
      }
    } catch (error) {
      console.error('Error claiming rewards:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Referral Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{referralData?.totalReferrals || 0}</div>
              <div className="text-sm text-muted-foreground">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">₹{referralData?.earnedRewards || 0}</div>
              <div className="text-sm text-muted-foreground">Earned Rewards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">₹{referralData?.pendingRewards || 0}</div>
              <div className="text-sm text-muted-foreground">Pending Rewards</div>
            </div>
            <div className="text-center">
              {referralData?.pendingRewards ? (
                <Button onClick={claimRewards} className="mt-2">
                  <Gift className="w-4 h-4 mr-2" />
                  Claim
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground mt-6">No pending rewards</div>
              )}
            </div>
          </div>

          {/* Referral Code Section */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-3">Your Referral Code</h3>
            <div className="flex space-x-2 mb-3">
              <Input
                value={referralData?.referralCode || ''}
                readOnly
                className="font-mono text-center text-lg"
              />
              <Button onClick={copyReferralCode} variant="outline">
                <Copy className="w-4 h-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={copyReferralLink} variant="outline" className="flex-1">
                Copy Link
              </Button>
              <Button onClick={shareReferral} className="flex-1">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-blue-900">How it works</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <div>1. Share your referral code with friends</div>
              <div>2. They sign up and place their first order</div>
              <div>3. You both get ₹100 reward!</div>
              <div>4. Earn ₹50 for every subsequent order they place (up to 10 orders)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Start sharing your code to earn rewards!
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{referral.referredUser.name}</div>
                    <div className="text-sm text-muted-foreground">{referral.referredUser.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(referral.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{referral.reward}</div>
                    <Badge
                      variant={
                        referral.status === 'completed' ? 'default' :
                        referral.status === 'paid' ? 'secondary' : 'outline'
                      }
                    >
                      {referral.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Terms & Conditions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <div>• Referral rewards are credited after the referred user completes their first order</div>
            <div>• Both referrer and referee receive ₹100 on the first successful referral</div>
            <div>• Additional ₹50 is earned for each subsequent order (maximum 10 orders per referral)</div>
            <div>• Rewards can be used as credits for future orders</div>
            <div>• Minimum order value of ₹200 required for referral to be valid</div>
            <div>• Referral rewards expire after 90 days if not used</div>
            <div>• Makubang reserves the right to modify or terminate the program at any time</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
