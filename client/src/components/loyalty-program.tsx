
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Gift, Star, Trophy, Coins, Calendar, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LoyaltyPoints {
  current: number;
  lifetime: number;
  nextTierThreshold: number;
  currentTier: string;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'free_item' | 'exclusive_access';
  validUntil: Date;
  isAvailable: boolean;
  image?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export default function LoyaltyProgram() {
  const { user } = useAuth();
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyPoints | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, []);

  const loadLoyaltyData = async () => {
    try {
      const [loyaltyRes, rewardsRes, achievementsRes] = await Promise.all([
        fetch('/api/loyalty/points', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/loyalty/rewards', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/loyalty/achievements', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const loyaltyData = await loyaltyRes.json();
      const rewardsData = await rewardsRes.json();
      const achievementsData = await achievementsRes.json();

      setLoyaltyData(loyaltyData);
      setRewards(rewardsData);
      setAchievements(achievementsData);
    } catch (error) {
      console.error('Failed to load loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (rewardId: string) => {
    try {
      const response = await fetch(`/api/loyalty/redeem/${rewardId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        loadLoyaltyData(); // Refresh data
        alert('Reward redeemed successfully!');
      } else {
        alert('Failed to redeem reward');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'bronze': return 'text-orange-600';
      case 'silver': return 'text-gray-600';
      case 'gold': return 'text-yellow-600';
      case 'platinum': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getTierProgress = () => {
    if (!loyaltyData) return 0;
    const progress = (loyaltyData.current / loyaltyData.nextTierThreshold) * 100;
    return Math.min(progress, 100);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Loyalty Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Loyalty Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{loyaltyData?.current || 0}</div>
              <div className="text-sm text-muted-foreground">Available Points</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getTierColor(loyaltyData?.currentTier || 'bronze')}`}>
                {loyaltyData?.currentTier || 'Bronze'}
              </div>
              <div className="text-sm text-muted-foreground">Current Tier</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{loyaltyData?.lifetime || 0}</div>
              <div className="text-sm text-muted-foreground">Lifetime Points</div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress to next tier</span>
              <span>{loyaltyData?.current || 0}/{loyaltyData?.nextTierThreshold || 1000}</span>
            </div>
            <Progress value={getTierProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="rewards" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => (
              <Card key={reward.id} className={!reward.isAvailable ? 'opacity-50' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{reward.title}</CardTitle>
                    <Badge variant={reward.type === 'free_item' ? 'default' : 'secondary'}>
                      {reward.pointsCost} pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{reward.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      Valid until {new Date(reward.validUntil).toLocaleDateString()}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => redeemReward(reward.id)}
                      disabled={!reward.isAvailable || (loyaltyData?.current || 0) < reward.pointsCost}
                    >
                      Redeem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.id} className={achievement.unlockedAt ? 'border-green-200' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{achievement.title}</h3>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      
                      {achievement.unlockedAt ? (
                        <Badge className="mt-2" variant="default">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </Badge>
                      ) : achievement.progress !== undefined && achievement.target !== undefined ? (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.target}</span>
                          </div>
                          <Progress value={(achievement.progress / achievement.target) * 100} className="h-1" />
                        </div>
                      ) : (
                        <Badge className="mt-2" variant="outline">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Mock history data - replace with actual API call */}
                {[
                  { date: '2024-01-15', action: 'Order placed', points: 50, type: 'earned' },
                  { date: '2024-01-14', action: 'Free coffee redeemed', points: -200, type: 'redeemed' },
                  { date: '2024-01-12', action: 'Review posted', points: 25, type: 'earned' },
                  { date: '2024-01-10', action: 'Order placed', points: 75, type: 'earned' },
                ].map((entry, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{entry.action}</div>
                      <div className="text-sm text-muted-foreground">{entry.date}</div>
                    </div>
                    <div className={`font-semibold ${entry.type === 'earned' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'earned' ? '+' : ''}{entry.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
