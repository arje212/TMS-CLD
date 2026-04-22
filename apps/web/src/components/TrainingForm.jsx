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

const TrainingForm = ({ training, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    status: 'upcoming',
    color: 'yellow',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (training) {
      setFormData({
        title:       training.title       || '',
        description: training.description || '',
        date:        training.date        || '',
        time:        training.time        || '',
        location:    training.location    || '',
        status:      training.status      || 'upcoming',
        color:       training.color       || 'yellow',
      });
    }
  }, [training]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (training) {
        await pb.collection('trainings').update(training.id, formData, { $autoCancel: false });
        toast('Training updated successfully');
      } else {
        await pb.collection('trainings').create(formData, { $autoCancel: false });
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

  const selectedColorBg = NOTE_COLORS.find(c => c.key === formData.color)?.bg || NOTE_COLORS[0].bg;
  const selectedColorLabel = NOTE_COLORS.find(c => c.key === formData.color)?.label || '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
          className="text-gray-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="text-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="text-gray-900"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            className="text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
          className="text-gray-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
          <SelectTrigger className="text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Note Color Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Note Color</Label>
          <span className="flex items-center gap-1.5">
            <span
              className="w-4 h-4 rounded-full border border-black/10 shadow-sm inline-block"
              style={{ backgroundColor: selectedColorBg }}
            />
            <span className="text-xs text-slate-500">{selectedColorLabel}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
          {NOTE_COLORS.map(c => (
            <button
              key={c.key}
              type="button"
              title={c.label}
              onClick={() => setFormData({ ...formData, color: c.key })}
              className="relative flex-shrink-0"
            >
              <div
                className="w-7 h-7 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: c.bg,
                  boxShadow: formData.color === c.key
                    ? '0 0 0 2.5px #1e293b, 0 0 0 4px ' + c.bg
                    : '0 1px 3px rgba(0,0,0,0.18)',
                  transform: formData.color === c.key ? 'scale(1.2)' : 'scale(1)',
                }}
              />
              {formData.color === c.key && (
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

      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: selectedColorBg, color: '#1e293b', border: 'none' }}
        >
          {loading ? 'Saving...' : training ? 'Update Training' : 'Create Training'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

    </form>
  );
};

export default TrainingForm;