import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const getLocalDateString = () => new Date().toLocaleDateString('en-CA');

const getCurrentHHMM = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
};

const toMinutes = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const minutesToHHMM = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
};

const getAttendanceWindow = (nowMinutes, startHHMM, endHHMM) => {
  const start = toMinutes(startHHMM);
  if (start === null) return 'closed';
  const windowOpen = start - 60;
  const lateAfter  = start + 15;
  if (nowMinutes < windowOpen) return 'before';
  const end = toMinutes(endHHMM);
  if (end !== null && nowMinutes >= end) return 'closed';
  if (nowMinutes >= lateAfter) return 'late';
  return 'open';
};

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

// ─── Flash overlays ──────────────────────────────────────────────────────────

const ScanFlash = ({ result }) => {
  if (!result) return null;
  const ok      = result.type === 'success';
  const late    = result.type === 'late';
  const timeout = result.type === 'timeout';
  const bg         = ok ? 'rgba(16,185,129,0.12)' : late ? 'rgba(234,179,8,0.12)' : timeout ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)';
  const cardBg     = ok ? '#f0fdf4' : late ? '#fefce8' : timeout ? '#eef2ff' : '#fef2f2';
  const cardBorder = ok ? '#86efac' : late ? '#fde68a' : timeout ? '#c7d2fe' : '#fca5a5';
  const nameColor  = ok ? '#166534' : late ? '#92400e' : timeout ? '#3730a3' : '#991b1b';
  const msgColor   = ok ? '#15803d' : late ? '#a16207' : timeout ? '#4338ca' : '#dc2626';
  const icon       = ok ? '✅' : late ? '🕐' : timeout ? '👋' : '❌';

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:50,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      pointerEvents:'none', background: bg,
      animation:'flashFade 2s ease-out forwards',
    }}>
      <div style={{
        borderRadius:20, padding:'clamp(16px,4vw,40px) clamp(24px,6vw,60px)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:12,
        background: cardBg, border:`2px solid ${cardBorder}`,
        boxShadow:'0 8px 40px rgba(0,0,0,0.12)',
      }}>
        <div style={{ fontSize:'clamp(2.5rem,8vw,5rem)' }}>{icon}</div>
        <p style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'clamp(1.2rem,3.5vw,2rem)', color: nameColor }}>
          {result.name}
        </p>
        <p style={{ fontSize:'clamp(0.8rem,2vw,1rem)', color: msgColor }}>
          {result.message}
        </p>
      </div>
    </div>
  );
};

const CompletedFlash = ({ visible }) => {
  if (!visible) return null;
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:60,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      pointerEvents:'none', background:'rgba(2,132,199,0.10)',
      animation:'flashFade 3s ease-out forwards',
    }}>
      <div style={{
        borderRadius:20, padding:'clamp(20px,5vw,48px) clamp(28px,7vw,72px)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:14,
        background:'#eff6ff', border:'2px solid #93c5fd',
        boxShadow:'0 8px 40px rgba(0,0,0,0.14)',
      }}>
        <div style={{ fontSize:'clamp(2.5rem,8vw,5rem)' }}>🎉</div>
        <p style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'clamp(1.2rem,3.5vw,2rem)', color:'#1d4ed8' }}>
          Training Completed
        </p>
        <p style={{ fontSize:'clamp(0.8rem,2vw,1rem)', color:'#0369a1' }}>
          Session has ended. Status updated automatically.
        </p>
      </div>
    </div>
  );
};

// ─── Attendee row ─────────────────────────────────────────────────────────────

