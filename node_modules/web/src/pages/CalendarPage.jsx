import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import pb from '@/lib/pocketbaseClient.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateKey = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
  return days;
};

// ─── Color & Status Maps ──────────────────────────────────────────────────────

const PIN_COLORS = ['#DC2626', '#2563EB', '#64748B'];

const colorMap = {
  yellow:   'hsl(54 100% 88%)',
  pink:     'hsl(0 100% 85%)',
  blue:     'hsl(199 100% 85%)',
  green:    'hsl(120 39% 85%)',
  purple:   'hsl(270 60% 88%)',
  orange:   'hsl(28 100% 85%)',
  teal:     'hsl(174 60% 82%)',
  red:      'hsl(5 85% 83%)',
  lime:     'hsl(82 65% 82%)',
  indigo:   'hsl(230 70% 88%)',
  amber:    'hsl(43 100% 82%)',
  blush:    'hsl(340 80% 88%)',
};

// Map training status → note color
const statusColorMap = {
  upcoming: 'blue',
  ongoing:  'amber',
  completed: 'green',
};

const statusDot = {
  Confirmed: 'bg-green-500',
  Pending:   'bg-yellow-500',
  Cancelled: 'bg-red-500',
  // Training statuses
  upcoming:  'bg-blue-500',
  ongoing:   'bg-amber-500',
  completed: 'bg-emerald-500',
};

// ─── Sticky Note ──────────────────────────────────────────────────────────────

