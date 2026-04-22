import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useRegistration } from '@/hooks/useRegistration.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, loading: registerLoading } = useRegistration();

  const [activeTab, setActiveTab] = useState('login');
  
  // Login State - TEMPORARY: Pre-filled with admin credentials for testing
  const [loginEmail, setLoginEmail] = useState('raybhudz90@gmail.com');
  const [loginPassword, setLoginPassword] = useState('Bhudzray91');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [regData, setRegData] = useState({
    name: '',
    email: '',
    idNumber: '',
    rfidId: '',
    batch: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [regErrors, setRegErrors] = useState({});
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const authData = await login(loginEmail, loginPassword);
      if (authData.record.role === 'admin') {
        navigate('/dashboard');
      } else if (authData.record.role === 'trainee') {
        navigate('/trainee-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setLoginError('Invalid email or password');
    } finally {
      setLoginLoading(false);
    }
  };

  const validateRegForm = () => {
    const errors = {};
    if (!regData.name.trim()) errors.name = "Full name is required";
    
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regData.email) errors.email = "Email is required";
    else if (!emailRe.test(regData.email)) errors.email = "Invalid email format";

    if (!regData.idNumber.trim()) errors.idNumber = "Employee ID is required";
    if (!regData.rfidId.trim()) errors.rfidId = "RFID ID is required";
    if (!regData.batch) errors.batch = "Batch/Department is required";

    const passRe = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!regData.password) errors.password = "Password is required";
    else if (!passRe.test(regData.password)) errors.password = "Min 8 chars, 1 uppercase, 1 lowercase, 1 number";

    if (regData.password !== regData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    if (!regData.terms) errors.terms = "You must accept the terms and conditions";

    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegForm()) return;

    const result = await register(regData);
    
    if (result.success) {
      toast.success('Account created successfully! Please log in with your credentials.');
      setRegData({
        name: '', email: '', idNumber: '', rfidId: '', batch: '', password: '', confirmPassword: '', terms: false
      });
      setLoginEmail(regData.email);
      setActiveTab('login');
    } else {
      setRegErrors({ form: result.error });
      toast.error(result.error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Welcome - Training Monitoring System</title>
        <meta name="description" content="Login or register to access the Training Monitoring System" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 px-4 py-12">
        <Card className="w-full max-w-md shadow-xl border-none ring-1 ring-slate-200/50">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
                <GraduationCap className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">TMS Portal</CardTitle>
            <CardDescription className="text-slate-500">Training Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/80 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="bg-slate-50 border-slate-200 text-slate-900 pr-10 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {loginError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg font-medium">
                      {loginError}
                    </div>
                  )}
                  <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loginLoading}>
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('register')}
                      className="text-sm text-slate-500 hover:text-primary hover:underline transition-colors"
                    >
                      Don't have an account? Register here
                    </button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {regErrors.form && (
                    <div className="text-sm text-white bg-red-600 p-4 rounded-lg font-medium mb-4 border border-red-700">
                      ⚠️ {regErrors.form}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Doe"
                      value={regData.name}
                      onChange={(e) => setRegData({...regData, name: e.target.value})}
                      className={`bg-slate-50 text-slate-900 ${regErrors.name ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                    />
                    {regErrors.name && <p className="text-xs text-destructive">{regErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="john@example.com"
                      value={regData.email}
                      onChange={(e) => setRegData({...regData, email: e.target.value})}
                      className={`bg-slate-50 text-slate-900 ${regErrors.email ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                    />
                    {regErrors.email && <p className="text-xs text-destructive">{regErrors.email}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-id">ID Number</Label>
                      <Input
                        id="reg-id"
                        placeholder="EMP-12345"
                        value={regData.idNumber}
                        onChange={(e) => setRegData({...regData, idNumber: e.target.value})}
                        className={`bg-slate-50 text-slate-900 ${regErrors.idNumber ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                      />
                      {regErrors.idNumber && <p className="text-xs text-destructive">{regErrors.idNumber}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-batch">Department</Label>
                      <Select value={regData.batch} onValueChange={(val) => setRegData({...regData, batch: val})}>
                        <SelectTrigger className={`bg-slate-50 text-slate-900 ${regErrors.batch ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {regErrors.batch && <p className="text-xs text-destructive">{regErrors.batch}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-rfid">RFID ID (for card scanning)</Label>
                    <Input
                      id="reg-rfid"
                      placeholder="Enter RFID card ID"
                      value={regData.rfidId}
                      onChange={(e) => setRegData({...regData, rfidId: e.target.value})}
                      className={`bg-slate-50 text-slate-900 ${regErrors.rfidId ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                    />
                    {regErrors.rfidId && <p className="text-xs text-destructive">{regErrors.rfidId}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={regData.password}
                        onChange={(e) => setRegData({...regData, password: e.target.value})}
                        className={`bg-slate-50 text-slate-900 pr-10 ${regErrors.password ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {regErrors.password && <p className="text-xs text-destructive">{regErrors.password}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        type={showRegConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={regData.confirmPassword}
                        onChange={(e) => setRegData({...regData, confirmPassword: e.target.value})}
                        className={`bg-slate-50 text-slate-900 pr-10 ${regErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : 'border-slate-200 focus-visible:ring-primary'}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {regErrors.confirmPassword && <p className="text-xs text-destructive">{regErrors.confirmPassword}</p>}
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox 
                      id="terms" 
                      checked={regData.terms}
                      onCheckedChange={(checked) => setRegData({...regData, terms: checked})}
                      className={regErrors.terms ? 'border-destructive' : ''}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-600"
                      >
                        Accept terms and conditions
                      </label>
                      {regErrors.terms && <p className="text-xs text-destructive">{regErrors.terms}</p>}
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-base font-semibold mt-2" disabled={registerLoading}>
                    {registerLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                  
                  <div className="text-center mt-4">
                    <button 
                      type="button" 
                      onClick={() => setActiveTab('login')}
                      className="text-sm text-slate-500 hover:text-primary hover:underline transition-colors"
                    >
                      Already have an account? Login here
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default LoginPage;