const AttendeeRow = ({ name, idNumber, status, timeIn, timeOut, isNew, department }) => {
  const isPresent    = status === 'present';
  const isLate       = status === 'late';
  const isIncomplete = status === 'incomplete';

  const bg     = isNew        ? '#f0fdf4'
               : isPresent    ? '#f8fafc'
               : isLate       ? '#fefce8'
               : isIncomplete ? '#f5f3ff'
               :                '#fff5f5';

  const border  = isNew        ? '#86efac'
                : isPresent    ? '#e2e8f0'
                : isLate       ? '#fde68a'
                : isIncomplete ? '#c4b5fd'
                :                '#fecaca';

  const avatarBg = isPresent ? '#10b981' : isLate ? '#eab308' : isIncomplete ? '#8b5cf6' : '#ef4444';
  const badgeBg    = isPresent ? '#dcfce7' : isLate ? '#fef9c3' : isIncomplete ? '#ede9fe' : '#fee2e2';
  const badgeColor = isPresent ? '#166534' : isLate ? '#854d0e' : isIncomplete ? '#5b21b6' : '#991b1b';
  const badgeBorder= isPresent ? '#86efac' : isLate ? '#fde68a' : isIncomplete ? '#c4b5fd' : '#fca5a5';

  const formatHHMM = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${m} ${ampm}`;
  };

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'clamp(5px,1.2vw,10px) clamp(8px,1.8vw,14px)',
      borderRadius:10, marginBottom:'clamp(4px,0.8vw,7px)',
      background: bg, border:`1px solid ${border}`,
      transition:'all 0.4s ease',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:'clamp(6px,1.2vw,10px)' }}>
        <div style={{
          width:'clamp(26px,3.5vw,36px)', height:'clamp(26px,3.5vw,36px)',
          borderRadius:'50%', flexShrink:0,
          background: avatarBg, color:'white',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:700, fontSize:'clamp(0.65rem,1.4vw,0.85rem)',
        }}>
          {name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <p style={{ fontWeight:600, fontSize:'clamp(0.65rem,1.6vw,0.85rem)', color:'#1e293b', margin:0, lineHeight:1.2 }}>{name}</p>
          <p style={{ fontSize:'clamp(0.55rem,1.1vw,0.7rem)', color:'#94a3b8', margin:0 }}>{idNumber || 'No ID'}{department ? ` · ${department}` : ''}</p>
          {timeIn && (
            <p style={{ fontSize:'clamp(0.5rem,1vw,0.65rem)', color:'#64748b', margin:0, marginTop:1 }}>
              In: {formatHHMM(timeIn)}
              {timeOut ? ` · Out: ${formatHHMM(timeOut)}` : ' · No time-out yet'}
            </p>
          )}
        </div>
      </div>
      <span style={{
        fontSize:'clamp(0.5rem,1.1vw,0.65rem)', fontWeight:700,
        padding:'2px 9px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.05em',
        background: badgeBg, color: badgeColor, border:`1px solid ${badgeBorder}`,
        whiteSpace:'nowrap',
      }}>
        {status}
      </span>
    </div>
  );
};

// ─── No-training screen ───────────────────────────────────────────────────────

const NoTrainingScreen = ({ room, now, isSH }) => (
  <div style={{
    position:'fixed', inset:0, display:'flex', flexDirection:'column',
    alignItems:'center', justifyContent:'center',
    background: isSH
      ? 'linear-gradient(135deg,#fff7ed,#fef3c7,#fff7ed)'
      : 'linear-gradient(135deg,#f0f9ff,#e0f2fe,#f0fdf4)',
    fontFamily:"'Outfit',sans-serif",
  }}>
    <div style={{ textAlign:'center', padding:'2rem' }}>
      <div style={{ fontSize:'clamp(3rem,10vw,6rem)', marginBottom:'1rem' }}>{isSH ? '🎓' : '🏫'}</div>
      <h1 style={{ color: isSH ? '#d97706' : '#0284c7', fontSize:'clamp(1rem,3.5vw,2rem)', fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:'0.5rem' }}>
        {isSH ? 'Senior High' : room?.toUpperCase()}
      </h1>
      <p style={{ color:'#94a3b8', fontSize:'clamp(0.8rem,2vw,1.1rem)', marginBottom:'2rem' }}>
        {isSH ? 'No active batch today' : 'No active training scheduled'}
      </p>
      <div style={{ color: isSH ? '#d97706' : '#0369a1', fontSize:'clamp(2rem,8vw,4rem)', fontWeight:200, letterSpacing:'0.1em', marginBottom:'0.5rem' }}>
        {now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </div>
      <p style={{ color: isSH ? '#fbbf24' : '#7dd3fc', fontSize:'clamp(0.75rem,2vw,1rem)' }}>
        {now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
      </p>
    </div>
  </div>
);

// ─── Senior High Room Display ─────────────────────────────────────────────────

const SHRoomDisplay = ({ room, now }) => {
  const [batch, setBatch]                 = useState(null);
  const [students, setStudents]           = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [scanResult, setScanResult]       = useState(null);
  const [newlyScanned, setNewlyScanned]   = useState(null);
  const [loading, setLoading]             = useState(true);

  // Register modal for unregistered RFID
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pendingRfid, setPendingRfid]             = useState(null);
  const [unregisteredStudents, setUnregisteredStudents] = useState([]);

  const lastUidRef       = useRef('');
  const processingRef    = useRef(false);
  const rfidRef          = useRef('');
  const timerRef         = useRef(null);

  const today     = getLocalDateString();
  const currentDay = batch?.current_day || 1;

  useEffect(() => {
    fetchBatchAndStudents();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => fetchAttendance(), 15000);
    return () => clearInterval(iv);
  }, [batch]);

  // Poll RFID server
  useEffect(() => {
    const poll = async () => {
      if (processingRef.current) return;
      try {
        const url = window.location.hostname === 'localhost'
          ? 'http://localhost:5050/uid'
          : 'http://10.44.7.253:5050/uid';
        const res  = await fetch(url, { signal: AbortSignal.timeout(1500) });
        const data = await res.json();
        const uid  = data.uid?.trim().toUpperCase();
        if (!uid || uid === 'NONE') { lastUidRef.current = ''; return; }
        if (uid !== lastUidRef.current) {
          lastUidRef.current = uid;
          handleRfidScan(uid);
        }
      } catch {}
    };
    const iv = setInterval(poll, 1000);
    return () => clearInterval(iv);
  }, [students, attendanceRecords, batch]);

  // Keyboard fallback
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        const s = rfidRef.current; rfidRef.current = ''; clearTimeout(timerRef.current);
        if (s.length >= 4) handleRfidScan(s);
      } else if (e.key.length === 1) {
        rfidRef.current += e.key; clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { rfidRef.current = ''; }, 500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [students, attendanceRecords, batch]);

  const fetchBatchAndStudents = async () => {
    setLoading(true);
    try {
      // Find ongoing batch
      const batches = await pb.collection('sh_batches').getFullList({
        filter: 'status = "ongoing"',
        expand: 'school',
        $autoCancel: false,
      });
      if (batches.length === 0) { setLoading(false); return; }
      const b = batches[0];
      setBatch(b);

      const studs = await pb.collection('sh_students').getFullList({
        filter: `batch = "${b.id}"`,
        sort: 'name',
        $autoCancel: false,
      });
      setStudents(studs);

      // Fetch today's attendance
      const att = await pb.collection('sh_attendance').getFullList({
        filter: `batch = "${b.id}" && date = "${today}"`,
        $autoCancel: false,
      });
      setAttendanceRecords(att);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!batch) return;
    try {
      const att = await pb.collection('sh_attendance').getFullList({
        filter: `batch = "${batch.id}" && date = "${today}"`,
        $autoCancel: false,
      });
      setAttendanceRecords(att);
    } catch {}
  };

  const handleRfidScan = async (uid) => {
    if (processingRef.current || !batch) return;
    processingRef.current = true;

    try {
      const student = students.find(s =>
        s.unique_id?.replace(/\s+/g,'').toUpperCase() === uid.replace(/\s+/g,'').toUpperCase()
      );

      if (!student) {
        // Unregistered card
        const unregistered = students.filter(s => !s.unique_id || s.unique_id.trim() === '');
        setUnregisteredStudents(unregistered);
        setPendingRfid(uid);
        setShowRegisterModal(true);
        processingRef.current = false;
        return;
      }

      const currentTime = getCurrentHHMM();
      const existing = attendanceRecords.find(a => a.student === student.id);

      if (!existing) {
        // First tap — time-in
        const newRec = await pb.collection('sh_attendance').create({
          student:    student.id,
          batch:      batch.id,
          day_number: currentDay,
          date:       today,
          status:     'present',
          time_in:    currentTime,
        }, { $autoCancel: false });

        setAttendanceRecords(prev => [...prev, newRec]);
        setScanResult({ type:'success', name: student.name, message: `Time-in recorded at ${formatTime(currentTime)}` });
        setNewlyScanned(student.id);
        setTimeout(() => setScanResult(null), 2500);
        setTimeout(() => setNewlyScanned(null), 4000);

      } else if (!existing.time_out) {
        // Second tap — time-out
        const updated = await pb.collection('sh_attendance').update(existing.id, {
          time_out: currentTime,
        }, { $autoCancel: false });

        setAttendanceRecords(prev => prev.map(a => a.id === existing.id ? { ...a, time_out: currentTime } : a));
        setScanResult({ type:'timeout', name: student.name, message: `Time-out recorded at ${formatTime(currentTime)}` });
        setNewlyScanned(student.id);
        setTimeout(() => setScanResult(null), 2500);
        setTimeout(() => setNewlyScanned(null), 4000);

      } else {
        // Already fully recorded
        setScanResult({ type:'error', name: student.name, message:'Already time-in and time-out recorded' });
        setTimeout(() => setScanResult(null), 2500);
      }
    } catch (e) {
      console.error(e);
      setScanResult({ type:'error', name:'Error', message:'Could not record attendance' });
      setTimeout(() => setScanResult(null), 2500);
    } finally {
      processingRef.current = false;
    }
  };

  const handleRegisterAndMark = async (student) => {
    if (!pendingRfid) return;
    processingRef.current = true;
    try {
      await pb.collection('sh_students').update(student.id, { unique_id: pendingRfid }, { $autoCancel: false });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, unique_id: pendingRfid } : s));

      const currentTime = getCurrentHHMM();
      const newRec = await pb.collection('sh_attendance').create({
        student:    student.id,
        batch:      batch.id,
        day_number: currentDay,
        date:       today,
        status:     'present',
        time_in:    currentTime,
      }, { $autoCancel: false });

      setAttendanceRecords(prev => [...prev, newRec]);
      setScanResult({ type:'success', name: student.name, message: `RFID registered · Time-in at ${formatTime(currentTime)}` });
      setNewlyScanned(student.id);
      setTimeout(() => setScanResult(null), 2500);
      setTimeout(() => setNewlyScanned(null), 4000);
      setShowRegisterModal(false);
      setPendingRfid(null);
    } catch (e) {
      console.error(e);
    } finally {
      processingRef.current = false;
    }
  };

  const presentCount    = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
  const timedOutCount   = attendanceRecords.filter(a => a.time_out).length;
  const noTimeOutCount  = attendanceRecords.filter(a => a.time_in && !a.time_out).length;
  const absentCount     = students.length - presentCount;
  const totalCount      = students.length;
  const percentage      = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const attendeeList = students.map(s => {
    const rec = attendanceRecords.find(a => a.student === s.id);
    return {
      id:         s.id,
      name:       s.name,
      idNumber:   s.id_number,
      department: s.department,
      status:     rec?.status || 'absent',
      timeIn:     rec?.time_in || null,
      timeOut:    rec?.time_out || null,
    };
  }).sort((a, b) => {
    const order = { present: 0, late: 1, absent: 2 };
    const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  if (loading) return (
    <div style={{ position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff7ed' }}>
      <p style={{ color:'#d97706', fontSize:'1.4rem', fontWeight:300, fontFamily:"'Outfit',sans-serif" }}>Loading...</p>
    </div>
  );

  if (!batch) return <NoTrainingScreen room={room} now={now} isSH={true} />;

  return (
    <>
      <div style={{
        position:'fixed', inset:0, display:'flex', flexDirection:'column',
        background:'linear-gradient(160deg,#fffbeb 0%,#fef3c7 50%,#fff7ed 100%)',
        fontFamily:"'Outfit',sans-serif", overflow:'hidden',
      }}>
        {/* TOP BAR */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'clamp(6px,1.2vw,14px) clamp(10px,2vw,24px)',
          background:'white', borderBottom:'2px solid #fde68a',
          boxShadow:'0 2px 12px rgba(217,119,6,0.08)', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(6px,1.2vw,12px)', flexWrap:'wrap' }}>
            <div style={{
              background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white',
              borderRadius:8, padding:'clamp(3px,0.8vw,7px) clamp(8px,1.8vw,16px)',
              fontFamily:"'Oswald',sans-serif", fontWeight:600,
              fontSize:'clamp(0.75rem,2.2vw,1.2rem)', letterSpacing:'0.08em', textTransform:'uppercase',
            }}>
              🎓 SENIOR HIGH
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background:'#fef3c7', border:'1px solid #fde68a',
              borderRadius:20, padding:'3px 10px',
            }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#f59e0b', animation:'pulseRing 2s infinite' }} />
              <span style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', fontWeight:700, color:'#92400e', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                Day {currentDay}
              </span>
            </div>
            <div style={{
              background:'#f0fdf4', border:'1px solid #86efac',
              borderRadius:20, padding:'3px 10px',
            }}>
              <span style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', fontWeight:700, color:'#166534' }}>
                📡 1st tap = Time-in · 2nd tap = Time-out
              </span>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'clamp(1.3rem,3.5vw,2.2rem)', fontWeight:400, color:'#0f172a', letterSpacing:'0.05em', lineHeight:1 }}>
              {now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
            </div>
            <div style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', color:'#94a3b8', marginTop:2 }}>
              {now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          {/* LEFT */}
          <div style={{
            width:'55%', display:'flex', flexDirection:'column',
            padding:'clamp(8px,1.5vw,18px)', gap:'clamp(6px,1.2vw,12px)',
            borderRight:'1.5px solid #fde68a', overflow:'hidden',
          }}>
            {/* Batch Info */}
            <div style={{
              background:'white', borderRadius:12, padding:'clamp(8px,1.8vw,18px)',
              border:'1.5px solid #fde68a', boxShadow:'0 2px 10px rgba(217,119,6,0.07)',
            }}>
              <p style={{ fontSize:'clamp(0.55rem,1.1vw,0.68rem)', fontWeight:700, color:'#d97706', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:5 }}>
                Active Batch
              </p>
              <h2 style={{
                fontFamily:"'Oswald',sans-serif", fontWeight:700, color:'#0f172a',
                fontSize:'clamp(1.3rem,4vw,2.8rem)', lineHeight:1.1, letterSpacing:'0.02em',
              }}>
                {batch.expand?.school?.name || 'Senior High'}
              </h2>
              <p style={{ fontSize:'clamp(0.65rem,1.3vw,0.8rem)', color:'#64748b', marginTop:6 }}>
                Batch {batch.batch_number} · {formatDate(today)}
              </p>
            </div>

            {/* Scan prompt */}
            <div style={{
              flex:1,
              background:'linear-gradient(135deg,#fffbeb,#fef3c7)',
              border:'2px dashed #fde68a',
              borderRadius:12, padding:'clamp(8px,1.5vw,16px)',
              display:'flex', alignItems:'center', gap:'clamp(8px,1.5vw,14px)',
            }}>
              <div style={{
                width:'clamp(32px,5vw,46px)', height:'clamp(32px,5vw,46px)',
                borderRadius:'50%', background:'white',
                border:'2px solid #fde68a',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'clamp(0.9rem,2vw,1.3rem)', flexShrink:0,
                animation:'pulseRing 2s infinite',
              }}>
                📡
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:'clamp(0.7rem,1.6vw,0.9rem)', color:'#92400e' }}>
                  Ready to Scan
                </p>
                <p style={{ color:'#64748b', fontSize:'clamp(0.58rem,1.2vw,0.72rem)', marginTop:2 }}>
                  Morning: I-tap ang RFID card para sa time-in
                </p>
                <p style={{ color:'#64748b', fontSize:'clamp(0.58rem,1.2vw,0.72rem)', marginTop:1 }}>
                  Hapon: I-tap ulit para sa time-out
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{
            width:'45%', display:'flex', flexDirection:'column',
            padding:'clamp(8px,1.5vw,18px)', gap:'clamp(6px,1.2vw,12px)', overflow:'hidden',
          }}>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:'clamp(4px,0.8vw,7px)', flexShrink:0 }}>
              {[
                { label:'Present', value: presentCount,   bg:'#f0fdf4', border:'#86efac', color:'#16a34a' },
                { label:'Timed Out', value: timedOutCount, bg:'#eff6ff', border:'#bfdbfe', color:'#0284c7' },
                { label:'No Out',  value: noTimeOutCount, bg:'#ede9fe', border:'#c4b5fd', color:'#7c3aed' },
                { label:'Absent',  value: absentCount,    bg:'#fef2f2', border:'#fca5a5', color:'#dc2626' },
                { label:'Rate',    value: `${percentage}%`, bg:'white',  border:'#bfdbfe', color:'#0284c7' },
              ].map(({ label, value, bg, border, color }) => (
                <div key={label} style={{ background: bg, border:`1.5px solid ${border}`, borderRadius:10, padding:'clamp(6px,1vw,10px)', textAlign:'center' }}>
                  <p style={{ fontSize:'clamp(1rem,2.8vw,1.6rem)', fontWeight:800, color, lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:'clamp(0.4rem,0.8vw,0.55rem)', color, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginTop:2 }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <p style={{ fontWeight:700, color:'#1e293b', fontSize:'clamp(0.75rem,1.8vw,1rem)' }}>Students</p>
              <span style={{ fontSize:'clamp(0.55rem,1.1vw,0.68rem)', color:'#64748b', background:'#f1f5f9', padding:'2px 9px', borderRadius:20 }}>
                {totalCount} students
              </span>
            </div>

            {/* List */}
            <div style={{ flex:1, overflowY:'auto', paddingRight:2 }}>
              {attendeeList.map(a => (
                <AttendeeRow
                  key={a.id}
                  name={a.name}
                  idNumber={a.idNumber}
                  department={a.department}
                  status={a.status}
                  timeIn={a.timeIn}
                  timeOut={a.timeOut}
                  isNew={a.id === newlyScanned}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <ScanFlash result={scanResult} />

      {/* Register RFID Modal */}
      {showRegisterModal && (
        <div style={{
          position:'fixed', inset:0, zIndex:70, background:'rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:"'Outfit',sans-serif",
        }}>
          <div style={{
            background:'white', borderRadius:16, padding:24, width:'min(480px, 90vw)',
            maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column', gap:16,
          }}>
            <div>
              <p style={{ fontWeight:700, fontSize:'1.1rem', color:'#1e293b' }}>💳 Register RFID Card</p>
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'8px 12px', marginTop:8 }}>
                <p style={{ fontSize:'0.7rem', color:'#94a3b8' }}>Card UID</p>
                <p style={{ fontFamily:'monospace', fontWeight:700, color:'#1e293b' }}>{pendingRfid}</p>
              </div>
            </div>
            <p style={{ fontSize:'0.85rem', color:'#64748b' }}>Piliin ang student na mag-o-own ng card na ito:</p>
            <div style={{ flex:1, overflowY:'auto', maxHeight:280 }}>
              {unregisteredStudents.length === 0 ? (
                <p style={{ textAlign:'center', color:'#94a3b8', padding:'2rem 0' }}>Lahat ng students ay may RFID na.</p>
              ) : unregisteredStudents.map(s => (
                <button key={s.id} onClick={() => handleRegisterAndMark(s)}
                  style={{
                    width:'100%', textAlign:'left', padding:'10px 14px', borderRadius:8,
                    border:'1px solid #f1f5f9', marginBottom:4, background:'white',
                    cursor:'pointer', transition:'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background='white'}
                >
                  <p style={{ fontWeight:600, color:'#1e293b', fontSize:'0.9rem' }}>{s.name}</p>
                  <p style={{ fontSize:'0.75rem', color:'#94a3b8' }}>{s.id_number || 'No ID'}{s.department ? ` · ${s.department}` : ''}</p>
                </button>
              ))}
            </div>
            <button onClick={() => { setShowRegisterModal(false); setPendingRfid(null); processingRef.current = false; }}
              style={{
                padding:'10px', borderRadius:8, border:'1px solid #e2e8f0',
                background:'white', cursor:'pointer', fontSize:'0.85rem', color:'#64748b',
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const RoomDisplayPage = () => {
  const [searchParams] = useSearchParams();
  const room = searchParams.get('room') || 'room 1';
  const type = searchParams.get('type') || '';

  const now = useClock();

  // ── Senior High mode ───────────────────────────────────────────────────────
  if (type === 'senior-high') {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;600;700;800&family=Oswald:wght@400;600;700&display=swap');
          @keyframes flashFade { 0%,60%{opacity:1} 100%{opacity:0} }
          @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
          * { box-sizing:border-box; margin:0; padding:0; }
          body { overflow:hidden; }
          ::-webkit-scrollbar { width:4px; }
          ::-webkit-scrollbar-track { background:transparent; }
          ::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
        `}</style>
        <SHRoomDisplay room={room} now={now} />
      </>
    );
  }

  // ── Torres Tech / Yazaki Torres mode (existing — untouched) ────────────────
  return <TTRoomDisplay room={room} now={now} />;
};