const StickyNote = ({ id, title, roomType, status, time, color, rotation, onEdit, onDelete, onDragStart, isTraining }) => {
  const [hovered, setHovered] = useState(false);
  const pinColor = PIN_COLORS[id.charCodeAt(0) % PIN_COLORS.length];
  const dotClass = statusDot[status] || 'bg-gray-400';

  return (
    <div
      draggable={!isTraining}
      onDragStart={!isTraining ? (e) => onDragStart(e, id) : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative animate-pop-in ${!isTraining ? 'cursor-move' : 'cursor-default'}`}
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center top' }}
    >
      {/* Pin */}
      <div className="absolute -top-3 left-1/2 z-10" style={{ transform: 'translateX(-50%)' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="6" r="4" fill={pinColor} opacity="0.9" />
          <ellipse cx="10" cy="6" rx="4" ry="2" fill={pinColor} opacity="0.6" />
          <rect x="9" y="6" width="2" height="8" fill={pinColor} opacity="0.8" />
          <circle cx="10" cy="14" r="1.5" fill={pinColor} opacity="0.9" />
        </svg>
      </div>

      {/* Body */}
      <div
        className="relative p-2 rounded-sm flex flex-col transition-all duration-200"
        style={{
          backgroundColor: colorMap[color] || colorMap.yellow,
          boxShadow: hovered ? '0 6px 18px rgba(0,0,0,0.22)' : '0 2px 6px rgba(0,0,0,0.12)',
          transform: hovered ? 'translateY(-2px) scale(1.03)' : 'none',
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(0,0,0,0.025) 14px, rgba(0,0,0,0.025) 15px)`,
          minHeight: 72,
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-black/10 text-gray-800 truncate max-w-[72%]">
            {roomType}
          </span>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
        </div>
        <p className="font-semibold text-[10px] text-gray-900 line-clamp-1 mb-0.5">{title}</p>
        <p className="text-[9px] text-gray-600 mb-1.5">{time}</p>

        {/* Only show edit/delete for manual bookings */}
        {!isTraining && (
          <div className="mt-auto flex gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(id); }}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-600"
            >
              <Edit2 className="h-2.5 w-2.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(id); }}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-black/10 text-gray-600"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {/* Training badge */}
        {isTraining && (
          <div className="mt-auto">
            <span className="text-[8px] px-1 py-0.5 rounded bg-black/10 text-gray-700 font-medium capitalize">
              📋 {status}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Note Colors for Picker ───────────────────────────────────────────────────

const NOTE_COLORS = [
  { key: 'yellow',  label: 'Butter',     bg: 'hsl(54 100% 88%)'  },
  { key: 'pink',    label: 'Rose',       bg: 'hsl(0 100% 85%)'   },
  { key: 'blue',    label: 'Sky',        bg: 'hsl(199 100% 85%)' },
  { key: 'green',   label: 'Mint',       bg: 'hsl(120 39% 85%)'  },
  { key: 'purple',  label: 'Lavender',   bg: 'hsl(270 60% 88%)'  },
  { key: 'orange',  label: 'Peach',      bg: 'hsl(28 100% 85%)'  },
  { key: 'teal',    label: 'Teal',       bg: 'hsl(174 60% 82%)'  },
  { key: 'red',     label: 'Coral',      bg: 'hsl(5 85% 83%)'    },
  { key: 'lime',    label: 'Lime',       bg: 'hsl(82 65% 82%)'   },
  { key: 'indigo',  label: 'Periwinkle', bg: 'hsl(230 70% 88%)'  },
  { key: 'amber',   label: 'Amber',      bg: 'hsl(43 100% 82%)'  },
  { key: 'blush',   label: 'Blush',      bg: 'hsl(340 80% 88%)'  },
];

// ─── Booking Modal ────────────────────────────────────────────────────────────

const BookingModal = ({ isOpen, onClose, onSubmit, booking, selectedDate }) => {
  const [form, setForm] = useState({
    title: '', roomType: 'Conference Room', time: '',
    attendees: '', notes: '', status: 'Confirmed', color: 'yellow'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (booking) {
      setForm({
        title: booking.title || '',
        roomType: booking.roomType || 'Conference Room',
        time: booking.time || '',
        attendees: booking.attendees || '',
        notes: booking.notes || '',
        status: booking.status || 'Confirmed',
        color: booking.color || 'yellow',
      });
    } else {
      setForm({ title: '', roomType: 'Conference Room', time: '', attendees: '', notes: '', status: 'Confirmed', color: 'yellow' });
    }
    setErrors({});
  }, [booking, isOpen]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.time) e.time = 'Time is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ ...form, date: selectedDate, id: booking?.id || Date.now().toString() });
    onClose();
  };

  const selectedColorBg = NOTE_COLORS.find(c => c.key === form.color)?.bg || NOTE_COLORS[0].bg;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-5">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">{booking ? 'Edit Booking' : 'New Booking'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
          <div className="space-y-1">
            <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
            <Input className="h-8 text-sm" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Team Meeting" />
            {errors.title && <p className="text-[10px] text-red-500">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Room Type</Label>
              <Select value={form.roomType} onValueChange={v => setForm({ ...form, roomType: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conference Room">Conference Room</SelectItem>
                  <SelectItem value="Meeting Room">Meeting Room</SelectItem>
                  <SelectItem value="Private Office">Private Office</SelectItem>
                  <SelectItem value="Training Room">Training Room</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time <span className="text-red-500">*</span></Label>
              <Input className="h-8 text-sm" type="time" value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })} />
              {errors.time && <p className="text-[10px] text-red-500">{errors.time}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Note Color</Label>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm inline-block"
                  style={{ backgroundColor: selectedColorBg }} />
                <span className="text-[10px] text-slate-500">
                  {NOTE_COLORS.find(c => c.key === form.color)?.label}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_COLORS.map(c => (
                <button key={c.key} type="button" title={c.label}
                  onClick={() => setForm({ ...form, color: c.key })} className="relative flex-shrink-0">
                  <div className="w-7 h-7 rounded-full transition-all duration-150"
                    style={{
                      backgroundColor: c.bg,
                      boxShadow: form.color === c.key ? '0 0 0 2.5px #1e293b, 0 0 0 4px ' + c.bg : '0 1px 3px rgba(0,0,0,0.18)',
                      transform: form.color === c.key ? 'scale(1.2)' : 'scale(1)',
                    }} />
                  {form.color === c.key && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <svg width="9" height="9" viewBox="0 0 10 10">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Attendees</Label>
              <Input className="h-8 text-sm" value={form.attendees}
                onChange={e => setForm({ ...form, attendees: e.target.value })} placeholder="e.g. 5 people" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-sm resize-none" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional details…" />
          </div>

          <DialogFooter className="pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm"
              style={{ backgroundColor: selectedColorBg, color: '#1e293b', borderColor: 'transparent' }}>
              {booking ? 'Update' : 'Create'} Booking
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Date Details Modal ───────────────────────────────────────────────────────

const ROTATIONS = [-2, -1, 0, 1, 2];

const ModalStickyNote = ({ id, title, roomType, status, time, color, rotation, attendees, notes, onEdit, onDelete, onClose, isTraining }) => {
  const [hovered, setHovered] = useState(false);
  const pinColor = PIN_COLORS[id.charCodeAt(0) % PIN_COLORS.length];
  const dotClass = statusDot[status] || 'bg-gray-400';

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative animate-pop-in"
      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center top' }}>
      <div className="absolute -top-4 left-1/2 z-10" style={{ transform: 'translateX(-50%)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="6" r="4" fill={pinColor} opacity="0.9" />
          <ellipse cx="10" cy="6" rx="4" ry="2" fill={pinColor} opacity="0.6" />
          <rect x="9" y="6" width="2" height="8" fill={pinColor} opacity="0.8" />
          <circle cx="10" cy="14" r="1.5" fill={pinColor} opacity="0.9" />
        </svg>
      </div>
      <div className="relative p-4 rounded-sm flex flex-col transition-all duration-200"
        style={{
          backgroundColor: colorMap[color] || colorMap.yellow,
          boxShadow: hovered ? '0 10px 28px rgba(0,0,0,0.25)' : '0 3px 10px rgba(0,0,0,0.15)',
          transform: hovered ? 'translateY(-4px) scale(1.02)' : 'none',
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(0,0,0,0.025) 20px, rgba(0,0,0,0.025) 21px)`,
          minHeight: 140, width: '100%',
        }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/10 text-gray-800 truncate max-w-[75%]">
            {roomType}
          </span>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
        </div>
        <p className="font-bold text-sm text-gray-900 mb-1 leading-tight">{title}</p>
        <p className="text-xs text-gray-600 mb-1">🕐 {time}</p>
        {attendees && <p className="text-xs text-gray-600 mb-1">👥 {attendees}</p>}
        {notes && <p className="text-xs text-gray-500 line-clamp-2 mb-2 italic">{notes}</p>}
        {isTraining && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/10 text-gray-700 font-medium capitalize self-start mb-2">
            📋 Training — {status}
          </span>
        )}
        {!isTraining && (
          <div className="mt-auto flex gap-1 pt-2">
            <button onClick={() => { onEdit(id); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1 h-7 rounded hover:bg-black/10 text-gray-600 text-[10px] font-medium transition-colors">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
            <button onClick={() => onDelete(id)}
              className="flex-1 flex items-center justify-center gap-1 h-7 rounded hover:bg-red-100 text-gray-600 hover:text-red-600 text-[10px] font-medium transition-colors">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DateDetailsModal = ({ isOpen, onClose, date, bookings, onEdit, onDelete }) => {
  const label = date
    ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[720px] max-h-[85vh] overflow-y-auto p-0 border-none rounded-2xl overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between"
          style={{
            background: 'hsl(28 42% 38%)',
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(28 35% 48%) 0%, transparent 60%), radial-gradient(circle at 80% 50%, hsl(28 30% 30%) 0%, transparent 60%)`,
          }}>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white/80" />
            <div>
              <p className="text-white font-bold text-base leading-tight">{label}</p>
              <p className="text-white/60 text-xs">{bookings.length} item{bookings.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-6 min-h-[200px]"
          style={{
            background: 'hsl(28 38% 42%)',
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px)`,
          }}>
          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Calendar className="h-10 w-10 text-white/30" />
              <p className="text-white/50 text-sm">No bookings for this date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-4">
              {bookings.map((b, i) => (
                <ModalStickyNote key={b.id} {...b}
                  rotation={ROTATIONS[i % ROTATIONS.length]}
                  onEdit={onEdit} onDelete={onDelete} onClose={onClose} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Parallax Board ───────────────────────────────────────────────────────────

const ParallaxBoard = ({ children }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const onMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - rect.width / 2) / rect.width) * 3;
    const y = ((e.clientY - rect.top - rect.height / 2) / rect.height) * 3;
    setOffset({ x, y });
  };
  return (
    <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={() => setOffset({ x: 0, y: 0 })} className="relative">
      <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: 'transform 0.2s ease-out' }}>
        {children}
      </div>
    </div>
  );
};

// ─── Main Calendar Page ───────────────────────────────────────────────────────

const STORAGE_KEY = 'tms_calendar_bookings';

const CalendarPage = () => {
  // Manual bookings from localStorage
  const [bookings, setBookings] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });

  // Trainings from PocketBase
  const [trainings, setTrainings] = useState([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [draggedId, setDraggedId] = useState(null);

  // Save manual bookings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }, [bookings]);

  // Fetch trainings from PocketBase
  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const result = await pb.collection('trainings').getFullList({
        sort: '-date',
        $autoCancel: false
      });
      setTrainings(result);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    }
  };

  // Convert PocketBase training to calendar note format
  const trainingToNote = (training) => ({
    id: `training-${training.id}`,
    title: training.title,
    roomType: training.location || 'Training Room',
    status: training.status || 'upcoming',
    time: training.time || '',
    color: training.color || statusColorMap[training.status] || 'blue',
    date: training.date,
    attendees: '',
    notes: training.description || '',
    isTraining: true,
  });

  // Get all items (trainings + manual bookings) for a specific date
  const getItemsForDate = (date) => {
    if (!date) return [];
    const key = typeof date === 'string' ? date : formatDateKey(date);
    const trainingNotes = trainings.map(trainingToNote).filter(t => t.date === key);
    const manualBookings = bookings.filter(b => b.date === key);
    return [...trainingNotes, ...manualBookings];
  };

  const handleAddBooking = (date, e) => {
    e?.stopPropagation();
    setSelectedDate(formatDateKey(date));
    setEditingBooking(null);
    setModalOpen(true);
  };

  const handleDateClick = (date) => {
    setSelectedDate(formatDateKey(date));
    setDetailsOpen(true);
  };

  const handleEditBooking = (id) => {
    const b = bookings.find(b => b.id === id);
    if (b) { setEditingBooking(b); setSelectedDate(b.date); setModalOpen(true); }
  };

  const handleDeleteBooking = (id) => {
    setBookings(prev => prev.filter(b => b.id !== id));
    toast('Booking deleted');
  };

  const handleSubmitBooking = (data) => {
    if (editingBooking) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? data : b));
      toast('Booking updated');
    } else {
      setBookings(prev => [...prev, data]);
      toast('Booking created!');
    }
    setEditingBooking(null);
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    if (!draggedId || !date) return;
    setBookings(prev => prev.map(b => b.id === draggedId ? { ...b, date: formatDateKey(date) } : b));
    setDraggedId(null);
    toast('Booking moved');
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayKey = formatDateKey(new Date());

  return (
    <>
      <Helmet><title>Calendar - TMS Pro</title></Helmet>

      <div className="h-full min-h-0 p-4 relative flex flex-col"
        style={{
          background: `hsl(28 42% 38%)`,
          backgroundImage: `
            radial-gradient(circle at 20% 30%, hsl(28 35% 48%) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, hsl(28 30% 30%) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, hsl(28 25% 42%) 0%, transparent 60%)
          `,
        }}>
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px),
              repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)
            `,
          }} />

        <ParallaxBoard>
          <div className="relative w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg tracking-tight">Calendar</h1>
                <p className="text-white/60 text-xs mt-0.5">Trainings & bookings at a glance</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="bg-white/90 hover:bg-white border-none shadow-md">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-white font-semibold text-lg min-w-44 text-center drop-shadow">{monthName}</span>
                <Button variant="outline" size="icon"
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="bg-white/90 hover:bg-white border-none shadow-md">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-white/60 text-[10px]">Upcoming Training</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-white/60 text-[10px]">Ongoing Training</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-white/60 text-[10px]">Completed Training</span>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                <div key={d} className="text-center text-white/60 text-[10px] font-semibold py-1 uppercase tracking-wider">
                  {d.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((date, idx) => {
                const items = date ? getItemsForDate(date) : [];
                const isToday = date && formatDateKey(date) === todayKey;

                return (
                  <div key={idx}
                    onDragOver={date ? (e) => e.preventDefault() : undefined}
                    onDrop={date ? (e) => handleDrop(e, date) : undefined}
                    onClick={date ? () => handleDateClick(date) : undefined}
                    className={`
                      min-h-[100px] rounded-2xl p-2 transition-all duration-200
                      ${date ? 'cursor-pointer hover:bg-white/20' : 'bg-transparent'}
                      ${date ? 'bg-white/10 backdrop-blur-sm' : ''}
                      ${isToday ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-transparent' : ''}
                    `}>
                    {date && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold leading-none
                            ${isToday
                              ? 'bg-white text-amber-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow'
                              : 'text-white/80 text-xs'
                            }`}>
                            {date.getDate()}
                          </span>
                          <button onClick={(e) => handleAddBooking(date, e)}
                            className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-white/30 text-white/50 hover:text-white transition-colors">
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        <div className="space-y-1" onClick={e => e.stopPropagation()}>
                          {items.slice(0, 1).map((item, i) => (
                            <StickyNote key={item.id} {...item}
                              rotation={ROTATIONS[i % ROTATIONS.length]}
                              onEdit={handleEditBooking}
                              onDelete={handleDeleteBooking}
                              onDragStart={handleDragStart} />
                          ))}
                          {items.length > 1 && (
                            <div onClick={(e) => { e.stopPropagation(); handleDateClick(date); }}
                              className="text-[9px] text-white font-semibold text-center bg-white/20 hover:bg-white/30 rounded-lg py-1 cursor-pointer transition-colors">
                              +{items.length - 1} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ParallaxBoard>
      </div>

      <BookingModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingBooking(null); }}
        onSubmit={handleSubmitBooking}
        booking={editingBooking}
        selectedDate={selectedDate}
      />

      <DateDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        date={selectedDate}
        bookings={getItemsForDate(selectedDate)}
        onEdit={handleEditBooking}
        onDelete={handleDeleteBooking}
      />
    </>
  );
};

export default CalendarPage;