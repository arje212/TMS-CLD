import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, CreditCard, Wifi, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

const RFID_SERVER = 'http://localhost:5050';
const POLL_MS = 400;
const COOLDOWN_MS = 3000; // 3 seconds before same card can scan again

const AttendanceScanner = ({ trainingId, onScanSuccess }) => {
  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const [rfidMode, setRfidMode] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const [readerName, setReaderName] = useState('');
  const [rfidStatus, setRfidStatus] = useState('idle');
  const [lastUid, setLastUid] = useState(null);

  const pollRef = useRef(null);
  const isProcessing = useRef(false);       // prevent double processing
  const lastProcessedUid = useRef(null);    // track last scanned UID
  const cooldownRef = useRef(null);         // cooldown timer

  useEffect(() => {
    checkServer();
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
      clearTimeout(cooldownRef.current);
    };
  }, []);

  const checkServer = async () => {
    try {
      const res = await fetch(`${RFID_SERVER}/status`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        setServerOnline(true);
        setReaderName(data.reader || '');
      }
    } catch {
      setServerOnline(false);
    }
  };

  const startRfid = async () => {
    setRfidStatus('idle');
    try {
      const res = await fetch(`${RFID_SERVER}/start`);
      const data = await res.json();
      if (data.success) {
        setServerOnline(true);
        setReaderName(data.reader || '');
        setRfidMode(true);
        setRfidStatus('waiting');
        isProcessing.current = false;
        lastProcessedUid.current = null;
        startPolling();
      } else {
        toast.error('Hindi ma-start ang RFID reader');
        setServerOnline(false);
      }
    } catch {
      toast.error('RFID server offline. I-run muna: python rfid_server.py');
      setServerOnline(false);
    }
  };

  const stopRfid = async () => {
    stopPolling();
    clearTimeout(cooldownRef.current);
    setRfidMode(false);
    setRfidStatus('idle');
    setLastUid(null);
    isProcessing.current = false;
    lastProcessedUid.current = null;
    try { await fetch(`${RFID_SERVER}/stop`); } catch {}
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${RFID_SERVER}/uid`);
        const data = await res.json();

        const uid = data.uid;

        // Ignore if: no uid, already processing, or same card in cooldown
        if (!uid) return;
        if (isProcessing.current) return;
        if (uid === lastProcessedUid.current) return;

        // Lock immediately to prevent duplicate triggers
        isProcessing.current = true;
        lastProcessedUid.current = uid;

        setLastUid(uid);
        setRfidStatus('detected');

        await processId(uid);

        // After processing, show waiting again
        setRfidStatus('waiting');

        // Cooldown: allow same card again after COOLDOWN_MS
        cooldownRef.current = setTimeout(() => {
          lastProcessedUid.current = null;
          isProcessing.current = false;
        }, COOLDOWN_MS);

      } catch (err) {
        console.error('RFID poll error:', err);
        isProcessing.current = false;
      }
    }, POLL_MS);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const processId = async (rawId) => {
    const id = rawId.replace(/^UID:\s*/i, '').trim();
    if (!id) return;

    console.log('🔍 Processing ID:', id);
    setIsScanning(true);
    setRfidStatus('processing');

    try {
      let trainee = null;

      // 1) Match by unique_id (RFID UID e.g. "4B CA 26 04")
      trainee = await pb
        .collection('trainees')
        .getFirstListItem(`unique_id="${id}"`, { $autoCancel: false })
        .catch(() => null);

      // 2) Match by id_number (Employee ID e.g. "25100205")
      if (!trainee) {
        trainee = await pb
          .collection('trainees')
          .getFirstListItem(`id_number="${id}"`, { $autoCancel: false })
          .catch(() => null);
      }

      // 3) Match by email (manual input fallback)
      if (!trainee) {
        trainee = await pb
          .collection('trainees')
          .getFirstListItem(`email="${id}"`, { $autoCancel: false })
          .catch(() => null);
      }

      console.log('👤 Trainee found:', trainee);

      if (!trainee) {
        toast.error(`❌ Trainee not found: "${id}"`);
        return;
      }

      // Check existing attendance
      const existing = await pb
        .collection('attendance')
        .getFirstListItem(
          `training="${trainingId}" && trainee="${trainee.id}"`,
          { $autoCancel: false }
        )
        .catch(() => null);

      if (existing && existing.status === 'present') {
        toast.info(`ℹ️ ${trainee.name} is already checked in`);
      } else if (existing) {
        await pb.collection('attendance').update(
          existing.id,
          { status: 'present' },
          { $autoCancel: false }
        );
        toast.success(`✅ ${trainee.name} marked as present`);
        onScanSuccess();
      } else {
        await pb.collection('attendance').create(
          { training: trainingId, trainee: trainee.id, status: 'present' },
          { $autoCancel: false }
        );
        toast.success(`✅ ${trainee.name} checked in successfully`);
        onScanSuccess();
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to process scan. Check console for details.');
    } finally {
      setScanInput('');
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    processId(scanInput.trim());
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">

      {/* Manual input */}
      <form onSubmit={handleManualSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Scan RFID/QR or enter ID..."
            className="pl-10 h-12 text-lg shadow-sm focus-visible:ring-primary"
            autoFocus
            disabled={isScanning || rfidMode}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isScanning || !scanInput.trim() || rfidMode}
          className="h-12 px-8"
        >
          {isScanning && !rfidMode
            ? <Loader2 className="h-5 w-5 animate-spin" />
            : 'Check In'}
        </Button>
      </form>

      {/* RFID row */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          {serverOnline
            ? <><Wifi className="h-3.5 w-3.5 text-emerald-500" /><span className="text-emerald-600">Reader ready</span></>
            : <><WifiOff className="h-3.5 w-3.5 text-slate-400" /><span>No server</span></>
          }
        </span>

        {!rfidMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={startRfid}
          >
            <CreditCard className="h-4 w-4" />
            Use RFID Card
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <div className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium flex-1
              transition-all duration-300
              ${rfidStatus === 'detected' || rfidStatus === 'processing'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-50 text-blue-700'}
            `}>
              {rfidStatus === 'processing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : rfidStatus === 'detected' ? (
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              )}
              {rfidStatus === 'processing'
                ? 'Processing...'
                : rfidStatus === 'detected'
                ? `UID: ${lastUid}`
                : 'I-tap ang RFID card...'}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-700 shrink-0"
              onClick={stopRfid}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Server offline hint */}
      {!serverOnline && !rfidMode && (
        <p className="text-xs text-slate-400">
          Para sa RFID, i-run muna sa terminal:{' '}
          <code className="bg-slate-100 px-1 rounded">python rfid_server.py</code>
        </p>
      )}
    </div>
  );
};

export default AttendanceScanner;