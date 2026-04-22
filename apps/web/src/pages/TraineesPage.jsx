import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient.js';
import TraineeForm from '@/components/TraineeForm.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Eye, Edit, Trash2, Search, Filter,
  CreditCard, User, Building2, Briefcase,
  CheckCircle2, Loader2, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

const RFID_SERVER = 'http://localhost:5050';

// ─── Registration Form ────────────────────────────────────────────────────────

const RegistrationForm = ({ onSuccess, onCancel }) => {
  const pollRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('idle'); // idle | starting | ready | error
  const [scanSuccess, setScanSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    unique_id: '',
    name: '',
    id_number: '',
    batch: '',
    email: '',
  });

  // Stop scanning on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      fetch(`${RFID_SERVER}/stop`).catch(() => {});
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const handleStartScan = async () => {
    setScanSuccess(false);
    setForm(prev => ({ ...prev, unique_id: '' }));
    setServerStatus('starting');
    stopPolling();

    try {
      const res = await fetch(`${RFID_SERVER}/start`);
      const data = await res.json();

      if (!data.success) {
        setServerStatus('error');
        toast.error(data.message || 'Hindi ma-connect sa RFID reader.');
        return;
      }

      setServerStatus('ready');
      toast.info('RFID reader ready — i-tap ang card.');

      // Poll /uid every 500ms
      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${RFID_SERVER}/uid`);
          const d = await r.json();

          if (d.uid) {
            const uid = d.uid.replace(/\s+/g, ''); // "A1 B2 C3 D4" → "A1B2C3D4"
            setForm(prev => ({ ...prev, unique_id: uid }));
            setScanSuccess(true);
            setErrors(prev => ({ ...prev, unique_id: null }));
            setServerStatus('idle');
            stopPolling();
            fetch(`${RFID_SERVER}/stop`).catch(() => {});
            toast.success(`Card detected: ${uid}`);
          }
        } catch {
          // server unreachable mid-poll, ignore silently
        }
      }, 500);

    } catch {
      setServerStatus('error');
      toast.error('Hindi ma-reach ang RFID server. Siguraduhing naka-run ang rfid_server.py.');
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    if (field === 'unique_id' && value) setScanSuccess(true);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.unique_id.trim()) newErrors.unique_id = 'Scan muna ang RFID card.';
    if (!form.name.trim()) newErrors.name = 'Kailangan ang pangalan.';
    if (!form.id_number.trim()) newErrors.id_number = 'Kailangan ang Company ID.';
    if (!form.batch.trim()) newErrors.batch = 'Kailangan ang department.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Check duplicate RFID
      const existing = await pb.collection('trainees').getList(1, 1, {
        filter: `unique_id = "${form.unique_id}"`,
        $autoCancel: false,
      });
      if (existing.items.length > 0) {
        toast.error('Ang RFID card na ito ay nakarehistro na sa ibang trainee.');
        setSubmitting(false);
        return;
      }

      const email = form.email.trim()
        || `${form.id_number.toLowerCase().replace(/\s+/g, '')}@trainee.local`;

      await pb.collection('trainees').create({
        unique_id: form.unique_id.trim(),
        name: form.name.trim(),
        id_number: form.id_number.trim(),
        batch: form.batch.trim(),
        email,
        status: 'active',
      }, { $autoCancel: false });

      toast.success('Trainee registered successfully!');
      onSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusMap = {
    idle:     { color: 'text-slate-500',  bg: 'bg-slate-50',   label: 'I-click ang "Scan Card" para simulan.' },
    starting: { color: 'text-yellow-600', bg: 'bg-yellow-50',  label: 'Nagko-connect sa RFID reader…' },
    ready:    { color: 'text-primary',    bg: 'bg-primary/5',  label: 'Ready — i-tap ang card sa reader.' },
    error:    { color: 'text-red-500',    bg: 'bg-red-50',     label: 'Error. Siguraduhing naka-run ang rfid_server.py.' },
  };
  const s = statusMap[serverStatus];

  return (
    <div className="space-y-5">

      {/* Status Banner */}
      <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${s.bg}`}>
        {serverStatus === 'starting'
          ? <Loader2 className={`h-4 w-4 flex-shrink-0 animate-spin ${s.color}`} />
          : serverStatus === 'ready'
            ? <Wifi className={`h-4 w-4 flex-shrink-0 ${s.color}`} />
            : <WifiOff className={`h-4 w-4 flex-shrink-0 ${s.color}`} />
        }
        <span className={`text-xs font-medium flex-1 ${s.color}`}>{s.label}</span>
        {(serverStatus === 'error' || serverStatus === 'idle') && (
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleStartScan}>
            {serverStatus === 'error' ? 'Retry' : 'Start'}
          </Button>
        )}
      </div>

      {/* RFID Scan Area */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> RFID Unique ID
        </Label>

        <div className={`
          flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition-all duration-300
          ${scanSuccess
            ? 'border-emerald-400 bg-emerald-50'
            : serverStatus === 'ready'
              ? 'border-primary/50 bg-primary/5'
              : 'border-slate-200 bg-slate-50'
          }
        `}>
          {scanSuccess
            ? <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            : serverStatus === 'ready'
              ? <Loader2 className="h-6 w-6 text-primary flex-shrink-0 animate-spin" />
              : <CreditCard className="h-6 w-6 text-slate-300 flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            {scanSuccess ? (
              <>
                <p className="text-xs font-semibold text-emerald-700">Card detected!</p>
                <p className="text-sm font-mono text-emerald-800 truncate">{form.unique_id}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                {serverStatus === 'ready' ? 'Naghihintay sa card tap…' : 'Walang card na na-detect'}
              </p>
            )}
          </div>
          <Button
            variant={scanSuccess ? 'outline' : 'default'}
            size="sm"
            className="flex-shrink-0"
            onClick={handleStartScan}
            disabled={serverStatus === 'starting' || serverStatus === 'ready'}
          >
            {serverStatus === 'starting' || serverStatus === 'ready'
              ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Scanning…</>
              : scanSuccess
                ? 'Re-scan'
                : <><CreditCard className="h-3 w-3 mr-1.5" /> Scan Card</>
            }
          </Button>
        </div>

        {/* Manual override */}
        <div className="flex items-center gap-2">
          <Separator className="flex-1" />
          <span className="text-xs text-slate-400">o manual na input</span>
          <Separator className="flex-1" />
        </div>
        <Input
          placeholder="e.g. A1B2C3D4"
          value={form.unique_id}
          onChange={e => handleChange('unique_id', e.target.value)}
          className={`font-mono text-sm ${errors.unique_id ? 'border-red-400' : ''}`}
        />
        {errors.unique_id && <p className="text-xs text-red-500">{errors.unique_id}</p>}
      </div>

      <Separator />

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="e.g. Juan Dela Cruz"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className={`pl-9 ${errors.name ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Company ID Number <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="e.g. EMP-2024-001"
              value={form.id_number}
              onChange={e => handleChange('id_number', e.target.value)}
              className={`pl-9 font-mono ${errors.id_number ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.id_number && <p className="text-xs text-red-500">{errors.id_number}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Department <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="e.g. Human Resources"
              value={form.batch}
              onChange={e => handleChange('batch', e.target.value)}
              className={`pl-9 ${errors.batch ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.batch && <p className="text-xs text-red-500">{errors.batch}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Email <span className="text-slate-400 font-normal text-xs">(optional)</span>
          </Label>
          <Input
            type="email"
            placeholder="e.g. juan@company.com"
            value={form.email}
            onChange={e => handleChange('email', e.target.value)}
          />
          <p className="text-xs text-slate-400">Kung blangko, awtomatikong gagawa ng placeholder email.</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-28">
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            : 'Register Trainee'
          }
        </Button>
      </div>
    </div>
  );
};

// ─── Main Trainees Page ───────────────────────────────────────────────────────

const TraineesPage = () => {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchTrainees(); }, []);

  const fetchTrainees = async () => {
    try {
      const result = await pb.collection('trainees').getList(1, 100, {
        sort: '-created',
        $autoCancel: false,
      });
      setTrainees(result.items);
    } catch (error) {
      console.error('Error fetching trainees:', error);
      toast.error('Failed to load trainees');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trainee? This action cannot be undone.')) return;
    try {
      await pb.collection('trainees').delete(id, { $autoCancel: false });
      toast.success('Trainee deleted successfully');
      fetchTrainees();
    } catch (error) {
      toast.error('Failed to delete trainee');
    }
  };

  const filteredTrainees = trainees.filter(t =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.unique_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.batch?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Helmet><title>Masterlist - TMS Pro</title></Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Masterlist</h1>
            <p className="text-muted-foreground mt-1">Manage all registered trainees in the system</p>
          </div>
          <Button onClick={() => setRegisterOpen(true)} className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add New Trainee
          </Button>
        </div>

        <Card className="shadow-sm border-none ring-1 ring-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, ID, department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto text-slate-600">
              <Filter className="h-4 w-4 mr-2" /> Filter
            </Button>
          </div>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : filteredTrainees.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No trainees found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-slate-200">
                    <TableHead className="w-12 text-center font-semibold text-slate-600">#</TableHead>
                    <TableHead className="font-semibold text-slate-600">Trainee</TableHead>
                    <TableHead className="font-semibold text-slate-600">Company ID</TableHead>
                    <TableHead className="font-semibold text-slate-600">RFID UID</TableHead>
                    <TableHead className="font-semibold text-slate-600">Department</TableHead>
                    <TableHead className="font-semibold text-slate-600">Email</TableHead>
                    <TableHead className="font-semibold text-slate-600">Status</TableHead>
                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrainees.map((trainee, index) => {
                    const initials = trainee.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
                    return (
                      <TableRow key={trainee.id} className="hover:bg-slate-50/50 transition-colors border-b-slate-100">
                        <TableCell className="text-center text-slate-500 text-sm">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-slate-200">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-slate-900">{trainee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{trainee.id_number || 'N/A'}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{trainee.unique_id || 'N/A'}</TableCell>
                        <TableCell className="text-slate-600">{trainee.batch || 'N/A'}</TableCell>
                        <TableCell className="text-slate-600">{trainee.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Active</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50">
                              <Link to={`/trainees/${trainee.id}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50"
                              onClick={() => { setSelectedTrainee(trainee); setEditDialogOpen(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-red-50"
                              onClick={() => handleDelete(trainee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Register Modal */}
        <Dialog open={registerOpen} onOpenChange={(open) => {
          if (!open) fetch(`${RFID_SERVER}/stop`).catch(() => {});
          setRegisterOpen(open);
        }}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" /> Register New Trainee
              </DialogTitle>
            </DialogHeader>
            <RegistrationForm
              onSuccess={() => { setRegisterOpen(false); fetchTrainees(); }}
              onCancel={() => { fetch(`${RFID_SERVER}/stop`).catch(() => {}); setRegisterOpen(false); }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Edit Trainee Profile</DialogTitle>
            </DialogHeader>
            <TraineeForm
              trainee={selectedTrainee}
              onSuccess={() => { setEditDialogOpen(false); fetchTrainees(); }}
              onCancel={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default TraineesPage;