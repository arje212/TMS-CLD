import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const NOTE_COLORS = [
  { key: 'yellow',   label: 'Butter',     bg: 'hsl(54 100% 88%)'  },
  { key: 'pink',     label: 'Rose',       bg: 'hsl(0 100% 85%)'   },
  { key: 'blue',     label: 'Sky',        bg: 'hsl(199 100% 85%)' },
  { key: 'green',    label: 'Mint',       bg: 'hsl(120 39% 85%)'  },
  { key: 'purple',   label: 'Lavender',   bg: 'hsl(270 60% 88%)'  },
  { key: 'orange',   label: 'Peach',      bg: 'hsl(28 100% 85%)'  },
  { key: 'teal',     label: 'Teal',       bg: 'hsl(174 60% 82%)'  },
  { key: 'red',      label: 'Coral',      bg: 'hsl(5 85% 83%)'    },
  { key: 'lime',     label: 'Lime',       bg: 'hsl(82 65% 82%)'   },
  { key: 'indigo',   label: 'Periwinkle', bg: 'hsl(230 70% 88%)'  },
  { key: 'amber',    label: 'Amber',      bg: 'hsl(43 100% 82%)'  },
  { key: 'blush',    label: 'Blush',      bg: 'hsl(340 80% 88%)'  },
];

const ROOMS = ['room 1', 'room 2', 'room 3', 'room 4', 'room 5', 'room 6'];

const TrainingForm = ({ training, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    training_code: '',
    title: '',
    description: '',
    date: '',
    time: '',
    end_time: '',
    trainer: '',
    location: '',
    status: 'upcoming',
    color: 'yellow',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (training) {
      setFormData({
        training_code: training.training_code || '',
        title:         training.title         || '',
        description:   training.description   || '',
        date:          training.date          || '',
        time:          training.time          || '',
        end_time:      training.end_time      || '',
        trainer:       training.trainer       || '',
        location:      training.location      || '',
        status:        training.status        || 'upcoming',
        color:         training.color         || 'yellow',
      });
    }
  }, [training]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.training_code.trim()) { toast.error('Lagyan ng Training Code.'); return; }
    if (!formData.location) { toast.error('Please select a room'); return; }
    if (formData.end_time && formData.time && formData.end_time <= formData.time) {
      toast.error('End time must be after start time');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        training_code: formData.training_code.trim().toUpperCase(),
      };
      if (training) {
        await pb.collection('trainings').update(training.id, payload, { $autoCancel: false });
        toast('Training updated successfully');
      } else {
        await pb.collection('trainings').create(payload, { $autoCancel: false });
        toast('Training created successfully');
      }
      onSuccess();
    } catch (error) {
      toast('Failed to save training');
      console.error('Error saving training:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedColorBg    = NOTE_COLORS.find(c => c.key === formData.color)?.bg    || NOTE_COLORS[0].bg;
  const selectedColorLabel = NOTE_COLORS.find(c => c.key === formData.color)?.label || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">

      {/* Training Code — full width on top */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold">
          Training Code <span className="text-red-500">*</span>
        </Label>
        <Input
          placeholder="e.g. MESH-001, BLS-2024, SAFETY-01"
          value={formData.training_code}
          onChange={(e) => setFormData({ ...formData, training_code: e.target.value.toUpperCase() })}
          className="text-gray-900 h-8 text-sm font-mono tracking-wide"
        />
      </div>

      {/* Title & Trainer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Title <span className="text-red-500">*</span></Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="text-gray-900 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trainer</Label>
          <Input
            placeholder="Enter trainer name"
            value={formData.trainer}
            onChange={(e) => setFormData({ ...formData, trainer: e.target.value })}
            className="text-gray-900 h-8 text-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="text-gray-900 text-sm resize-none"
        />
      </div>

      {/* Date, Start Time, End Time */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date <span className="text-red-500">*</span></Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="text-gray-900 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start Time <span className="text-red-500">*</span></Label>
          <Input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            className="text-gray-900 h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            className="text-gray-900 h-8 text-sm"
          />
        </div>
      </div>

      {/* Location */}
      <div className="space-y-1">
        <Label className="text-xs">Location</Label>
        <div className="grid grid-cols-6 gap-1">
          {ROOMS.map(room => (
            <button
              key={room}
              type="button"
              onClick={() => setFormData({ ...formData, location: room })}
              className={`
                py-0.5 rounded border text-xs font-medium transition-all duration-150 capitalize
                ${formData.location === room
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:bg-slate-50'
                }
              `}
            >
              {room.charAt(0).toUpperCase() + room.slice(1)}
            </button>
          ))}
        </div>
        {!formData.location && (
          <p className="text-xs text-slate-400">Select the room where training will be held</p>
        )}
        {formData.location && (
          <p className="text-xs text-primary font-medium">
            ✓ {formData.location.charAt(0).toUpperCase() + formData.location.slice(1)}
          </p>
        )}
      </div>

      {/* Status & Note Color */}
      <div className="grid grid-cols-2 gap-3 items-start">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger className="text-gray-900 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Note Color</Label>
            <span className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full border border-black/10 shadow-sm inline-block"
                style={{ backgroundColor: selectedColorBg }}
              />
              <span className="text-xs text-slate-500">{selectedColorLabel}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
            {NOTE_COLORS.map(c => (
              <button
                key={c.key}
                type="button"
                title={c.label}
                onClick={() => setFormData({ ...formData, color: c.key })}
                className="relative flex-shrink-0"
              >
                <div
                  className="w-5 h-5 rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: c.bg,
                    boxShadow: formData.color === c.key
                      ? '0 0 0 2px #1e293b, 0 0 0 3.5px ' + c.bg
                      : '0 1px 3px rgba(0,0,0,0.18)',
                    transform: formData.color === c.key ? 'scale(1.2)' : 'scale(1)',
                  }}
                />
                {formData.color === c.key && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="7" height="7" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={loading}
          className="h-8 text-sm"
          style={{ backgroundColor: selectedColorBg, color: '#1e293b', border: 'none' }}
        >
          {loading ? 'Saving...' : training ? 'Update Training' : 'Create Training'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-8 text-sm">
          Cancel
        </Button>
      </div>

    </form>
  );
};

export default TrainingForm;