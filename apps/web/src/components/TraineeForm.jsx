import React, { useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const TraineeForm = ({ trainee, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    id_number: '',
    unique_id: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (trainee) {
      setFormData({
        name: trainee.name || '',
        email: trainee.email || '',
        id_number: trainee.id_number || '',
        unique_id: trainee.unique_id || ''
      });
    }
  }, [trainee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (trainee) {
        await pb.collection('trainees').update(trainee.id, formData, { $autoCancel: false });
        toast('Trainee updated successfully');
      } else {
        await pb.collection('trainees').create(formData, { $autoCancel: false });
        toast('Trainee registered successfully');
      }
      onSuccess();
    } catch (error) {
      toast('Failed to save trainee');
      console.error('Error saving trainee:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="text-gray-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="text-gray-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="id_number">Employee ID</Label>
        <Input
          id="id_number"
          value={formData.id_number}
          onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
          required
          placeholder="e.g., EMP-12345"
          className="text-gray-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unique_id">RFID ID (for card scanning)</Label>
        <Input
          id="unique_id"
          value={formData.unique_id}
          onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
          required
          placeholder="Enter RFID tag or QR code value"
          className="text-gray-900"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : trainee ? 'Update Trainee' : 'Register Trainee'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default TraineeForm;