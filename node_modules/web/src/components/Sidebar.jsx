import React, { useState } from 'react';
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
  ChevronDown,
  School,
  BookMarked,
  Award,
  BookText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext.jsx';

const companies = [
  { id: 'torres-tech',   label: 'Torres Tech',   color: '#378ADD', prefix: '/torres-tech'   },
  { id: 'yazaki-torres', label: 'Yazaki Torres',  color: '#1D9E75', prefix: '/yazaki-torres'  },
  { id: 'senior-high',   label: 'Senior High',    color: '#D85A30', prefix: '/senior-high'    },
];

// Torres Tech & Yazaki Torres submenu
const defaultMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',          subpath: '/dashboard'  },
  { icon: Users,           label: 'Masterlist',         subpath: '/trainees'   },
  { icon: ClipboardCheck,  label: 'Attendance',         subpath: '/attendance' },
  { icon: BarChart3,       label: 'Training Analytics', subpath: '/analytics'  },
  { icon: FileText,        label: 'Trainee Reports',    subpath: '/reports'    },
  { icon: CalendarDays,    label: 'Calendar',           subpath: '/calendar'   },
];

// Senior High exclusive submenu
const seniorHighMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    subpath: '/dashboard'     },
  { icon: School,          label: 'Schools',      subpath: '/schools'       },
  { icon: BookMarked,      label: 'Batches',      subpath: '/batches'       },
  { icon: Users,           label: 'Students',     subpath: '/students'      },
  { icon: ClipboardCheck,  label: 'Attendance',   subpath: '/attendance'    },
  { icon: Award,           label: 'Certificates', subpath: '/certificates'  },
  { icon: BookText,        label: 'Pre-Training', subpath: '/pre-training'  },
];

const adminTopMenuItems = [
  { icon: Calendar, label: 'Pre-Training', path: '/pre-training' },
];

const adminBottomMenuItems = [
  { icon: Settings, label: 'Settings', subpath: '/settings' },
];

const traineeMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/trainee-dashboard' },
  { icon: BookOpen,        label: 'My Trainings', path: '/my-trainings'      },
  { icon: UserCircle,      label: 'Profile',      path: '/trainee-profile'   },
];

const Sidebar = ({ className }) => {
  const location = useLocation();
  const { isTrainee, isAdmin } = useAuth();

  const defaultOpen = companies.find(c => location.pathname.startsWith(c.prefix))?.id ?? companies[0].id;
  const [openCompany, setOpenCompany] = useState(defaultOpen);
  const activeCompany = companies.find(c => c.id === (openCompany ?? defaultOpen)) ?? companies[0];

  const toggleCompany = (id) => {
    setOpenCompany(prev => (prev === id ? null : id));
  };

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

        {/* Pre-Training top button */}
        {isAdmin && (
          <div className="space-y-1.5 mb-1.5">
            {adminTopMenuItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-slate-50 border-border text-slate-600 hover:bg-blue-50 hover:text-primary hover:border-blue-200"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Company accordions */}
        {isAdmin && companies.map((company) => {
          const isOpen    = openCompany === company.id;
          const menuItems = company.id === 'senior-high' ? seniorHighMenuItems : defaultMenuItems;

          return (
            <div key={company.id}>
              <button
                onClick={() => toggleCompany(company.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border",
                  isOpen
                    ? "bg-blue-50 border-blue-300 text-slate-800"
                    : "bg-slate-50 border-border text-slate-600 hover:bg-blue-50 hover:border-blue-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: company.color }} />
                  {company.label}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
              </button>

              {isOpen && (
                <div className="mt-1 ml-4 pl-3 border-l-2 border-blue-200 space-y-0.5">
                  {menuItems.map((item) => {
                    const fullPath = `${company.prefix}${item.subpath}`;
                    const isActive = location.pathname.startsWith(fullPath);
                    return (
                      <Link
                        key={fullPath}
                        to={fullPath}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-slate-600 hover:bg-blue-50 hover:text-primary"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary")} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Trainee menu */}
        {isTrainee && traineeMenuItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
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
              <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Settings + Support */}
      <div className="p-4 border-t border-border/50">
        {isAdmin && (
          <div className="mb-3 space-y-1.5">
            {adminBottomMenuItems.map((item) => {
              const fullPath = `${activeCompany.prefix}${item.subpath}`;
              const isActive = companies.some(c =>
                location.pathname === `${c.prefix}${item.subpath}` ||
                location.pathname.startsWith(`${c.prefix}${item.subpath}/`)
              );
              return (
                <Link
                  key={item.subpath}
                  to={fullPath}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group border",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                      : "bg-slate-50 border-border text-slate-600 hover:bg-blue-50 hover:text-primary hover:border-blue-200"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary")} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
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