// ─── Torres Tech Room Display (original code, extracted to component) ─────────

const TTRoomDisplay = ({ room, now }) => {
  const [training, setTraining]                   = useState(null);
  const [assignments, setAssignments]             = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [scanResult, setScanResult]               = useState(null);
  const [newlyScanned, setNewlyScanned]           = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [showCompleted, setShowCompleted]         = useState(false);

  const rfidRef          = useRef('');
  const timerRef         = useRef(null);
  const lastUidRef       = useRef('');
  const autoCompletedRef = useRef(false);
  const autoCompletedTrainingIdRef = useRef(null);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const attendanceWindow = training
    ? getAttendanceWindow(nowMinutes, training.time, training.end_time)
    : 'closed';

  const canScan = attendanceWindow === 'open' || attendanceWindow === 'late';

  const fetchTraining = useCallback(async () => {
    try {
      const today = getLocalDateString();
      const result = await pb.collection('trainings').getFullList({
        filter: `(status="upcoming" || status="ongoing")`,
        sort: '-date', $autoCancel: false,
      });
      const matched = result.find(t => {
        const locationMatch = t.location?.toLowerCase().trim() === room?.toLowerCase().trim();
        const dateMatch     = t.date?.slice(0, 10) === today;
        return locationMatch && dateMatch;
      });
      setTraining(matched || null);
      if (!matched || matched.id !== autoCompletedTrainingIdRef.current) {
        autoCompletedRef.current = false;
        autoCompletedTrainingIdRef.current = matched?.id || null;
      }
    } catch {
      setTraining(null);
    } finally {
      setLoading(false);
    }
  }, [room]);

  const fetchAttendance = useCallback(async () => {
    if (!training) return;
    try {
      const [assigns, records] = await Promise.all([
        pb.collection('training_assignments').getFullList({ filter:`training="${training.id}"`, expand:'trainee', $autoCancel:false }),
        pb.collection('attendance').getFullList({ filter:`training="${training.id}"`, expand:'trainee', $autoCancel:false }),
      ]);
      setAssignments(assigns);
      setAttendanceRecords(records);
    } catch {}
  }, [training]);

  useEffect(() => {
    if (!training || !training.end_time || autoCompletedRef.current) return;
    const today = getLocalDateString();
    if (training.date?.slice(0, 10) !== today) return;
    const currentHHMM = now.toTimeString().slice(0, 5);
    if (currentHHMM >= training.end_time) {
      autoCompletedRef.current = true;
      (async () => {
        try {
          await pb.collection('trainings').update(training.id, { status:'completed' }, { $autoCancel:false });
          setShowCompleted(true);
          setTimeout(() => setShowCompleted(false), 4000);
          setTimeout(() => fetchTraining(), 4200);
        } catch (err) { console.error('Auto-complete failed:', err); }
      })();
    }
  }, [now, training, fetchTraining]);

  useEffect(() => { fetchTraining(); },   [fetchTraining]);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);
  useEffect(() => {
    const iv = setInterval(() => { fetchTraining(); fetchAttendance(); }, 10000);
    return () => clearInterval(iv);
  }, [fetchTraining, fetchAttendance]);

  const handleRFIDScan = useCallback(async (scannedId) => {
    if (!training) return;
    const uid = scannedId.trim().toUpperCase();
    if (!uid) return;
    try {
      const tr = await pb.collection('trainees').getList(1, 1, {
        filter: `unique_id="${uid}"`, $autoCancel: false,
      });
      if (tr.items.length === 0) {
        setScanResult({ type:'error', name:'Unknown Card', message:'RFID not registered' });
        setTimeout(() => setScanResult(null), 2500);
        return;
      }
      const trainee = tr.items[0];
      const isAssigned = assignments.some(a => a.trainee === trainee.id);
      if (!isAssigned) {
        setScanResult({ type:'error', name: trainee.name, message:'Not assigned to this training' });
        setTimeout(() => setScanResult(null), 2500);
        return;
      }
      const ex = await pb.collection('attendance').getList(1, 1, {
        filter: `training="${training.id}" && trainee="${trainee.id}"`, $autoCancel:false,
      });
      const currentTime = getCurrentHHMM();
      if (ex.items.length === 0) {
        if (!canScan) {
          const msg = attendanceWindow === 'before'
            ? 'Attendance window is not open yet'
            : 'Attendance window has already closed';
          setScanResult({ type:'error', name: trainee.name, message: msg });
          setTimeout(() => setScanResult(null), 2500);
          return;
        }
        const isLate = attendanceWindow === 'late';
        const attendanceStatus = isLate ? 'late' : 'present';
        await pb.collection('attendance').create({
          training: training.id,
          trainee:  trainee.id,
          status:   attendanceStatus,
          date:     getLocalDateString(),
          time_in:  currentTime,
        }, { $autoCancel: false });
        setScanResult({
          type: isLate ? 'late' : 'success',
          name: trainee.name,
          message: isLate
            ? `Time-in recorded as LATE (${currentTime})`
            : `Time-in recorded at ${currentTime}`,
        });
        setNewlyScanned(trainee.id);
        setTimeout(() => setScanResult(null), 2500);
        setTimeout(() => setNewlyScanned(null), 4000);
        fetchAttendance();
      } else {
        const record = ex.items[0];
        if (!record.time_out) {
          await pb.collection('attendance').update(record.id, { time_out: currentTime }, { $autoCancel: false });
          setScanResult({ type:'timeout', name: trainee.name, message: `Time-out recorded at ${currentTime}` });
          setNewlyScanned(trainee.id);
          setTimeout(() => setScanResult(null), 2500);
          setTimeout(() => setNewlyScanned(null), 4000);
          fetchAttendance();
        } else {
          setScanResult({ type:'error', name: trainee.name, message:'Already time-in and time-out recorded' });
          setTimeout(() => setScanResult(null), 2500);
        }
      }
    } catch {
      setScanResult({ type:'error', name:'Error', message:'Could not record attendance' });
      setTimeout(() => setScanResult(null), 2500);
    }
  }, [training, canScan, attendanceWindow, assignments, fetchAttendance]);

  useEffect(() => {
    const poll = async () => {
      try {
        const url = window.location.hostname === 'localhost'
          ? 'http://localhost:5050/uid'
          : 'http://10.44.7.253:5050/uid';
        const res  = await fetch(url);
        const data = await res.json();
        const uid  = data.uid?.trim().toUpperCase();
        if (!uid || uid === 'NONE') { lastUidRef.current = ''; return; }
        if (uid !== lastUidRef.current) {
          lastUidRef.current = uid;
          handleRFIDScan(uid);
        }
      } catch {}
    };
    const iv = setInterval(poll, 1000);
    return () => clearInterval(iv);
  }, [handleRFIDScan]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter') {
        const s = rfidRef.current; rfidRef.current = ''; clearTimeout(timerRef.current);
        if (s.length >= 4) handleRFIDScan(s);
      } else if (e.key.length === 1) {
        rfidRef.current += e.key; clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { rfidRef.current = ''; }, 500);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRFIDScan]);

  const trainingEnded = training?.end_time
    ? now.toTimeString().slice(0, 5) >= training.end_time
    : training?.status === 'completed';

  const attendeeList = assignments.map(a => {
    const trainee = a.expand?.trainee;
    const record  = attendanceRecords.find(r => r.trainee === a.trainee);
    let displayStatus = record?.status || 'absent';
    if (record && record.time_in && !record.time_out && trainingEnded) {
      displayStatus = 'incomplete';
    }
    return {
      id:       a.trainee,
      name:     trainee?.name || 'Unknown',
      idNumber: trainee?.id_number,
      status:   displayStatus,
      timeIn:   record?.time_in || null,
      timeOut:  record?.time_out || null,
    };
  }).sort((a, b) => {
    const order = { present: 0, late: 1, incomplete: 2, absent: 3 };
    const diff = (order[a.status] ?? 4) - (order[b.status] ?? 4);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const presentCount    = attendeeList.filter(a => a.status === 'present').length;
  const lateCount       = attendeeList.filter(a => a.status === 'late').length;
  const incompleteCount = attendeeList.filter(a => a.status === 'incomplete').length;
  const absentCount     = attendeeList.filter(a => a.status === 'absent').length;
  const totalCount      = attendeeList.length;
  const percentage      = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const getCountdown = () => {
    if (!training?.end_time) return null;
    const [eh, em] = training.end_time.split(':').map(Number);
    const end  = new Date(now); end.setHours(eh, em, 0, 0);
    const diff = end - now;
    if (diff <= 0) return null;
    const totalMins = Math.floor(diff / 60000);
    const hrs  = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;
  };
  const countdown = getCountdown();

  const getWindowLabel = () => {
    if (!training?.time) return null;
    const [sh, sm] = training.time.split(':').map(Number);
    if (attendanceWindow === 'before') {
      const openH   = Math.max(sh - 1, 0);
      const openStr = `${String(openH).padStart(2,'0')}:${String(sm).padStart(2,'0')}`;
      return { color:'#92400e', bg:'#fefce8', border:'#fde68a', icon:'⏳', text:`Opens at ${formatTime(openStr)}` };
    }
    if (attendanceWindow === 'open') {
      const lateStr = minutesToHHMM((sh * 60) + sm + 15);
      return { color:'#166534', bg:'#f0fdf4', border:'#86efac', icon:'✅', text:`Open · Late after ${formatTime(lateStr)}` };
    }
    if (attendanceWindow === 'late') {
      return { color:'#92400e', bg:'#fefce8', border:'#fde68a', icon:'🕐', text:'Late Attendance · Still Accepting' };
    }
    return { color:'#991b1b', bg:'#fef2f2', border:'#fca5a5', icon:'🔒', text:'Attendance Closed · Time-out still allowed' };
  };
  const windowLabel = getWindowLabel();

  if (loading) return (
    <div style={{ position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f9ff' }}>
      <p style={{ color:'#0284c7', fontSize:'1.4rem', fontWeight:300, fontFamily:"'Outfit',sans-serif" }}>Loading...</p>
    </div>
  );

  if (!training) return <NoTrainingScreen room={room} now={now} isSH={false} />;

  return (
    <>
      <div style={{
        position:'fixed', inset:0, display:'flex', flexDirection:'column',
        background:'linear-gradient(160deg,#f8faff 0%,#eff6ff 50%,#f0fdf4 100%)',
        fontFamily:"'Outfit',sans-serif", overflow:'hidden',
      }}>
        {/* TOP BAR */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'clamp(6px,1.2vw,14px) clamp(10px,2vw,24px)',
          background:'white', borderBottom:'2px solid #bfdbfe',
          boxShadow:'0 2px 12px rgba(2,132,199,0.08)', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'clamp(6px,1.2vw,12px)', flexWrap:'wrap' }}>
            <div style={{
              background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'white',
              borderRadius:8, padding:'clamp(3px,0.8vw,7px) clamp(8px,1.8vw,16px)',
              fontFamily:"'Oswald',sans-serif", fontWeight:600,
              fontSize:'clamp(0.75rem,2.2vw,1.2rem)', letterSpacing:'0.08em', textTransform:'uppercase',
            }}>
              📍 {room.toUpperCase()}
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background: training.status === 'ongoing' ? '#f0fdf4' : '#eff6ff',
              border:`1px solid ${training.status === 'ongoing' ? '#86efac' : '#bfdbfe'}`,
              borderRadius:20, padding:'3px 10px',
            }}>
              <div style={{
                width:7, height:7, borderRadius:'50%',
                background: training.status === 'ongoing' ? '#10b981' : '#3b82f6',
                animation:'pulseRing 2s infinite',
              }} />
              <span style={{
                fontSize:'clamp(0.55rem,1.2vw,0.72rem)', fontWeight:700,
                color: training.status === 'ongoing' ? '#166534' : '#1d4ed8',
                textTransform:'uppercase', letterSpacing:'0.08em',
              }}>
                {training.status}
              </span>
            </div>
            {windowLabel && (
              <div style={{
                display:'flex', alignItems:'center', gap:5,
                background: windowLabel.bg, border:`1px solid ${windowLabel.border}`,
                borderRadius:20, padding:'3px 10px',
              }}>
                <span style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', fontWeight:700, color: windowLabel.color, letterSpacing:'0.05em' }}>
                  {windowLabel.icon} {windowLabel.text}
                </span>
              </div>
            )}
            {countdown && (
              <div style={{
                display:'flex', alignItems:'center', gap:5,
                background:'#fefce8', border:'1px solid #fde68a',
                borderRadius:20, padding:'3px 10px',
              }}>
                <span style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', fontWeight:700, color:'#92400e', letterSpacing:'0.05em' }}>
                  ⏱ {countdown}
                </span>
              </div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'clamp(1.3rem,3.5vw,2.2rem)', fontWeight:400, color:'#0f172a', letterSpacing:'0.05em', lineHeight:1 }}>
              {now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}
            </div>
            <div style={{ fontSize:'clamp(0.55rem,1.2vw,0.72rem)', color:'#94a3b8', marginTop:2 }}>
              {now.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div style={{
            width:'55%', display:'flex', flexDirection:'column',
            padding:'clamp(8px,1.5vw,18px)', gap:'clamp(6px,1.2vw,12px)',
            borderRight:'1.5px solid #bfdbfe', overflow:'hidden',
          }}>
            <div style={{
              background:'white', borderRadius:12, padding:'clamp(8px,1.8vw,18px)',
              border:'1.5px solid #bfdbfe', boxShadow:'0 2px 10px rgba(2,132,199,0.07)',
            }}>
              <p style={{ fontSize:'clamp(0.55rem,1.1vw,0.68rem)', fontWeight:700, color:'#0284c7', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:5 }}>
                Training Session
              </p>
              <h2 style={{
                fontFamily:"'Oswald',sans-serif", fontWeight:700, color:'#0f172a',
                fontSize:'clamp(1.3rem,4vw,2.8rem)', lineHeight:1.1, letterSpacing:'0.02em',
              }}>
                {(training.title || 'Untitled Training').toUpperCase()}
              </h2>
              {training.description && (
                <p style={{ fontSize:'clamp(0.65rem,1.3vw,0.8rem)', color:'#64748b', marginTop:6, lineHeight:1.4 }}>
                  {training.description}
                </p>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'clamp(5px,1vw,9px)' }}>
              {[
                { icon:'📅', label:'Date',    value: formatDate(training.date?.slice(0, 10)) },
                { icon:'🕐', label:'Time',    value: training.end_time ? `${formatTime(training.time)} – ${formatTime(training.end_time)}` : formatTime(training.time) },
                { icon:'🧑‍🏫', label:'Trainer', value: training.trainer || '—' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{
                  background:'white', borderRadius:10, padding:'clamp(7px,1.3vw,12px)',
                  border:'1.5px solid #e0f2fe', boxShadow:'0 1px 5px rgba(2,132,199,0.05)',
                }}>
                  <div style={{ fontSize:'clamp(0.9rem,2vw,1.3rem)', marginBottom:3 }}>{icon}</div>
                  <p style={{ fontSize:'clamp(0.5rem,1vw,0.62rem)', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:600 }}>{label}</p>
                  <p style={{ fontSize:'clamp(0.6rem,1.3vw,0.78rem)', color:'#1e293b', fontWeight:600, marginTop:2, lineHeight:1.3 }}>{value}</p>
                </div>
              ))}
            </div>
            <div style={{
              flex:1,
              background: canScan ? attendanceWindow === 'late' ? 'linear-gradient(135deg,#fefce8,#fff7ed)' : 'linear-gradient(135deg,#eff6ff,#f0fdf4)' : attendanceWindow === 'before' ? 'linear-gradient(135deg,#fefce8,#fff7ed)' : 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
              border:`2px dashed ${canScan ? attendanceWindow === 'late' ? '#fde68a' : '#93c5fd' : attendanceWindow === 'before' ? '#fde68a' : '#c4b5fd'}`,
              borderRadius:12, padding:'clamp(8px,1.5vw,16px)',
              display:'flex', alignItems:'center', gap:'clamp(8px,1.5vw,14px)',
            }}>
              <div style={{
                width:'clamp(32px,5vw,46px)', height:'clamp(32px,5vw,46px)',
                borderRadius:'50%', background:'white',
                border:`2px solid ${canScan ? attendanceWindow === 'late' ? '#fde68a' : '#93c5fd' : attendanceWindow === 'before' ? '#fde68a' : '#c4b5fd'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'clamp(0.9rem,2vw,1.3rem)', flexShrink:0,
                animation: canScan ? 'pulseRing 2s infinite' : 'none',
              }}>
                {canScan ? attendanceWindow === 'late' ? '🕐' : '📡' : attendanceWindow === 'before' ? '⏳' : '📡'}
              </div>
              <div>
                <p style={{ fontWeight:700, fontSize:'clamp(0.7rem,1.6vw,0.9rem)', color: canScan ? attendanceWindow === 'late' ? '#92400e' : '#1e40af' : attendanceWindow === 'before' ? '#92400e' : '#5b21b6' }}>
                  {canScan ? attendanceWindow === 'late' ? 'Late Attendance — Still Accepting' : 'Ready to Scan' : attendanceWindow === 'before' ? 'Attendance Not Yet Open' : 'Window Closed — Time-out Still Active'}
                </p>
                <p style={{ color:'#64748b', fontSize:'clamp(0.58rem,1.2vw,0.72rem)', marginTop:2 }}>
                  {canScan ? attendanceWindow === 'late' ? '1st tap = time-in (LATE) · 2nd tap = time-out' : '1st tap = time-in · 2nd tap = time-out' : attendanceWindow === 'before' ? `Opens 1 hour before start time (${formatTime(training.time)})` : 'Tap card again to record time-out if not yet done'}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            width:'45%', display:'flex', flexDirection:'column',
            padding:'clamp(8px,1.5vw,18px)', gap:'clamp(6px,1.2vw,12px)', overflow:'hidden',
          }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', gap:'clamp(4px,0.8vw,7px)', flexShrink:0 }}>
              {[
                { label:'Present',    value: presentCount,    bg:'#f0fdf4', border:'#86efac', color:'#16a34a' },
                { label:'Late',       value: lateCount,       bg:'#fefce8', border:'#fde68a', color:'#ca8a04' },
                { label:'Incomplete', value: incompleteCount, bg:'#ede9fe', border:'#c4b5fd', color:'#7c3aed' },
                { label:'Absent',     value: absentCount,     bg:'#fef2f2', border:'#fca5a5', color:'#dc2626' },
                { label:'Rate',       value: `${percentage}%`, bg:'white',  border:'#bfdbfe', color:'#0284c7' },
              ].map(({ label, value, bg, border, color }) => (
                <div key={label} style={{ background: bg, border:`1.5px solid ${border}`, borderRadius:10, padding:'clamp(6px,1vw,10px)', textAlign:'center' }}>
                  <p style={{ fontSize:'clamp(1rem,2.8vw,1.6rem)', fontWeight:800, color, lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:'clamp(0.4rem,0.8vw,0.55rem)', color, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, marginTop:2 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <p style={{ fontWeight:700, color:'#1e293b', fontSize:'clamp(0.75rem,1.8vw,1rem)' }}>Assigned Trainees</p>
              <span style={{ fontSize:'clamp(0.55rem,1.1vw,0.68rem)', color:'#64748b', background:'#f1f5f9', padding:'2px 9px', borderRadius:20 }}>
                {totalCount} registered
              </span>
            </div>
            <div style={{ flex:1, overflowY:'auto', paddingRight:2 }}>
              {attendeeList.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem', color:'#cbd5e1' }}>
                  <div style={{ fontSize:'2rem', marginBottom:8 }}>👥</div>
                  <p style={{ fontSize:'0.8rem' }}>No trainees assigned yet</p>
                </div>
              ) : attendeeList.map(a => (
                <AttendeeRow key={a.id} name={a.name} idNumber={a.idNumber} status={a.status} timeIn={a.timeIn} timeOut={a.timeOut} isNew={a.id === newlyScanned} />
              ))}
            </div>
          </div>
        </div>

        <ScanFlash result={scanResult} />
        <CompletedFlash visible={showCompleted} />
      </div>
    </>
  );
};

export default RoomDisplayPage;