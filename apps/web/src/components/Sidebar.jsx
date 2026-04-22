import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  FileText, 
  Settings,
  GraduationCap,
  BookOpen,
  UserCircle,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext.jsx';

const Sidebar = ({ className }) => {
  const location = useLocation();
  const { isTrainee, isAdmin } = useAuth();

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard',          path: '/dashboard'   },
    { icon: Calendar,        label: 'Pre-Training',       path: '/trainings'   },
    { icon: Users,           label: 'Masterlist',         path: '/trainees'    },
    { icon: ClipboardCheck,  label: 'Attendance',         path: '/attendance'  },
    { icon: BarChart3,       label: 'Training Analytics', path: '/analytics'   },
    { icon: FileText,        label: 'Trainee Reports',    path: '/reports'     },
    { icon: CalendarDays,    label: 'Calendar',           path: '/calendar'    }, // ← bagong button
    { icon: Settings,        label: 'Settings',           path: '/settings'    },
  ];

  const traineeMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    path: '/trainee-dashboard' },
    { icon: BookOpen,        label: 'My Trainings', path: '/my-trainings'      },
    { icon: UserCircle,      label: 'Profile',      path: '/trainee-profile'   },
  ];

  const menuItems = isTrainee ? traineeMenuItems : (isAdmin ? adminMenuItems : []);

  return (
    <aside className={cn("flex flex-col h-full bg-white border-r border-border shadow-sm", className)}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-900">
          {isTrainee ? 'Trainee Portal' : 'TMS Pro'}
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
          Main Menu
        </div>
        {menuItems.map((item) => {
          const isActive = item.path === '/' || item.path === '/dashboard' || item.path === '/trainee-dashboard'
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-slate-600 hover:bg-blue-50 hover:text-primary"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary"
              )} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Support */}
      <div className="p-4 border-t border-border/50">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-primary mb-2">Need Help?</p>
          <p className="text-xs text-slate-500 mb-3">Check our documentation or contact support.</p>
          <button className="w-full bg-white text-primary border border-primary/20 text-xs font-semibold py-2 rounded-lg hover:bg-primary hover:text-white transition-colors">
            Support Center
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;