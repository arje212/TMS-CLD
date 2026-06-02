import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import * as XLSX from 'xlsx';
import pb from '@/lib/pocketbaseClient.js';
import { useCompany } from '@/hooks/useCompany.js';
import TraineeForm from '@/components/TraineeForm.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Plus, Eye, Edit, Trash2, Search,
  CreditCard, User, Building2, Briefcase,
  CheckCircle2, Loader2, Wifi, WifiOff,
  Upload, FileSpreadsheet, AlertCircle, CheckCheck, X,
  PenLine, ImageOff, FileImage
} from 'lucide-react';
import { toast } from 'sonner';

const RFID_SERVER = 'http://localhost:5050';

export const TORRES_TECH_DEPARTMENTS = [
  'KHMPT-MDC','TDS', 'LOG', 'REAL', 'SATISCO', 'SPSM', 'SPST', 'SYTR', 'SYTRFIN',
  'TTEC ACCTG', 'TTEC ADMIN', 'TTEC BAT', 'TTEC CLD', 'TTEC CREF', 'TTEC FOIL',
  'TTEC KOMAX', 'TTEC MDC', 'TTEC TOOL', 'TTEC TUBE', 'TTEC WHSE', 'TTECAM',
  'TTECBD', 'TTECFAB', 'TTECHR', 'TTECJIGFAB', 'TTECMAINT', 'TTECPAM', 'TTECSAD',
  'TTECSOSM', 'TTECTRUCK', 'TTECTS', 'WHSE',
];

const formatUID = (uid) => {
  if (!uid) return 'N/A';
  let clean = uid.replace(/\s+/g, '').toUpperCase();
  if (clean.length % 2 !== 0) clean = '0' + clean;
  return clean.match(/.{2}/g)?.join(' ') ?? clean;
};

// ─── Registration Form ────────────────────────────────────────────────────────

