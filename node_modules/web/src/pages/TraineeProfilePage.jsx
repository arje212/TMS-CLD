import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Lock, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';

const TraineeProfilePage = () => {
  const { currentUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: ''
  });

  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        name: profileData.name,
      }, { $autoCancel: false });
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.error('Failed to update profile. Email cannot be changed here.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.passwordConfirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    setPassLoading(true);
    try {
      await pb.collection('users').update(currentUser.id, {
        oldPassword: passwordData.oldPassword,
        password: passwordData.password,
        passwordConfirm: passwordData.passwordConfirm
      }, { $autoCancel: false });

      setPasswordData({ oldPassword: '', password: '', passwordConfirm: '' });
      toast.success('Password changed successfully');
    } catch (error) {
      console.error('Password update failed:', error);
      toast.error('Failed to change password. Check your current password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>My Profile - Trainee Portal</title>
      </Helmet>

      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Account Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and security preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none ring-1 ring-slate-100 shadow-sm bg-gradient-to-b from-slate-50 to-white">
              <CardContent className="pt-6 text-center">
                <div className="h-24 w-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                  <User className="h-10 w-10" />
                </div>
                <h3 className="font-bold text-xl text-slate-900">{currentUser?.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{currentUser?.email}</p>
                <div className="mt-6 flex flex-col gap-2">
                  <div className="bg-white rounded-lg p-3 text-sm flex justify-between items-center shadow-sm border border-slate-100">
                    <span className="text-slate-500 font-medium">Role</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-bold uppercase text-[10px] tracking-wide">
                      {currentUser?.role}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="border-none ring-1 ring-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" /> Personal Information
                </CardTitle>
                <CardDescription>Update your basic profile details.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-700">Full Name</Label>
                      <Input 
                        id="name" 
                        value={profileData.name} 
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})} 
                        className="bg-slate-50 text-slate-900 border-slate-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700">Email Address (Read Only)</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={profileData.email} 
                        disabled 
                        className="bg-slate-100 text-slate-500 cursor-not-allowed border-transparent"
                      />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" disabled={loading} className="px-8">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-none ring-1 ring-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-primary" /> Security & Password
                </CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Current Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        id="oldPassword" 
                        type="password" 
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                        className="pl-10 text-slate-900 border-slate-200"
                        required
                      />
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          id="newPassword" 
                          type="password" 
                          value={passwordData.password}
                          onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                          className="pl-10 text-slate-900 border-slate-200"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          id="confirmPassword" 
                          type="password" 
                          value={passwordData.passwordConfirm}
                          onChange={(e) => setPasswordData({...passwordData, passwordConfirm: e.target.value})}
                          className="pl-10 text-slate-900 border-slate-200"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <Button type="submit" variant="secondary" disabled={passLoading} className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-900">
                      {passLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default TraineeProfilePage;