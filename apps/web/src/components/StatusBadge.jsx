import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const StatusBadge = ({ status, className }) => {
  const normalizedStatus = status?.toLowerCase() || 'pending';
  
  const colorMap = {
    present: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent',
    completed: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-transparent',
    absent: 'bg-rose-100 text-rose-800 hover:bg-rose-200 border-transparent',
    ongoing: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-transparent',
    pending: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent',
    upcoming: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent'
  };

  const badgeClass = colorMap[normalizedStatus] || colorMap.pending;

  return (
    <Badge className={cn("uppercase tracking-wider text-[10px] font-bold", badgeClass, className)}>
      {status || 'Pending'}
    </Badge>
  );
};

export default StatusBadge;