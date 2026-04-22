import { useState, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);

  const fetchAttendanceForTraining = useCallback(async (trainingId) => {
    try {
      const records = await pb.collection('attendance').getFullList({
        filter: `training="${trainingId}"`,
        expand: 'trainee',
        sort: '-created',
        $autoCancel: false
      });
      return records;
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return [];
    }
  }, []);

  const fetchAssignmentsForTraining = useCallback(async (trainingId) => {
    try {
      const assignments = await pb.collection('training_assignments').getFullList({
        filter: `training="${trainingId}"`,
        expand: 'trainee',
        $autoCancel: false
      });
      return assignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }, []);

  const markPresent = async (trainingId, traineeId) => {
    try {
      setLoading(true);
      // Check if already exists
      const existing = await pb.collection('attendance').getFirstListItem(
        `training="${trainingId}" && trainee="${traineeId}"`,
        { $autoCancel: false }
      ).catch(() => null);

      if (existing) {
        if (existing.status !== 'present') {
          await pb.collection('attendance').update(existing.id, { status: 'present' }, { $autoCancel: false });
        }
      } else {
        await pb.collection('attendance').create({
          training: trainingId,
          trainee: traineeId,
          status: 'present'
        }, { $autoCancel: false });
      }
      return true;
    } catch (error) {
      console.error('Error marking present:', error);
      toast.error('Failed to mark present');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markAbsent = async (trainingId, traineeId) => {
    try {
      setLoading(true);
      const existing = await pb.collection('attendance').getFirstListItem(
        `training="${trainingId}" && trainee="${traineeId}"`,
        { $autoCancel: false }
      ).catch(() => null);

      if (existing) {
        await pb.collection('attendance').update(existing.id, { status: 'absent' }, { $autoCancel: false });
      } else {
        await pb.collection('attendance').create({
          training: trainingId,
          trainee: traineeId,
          status: 'absent'
        }, { $autoCancel: false });
      }
      return true;
    } catch (error) {
      console.error('Error marking absent:', error);
      toast.error('Failed to mark absent');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const recordCheckout = async (attendanceId) => {
    try {
      setLoading(true);
      await pb.collection('attendance').update(attendanceId, {
        check_out_time: new Date().toISOString()
      }, { $autoCancel: false });
      return true;
    } catch (error) {
      console.error('Error recording checkout:', error);
      toast.error('Failed to record checkout');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceStats = (assignments, attendanceRecords) => {
    const totalAssigned = assignments.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const percentage = totalAssigned > 0 ? Math.round((presentCount / totalAssigned) * 100) : 0;

    return { totalAssigned, presentCount, absentCount, percentage };
  };

  return {
    loading,
    fetchAttendanceForTraining,
    fetchAssignmentsForTraining,
    markPresent,
    markAbsent,
    recordCheckout,
    getAttendanceStats
  };
};