
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, User, Bell, Globe, Shield, CreditCard, 
  MapPin, Moon, Sun, Monitor, Volume2, VolumeX,
  Smartphone, Mail, Lock, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { useI18n, languages } from '../lib/i18n';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useI18n();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [showPassword, setShowPassword] = useState(false);

  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['/api/user/settings'],
    queryFn: () => fetch('/api/user/settings').then(res => res.json())
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved successfully."
      });
    }
  });

  const [formData, setFormData] = useState({
    // Profile Settings
    displayName: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
    profilePicture: '',
    
    // Privacy Settings
    profileVisibility: 'public' as 'public' | 'friends' | 'private',
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    allowFollows: true,
    
    // Notification Settings
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    promotions: false,
    newFollowers: true,
    comments: true,
    likes: false,
    
    // App Preferences
    autoPlay: true,
    dataUsage: 'normal' as 'low' | 'normal' | 'high',
    downloadQuality: 'high' as 'low' | 'medium' | 'high',
    cacheSize: 1024, // MB
    
    // Location Settings
    locationSharing: true,
    nearbyRestaurants: true,
    deliveryTracking: true,
    
    // Payment Settings
    defaultPayment: 'card' as 'card' | 'upi' | 'wallet' | 'cod',
    autoSaveMethods: true,
    
    // Dietary Preferences
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    diabeticFriendly: false,
    allergens: [] as string[],
    
    // Content Preferences
    explicitContent: false,
    contentLanguages: ['en'] as string[],
    
    // Security Settings
    twoFactorAuth: false,
    loginAlerts: true,
    deviceTracking: true,
    sessionTimeout: 30 // minutes
  });

  const updateSetting = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    updateSettingsMutation.mutate({ [key]: value });
  };

  const allergenOptions = [
    'Nuts', 'Dairy', 'Eggs', 'Soy', 'Wheat', 'Fish', 'Shellfish', 'Sesame'
  ];

  const toggleAllergen = (allergen: string) => {
    const newAllergens = formData.allergens.includes(allergen)
      ? formData.allergens.filter(a => a !== allergen)
      : [...formData.allergens, allergen];
    updateSetting('allergens', newAllergens);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and app settings
          </p>
        </div>

        <div className="space-y-8">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Profile Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => updateSetting('displayName', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateSetting('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateSetting('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="profileVisibility">Profile Visibility</Label>
                  <Select 
                    value={formData.profileVisibility} 
                    onValueChange={(value) => updateSetting('profileVisibility', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showEmail">Show email in profile</Label>
                  <Switch
                    id="showEmail"
                    checked={formData.showEmail}
                    onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowMessages">Allow direct messages</Label>
                  <Switch
                    id="allowMessages"
                    checked={formData.allowMessages}
                    onCheckedChange={(checked) => updateSetting('allowMessages', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowFollows">Allow follows</Label>
                  <Switch
                    id="allowFollows"
                    checked={formData.allowFollows}
                    onCheckedChange={(checked) => updateSetting('allowFollows', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language & Region */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Language & Region</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="language">App Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Content Languages</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {languages.map((lang) => (
                    <Badge
                      key={lang.code}
                      variant={formData.contentLanguages.includes(lang.code) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newLangs = formData.contentLanguages.includes(lang.code)
                          ? formData.contentLanguages.filter(l => l !== lang.code)
                          : [...formData.contentLanguages, lang.code];
                        updateSetting('contentLanguages', newLangs);
                      }}
                    >
                      {lang.nativeName}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={formData.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
                  </div>
                  <Switch
                    checked={formData.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Order Updates</Label>
                    <p className="text-sm text-muted-foreground">Get notified about order status changes</p>
                  </div>
                  <Switch
                    checked={formData.orderUpdates}
                    onCheckedChange={(checked) => updateSetting('orderUpdates', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>New Followers</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone follows you</p>
                  </div>
                  <Switch
                    checked={formData.newFollowers}
                    onCheckedChange={(checked) => updateSetting('newFollowers', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Comments & Likes</Label>
                    <p className="text-sm text-muted-foreground">Get notified about interactions on your content</p>
                  </div>
                  <Switch
                    checked={formData.comments}
                    onCheckedChange={(checked) => updateSetting('comments', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5" />
                <span>App Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center space-x-2">
                          <Sun className="w-4 h-4" />
                          <span>Light</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center space-x-2">
                          <Moon className="w-4 h-4" />
                          <span>Dark</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4" />
                          <span>System</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Data Usage</Label>
                  <Select 
                    value={formData.dataUsage} 
                    onValueChange={(value) => updateSetting('dataUsage', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Data Saver)</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High (Best Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-play Videos</Label>
                    <p className="text-sm text-muted-foreground">Automatically play videos in feed</p>
                  </div>
                  <Switch
                    checked={formData.autoPlay}
                    onCheckedChange={(checked) => updateSetting('autoPlay', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Location Sharing</Label>
                    <p className="text-sm text-muted-foreground">Allow location access for better recommendations</p>
                  </div>
                  <Switch
                    checked={formData.locationSharing}
                    onCheckedChange={(checked) => updateSetting('locationSharing', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dietary Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🥗</span>
                <span>Dietary Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Vegetarian</Label>
                  <Switch
                    checked={formData.vegetarian}
                    onCheckedChange={(checked) => updateSetting('vegetarian', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Vegan</Label>
                  <Switch
                    checked={formData.vegan}
                    onCheckedChange={(checked) => updateSetting('vegan', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Gluten-Free</Label>
                  <Switch
                    checked={formData.glutenFree}
                    onCheckedChange={(checked) => updateSetting('glutenFree', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Diabetic-Friendly</Label>
                  <Switch
                    checked={formData.diabeticFriendly}
                    onCheckedChange={(checked) => updateSetting('diabeticFriendly', checked)}
                  />
                </div>
              </div>
              
              <div>
                <Label>Allergens to Avoid</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allergenOptions.map((allergen) => (
                    <Badge
                      key={allergen}
                      variant={formData.allergens.includes(allergen) ? "destructive" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleAllergen(allergen)}
                    >
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security & Privacy</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Switch
                    checked={formData.twoFactorAuth}
                    onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Login Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when someone logs into your account</p>
                  </div>
                  <Switch
                    checked={formData.loginAlerts}
                    onCheckedChange={(checked) => updateSetting('loginAlerts', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Explicit Content Filter</Label>
                    <p className="text-sm text-muted-foreground">Hide content marked as explicit</p>
                  </div>
                  <Switch
                    checked={!formData.explicitContent}
                    onCheckedChange={(checked) => updateSetting('explicitContent', !checked)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Lock className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Download My Data
                </Button>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