const RegistrationForm = ({ onSuccess, onCancel, company, prefix, departments }) => {
  const pollRef = useRef(null);
  const [serverStatus, setServerStatus] = useState('idle');
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

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`${RFID_SERVER}/uid`);
          const d = await r.json();
          if (d.uid) {
            const uid = d.uid.replace(/\s+/g, '').toUpperCase();
            setForm(prev => ({ ...prev, unique_id: uid }));
            setScanSuccess(true);
            setErrors(prev => ({ ...prev, unique_id: null }));
            setServerStatus('idle');
            stopPolling();
            fetch(`${RFID_SERVER}/stop`).catch(() => {});
            toast.success(`Card detected: ${formatUID(uid)}`);
          }
        } catch { /* ignore */ }
      }, 500);

    } catch {
      setServerStatus('error');
      toast.error('Hindi ma-reach ang RFID server. Siguraduhing naka-run ang rfid_server.py.');
    }
  };

  const handleChange = (field, value) => {
    const finalValue = (field === 'name' || field === 'id_number') ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [field]: finalValue }));
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
      const existing = await pb.collection(`${prefix}trainees`).getList(1, 1, {
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

      await pb.collection(`${prefix}trainees`).create({
        unique_id: form.unique_id.trim().toUpperCase(),
        name: form.name.trim().toUpperCase(),
        id_number: form.id_number.trim().toUpperCase(),
        batch: form.batch.trim(),
        email,
        company,
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
                <p className="text-sm font-mono text-emerald-800 truncate">{formatUID(form.unique_id)}</p>
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

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Full Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="e.g. JUAN DELA CRUZ"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className={`pl-9 uppercase ${errors.name ? 'border-red-400' : ''}`}
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
              className={`pl-9 font-mono uppercase ${errors.id_number ? 'border-red-400' : ''}`}
            />
          </div>
          {errors.id_number && <p className="text-xs text-red-500">{errors.id_number}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">
            Department <span className="text-red-500">*</span>
          </Label>
          {departments.length > 0 ? (
            <div className="grid grid-cols-4 gap-1.5">
              {departments.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => handleChange('batch', dept)}
                  className={`
                    rounded-lg border px-2 py-1.5 text-xs font-medium transition-all
                    ${form.batch === dept
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:bg-primary/5'
                    }
                  `}
                >
                  {dept}
                </button>
              ))}
            </div>
          ) : (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Enter department"
                value={form.batch}
                onChange={e => handleChange('batch', e.target.value.toUpperCase())}
                className={`pl-9 uppercase ${errors.batch ? 'border-red-400' : ''}`}
              />
            </div>
          )}
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

// ─── Bulk Upload Form ─────────────────────────────────────────────────────────

const BulkUploadForm = ({ onSuccess, onCancel, existingTrainees, company, prefix }) => {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState('');
  const [colMapDetected, setColMapDetected] = useState(null);
  const [colWarning, setColWarning] = useState('');

  const existingByID = useMemo(() => {
    const map = new Map();
    existingTrainees.forEach(t => {
      if (t.id_number) map.set(t.id_number.trim().toUpperCase(), t);
    });
    return map;
  }, [existingTrainees]);

  const existingUIDs = useMemo(() => {
    const set = new Set();
    existingTrainees.forEach(t => {
      if (t.unique_id) set.add(t.unique_id.replace(/[\s\-]/g, '').toUpperCase());
    });
    return set;
  }, [existingTrainees]);

  const detectColumns = (headers) => {
    const norm = (s) => s.toString().trim().toLowerCase().replace(/[\s_\-]/g, '');

    const colMap = { name: null, id_number: null, batch: null, unique_id: null };

    const rfidExact    = ['uniqueidnumber', 'uniqueid', 'rfiduid', 'cardid', 'rfid', 'uid', 'uniqueno'];
    const rfidContains = ['uniqueid', 'rfid', 'cardid'];
    const idExact      = ['idnumber', 'id_number', 'idno', 'empid', 'employeeid', 'companyid', 'employeeno', 'empno'];
    const nameExact    = ['empname', 'employeename', 'fullname', 'empfullname', 'name'];
    const deptExact    = ['department', 'dept', 'departmentname', 'section', 'deptname'];

    headers.forEach(h => {
      const n = norm(h);

      if (!colMap.unique_id && rfidExact.some(p => n === p)) {
        colMap.unique_id = h;
        return;
      }
      if (!colMap.unique_id && rfidContains.some(p => n.includes(p))) {
        colMap.unique_id = h;
        return;
      }
      if (!colMap.id_number && idExact.some(p => n === p)) {
        colMap.id_number = h;
        return;
      }
      if (!colMap.name && nameExact.some(p => n === p || n.startsWith(p))) {
        colMap.name = h;
        return;
      }
      if (!colMap.batch && deptExact.some(p => n === p || n.startsWith(p))) {
        colMap.batch = h;
      }
    });

    return colMap;
  };

  const normalizeUID = (raw) =>
    raw.toString().trim().replace(/[\s\-:]/g, '').toUpperCase();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);
    setProgress(0);
    setParsed([]);
    setColWarning('');
    setColMapDetected(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          toast.error('File is empty.');
          return;
        }

        const headers = Object.keys(rows[0]);
        const colMap = detectColumns(headers);
        setColMapDetected(colMap);

        const missing = [];
        if (!colMap.name)      missing.push('Name (EMPNAME / NAME)');
        if (!colMap.id_number) missing.push('Company ID (ID_NUMBER / EMPID)');
        if (missing.length) {
          const msg = `Hindi mahanap ang column: ${missing.join(' at ')}. I-check ang headers ng Excel file.`;
          setColWarning(msg);
          toast.warning(msg);
        }

        const records = rows
          .map(row => {
            const name      = colMap.name      ? row[colMap.name].toString().trim().toUpperCase()      : '';
            const id_number = colMap.id_number ? row[colMap.id_number].toString().trim().toUpperCase() : '';
            const batch     = colMap.batch     ? row[colMap.batch].toString().trim().toUpperCase()     : '';
            const unique_id = colMap.unique_id ? normalizeUID(row[colMap.unique_id])                   : '';

            let status = 'pending';
            let skipReason = '';

            if (!name) return null;

            if (id_number && existingByID.has(id_number)) {
              status = 'duplicate';
              skipReason = 'Company ID nasa masterlist na';
            } else if (unique_id && existingUIDs.has(unique_id)) {
              status = 'duplicate';
              skipReason = 'RFID UID naka-register na';
            }

            return { id_number, name, batch, unique_id, status, skipReason };
          })
          .filter(Boolean);

        setParsed(records);
        toast.info(`${records.length} rows detected.`);
      } catch (err) {
        toast.error('Hindi ma-parse ang file. Siguraduhing valid ang Excel/CSV.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
  };

  const pendingCount  = parsed.filter(r => r.status === 'pending').length;
  const dupCount      = parsed.filter(r => r.status === 'duplicate').length;
  const successCount  = parsed.filter(r => r.status === 'success').length;
  const errorCount    = parsed.filter(r => r.status === 'error').length;

  const handleImport = async () => {
    const toImport = parsed.filter(r => r.status === 'pending');
    if (!toImport.length) return;

    setImporting(true);
    setProgress(0);

    const updated = [...parsed];
    let completed = 0;

    for (const record of toImport) {
      const idx = updated.findIndex(r => r === record);
      try {
        let isDuplicate = false;
        let dupReason   = '';

        if (record.id_number) {
          const check = await pb.collection(`${prefix}trainees`).getList(1, 1, {
            filter: `id_number = "${record.id_number.replace(/"/g, '\\"')}"`,
            $autoCancel: false,
          });
          if (check.items.length > 0) {
            isDuplicate = true;
            dupReason   = 'Company ID nasa masterlist na (DB re-check)';
          }
        }

        if (!isDuplicate && record.unique_id) {
          const check2 = await pb.collection(`${prefix}trainees`).getList(1, 1, {
            filter: `unique_id = "${record.unique_id.replace(/"/g, '\\"')}"`,
            $autoCancel: false,
          });
          if (check2.items.length > 0) {
            isDuplicate = true;
            dupReason   = 'RFID UID naka-register na (DB re-check)';
          }
        }

        if (isDuplicate) {
          updated[idx] = { ...record, status: 'duplicate', skipReason: dupReason };
        } else {
          const emailBase = record.id_number
            ? record.id_number.toLowerCase().replace(/[^a-z0-9]/g, '')
            : record.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
          const email = `${emailBase}@trainee.local`;

          await pb.collection(`${prefix}trainees`).create({
            unique_id:  record.unique_id  || '',
            name:       record.name,
            id_number:  record.id_number  || '',
            batch:      record.batch      || '',
            email,
            company,
            status: 'active',
          }, { $autoCancel: false });

          updated[idx] = { ...record, status: 'success' };
        }
      } catch (err) {
        console.error('Bulk register error:', err);
        const errMsg = err?.data?.message || err?.message || 'DB error';
        updated[idx] = { ...record, status: 'error', skipReason: errMsg };
      }

      completed++;
      setProgress(Math.round((completed / toImport.length) * 100));
      setParsed([...updated]);
    }

    setImporting(false);
    setDone(true);
    const finalSuccess = updated.filter(r => r.status === 'success').length;
    toast.success(`Bulk import done! ${finalSuccess} trainee(s) registered.`);
    onSuccess();
  };

  const statusStyle = {
    pending:   { badge: 'bg-blue-50 text-blue-700',       label: 'To Import' },
    duplicate: { badge: 'bg-amber-50 text-amber-700',     label: 'Duplicate' },
    success:   { badge: 'bg-emerald-50 text-emerald-700', label: 'Registered' },
    error:     { badge: 'bg-red-50 text-red-700',         label: 'Error' },
  };

  return (
    <div className="space-y-5">
      <div
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">I-click para mag-upload ng Excel/CSV</p>
          <p className="text-xs text-slate-400 mt-1">
            Required columns:{' '}
            <span className="font-mono">ID_NUMBER / EMPNAME / DEPARTMENT / Unique id number</span>
          </p>
        </div>
        {fileName && (
          <Badge className="bg-primary/10 text-primary border-none text-xs font-mono px-3">
            📄 {fileName}
          </Badge>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      {colMapDetected && (
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detected columns</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            {[
              { label: 'Name',        key: 'name' },
              { label: 'Company ID',  key: 'id_number' },
              { label: 'Department',  key: 'batch' },
              { label: 'RFID UID',    key: 'unique_id' },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center gap-2">
                {colMapDetected[key]
                  ? <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  : <AlertCircle  className="h-3 w-3 text-amber-400 flex-shrink-0" />
                }
                <span className="text-slate-500">{label}:</span>
                <span className={`font-mono truncate ${colMapDetected[key] ? 'text-slate-800' : 'text-amber-500'}`}>
                  {colMapDetected[key] ?? 'not found'}
                </span>
              </div>
            ))}
          </div>
          {colWarning && (
            <p className="text-xs text-amber-600 flex items-start gap-1.5 mt-1">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" /> {colWarning}
            </p>
          )}
        </div>
      )}

      {parsed.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-50 text-blue-700 border-none">{pendingCount} to import</Badge>
            {dupCount     > 0 && <Badge className="bg-amber-50 text-amber-700 border-none">{dupCount} duplicate</Badge>}
            {successCount > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-none">{successCount} registered</Badge>}
            {errorCount   > 0 && <Badge className="bg-red-50 text-red-700 border-none">{errorCount} error</Badge>}
            <span className="text-xs text-slate-400 ml-auto">{parsed.length} total rows</span>
          </div>

          {importing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  Nagre-register… (
                  {parsed.filter(r => ['success','duplicate','error'].includes(r.status)).length}
                  {' / '}{parsed.length})
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Name</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Company ID</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Dept</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">RFID UID</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((r, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 border-b-slate-100">
                    <TableCell className="text-xs font-medium text-slate-800 py-2">{r.name || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 py-2">{r.id_number || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600 py-2">{r.batch || '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 py-2">{formatUID(r.unique_id)}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col gap-0.5">
                        <Badge className={`text-xs border-none w-fit ${statusStyle[r.status]?.badge}`}>
                          {r.status === 'success'   && <CheckCheck  className="h-3 w-3 mr-1" />}
                          {r.status === 'error'     && <AlertCircle className="h-3 w-3 mr-1" />}
                          {r.status === 'duplicate' && <X           className="h-3 w-3 mr-1" />}
                          {statusStyle[r.status]?.label}
                        </Badge>
                        {r.skipReason && <span className="text-[10px] text-slate-400">{r.skipReason}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={importing}>Cancel</Button>
        <Button onClick={handleImport} disabled={importing || pendingCount === 0 || done} className="min-w-36">
          {importing
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing…</>
            : done
              ? <><CheckCheck className="h-4 w-4 mr-2" /> Done</>
              : <><Upload className="h-4 w-4 mr-2" /> Import {pendingCount} Trainee{pendingCount !== 1 ? 's' : ''}</>
          }
        </Button>
      </div>
    </div>
  );
};

// ─── Bulk Signature Upload Form ───────────────────────────────────────────────

const BulkSignatureForm = ({ onSuccess, onCancel, existingTrainees, prefix }) => {
  const fileRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const traineeByID = useMemo(() => {
    const map = new Map();
    existingTrainees.forEach(t => {
      if (t.id_number) map.set(t.id_number.trim().toUpperCase(), t);
    });
    return map;
  }, [existingTrainees]);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setDone(false);
    setProgress(0);

    const matched = selected.map(file => {
      const idNumber = file.name.replace(/\.[^/.]+$/, '').trim().toUpperCase();
      const trainee  = traineeByID.get(idNumber);
      return {
        file,
        filename: file.name,
        idNumber,
        trainee: trainee || null,
        status:  trainee ? 'pending' : 'no_match',
        reason:  trainee ? '' : 'Walang trainee na may ID na ito',
      };
    });

    setFiles(matched);
  };

  const pendingCount  = files.filter(f => f.status === 'pending').length;
  const noMatchCount  = files.filter(f => f.status === 'no_match').length;
  const successCount  = files.filter(f => f.status === 'success').length;
  const errorCount    = files.filter(f => f.status === 'error').length;

  const handleUpload = async () => {
    const toUpload = files.filter(f => f.status === 'pending');
    if (!toUpload.length) return;

    setUploading(true);
    setProgress(0);

    const updated = [...files];
    let completed = 0;

    for (const item of toUpload) {
      const idx = updated.findIndex(f => f === item);
      try {
        const formData = new FormData();
        formData.append('signature', item.file);
        await pb.collection(`${prefix}trainees`).update(item.trainee.id, formData, { $autoCancel: false });
        updated[idx] = { ...item, status: 'success' };
      } catch (err) {
        console.error('Signature upload error:', err);
        updated[idx] = { ...item, status: 'error', reason: 'Upload failed' };
      }

      completed++;
      setProgress(Math.round((completed / toUpload.length) * 100));
      setFiles([...updated]);
    }

    setUploading(false);
    setDone(true);
    const finalSuccess = updated.filter(f => f.status === 'success').length;
    toast.success(`Done! ${finalSuccess} signature(s) uploaded.`);
    onSuccess();
  };

  const statusStyle = {
    pending:  { badge: 'bg-blue-50 text-blue-700',       label: 'Ready' },
    no_match: { badge: 'bg-amber-50 text-amber-700',     label: 'No Match' },
    success:  { badge: 'bg-emerald-50 text-emerald-700', label: 'Uploaded' },
    error:    { badge: 'bg-red-50 text-red-700',         label: 'Error' },
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 flex gap-3 items-start">
        <FileImage className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Paano mag-upload ng signatures:</p>
          <p>Ang filename ng bawat image ay dapat katumbas ng <span className="font-mono font-bold">Company ID</span> ng trainee.</p>
          <p className="text-blue-500">Halimbawa: <span className="font-mono">019001.BMP</span> → trainee na may ID <span className="font-mono">019001</span></p>
        </div>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
      >
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
          <PenLine className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">Piliin ang lahat ng signature files</p>
          <p className="text-xs text-slate-400 mt-1">BMP, PNG, JPG — pwedeng multiple files sabay-sabay</p>
        </div>
        {files.length > 0 && (
          <Badge className="bg-primary/10 text-primary border-none text-xs px-3">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </Badge>
        )}
        <input ref={fileRef} type="file" accept="image/*,.bmp" multiple className="hidden" onChange={handleFiles} />
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-50 text-blue-700 border-none">{pendingCount} to upload</Badge>
            {noMatchCount > 0 && <Badge className="bg-amber-50 text-amber-700 border-none">{noMatchCount} no match</Badge>}
            {successCount > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-none">{successCount} uploaded</Badge>}
            {errorCount   > 0 && <Badge className="bg-red-50 text-red-700 border-none">{errorCount} error</Badge>}
            <span className="text-xs text-slate-400 ml-auto">{files.length} total files</span>
          </div>

          {uploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Nag-a-upload…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-100">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-slate-500 font-semibold py-2 w-8">Sig</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Filename</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Matched Trainee</TableHead>
                  <TableHead className="text-xs text-slate-500 font-semibold py-2">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 border-b-slate-100">
                    <TableCell className="py-1.5">
                      {f.status === 'success' || f.status === 'pending' ? (
                        <img src={URL.createObjectURL(f.file)} alt="sig" className="h-8 w-12 object-contain bg-white border border-slate-100 rounded" />
                      ) : (
                        <div className="h-8 w-12 flex items-center justify-center bg-slate-100 rounded">
                          <ImageOff className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-600 py-1.5">{f.filename}</TableCell>
                    <TableCell className="text-xs text-slate-700 py-1.5 font-medium">
                      {f.trainee ? (
                        <div>
                          <p>{f.trainee.name}</p>
                          <p className="text-slate-400 font-normal">{f.trainee.id_number}</p>
                        </div>
                      ) : (
                        <span className="text-amber-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div className="flex flex-col gap-0.5">
                        <Badge className={`text-xs border-none w-fit ${statusStyle[f.status]?.badge}`}>
                          {f.status === 'success'  && <CheckCheck  className="h-3 w-3 mr-1" />}
                          {f.status === 'error'    && <AlertCircle className="h-3 w-3 mr-1" />}
                          {f.status === 'no_match' && <X           className="h-3 w-3 mr-1" />}
                          {statusStyle[f.status]?.label}
                        </Badge>
                        {f.reason && <span className="text-[10px] text-slate-400">{f.reason}</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>Cancel</Button>
        <Button onClick={handleUpload} disabled={uploading || pendingCount === 0 || done} className="min-w-36">
          {uploading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</>
            : done
              ? <><CheckCheck className="h-4 w-4 mr-2" /> Done</>
              : <><PenLine className="h-4 w-4 mr-2" /> Upload {pendingCount} Signature{pendingCount !== 1 ? 's' : ''}</>
          }
        </Button>
      </div>
    </div>
  );
};

// ─── Main Trainees Page ───────────────────────────────────────────────────────

const TraineesPage = ({ departmentOptions = TORRES_TECH_DEPARTMENTS }) => {
  const [trainees, setTrainees]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [editDialogOpen, setEditDialogOpen]   = useState(false);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [registerOpen, setRegisterOpen]       = useState(false);
  const [bulkOpen, setBulkOpen]               = useState(false);
  const [signatureOpen, setSignatureOpen]     = useState(false);
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeDept, setActiveDept]           = useState('All');

  // ── FIXED: destructure prefix from useCompany ──────────────────────────────
  const { company, companyLabel, prefix } = useCompany();

  const departments = useMemo(() => {
    if (departmentOptions.length > 0) return departmentOptions;
    return Array.from(new Set(
      trainees.map(t => t.batch?.trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
  }, [departmentOptions, trainees]);

  // ── FIXED: reset state + use prefix collection, no company filter ──────────
  useEffect(() => {
    setLoading(true);
    setTrainees([]);
    fetchTrainees();
  }, [company]);

  useEffect(() => {
    if (activeDept !== 'All' && !departments.includes(activeDept)) {
      setActiveDept('All');
    }
  }, [activeDept, departments]);

  const fetchTrainees = async () => {
    try {
      const items = await pb.collection(`${prefix}trainees`).getFullList({
        sort: 'batch,name',
        $autoCancel: false,
      });
      setTrainees(items);
    } catch (error) {
      console.error('Error fetching trainees:', error);
      toast.error('Failed to load trainees');
    } finally {
      setLoading(false);
    }
  };

  // ── FIXED: use prefix collection ───────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trainee? This action cannot be undone.')) return;
    try {
      await pb.collection(`${prefix}trainees`).delete(id, { $autoCancel: false });
      toast.success('Trainee deleted successfully');
      fetchTrainees();
    } catch {
      toast.error('Failed to delete trainee');
    }
  };

  const deptCount = (dept) => trainees.filter(t => t.batch === dept).length;

  const filteredTrainees = trainees
    .filter(t => activeDept === 'All' || t.batch === activeDept)
    .filter(t =>
      !searchQuery ||
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.unique_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.batch?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getSignatureUrl = (trainee) => {
    if (!trainee.signature) return null;
    return pb.files.getURL(trainee, trainee.signature, { thumb: '60x30' });
  };

  return (
    <>
      <Helmet><title>Masterlist - {companyLabel}</title></Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Masterlist</h1>
            <p className="text-muted-foreground mt-1">Manage all registered trainees in the system</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={() => setSignatureOpen(true)} className="shadow-sm">
              <PenLine className="h-4 w-4 mr-2" /> Bulk Signatures
            </Button>
            <Button variant="outline" onClick={() => setBulkOpen(true)} className="shadow-sm">
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </Button>
            <Button onClick={() => setRegisterOpen(true)} className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Add New Trainee
            </Button>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <Card className="w-44 flex-shrink-0 shadow-sm border-none ring-1 ring-slate-100 overflow-hidden">
            <div className="p-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 pb-2">Department</p>
              <button
                onClick={() => setActiveDept('All')}
                className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 text-sm transition-colors ${activeDept === 'All' ? 'bg-primary text-primary-foreground font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <span>All</span>
                <Badge className={`text-xs h-5 ${activeDept === 'All' ? 'bg-white/20 text-primary-foreground border-none' : 'bg-slate-100 text-slate-500 border-none'}`}>{trainees.length}</Badge>
              </button>
              {departments.map(dept => {
                const count    = deptCount(dept);
                const isActive = activeDept === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setActiveDept(dept)}
                    className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>{dept}</span>
                    <Badge className={`text-xs h-5 ${isActive ? 'bg-white/20 text-primary-foreground border-none' : 'bg-slate-100 text-slate-500 border-none'}`}>{count}</Badge>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="flex-1 shadow-sm border-none ring-1 ring-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, ID, department…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200"
                />
              </div>
              {activeDept !== 'All' && (
                <Badge className="bg-primary/10 text-primary border-none px-3 py-1 text-sm">{activeDept}</Badge>
              )}
              <span className="text-sm text-slate-400 ml-auto">
                {filteredTrainees.length} trainee{filteredTrainees.length !== 1 ? 's' : ''}
              </span>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
                </div>
              ) : filteredTrainees.length === 0 ? (
                <div className="text-center py-16">
                  <Building2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No trainees found for {companyLabel}.</p>
                  {activeDept !== 'All' && (
                    <p className="text-xs text-slate-400 mt-1">No one assigned to {activeDept} yet.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent border-b-slate-200">
                      <TableHead className="w-12 text-center font-semibold text-slate-600">#</TableHead>
                      <TableHead className="font-semibold text-slate-600">Trainee</TableHead>
                      <TableHead className="font-semibold text-slate-600">Company ID</TableHead>
                      <TableHead className="font-semibold text-slate-600">RFID UID</TableHead>
                      <TableHead className="font-semibold text-slate-600">Signature</TableHead>
                      <TableHead className="font-semibold text-slate-600">Department</TableHead>
                      <TableHead className="font-semibold text-slate-600">Status</TableHead>
                      <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrainees.map((trainee, index) => {
                      const sigUrl = getSignatureUrl(trainee);
                      return (
                        <TableRow key={trainee.id} className="hover:bg-slate-50/50 transition-colors border-b-slate-100">
                          <TableCell className="text-center text-slate-500 text-sm">{index + 1}</TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-900">{trainee.name}</span>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">{trainee.id_number || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-600 whitespace-nowrap">{formatUID(trainee.unique_id)}</TableCell>
                          <TableCell>
                            {sigUrl ? (
                              <img src={sigUrl} alt="signature" className="h-8 w-16 object-contain bg-white border border-slate-100 rounded" />
                            ) : (
                              <span className="text-xs text-slate-300 flex items-center gap-1">
                                <ImageOff className="h-3 w-3" /> None
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-none text-xs">
                              {trainee.batch || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Active</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-blue-50">
                                <Link to={`/${company}/trainees/${trainee.id}`}><Eye className="h-4 w-4" /></Link>
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
        </div>

        {/* Register Dialog */}
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
              company={company}
              prefix={prefix}
              departments={departments}
              onSuccess={() => { setRegisterOpen(false); fetchTrainees(); }}
              onCancel={() => { fetch(`${RFID_SERVER}/stop`).catch(() => {}); setRegisterOpen(false); }}
            />
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" /> Bulk Register Trainees
              </DialogTitle>
            </DialogHeader>
            <BulkUploadForm
              company={company}
              prefix={prefix}
              existingTrainees={trainees}
              onSuccess={() => { setBulkOpen(false); fetchTrainees(); }}
              onCancel={() => setBulkOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Bulk Signature Dialog */}
        <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" /> Bulk Upload Signatures
              </DialogTitle>
            </DialogHeader>
            <BulkSignatureForm
              prefix={prefix}
              existingTrainees={trainees}
              onSuccess={() => { setSignatureOpen(false); fetchTrainees(); }}
              onCancel={() => setSignatureOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
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