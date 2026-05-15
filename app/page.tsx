'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, animate, useMotionValue, useAnimationFrame, AnimatePresence, useMotionValueEvent, useTransform } from 'motion/react';
import { User, Trophy, Gift, Settings, RotateCcw, ChevronRight, ChevronDown, Train, Upload, Users, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';

import Image from 'next/image';

// --- Hooks ---
function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return size;
}

// --- Sound Effects Hook ---
function useSoundEffects(bgmUrl: string, isDrawing: boolean, isMuted: boolean) {
  const trainRunningSound = useRef<HTMLAudioElement | null>(null);
  const trainStoppingSound = useRef<HTMLAudioElement | null>(null);
  const cheerSound = useRef<HTMLAudioElement | null>(null);
  const birthdayCheerSound = useRef<HTMLAudioElement | null>(null);
  const revealSound = useRef<HTMLAudioElement | null>(null);
  const bgmSound = useRef<HTMLAudioElement | null>(null);
  const currentBgmUrl = useRef<string>('');

  useEffect(() => {
    // Initialize audio objects only on the client side
    trainRunningSound.current = new Audio('/train-running.mp3');
    trainRunningSound.current.loop = true;
    trainRunningSound.current.volume = 0.5;

    trainStoppingSound.current = new Audio('/train-stopping.mp3');
    trainStoppingSound.current.loop = false;
    trainStoppingSound.current.volume = 0.1;
    
    cheerSound.current = new Audio('/winning.mp3');
    cheerSound.current.volume = 0.7;
    
    birthdayCheerSound.current = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/39/Happy_Birthday_To_You_-_B%C3%B6sendorfer_Imperial.ogg');
    birthdayCheerSound.current.volume = 0.7;
    
    revealSound.current = new Audio('/winning.mp3');
    revealSound.current.volume = 0.8;
  }, []);

  useEffect(() => {
    if (isMuted) {
      trainRunningSound.current?.pause();
      trainStoppingSound.current?.pause();
      cheerSound.current?.pause();
      birthdayCheerSound.current?.pause();
      revealSound.current?.pause();
      bgmSound.current?.pause();
      return;
    }

    if (currentBgmUrl.current !== bgmUrl) {
      if (bgmSound.current) {
        bgmSound.current.pause();
      }
      currentBgmUrl.current = bgmUrl;
      if (bgmUrl) {
        bgmSound.current = new Audio(bgmUrl);
        bgmSound.current.loop = true;
        bgmSound.current.volume = 0.3;
        if (!isDrawing) {
          bgmSound.current.play().catch(e => console.log('BGM play failed', e));
        }
      } else {
        bgmSound.current = null;
      }
    } else if (bgmSound.current) {
      if (!isDrawing) {
        if (bgmSound.current.paused) {
          bgmSound.current.play().catch(e => console.log('BGM play failed', e));
        }
      } else {
        bgmSound.current.pause();
      }
    }
  }, [bgmUrl, isDrawing, isMuted]);

  useEffect(() => {
    const unlockAudio = () => {
      if (!isMuted && !isDrawing && bgmSound.current && bgmSound.current.paused) {
        bgmSound.current.play().catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, [isDrawing, isMuted]);

  const playTrainRunning = () => {
    if (isMuted) return;
    if (trainStoppingSound.current) {
      trainStoppingSound.current.pause();
      trainStoppingSound.current.currentTime = 0;
    }
    if (trainRunningSound.current) {
      trainRunningSound.current.play().catch(e => console.log('Audio play failed', e));
    }
  };

  const playTrainStopping = () => {
    if (isMuted) return;
    if (trainRunningSound.current) {
      trainRunningSound.current.pause();
      trainRunningSound.current.currentTime = 0;
    }
    if (trainStoppingSound.current) {
      trainStoppingSound.current.currentTime = 0;
      trainStoppingSound.current.play().catch(e => console.log('Audio play failed', e));
    }
  };

  const stopAllTrainSounds = () => {
    if (trainRunningSound.current) {
      trainRunningSound.current.pause();
      trainRunningSound.current.currentTime = 0;
    }
    if (trainStoppingSound.current) {
      trainStoppingSound.current.pause();
      trainStoppingSound.current.currentTime = 0;
    }
  };

  const playCheer = (currentMode?: string | null) => {
    if (isMuted) return;
    const isBirthday = currentMode?.toLowerCase().includes('birthday');
    if (isBirthday && birthdayCheerSound.current) {
      birthdayCheerSound.current.currentTime = 0;
      birthdayCheerSound.current.play().catch(e => console.log('Audio play failed', e));
    } else if (cheerSound.current) {
      cheerSound.current.currentTime = 0;
      cheerSound.current.play().catch(e => console.log('Audio play failed', e));
    }
  };

  const playReveal = () => {
    if (isMuted) return;
    if (revealSound.current) {
      revealSound.current.currentTime = 0;
      revealSound.current.play().catch(e => console.log('Audio play failed', e));
    }
  };

  return { playTrainRunning, playTrainStopping, stopAllTrainSounds, playCheer, playReveal };
}

// Removed hardcoded EMPLOYEES and MODES as they are now loaded dynamically from CSVs via API



const ITEM_WIDTH = 260;
const WINDOW_HEIGHT = 220;
const REEL_REPEAT_COUNT = 3;
const SPEED_LINE_COUNT = 24;

const ALLOWED_BACKGROUND_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp']);

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

type Employee = {
  id: string;
  staffCode?: string;
  name: string;
  title: string;
  avatar: string;
  birthday?: string;
};

type WinnerRecord = {
  employee: Employee;
  prize: string;
  prizeImage: string;
};

type BirthdayWindowInfo = {
  startMonth: number;
  endMonth: number;
  fileName: string;
  sourceCount: number;
  signature: string;
};

type EmployeeSourceInfo = {
  type: 'uploaded-birthday-workbook' | 'public-birthday-workbook' | 'employees-csv';
  fileName: string;
  sourceCount: number;
};

function formatMonthWindowLabel(startMonth: number, endMonth: number) {
  const startLabel = MONTH_OPTIONS.find((option) => option.value === startMonth)?.label ?? 'Unknown';
  const endLabel = MONTH_OPTIONS.find((option) => option.value === endMonth)?.label ?? 'Unknown';

  return `${startLabel} - ${endLabel}`;
}

function getBirthdayMonth(birthday?: string) {
  if (!birthday) return null;

  const parts = birthday.split('-').map((part) => part.trim());
  const monthToken = parts.length === 3 ? parts[1] : parts[0];
  const month = Number(monthToken);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return month;
}

function getBirthdayDay(birthday?: string) {
  if (!birthday) return 99;

  const parts = birthday.split('-').map((part) => part.trim());
  const dayToken = parts.length === 3 ? parts[2] : parts[1];
  const day = Number(dayToken);

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return 99;
  }

  return day;
}

function isMonthInRange(month: number | null, startMonth: number, endMonth: number) {
  if (month === null) return false;

  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }

  return month >= startMonth || month <= endMonth;
}

function formatBirthdayLabel(birthday?: string) {
  const month = getBirthdayMonth(birthday);

  if (month === null) {
    return 'Birthday TBD';
  }

  return MONTH_OPTIONS.find((option) => option.value === month)?.label ?? 'Unknown';
}

function getDisplayTitle(title?: string) {
  const normalizedTitle = title?.trim();

  if (!normalizedTitle || normalizedTitle.toLowerCase() === 'employee') {
    return null;
  }

  return normalizedTitle;
}

function getParticipantGroups(participants: Employee[]) {
  const monthGroups = new Map<number, Employee[]>();
  const unknownMonthParticipants: Employee[] = [];

  [...participants]
    .sort((left, right) => {
      const leftMonth = getBirthdayMonth(left.birthday) ?? 99;
      const rightMonth = getBirthdayMonth(right.birthday) ?? 99;
      if (leftMonth !== rightMonth) return leftMonth - rightMonth;

      return left.name.localeCompare(right.name);
    })
    .forEach((participant) => {
      const month = getBirthdayMonth(participant.birthday);

      if (month === null) {
        unknownMonthParticipants.push(participant);
        return;
      }

      const existing = monthGroups.get(month) ?? [];
      existing.push(participant);
      monthGroups.set(month, existing);
    });

  const groups = Array.from(monthGroups.entries())
    .sort(([leftMonth], [rightMonth]) => leftMonth - rightMonth)
    .map(([month, monthParticipants]) => ({
      key: `month-${month}`,
      label: MONTH_OPTIONS.find((option) => option.value === month)?.label ?? 'Unknown',
      participants: monthParticipants,
    }));

  if (unknownMonthParticipants.length > 0) {
    groups.push({
      key: 'month-unknown',
      label: 'Birthday TBD',
      participants: unknownMonthParticipants,
    });
  }

  return groups;
}

function getBirthdayScopedEmployees(allEmployees: Employee[], mode: string | null, startMonth: number, endMonth: number) {
  if (mode !== 'birthday') return allEmployees;

  const scopedEmployees = allEmployees.filter(
    (employee) => isMonthInRange(getBirthdayMonth(employee.birthday), startMonth, endMonth)
  );

  return [...scopedEmployees].sort((left, right) => {
    const monthDiff = (getBirthdayMonth(left.birthday) ?? 99) - (getBirthdayMonth(right.birthday) ?? 99);
    if (monthDiff !== 0) return monthDiff;

    const dayDiff = getBirthdayDay(left.birthday) - getBirthdayDay(right.birthday);
    if (dayDiff !== 0) return dayDiff;

    return left.name.localeCompare(right.name);
  });
}

function getAvailableReelEmployees(
  allEmployees: Employee[],
  pastWinners: WinnerRecord[],
  excludedEmployeeIds: string[],
  preservedEmployeeId: string | null = null
) {
  const winnerIds = new Set(pastWinners.map((winnerRecord) => winnerRecord.employee.id));
  const excludedIds = new Set(excludedEmployeeIds);

  return allEmployees.filter((employee) => {
    if (excludedIds.has(employee.id)) {
      return false;
    }

    if (winnerIds.has(employee.id) && employee.id !== preservedEmployeeId) {
      return false;
    }

    return true;
  });
}

const SettingsModal = ({ isOpen, onClose, mode, onModeChange, maxSpeed, setMaxSpeed, modesData, bgImage, setBgImage, availableBackgrounds, bgm, setBgm, birthdayStartMonth, setBirthdayStartMonth, birthdayEndMonth, setBirthdayEndMonth, birthdayMatchCount, birthdayPreview, birthdayDetectedWindow, employeeSource, onClearEmployeeData, isClearingEmployeeData, theme = 'light' }: any) => {
  const [openSection, setOpenSection] = useState<'mode' | 'speed' | 'birthday' | 'bg' | 'bgm' | 'upload' | null>('mode');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, filenameArg?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    let uploadFilename = filenameArg || file.name;

    if (filenameArg === 'background_custom') {
      const extFromFile = file.name.split('.').pop()?.toLowerCase() || '';
      const safeExt = ALLOWED_BACKGROUND_EXTENSIONS.has(extFromFile) ? extFromFile : 'png';
      uploadFilename = `backgrounds/background_custom.${safeExt}`;
    }

    formData.append('filename', uploadFilename);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Upload failed');
      }

      const uploadResult = await response.json().catch(() => null);

      // When a mode CSV is uploaded, make it the active mode after refresh.
      if (!filenameArg && typeof uploadResult?.path === 'string') {
        const uploadedPath = uploadResult.path.toLowerCase();
        if (uploadedPath.endsWith('.csv') && uploadedPath !== '/employees.csv') {
          const uploadedFileName = uploadResult.path.split('/').pop() || '';
          const uploadedMode = uploadedFileName.replace(/\.csv$/i, '');

          if (uploadedMode) {
            localStorage.setItem('luckyDrawMode', uploadedMode);
          }
        }
      }

      // Force a page reload to fetch the new files
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const backgrounds = availableBackgrounds || [
    { id: '/backgrounds/background.png', label: 'Default' },
    { id: '/backgrounds/background2.png', label: 'Alternative' },
  ];

  const bgmOptions = [
        { id: '/upbeat.mp3', label: 'Upbeat' },
   { id: '/chill.mp3', label: 'Chill' },
    { id: '', label: 'None' },
  ];

  const applyBirthdayWindow = (monthCount: number) => {
    const nextEndMonth = ((birthdayStartMonth - 1 + monthCount - 1) % 12) + 1;
    setBirthdayEndMonth(nextEndMonth);
  };

  const canClearEmployeeData = employeeSource?.type === 'uploaded-birthday-workbook' || employeeSource?.type === 'public-birthday-workbook';

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "absolute top-14 right-0 rounded-2xl shadow-2xl border p-2 w-64 md:w-80 z-50 overflow-hidden max-h-[80vh] overflow-y-auto",
        theme === 'dark' ? "bg-gray-900/95 backdrop-blur-xl border-white/10" : "bg-white/95 backdrop-blur-xl border-gray-200"
      )}
    >
      {/* Draw Mode Section */}
      <div className="mb-1">
        <button 
          onClick={() => setOpenSection(openSection === 'mode' ? null : 'mode')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Draw Mode
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'mode' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'mode' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-2">
                {Object.keys(modesData || {}).map((m) => (
                  <button 
                    key={m}
                    onClick={() => { onModeChange(m); onClose(); }}
                    className={clsx("w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors text-sm capitalize", mode === m ? "bg-[#E60000] text-white shadow-md" : theme === 'dark' ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                  >
                    {m.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Animation Speed Section */}
      <div className="mb-1">
        <button 
          onClick={() => setOpenSection(openSection === 'speed' ? null : 'speed')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Animation Speed
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'speed' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'speed' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-2">
                <input 
                  type="range" 
                  min="2" 
                  max="8" 
                  step="0.5"
                  value={maxSpeed}
                  onChange={(e) => setMaxSpeed(parseFloat(e.target.value))}
                  className="w-full accent-[#E60000]"
                />
                <div className={clsx("flex justify-between text-xs mt-2 font-medium", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                  <span>Slow</span>
                  <span>{maxSpeed}x</span>
                  <span>Fast</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Birthday Filter Section — only shown in birthday mode */}
      {mode === 'birthday' && (
      <div className="mb-1">
        <button
          onClick={() => setOpenSection(openSection === 'birthday' ? null : 'birthday')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Birthday Filter
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'birthday' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'birthday' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-2 space-y-4">
                <p className={clsx("text-xs font-semibold", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                  Filters participants by birthday month. Updates the train passenger list instantly.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyBirthdayWindow(2)}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                      theme === 'dark' ? "bg-white/5 text-gray-200 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    2 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => applyBirthdayWindow(3)}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                      theme === 'dark' ? "bg-white/5 text-gray-200 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                  >
                    3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBirthdayStartMonth(1); setBirthdayEndMonth(12); }}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-xs font-bold transition-colors",
                      theme === 'dark' ? "bg-red-900/40 text-red-300 hover:bg-red-900/60" : "bg-red-50 text-[#E60000] hover:bg-red-100"
                    )}
                  >
                    Clear
                  </button>
                </div>
                {birthdayDetectedWindow && (
                  <div className={clsx("rounded-xl border px-3 py-3", theme === 'dark' ? "border-white/10 bg-white/5" : "border-emerald-100 bg-emerald-50/80")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={clsx("text-[11px] font-bold uppercase tracking-[0.2em]", theme === 'dark' ? "text-gray-400" : "text-emerald-700")}>
                        Auto-Detected Birthday
                      </span>
                      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                        {formatMonthWindowLabel(birthdayDetectedWindow.startMonth, birthdayDetectedWindow.endMonth)}
                      </span>
                    </div>
                    <p className={clsx("mt-2 text-xs leading-relaxed", theme === 'dark' ? "text-gray-300" : "text-emerald-900") }>
                      {birthdayDetectedWindow.sourceCount > 1
                        ? `Loaded from ${birthdayDetectedWindow.sourceCount} birthday workbooks. Latest file: ${birthdayDetectedWindow.fileName}`
                        : `Loaded from ${birthdayDetectedWindow.fileName}`}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <span>Start</span>
                    <select
                      value={birthdayStartMonth}
                      onChange={(event) => setBirthdayStartMonth(Number(event.target.value))}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-sm font-medium outline-none",
                        theme === 'dark' ? "border-white/10 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-700"
                      )}
                    >
                      {MONTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <span>End</span>
                    <select
                      value={birthdayEndMonth}
                      onChange={(event) => setBirthdayEndMonth(Number(event.target.value))}
                      className={clsx(
                        "w-full rounded-lg border px-3 py-2 text-sm font-medium outline-none",
                        theme === 'dark' ? "border-white/10 bg-black/20 text-white" : "border-gray-200 bg-white text-gray-700"
                      )}
                    >
                      {MONTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className={clsx("rounded-xl border px-3 py-3", theme === 'dark' ? "border-white/10 bg-white/5" : "border-red-100 bg-red-50/70")}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={clsx("text-[11px] font-bold uppercase tracking-[0.2em]", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                      Matching Participants
                    </span>
                    <span className="rounded-full bg-[#E60000] px-2.5 py-1 text-xs font-black text-white">
                      {birthdayMatchCount}
                    </span>
                  </div>
                  <p className={clsx("mt-2 text-xs leading-relaxed", theme === 'dark' ? "text-gray-300" : "text-gray-600")}>
                    {birthdayPreview.length > 0 ? birthdayPreview.join(', ') : 'No birthdays found in the selected month range.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}
      <div className="mb-1">
        <button 
          onClick={() => setOpenSection(openSection === 'bg' ? null : 'bg')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Background Image
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'bg' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'bg' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-2 grid grid-cols-2 gap-2">
                {backgrounds.map((bg: any) => (
                  <button 
                    key={bg.id}
                    onClick={() => setBgImage(bg.id)}
                    className={clsx(
                      "relative rounded-lg overflow-hidden border-2 transition-all aspect-video",
                      bgImage === bg.id ? "border-[#E60000] shadow-md" : "border-transparent hover:border-gray-300"
                    )}
                  >
                    <Image src={bg.id} alt={bg.label} fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-1">
                      <span className="text-white text-[10px] font-bold truncate w-full text-left">{bg.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Music Section */}
      <div>
        <button 
          onClick={() => setOpenSection(openSection === 'bgm' ? null : 'bgm')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Background Music
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'bgm' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'bgm' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-2">
                {bgmOptions.map((opt) => (
                  <button 
                    key={opt.id}
                    onClick={() => setBgm(opt.id)}
                    className={clsx("w-full text-left px-4 py-2.5 rounded-lg font-medium transition-colors text-sm capitalize", bgm === opt.id ? "bg-[#E60000] text-white shadow-md" : theme === 'dark' ? "bg-white/5 text-gray-300 hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Uploads Section */}
      <div className="mb-1">
        <button 
          onClick={() => setOpenSection(openSection === 'upload' ? null : 'upload')}
          className={clsx(
            "w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-colors",
            theme === 'dark' ? "text-gray-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50"
          )}
        >
          Upload Data
          <ChevronDown className={clsx("w-4 h-4 transition-transform", openSection === 'upload' && "rotate-180")} />
        </button>
        <AnimatePresence>
          {openSection === 'upload' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Custom Background</label>
                  <label className={clsx("cursor-pointer flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors", theme === 'dark' ? "border-gray-600 hover:border-[#E60000] hover:text-[#E60000] text-gray-300" : "border-gray-300 hover:border-[#E60000] hover:text-[#E60000] hover:bg-red-50 text-gray-700")}>
                    <Upload className="w-4 h-4 mr-2" /> Upload Background
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleFileUpload(e, 'background_custom')} />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Birthday Excel</label>
                  <label className={clsx("cursor-pointer flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors", theme === 'dark' ? "border-gray-600 hover:border-[#E60000] hover:text-[#E60000] text-gray-300" : "border-gray-300 hover:border-[#E60000] hover:text-[#E60000] hover:bg-red-50 text-gray-700")}>
                    <Upload className="w-4 h-4 mr-2" /> Upload GTS Birthday List (.xls/.xlsx)
                    <input type="file" accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => handleFileUpload(e, 'birthday_excel')} />
                  </label>
                  <p className="mt-2 text-[10px] text-gray-400">
                    {employeeSource
                      ? `Current employee source: ${employeeSource.fileName}`
                      : 'Sets this workbook as the active Birthday source and refreshes the month range.'}
                  </p>
                  <button
                    type="button"
                    onClick={onClearEmployeeData}
                    disabled={!canClearEmployeeData || isClearingEmployeeData}
                    className={clsx(
                      "mt-2 flex w-full items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold transition-colors",
                      canClearEmployeeData && !isClearingEmployeeData
                        ? theme === 'dark'
                          ? "border-red-500/40 bg-red-950/40 text-red-200 hover:bg-red-950/60"
                          : "border-red-200 bg-red-50 text-[#E60000] hover:bg-red-100"
                        : theme === 'dark'
                          ? "border-white/10 bg-white/5 text-gray-500"
                          : "border-gray-200 bg-gray-100 text-gray-400"
                    )}
                  >
                    {isClearingEmployeeData ? 'Clearing employee data...' : 'Clear loaded employee data'}
                  </button>
                  <p className="mt-2 text-[10px] text-gray-400">Clears the uploaded birthday workbook and falls back to the default employee source.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Custom Prizes (.csv files)</label>
                  <label className={clsx("cursor-pointer flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg text-sm font-medium transition-colors mb-2", theme === 'dark' ? "border-gray-600 hover:border-[#E60000] hover:text-[#E60000] text-gray-300" : "border-gray-300 hover:border-[#E60000] hover:text-[#E60000] hover:bg-red-50 text-gray-700")}>
                    <Upload className="w-4 h-4 mr-2" /> Drop mode file (birthday.csv)
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e)} />
                  </label>
                  <p className="text-[10px] text-gray-400">Name file as your mode e.g. "annual.csv". Refresh to apply.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


const ParticipantsDialog = ({ isOpen, onClose, participants, showBirthdayDetails }: { isOpen: boolean, onClose: () => void, participants: Employee[], showBirthdayDetails: boolean }) => {
  if (!isOpen) return null;

  const participantGroups = showBirthdayDetails ? getParticipantGroups(participants) : [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-[#f7f4ef] shadow-[0_35px_90px_rgba(0,0,0,0.35)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#1A1A1A] px-6 py-5 text-white">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-red-200">Participants In Train</div>
              <div className="mt-1 text-sm text-white/70">{participants.length} visible passengers in the current roster.</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
            {participants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/10 bg-white/70 px-6 py-10 text-center text-gray-500">
                No participants match the current train filter.
              </div>
            ) : showBirthdayDetails ? (
              <div className="space-y-4">
                {participantGroups.map((group) => (
                  <section key={group.key} className="rounded-[28px] border border-black/8 bg-white/90 px-4 py-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-[#1A1A1A]">{group.label}</h3>
                      <span className="rounded-full bg-[#E60000] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        {group.participants.length}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {group.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="rounded-full border border-[#E60000]/12 bg-[#fff4ef] px-3 py-2 text-sm font-bold text-[#1A1A1A] shadow-[0_6px_16px_rgba(230,0,0,0.06)]"
                        >
                          {participant.name}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-full border border-black/8 bg-white/95 px-3 py-2 text-sm font-bold text-[#1A1A1A] shadow-sm"
                  >
                    {participant.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};





// --- Train Sparks ---
type SparkParticle = {
  id: number;
  left: number;
  velX: number;
  velY: number;
  size: number;
  color: string;
  duration: number;
};

let _sparkId = 0;
const SPARK_COLORS = ['#FFD700', '#FFA500', '#FFFFFF', '#FFB300', '#FFF59D'];
const WHEEL_X_POSITIONS = [15, 35, 50, 65, 85];

const TrainSparks = ({ isActive }: { isActive: boolean }) => {
  const [particles, setParticles] = useState<SparkParticle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    const emitSparks = () => {
      const newBatch: SparkParticle[] = [];
      const activeWheels = WHEEL_X_POSITIONS.filter(() => Math.random() > 0.45).slice(0, 3);

      activeWheels.forEach((wheelPos) => {
        const count = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
          const angleRad = (Math.random() * 80 + 75) * (Math.PI / 180);
          const speed = Math.random() * 62 + 26;
          const dirX = Math.random() > 0.5 ? 1 : -1;
          newBatch.push({
            id: ++_sparkId,
            left: wheelPos + (Math.random() * 5 - 2.5),
            velX: dirX * Math.cos(angleRad) * speed,
            velY: Math.sin(angleRad) * speed,
            size: Math.random() * 4 + 3,
            color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
            duration: Math.random() * 0.3 + 0.2,
          });
        }
      });

      setParticles((prev) => [...prev.slice(-40), ...newBatch]);
    };

    const interval = setInterval(emitSparks, 55);
    return () => clearInterval(interval);
  }, [isActive]);

  const removeParticle = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  if (!isActive && particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none overflow-visible"
      style={{ position: 'absolute', bottom: '-2px', left: 0, width: '100%', height: 0, zIndex: 25 }}
    >
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: p.velX, y: p.velY, opacity: 0, scale: 0 }}
            transition={{ duration: p.duration, ease: [0.25, 1, 0.5, 1] }}
            onAnimationComplete={() => removeParticle(p.id)}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}99`,
              display: 'block',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const SpeedLine = ({ top, height, width, opacity, color, baseSpeed, globalSpeed }: any) => {
  const [initialX, setInitialX] = useState(1000);
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialX(window.innerWidth + Math.random() * 500);
  }, []);

  const x = useMotionValue(initialX);

  useEffect(() => {
    x.set(initialX);
  }, [initialX, x]);

  useAnimationFrame((t, delta) => {
    const currentSpeed = globalSpeed.get();
    if (currentSpeed > 0) {
      let newX = x.get() - (baseSpeed * currentSpeed * delta * 0.8);
      if (newX < -width) newX = window.innerWidth + Math.random() * 200;
      x.set(newX);
    }
  });

  return (
    <motion.div
      className="absolute rounded-full bg-current transform-gpu will-change-transform"
      style={{
        top: `${top}%`,
        height: `${height}px`,
        width: `${width}px`,
        opacity,
        color,
        x,
      }}
    />
  );
};

const Rail = ({ globalSpeed }: { globalSpeed: any }) => {
  const x = useMotionValue(0);
  
  useAnimationFrame((t, delta) => {
    const currentSpeed = globalSpeed.get();
    if (currentSpeed > 0) {
      x.set((x.get() - currentSpeed * delta * 0.3) % 48);
    }
  });

  return (
    <div className="absolute bottom-[-28px] left-[-10%] w-[120%] h-8 z-0 overflow-hidden border-t-8 border-gray-400 bg-gray-200">
      <motion.div style={{ x }} className="mt-1 flex w-[200%] flex-row gap-8 transform-gpu will-change-transform">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className="w-4 h-4 bg-gray-400 skew-x-[30deg]" />
        ))}
      </motion.div>
    </div>
  );
};

const SpeedIndicator = ({ globalSpeed, maxSpeed, className, style }: { globalSpeed: any, maxSpeed: number, className?: string, style?: any }) => {
  const speedLabelRef = useRef<HTMLDivElement | null>(null);
  const displaySpeed = useTransform(globalSpeed, (currentSpeed: number) => {
    if (maxSpeed <= 0) return 0;

    return Math.max(0, Math.round((currentSpeed / maxSpeed) * 300));
  });

  useMotionValueEvent(displaySpeed, 'change', (latest) => {
    if (speedLabelRef.current) {
      speedLabelRef.current.textContent = String(latest);
    }
  });

  useEffect(() => {
    if (speedLabelRef.current) {
      speedLabelRef.current.textContent = String(displaySpeed.get());
    }
  }, [displaySpeed]);

  return (
    <div className={clsx("bg-[#1A1A1A] text-white px-6 py-3 rounded-2xl border-2 border-[#E60000] shadow-[0_0_20px_rgba(230,0,0,0.3)] flex items-center gap-3", className)} style={style}>
      <div className="w-3 h-3 rounded-full bg-[#E60000] animate-pulse" />
      <div ref={speedLabelRef} className="w-16 text-right font-mono text-3xl font-black tracking-tighter">
        0
      </div>
      <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
        km/h
      </div>
    </div>
  );
};

const ReelPassengerCard = memo(function ReelPassengerCard({
  employee,
  displayTitle,
  shouldAnimateRemoval,
}: {
  employee: Employee;
  displayTitle: string | null;
  shouldAnimateRemoval: boolean;
}) {
  const content = (
    <>
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-3 shadow-sm border border-gray-200 overflow-hidden">
        {employee.avatar ? (
          <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-10 h-10 text-gray-400" />
        )}
      </div>
      <div className="text-xl font-bold text-[#1A1A1A] truncate w-full text-center px-4">{employee.name}</div>
      {displayTitle && (
        <div className="text-md font-medium text-[#E60000] truncate w-full text-center px-4">{displayTitle}</div>
      )}
    </>
  );

  if (shouldAnimateRemoval) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center shrink-0 bg-white h-full"
        style={{ width: ITEM_WIDTH }}
        animate={{ y: -300, opacity: 0, scale: 0.5, rotate: 15 }}
        transition={{ duration: 0.6, ease: 'backIn' }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center shrink-0 bg-white h-full" style={{ width: ITEM_WIDTH }}>
      {content}
    </div>
  );
});

const Reel = memo(function Reel({ targetIndex, isCenter = false, status, removingWinner = false, globalDistance, indexOffset = 0, employees }: { targetIndex?: number | null, isCenter?: boolean, status: string, removingWinner?: boolean, globalDistance: any, indexOffset?: number, employees: Employee[] }) {
  const repeatedEmployees = useMemo(
    () => Array.from({ length: REEL_REPEAT_COUNT }, (_, copyIndex) => ({ copyIndex, key: `copy-${copyIndex}` })),
    []
  );

  const x = useTransform(globalDistance, (val: number) => {
    if (!employees || employees.length === 0) return 0;
    const currentTotalWidth = employees.length * ITEM_WIDTH;
    let newX = val % currentTotalWidth;
    if (newX > 0) newX -= currentTotalWidth;
    return newX - currentTotalWidth + indexOffset * ITEM_WIDTH;
  });

  return (
    <motion.div 
      layoutId={isCenter ? "winner-card" : undefined}
      className={clsx(
        "overflow-hidden relative bg-[#1A1A1A] rounded-2xl shadow-inner border-[6px] shrink-0",
        isCenter ? "border-[#E60000] z-10 scale-110 shadow-2xl mx-2 md:mx-6" : "border-[#1A1A1A] opacity-90",
        status === 'finished' && isCenter && targetIndex !== null ? "shadow-[0_0_40px_rgba(230,0,0,0.5)]" : ""
      )} 
      style={{ height: WINDOW_HEIGHT, width: ITEM_WIDTH }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none z-20" />
      <div className="absolute top-0 left-1/2 h-full w-[260px] -translate-x-1/2 bg-gradient-to-r from-transparent via-red-500/10 to-transparent pointer-events-none z-10 border-x border-red-500/20" />
      
      <div className="absolute left-1/2 top-0 h-full" style={{ width: 0 }}>
        <motion.div style={{ x, marginLeft: -ITEM_WIDTH / 2 }} className="absolute top-0 flex h-full flex-row items-center transform-gpu will-change-transform">
          {repeatedEmployees.map(({ copyIndex, key }) => (
            <div key={key} className="flex flex-row">
              {employees.map((employee, employeeIndex) => {
                const displayTitle = getDisplayTitle(employee.title);

                return (
                  <ReelPassengerCard
                    key={`${copyIndex}-${employee.id}-${employeeIndex}`}
                    employee={employee}
                    displayTitle={displayTitle}
                    shouldAnimateRemoval={Boolean(isCenter && removingWinner && targetIndex === employeeIndex)}
                  />
                );
              })}
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
});

export default function LuckyDraw() {
  const [mode, setMode] = useState<string | null>(null);
  const [bgm, setBgm] = useState<string>('/upbeat.mp3');
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState<'idle' | 'accelerating' | 'drawing' | 'stopping' | 'finished'>('idle');
  const isDrawing = status === 'accelerating' || status === 'drawing' || status === 'stopping';
  const sounds = useSoundEffects(bgm, isDrawing, isMuted);
  const [appState, setAppState] = useState<'train' | 'reveal' | 'summary'>('train');
  const [drawCount, setDrawCount] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modesData, setModesData] = useState<Record<string, any[]>>({});
  const [pastWinners, setPastWinners] = useState<WinnerRecord[]>([]);
  const [excludedEmployeeIds, setExcludedEmployeeIds] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [maxSpeed, setMaxSpeed] = useState(4.0);
  const [bgImage, setBgImage] = useState<string>('/backgrounds/background.png');
  const [birthdayStartMonth, setBirthdayStartMonth] = useState(1);
  const [birthdayEndMonth, setBirthdayEndMonth] = useState(3);
  const [birthdayDetectedWindow, setBirthdayDetectedWindow] = useState<BirthdayWindowInfo | null>(null);
  const [availableBackgrounds, setAvailableBackgrounds] = useState<any[]>([
    { id: '/backgrounds/background.png', label: 'Default' },
    { id: '/backgrounds/background2.png', label: 'Alternative' }
  ]);
  const [employeeSource, setEmployeeSource] = useState<EmployeeSourceInfo | null>(null);
  const [isClearingEmployeeData, setIsClearingEmployeeData] = useState(false);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [isWinnersLoaded, setIsWinnersLoaded] = useState(false);
  const [whoosh, setWhoosh] = useState(false);

  const [removingWinner, setRemovingWinner] = useState(false);
  const [targetCenter, setTargetCenter] = useState<number | null>(null);
  const [winner, setWinner] = useState<{employee: any, prize: string, prizeImage: string} | null>(null);
  const lines = useMemo(
    () => Array.from({ length: SPEED_LINE_COUNT }).map(() => ({
      id: Math.random(),
      top: Math.random() * 70 + 30,
      height: Math.random() * 3 + 1,
      width: Math.random() * 400 + 100,
      opacity: Math.random() * 0.4 + 0.1,
      color: Math.random() > 0.8 ? '#E60000' : '#808080',
      baseSpeed: Math.random() * 0.8 + 0.5,
    })),
    []
  );
  
  const globalSpeed = useMotionValue(0);
  const globalDistance = useMotionValue(0);

  const windowSize = useWindowSize();
  const mainScale = Math.min(0.8, Math.max(0.4, (windowSize.width - 40) / 1200));
  const revealScale = Math.min(1, Math.max(0.5, (windowSize.width - 40) / 800));

  useAnimationFrame((t, delta) => {
    if (reelEmployees.length > 0) {
      const currentTotalWidth = reelEmployees.length * ITEM_WIDTH;
      if (status === 'accelerating' || status === 'drawing') {
        globalDistance.set((globalDistance.get() - globalSpeed.get() * delta) % currentTotalWidth);
      } else if (status === 'idle') {
        globalDistance.set((globalDistance.get() - 0.05 * delta) % currentTotalWidth);
      }
    }
  });

  const loadAppData = async () => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.employees) {
          setEmployees(data.employees);
        }
        if (data.employeeSource) {
          setEmployeeSource(data.employeeSource as EmployeeSourceInfo);
        }
        if (data.birthdayWindow?.startMonth && data.birthdayWindow?.endMonth) {
          setBirthdayDetectedWindow(data.birthdayWindow as BirthdayWindowInfo);
          setBirthdayStartMonth(data.birthdayWindow.startMonth);
          setBirthdayEndMonth(data.birthdayWindow.endMonth);
        } else {
          setBirthdayDetectedWindow(null);
        }
        if (data.modes) {
          setModesData(data.modes);
          if (Object.keys(data.modes).length > 0) {
            setMode(prev => prev || Object.keys(data.modes)[0]);
          }
        }
        if (data.backgrounds) {
          const loadedBgs = data.backgrounds.map((bg: string) => {
            const normalizedPath = bg.startsWith('/') ? bg : `/${bg}`;
            const filename = normalizedPath.split('/').pop() || normalizedPath;
            const label = filename
              .replace(/\.(png|jpg|jpeg|webp)$/i, '')
              .replace(/_/g, ' ')
              .replace('background', '')
              .trim() || 'Default';
            return { id: normalizedPath, label: label.charAt(0).toUpperCase() + label.slice(1) };
          });
          if (loadedBgs.length > 0) {
            setAvailableBackgrounds(loadedBgs);
          }
        }
      })
      .catch(err => console.error('Failed to load CSV data:', err));
  };

  // Load data from API
  useEffect(() => {
    loadAppData();
  }, []);

  const currentModeConfig = mode && modesData[mode] ? { name: mode, prizes: modesData[mode] } : { name: 'Default', prizes: [] };
  const modeDisplayName = mode === 'annual' ? 'Annual Dinner' : mode === 'birthday' ? 'Birthday Party' : currentModeConfig.name;
  const isDrawComplete = currentModeConfig.prizes.length > 0 && drawCount >= currentModeConfig.prizes.length;
  const nextPrize = currentModeConfig.prizes[drawCount] || { name: 'Mystery Prize', image: '' };
  const birthdayScopedEmployees = useMemo(
    () => getBirthdayScopedEmployees(employees, mode, birthdayStartMonth, birthdayEndMonth),
    [birthdayEndMonth, birthdayStartMonth, employees, mode]
  );
  const preservedWinnerId = winner && (status === 'finished' || appState === 'reveal' || removingWinner)
    ? winner.employee.id
    : null;
  const reelEmployees = useMemo(
    () => getAvailableReelEmployees(birthdayScopedEmployees, pastWinners, excludedEmployeeIds, preservedWinnerId),
    [appState, birthdayScopedEmployees, excludedEmployeeIds, pastWinners, preservedWinnerId, removingWinner, status]
  );
  const birthdayPreview = useMemo(
    () => birthdayScopedEmployees.slice(0, 4).map((employee) => employee.name),
    [birthdayScopedEmployees]
  );
  const participantsLeft = reelEmployees.length;
  const participantsInScope = birthdayScopedEmployees.length;
  const birthdayWindowLabel = formatMonthWindowLabel(birthdayStartMonth, birthdayEndMonth);
  const firstVisibleParticipant = reelEmployees[0] ?? null;
  const finalVisibleParticipant = reelEmployees[reelEmployees.length - 1] ?? null;
  const canStartDraw = !isDrawComplete && participantsLeft > 0;

  // Load static settings from localStorage once
  useEffect(() => {
    const savedMode = localStorage.getItem('luckyDrawMode');
    if (savedMode) setMode(savedMode);
    
    const savedBgImage = localStorage.getItem('luckyDrawBgImage');
    if (savedBgImage) setBgImage(savedBgImage);

    const savedBgm = localStorage.getItem('luckyDrawBgm');
    if (savedBgm !== null) setBgm(savedBgm);

    const savedMute = localStorage.getItem('luckyDrawMuted');
    if (savedMute !== null) setIsMuted(savedMute === 'true');

    const savedBirthdayStartMonth = localStorage.getItem('luckyDrawBirthdayStartMonth');
    if (savedBirthdayStartMonth) setBirthdayStartMonth(Number(savedBirthdayStartMonth));

    const savedBirthdayEndMonth = localStorage.getItem('luckyDrawBirthdayEndMonth');
    if (savedBirthdayEndMonth) setBirthdayEndMonth(Number(savedBirthdayEndMonth));
    
    setIsSettingsLoaded(true);
  }, []);

  // Load winners from localStorage once employees are available
  useEffect(() => {
    if (employees.length > 0) {
      const savedWinners = localStorage.getItem('luckyDrawWinners');
      if (savedWinners) {
        try {
          const parsed = JSON.parse(savedWinners);
          setPastWinners(parsed);
          setDrawCount(parsed.length);
        } catch (e) {
          console.error("Failed to parse winners", e);
        }
      }

      const savedExcludedEmployees = localStorage.getItem('luckyDrawExcludedEmployees');
      if (savedExcludedEmployees) {
        try {
          const parsed = JSON.parse(savedExcludedEmployees);
          if (Array.isArray(parsed)) {
            setExcludedEmployeeIds(parsed);
          }
        } catch (e) {
          console.error('Failed to parse excluded employees', e);
        }
      }

      setIsWinnersLoaded(true);
    }
  }, [employees]);

  // Save specific settings to localStorage when they change
  useEffect(() => {
    if (isSettingsLoaded && mode) {
      localStorage.setItem('luckyDrawMode', mode);
    }
    if (isSettingsLoaded) {
      localStorage.setItem('luckyDrawBgImage', bgImage);
      localStorage.setItem('luckyDrawBgm', bgm);
      localStorage.setItem('luckyDrawMuted', String(isMuted));
      localStorage.setItem('luckyDrawBirthdayStartMonth', String(birthdayStartMonth));
      localStorage.setItem('luckyDrawBirthdayEndMonth', String(birthdayEndMonth));
    }
  }, [mode, bgImage, bgm, isMuted, birthdayEndMonth, birthdayStartMonth, isSettingsLoaded]);

  // Save winners to localStorage when they change
  useEffect(() => {
    if (isWinnersLoaded) {
      localStorage.setItem('luckyDrawWinners', JSON.stringify(pastWinners));
    }
  }, [pastWinners, isWinnersLoaded]);

  useEffect(() => {
    if (isWinnersLoaded) {
      localStorage.setItem('luckyDrawExcludedEmployees', JSON.stringify(excludedEmployeeIds));
    }
  }, [excludedEmployeeIds, isWinnersLoaded]);

  useEffect(() => {
    if (status === 'finished') {
      const safeIndex = reelEmployees.length > 0
        ? Math.min(targetCenter ?? 0, Math.max(reelEmployees.length - 1, 0))
        : 0;

      globalDistance.set(-(safeIndex * ITEM_WIDTH));
    }
  }, [globalDistance, reelEmployees, status, targetCenter]);

  const clearLoadedEmployeeData = async () => {
    setIsClearingEmployeeData(true);

    try {
      const response = await fetch('/api/upload', { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to clear employee data');
      }

      window.location.reload();
    } catch (error) {
      console.error(error);
      setIsClearingEmployeeData(false);
    }
  };

  const switchMode = (newMode: string) => {
    setMode(newMode);
    setDrawCount(0);
    setPastWinners([]);
    setExcludedEmployeeIds([]);
    localStorage.removeItem('luckyDrawWinners');
    localStorage.removeItem('luckyDrawExcludedEmployees');
    setWinner(null);
    setStatus('idle');
    setTargetCenter(null);
    setAppState('train');
    setShowParticipantsDialog(false);
    setShowSettings(false);
  };

  const restartEvent = () => {
    setDrawCount(0);
    setPastWinners([]);
    setExcludedEmployeeIds([]);
    localStorage.removeItem('luckyDrawWinners');
    localStorage.removeItem('luckyDrawExcludedEmployees');
    setWinner(null);
    setStatus('idle');
    setTargetCenter(null);
    setAppState('train');
    setShowParticipantsDialog(false);
  };

  const startDrawing = () => {
    if (isDrawComplete || reelEmployees.length === 0) return;
    setStatus('accelerating');
    setWinner(null);
    setTargetCenter(null);
    sounds.playTrainRunning();
    
    animate(globalSpeed, maxSpeed, {
      duration: 4,
      ease: "easeIn",
      onComplete: () => {
        setStatus('drawing');
        
        animate(globalSpeed, [maxSpeed, maxSpeed * 0.96, maxSpeed * 1.04, maxSpeed], {
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "mirror"
        });
      }
    });
  };

  const stopDrawing = () => {
    setStatus('stopping');
    sounds.playTrainStopping();
    
    // Filter out past winners
    const availableEmployees = reelEmployees;
    if (availableEmployees.length === 0) {
      setStatus('idle');
      sounds.stopAllTrainSounds();
      return;
    }

    const winnerEmp = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
      
    const centerIdx = availableEmployees.findIndex(e => e.id === winnerEmp.id);
    setTargetCenter(centerIdx);

    const currentTotalWidth = availableEmployees.length * ITEM_WIDTH;

    const currentX = globalDistance.get();
    const baseTargetX = - (centerIdx * ITEM_WIDTH);
    
    let currentSpeedPerSec = globalSpeed.get() * 1000;
    if (currentSpeedPerSec < 100) currentSpeedPerSec = 100; // Prevent division by zero or extremely slow speeds
    
    let remainder = (currentX - baseTargetX) % currentTotalWidth;
    if (remainder < 0) remainder += currentTotalWidth;
    
    // We want the reel to spin for at least 1.5 seconds at current speed
    let N = 0;
    while ((remainder + N * currentTotalWidth) < currentSpeedPerSec * 1.5) {
      N++;
    }
    
    const actualDistance = remainder + N * currentTotalWidth;
    
    // Calculate duration, clamped between 3 and 5 seconds
    let actualDuration = (2 * actualDistance) / currentSpeedPerSec;
    if (actualDuration > 5) actualDuration = 5;
    if (actualDuration < 3) actualDuration = 3;
    
    const finalX = currentX - actualDistance;

    animate(globalDistance, finalX, {
      ease: "easeOut",
      duration: actualDuration,
      onComplete: () => {
        sounds.stopAllTrainSounds();
        const wonPrize = nextPrize.name;
        const wonPrizeImage = nextPrize.image;
        const newWinner = { employee: winnerEmp, prize: wonPrize, prizeImage: wonPrizeImage };
        setWinner(newWinner);
        setPastWinners(prev => [...prev, newWinner]);
        setDrawCount(prev => prev + 1);
        setStatus('finished');
        
        // Transition to Reveal Screen
        setTimeout(() => {
          setAppState('reveal');
        }, 1500);
      }
    });

    animate(globalSpeed, 0, {
      duration: actualDuration,
      ease: "easeOut"
    });
  };

  const triggerConfetti = () => {
    const duration = 4000;
    const end = Date.now() + duration;

    // Initial big burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#E60000', '#FFDF00', '#FFFFFF', '#1A1A1A', '#FF4D4D'],
      zIndex: 100,
    });

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#E60000', '#FFDF00', '#FFFFFF', '#1A1A1A'],
        zIndex: 100,
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#E60000', '#FFDF00', '#FFFFFF', '#1A1A1A'],
        zIndex: 100,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  useEffect(() => {
    if (appState === 'reveal') {
      sounds.playReveal();
      sounds.playCheer(mode);
      triggerConfetti();

      // Automatically transition to summary screen if all prizes are given
      if (isDrawComplete) {
        const timer = setTimeout(() => {
          setAppState('summary');
        }, 8000); // Wait 8 seconds before auto-redirecting
        return () => clearTimeout(timer);
      }
    }
  }, [appState, mode, isDrawComplete]);

  if (!isSettingsLoaded) return null;

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] overflow-hidden relative flex flex-col items-center justify-center">
      
      <AnimatePresence>
        {whoosh && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '0%' }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[100] bg-[#E60000]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {appState === 'train' && (
          <motion.div 
            key="train-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url('${bgImage}')` }}
          >
            
            {/* Start/Stop Button */}
            <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-48 h-[88px] md:w-64 md:h-[124px] z-30" style={{ transform: 'perspective(500px) rotateX(22deg)' }}>
              {(status === 'idle' || status === 'finished') && !isDrawComplete && (
                <button
                  onClick={() => {
                    if (status === 'idle' && canStartDraw) startDrawing();
                  }}
                  className={clsx(
                    "w-full h-full rounded-2xl border-b-[10px] md:border-b-[14px] flex items-center justify-center text-white font-black tracking-widest shadow-2xl text-2xl md:text-3xl transition-all",
                    status === 'idle' && canStartDraw ? "cursor-pointer bg-green-600 hover:bg-green-500 border-green-800 active:border-b-0 active:translate-y-[10px] md:active:translate-y-[14px]" : "bg-gray-500 border-gray-700 cursor-default pointer-events-none"
                  )}
                  title={canStartDraw ? 'START' : 'No participants available'}
                >
                  {canStartDraw ? 'START' : 'NO PASSENGERS'}
                </button>
              )}

              {(status === 'accelerating' || status === 'drawing') && (
                <button
                  onClick={stopDrawing}
                  className="w-full h-full cursor-pointer bg-red-600 hover:bg-red-500 transition-all rounded-2xl border-b-[10px] md:border-b-[14px] border-red-800 flex items-center justify-center text-white font-black tracking-widest shadow-2xl text-2xl md:text-3xl active:border-b-0 active:translate-y-[10px] md:active:translate-y-[14px]"
                  title="STOP"
                >
                  STOP
                </button>
              )}

              {status === 'stopping' && (
                <button
                  disabled
                  className="w-full h-full cursor-not-allowed bg-gray-500 rounded-2xl border-b-[10px] md:border-b-[14px] border-gray-700 flex items-center justify-center font-black tracking-widest text-white shadow-2xl text-2xl md:text-3xl"
                >
                  STOP
                </button>
              )}
            </div>

            {status === 'finished' && isDrawComplete && (
              <div className="absolute bottom-[23%] left-1/2 -translate-x-1/2 z-40">
                <button
                  onClick={() => setAppState('summary')}
                  className="px-10 py-4 rounded-full font-black text-xl text-white bg-[#1A1A1A] hover:bg-black shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                >
                  VIEW ALL WINNERS <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* Speed Indicator */}
            <SpeedIndicator 
              globalSpeed={globalSpeed} 
              maxSpeed={maxSpeed} 
              className="absolute bottom-[9%] left-1/2 -translate-x-1/2 z-30 scale-75 md:scale-100"
              style={{ transform: 'perspective(500px) rotateX(22deg)' }}
            />

            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-50 flex gap-3">
              <button
                onClick={() => setIsMuted((currentValue) => !currentValue)}
                className="p-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-[#E60000] transition-colors"
                title={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <button 
                onClick={restartEvent}
                className="px-4 py-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-[#E60000] transition-colors flex items-center gap-2 font-bold text-sm"
                title="Reset Event"
              >
                <RotateCcw className="w-5 h-5" />
                <span className="hidden md:inline">Reset</span>
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-3 bg-white rounded-full shadow-lg border border-gray-200 text-gray-600 hover:text-[#E60000] transition-colors"
                >
                  <Settings className="w-6 h-6" />
                </button>
                
                <SettingsModal 
                  isOpen={showSettings} 
                  onClose={() => setShowSettings(false)} 
                  mode={mode} 
                  onModeChange={switchMode} 
                  maxSpeed={maxSpeed} 
                  setMaxSpeed={setMaxSpeed} 
                  modesData={modesData}
                  bgImage={bgImage}
                  setBgImage={setBgImage}
                  availableBackgrounds={availableBackgrounds}
                  bgm={bgm}
                  setBgm={setBgm}
                  birthdayStartMonth={birthdayStartMonth}
                  setBirthdayStartMonth={setBirthdayStartMonth}
                  birthdayEndMonth={birthdayEndMonth}
                  setBirthdayEndMonth={setBirthdayEndMonth}
                  birthdayMatchCount={participantsInScope}
                  birthdayPreview={birthdayPreview}
                  birthdayDetectedWindow={birthdayDetectedWindow}
                  employeeSource={employeeSource}
                  onClearEmployeeData={clearLoadedEmployeeData}
                  isClearingEmployeeData={isClearingEmployeeData}
                  theme="light" 
                />
              </div>
            </div>

            {/* Right Side Panels */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex w-56 md:w-72 flex-col gap-3 pointer-events-none">
              <button
                type="button"
                onClick={() => setShowParticipantsDialog(true)}
                className="pointer-events-auto overflow-hidden rounded-2xl border border-white/30 bg-white/20 text-left shadow-xl backdrop-blur-md transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 bg-[#1A1A1A]/80 px-3 py-3 text-white backdrop-blur-md">
                  <Users className="w-4 h-4 text-red-300" />
                  <h3 className="font-bold tracking-wider text-xs uppercase">Participants Left</h3>
                  <div className="ml-auto bg-[#E60000] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {participantsLeft}
                  </div>
                </div>
                <div className="px-3 py-3 text-white/95">
                  <div className="text-sm font-bold">View all participants in the train</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/65">
                    {firstVisibleParticipant ? `${firstVisibleParticipant.name} to ${finalVisibleParticipant?.name}` : 'No active passengers'}
                  </div>
                </div>
              </button>

              <div className="max-h-[30vh] md:max-h-[40vh] flex flex-col pointer-events-none">
                <div className="bg-white/20 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 overflow-hidden flex flex-col h-full pointer-events-auto">
                <div className="bg-[#1A1A1A]/80 backdrop-blur-md text-white px-3 py-3 flex items-center gap-2 shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-bold tracking-wider text-xs uppercase">All Winners</h3>
                  <div className="ml-auto bg-[#E60000] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pastWinners.length}
                  </div>
                </div>
                <div className="p-3 space-y-2 overflow-y-auto flex-1">
                  {pastWinners.length === 0 ? (
                    <p className="text-white text-xs italic text-center py-3 drop-shadow-md">No winners yet</p>
                  ) : (
                    [...pastWinners].reverse().map((w, idx) => (
                      (() => {
                        const displayTitle = getDisplayTitle(w.employee.title);

                        return (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx} 
                        className="flex items-center gap-2 bg-white/40 backdrop-blur-sm p-2 rounded-lg border border-white/50 shadow-sm"
                      >
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0 overflow-hidden border-2 border-white/80">
                          {w.employee.avatar ? (
                            <img src={w.employee.avatar} alt={w.employee.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-gray-900 truncate drop-shadow-sm">{w.employee.name}</div>
                          {displayTitle && <div className="text-[10px] text-gray-800 truncate">{displayTitle}</div>}
                          <div className="text-[10px] text-[#E60000] font-bold truncate mt-0.5 flex items-center gap-1 drop-shadow-sm">
                            <Gift className="w-3 h-3" />
                            {w.prize}
                          </div>
                        </div>
                      </motion.div>
                        );
                      })()
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>

            {isDrawing && (
              <div className="absolute inset-0 z-0 bg-white/10 backdrop-blur-[2px]">
                {lines.map(line => (
                  <SpeedLine key={line.id} globalSpeed={globalSpeed} {...line} />
                ))}
              </div>
            )}

            <div className="absolute top-8 left-0 w-full text-center z-20 px-4">
              <motion.h1 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight uppercase text-[#1A1A1A] flex items-center justify-center gap-2 md:gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 224.896 35.894" className="h-[0.8em] fill-current">
                  <path d="M148.51 0c-9.33-.062-20.703 3.807-20.763 17.858-.06 13.91 11.553 18.3 20.763 18.024 8.561-.255 18.013-2.634 18.445-13.105l-9.463.021c-.267 6.58-5.517 7.885-8.982 7.896-3.555.013-10.79-.735-10.904-12.695-.108-11.289 6.533-12.885 10.904-12.837 4.371.048 8.707 2.087 8.756 7.227l9.401-.008C166.571 6.088 161.131.085 148.51 0ZM0 .638V35.2h9.15V19.947h18.518V35.2h9.193V.637h-9.193V14.47H9.15V.637Zm44.452 0v34.56h9.213V.638Zm12.623 0v5.717h13.419v28.838h9.114V6.354H93.03V.637Zm114.367 0V35.2h9.15V19.947h18.518V35.2h9.15V.637h-9.15V14.47h-18.517V.637Zm44.231 0v34.56h9.223V.638ZM101.541.689l-16.385 34.51h10.281l3.195-7.754 17.313-.006 3.187 7.76h10.306L113.128.689Zm5.763 5.836 6.332 15.42-12.717.008z"/>
                </svg>
                <span>RAIL <span className="text-[#E60000] italic">LUCKY DRAW</span></span>
              </motion.h1>
              <p className="text-gray-500 font-bold mt-2 tracking-[0.3em] uppercase text-[21px] leading-none">{modeDisplayName}</p>
              
              {/* Prize Status */}
              <div className="mt-6 inline-flex flex-col gap-4 bg-white/80 backdrop-blur-md px-8 py-5 rounded-3xl border border-gray-200 shadow-xl">
                <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                  <div className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
                    {isDrawComplete ? 'All prizes drawn!' : `Drawing ${drawCount + 1} of ${currentModeConfig.prizes.length}`}
                  </div>
                  {mode === 'birthday' && (
                    <div className="rounded-full bg-red-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#E60000]">
                      Birthday {birthdayWindowLabel}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                  {!isDrawComplete && nextPrize && (
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="w-20 h-20 shrink-0">
                        {nextPrize.image ? (
                          <div className="w-full h-full rounded-xl overflow-hidden shadow-md border-2 border-white relative">
                            <Image src={nextPrize.image} alt={nextPrize.name} fill className="object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <div className="w-full h-full bg-red-50 rounded-full flex items-center justify-center">
                            <Gift className="w-8 h-8 text-[#E60000]" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-sm text-gray-500 font-medium mb-1">Next Prize</div>
                        <div className="text-2xl font-black text-[#1A1A1A]">{nextPrize.name}</div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div className="w-full overflow-hidden flex flex-col items-center justify-center mt-[-5vh] md:mt-[-10vh] px-4 flex-1">
              <div 
                className="relative flex flex-col items-center justify-center min-w-[300px] w-full max-w-[1400px] mx-auto origin-center mt-12 md:mt-24"
                style={{ transform: `scale(${mainScale})` }}
              >
                <div className="w-full relative flex justify-center">
                  <motion.div 
                    animate={status === 'accelerating' || status === 'drawing' ? { y: [-1, 1, -0.5, 0.5, -1] } : { y: 0 }}
                    transition={status === 'accelerating' || status === 'drawing' ? { repeat: Infinity, duration: 0.3 } : { duration: 0.5, ease: "easeOut" }}
                    className="relative z-10 flex w-full flex-row items-center justify-center drop-shadow-2xl transform-gpu will-change-transform"
                  >
                    {/* Train Tail */}
                    <div 
                      className="w-48 md:w-80 h-[300px] bg-gradient-to-b from-white via-[#e0e0e0] to-[#808080] relative overflow-hidden shrink-0 shadow-[-10px_0_20px_rgba(0,0,0,0.2)]"
                    style={{ borderTopLeftRadius: '100% 80%', borderBottomLeftRadius: '20px' }}
                  >
                    {/* Window Band */}
                    <div className="absolute top-[40px] left-0 w-full h-[220px] bg-[#1A1A1A]" />
                    {/* Tail Window */}
                    <div className="absolute top-[60px] left-12 w-32 h-[180px] bg-white/80" style={{ borderTopLeftRadius: '100% 80%', borderBottomLeftRadius: '10px' }} />
                    {/* Taillight */}
                    <div className="absolute bottom-[10px] left-4 w-4 h-8 bg-[#E60000] rounded-full shadow-[0_0_15px_#E60000]" />
                    {/* Bottom Stripe */}
                    <div className="absolute bottom-[10px] left-0 w-full h-[10px] bg-[#E60000]" />
                  </div>

                  {/* Train Body (Carts) */}
                  <div className="flex-1 h-[300px] bg-gradient-to-b from-white via-[#e0e0e0] to-[#808080] relative flex items-center justify-center px-2 md:px-8 z-10">
                    {/* Window Band */}
                    <div className="absolute top-[40px] left-0 w-full h-[220px] bg-[#1A1A1A]" />
                    {/* Bottom Stripe */}
                    <div className="absolute bottom-[10px] left-0 w-full h-[10px] bg-[#E60000]" />
                    
                    <Reel status={status} globalDistance={globalDistance} indexOffset={1} employees={reelEmployees} />
                    <Reel status={status} globalDistance={globalDistance} indexOffset={0} isCenter={true} targetIndex={targetCenter} removingWinner={removingWinner} employees={reelEmployees} />
                    <Reel status={status} globalDistance={globalDistance} indexOffset={-1} employees={reelEmployees} />
                  </div>

                  {/* Train Head */}
                  <div 
                    className="w-48 md:w-80 h-[300px] bg-gradient-to-b from-white via-[#e0e0e0] to-[#808080] relative overflow-hidden shrink-0 shadow-[10px_0_20px_rgba(0,0,0,0.2)]"
                    style={{ borderTopRightRadius: '100% 80%', borderBottomRightRadius: '20px' }}
                  >
                    {/* Window Band */}
                    <div className="absolute top-[40px] left-0 w-full h-[220px] bg-[#1A1A1A]" />
                    {/* Head Window */}
                    <div className="absolute top-[60px] right-12 w-32 h-[180px] bg-white/80" style={{ borderTopRightRadius: '100% 80%', borderBottomRightRadius: '10px' }} />
                    {/* Headlight */}
                    <div className="absolute bottom-[10px] right-4 w-4 h-8 bg-white rounded-full shadow-[0_0_20px_#ffffff]" />
                    {/* Bottom Stripe */}
                    <div className="absolute bottom-[10px] left-0 w-full h-[10px] bg-[#E60000]" />
                  </div>
                  <TrainSparks isActive={status === 'stopping'} />
                </motion.div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
        {appState === 'reveal' && winner && (
          (() => {
            const displayTitle = getDisplayTitle(winner.employee.title);
            const staffCode = winner.employee.staffCode?.trim();

            return (
          <motion.div 
            key="reveal-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#f8f9fa] flex flex-col items-center justify-center z-50 p-8 overflow-hidden"
          >
            {/* Sunburst background */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-100%] opacity-10 pointer-events-none"
              style={{
                background: 'repeating-conic-gradient(from 0deg, #E60000 0deg 15deg, transparent 15deg 30deg)'
              }}
            />

            <motion.div 
              layoutId="winner-card"
              initial={{ y: 300, scale: 0.5, rotate: -10, opacity: 0 }}
              animate={{ y: 0, scale: revealScale, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.1 }}
              className="flex flex-col xl:flex-row w-full max-w-5xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] relative z-10 filter drop-shadow-2xl"
              style={{ transformPerspective: 1000 }}
            >
              {/* MAIN TICKET BODY */}
              <div className="bg-[#FFF9EE] flex-1 rounded-t-3xl xl:rounded-l-3xl xl:rounded-tr-none p-8 md:p-12 relative overflow-hidden border-2 border-dashed xl:border-solid xl:border-r-0 border-[#1A1A1A]">
                <div className="absolute top-0 left-0 w-full h-3 bg-[#E60000]"></div>
                
                <div className="flex flex-col items-center mt-2">
                  <span className="uppercase tracking-[0.4em] text-gray-400 font-bold text-xs md:text-sm mb-8 flex items-center gap-2">
                    <Train className="w-5 h-5" /> GOLDEN TICKET &bull; {modeDisplayName}
                  </span>
                  
                  <div className="flex flex-col xl:flex-row items-center gap-8 md:gap-12 w-full justify-center">
                    <motion.div 
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 15, delay: 0.4 }}
                      className="w-40 h-40 md:w-56 md:h-56 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#1A1A1A] shrink-0 overflow-hidden relative z-10"
                    >
                      {winner.employee.avatar ? (
                        <img src={winner.employee.avatar} alt={winner.employee.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-20 h-20 md:w-28 md:h-28 text-gray-300" />
                      )}
                    </motion.div>

                    <div className="flex flex-col text-center xl:text-left z-10 flex-1">
                      <motion.h2 
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-4xl sm:text-6xl md:text-7xl font-black text-[#1A1A1A] tracking-tight mb-2 uppercase font-serif px-2"
                      >
                        {winner.employee.name}
                      </motion.h2>
                      {displayTitle && (
                        <motion.p 
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.7 }}
                          className="text-xl md:text-3xl font-medium text-gray-500 uppercase tracking-widest px-2"
                        >
                          {displayTitle}
                        </motion.p>
                      )}
                      {staffCode && (
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.78 }}
                          className="mt-4 inline-flex items-center justify-center rounded-full border border-[#1A1A1A]/10 bg-[#fff1ea] px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-[#E60000] xl:justify-start"
                        >
                          Staff Code: {staffCode}
                        </motion.div>
                      )}
                      
                      {winner.prizeImage && (
                        <motion.div
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.9 }}
                          className="mt-8 hidden xl:flex items-center gap-6"
                        >
                          <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200 shadow-md relative">
                            <Image src={winner.prizeImage} alt={winner.prize} fill className="object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <span className="text-gray-400 font-bold uppercase tracking-widest text-sm">Reward Detail</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TICKET STUB */}
              <div className="bg-[#E60000] w-full xl:w-[400px] rounded-b-3xl xl:rounded-r-3xl xl:rounded-bl-none p-8 md:p-12 relative flex flex-col items-center justify-center border-2 border-[#1A1A1A] xl:border-l-0 text-white shadow-inner">
                {/* Cutouts for dashed effect */}
                <div className="absolute top-0 left-1/2 xl:left-[0px] xl:top-1/2 w-8 h-8 md:w-[40px] md:h-[40px] bg-[#f8f9fa] rounded-full -translate-x-1/2 xl:-translate-x-1/2 -translate-y-1/2 border-b-2 xl:border-b-0 xl:border-r-2 border-[#1A1A1A] z-20" />
                
                {/* Horizontal dash for mobile, vertical dash for desktop */}
                <div className="block xl:hidden absolute top-0 left-8 right-8 h-px border-t-[4px] border-dashed border-[#1A1A1A]/30"></div>
                <div className="hidden xl:block absolute left-0 top-10 bottom-10 w-px border-l-[4px] border-dashed border-[#1A1A1A]/30"></div>

                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8, type: "spring", bounce: 0.6 }}
                  className="flex flex-col items-center text-center mt-6 xl:mt-0 z-10 w-full"
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mb-4 drop-shadow-md" />
                  <span className="text-yellow-400 font-bold tracking-[0.2em] uppercase text-sm mb-3">OFFICIAL REWARD</span>
                  <div className="bg-white/10 px-6 py-4 rounded-xl border border-white/20 w-full">
                    <h3 className="font-black text-3xl md:text-4xl leading-tight tracking-tight drop-shadow-sm break-words">
                      {winner.prize}
                    </h3>
                  </div>
                  
                  {winner.prizeImage && (
                    <div className="mt-6 w-48 h-48 rounded-xl overflow-hidden border-4 border-white/20 shadow-2xl relative block xl:hidden">
                      <Image src={winner.prizeImage} alt={winner.prize} fill className="object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </motion.div>
                
                <div className="mt-12 xl:mt-auto w-full pt-4">
                  {/* Barcode graphic simulation */}
                  <div className="w-full flex justify-between h-16 opacity-60 mix-blend-overlay">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className={`bg-[#1A1A1A] h-full ${i % 3 === 0 ? 'w-1' : i % 2 === 0 ? 'w-2' : 'w-3'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
              className="mt-12 flex flex-col md:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={() => {
                  setAppState('train');
                  setTimeout(() => {
                    setRemovingWinner(true);
                    setTimeout(() => {
                      const winnerId = winner?.employee.id;
                      const nextPastWinners = pastWinners.slice(0, -1);
                      const nextExcludedEmployeeIds = winnerId && !excludedEmployeeIds.includes(winnerId)
                        ? [...excludedEmployeeIds, winnerId]
                        : excludedEmployeeIds;
                      const nextEmployees = getAvailableReelEmployees(
                        birthdayScopedEmployees,
                        nextPastWinners,
                        nextExcludedEmployeeIds
                      );
                      const nextCenterIdx = nextEmployees.length > 0 && targetCenter !== null
                        ? Math.min(targetCenter, nextEmployees.length - 1)
                        : 0;

                      setPastWinners(nextPastWinners);
                      setExcludedEmployeeIds(nextExcludedEmployeeIds);
                      setDrawCount(prev => Math.max(prev - 1, 0));
                      setWinner(null);
                      setRemovingWinner(false);
                      setStatus('idle');
                      setTargetCenter(nextEmployees.length > 0 ? nextCenterIdx : null);
                      globalDistance.set(-(nextCenterIdx * ITEM_WIDTH));
                    }, 800);
                  }, 600);
                }}
                className="px-6 py-4 rounded-full font-bold text-lg text-gray-500 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all active:scale-95 flex items-center gap-2"
                title="Discard this winner and draw again without consuming prize quota"
              >
                <RotateCcw className="w-5 h-5" /> REDRAW
              </button>

              {isDrawComplete ? (
                <button
                  onClick={() => setAppState('summary')}
                  className="px-10 py-4 rounded-full font-black text-xl text-white bg-[#1A1A1A] hover:bg-black shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                >
                  VIEW ALL WINNERS <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAppState('train');
                    setTimeout(() => {
                      setRemovingWinner(true);
                      setTimeout(() => {
                        const nextEmployees = getAvailableReelEmployees(
                          birthdayScopedEmployees,
                          pastWinners,
                          excludedEmployeeIds
                        );
                        const newCenterIdx = nextEmployees.length > 0 && targetCenter !== null
                          ? Math.min(targetCenter, nextEmployees.length - 1)
                          : 0;

                        setWinner(null);
                        setRemovingWinner(false);
                        setStatus('idle');
                        setTargetCenter(nextEmployees.length > 0 ? newCenterIdx : null);
                        globalDistance.set(-newCenterIdx * ITEM_WIDTH);
                      }, 800);
                    }, 600);
                  }}
                  className="px-10 py-4 rounded-full font-black text-xl text-white bg-[#E60000] hover:bg-red-600 shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                >
                  DRAW NEXT WINNER <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </motion.div>
          </motion.div>
            );
          })()
        )}

        {appState === 'summary' && (
          <motion.div 
            key="summary-screen"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#1A1A1A] overflow-y-auto p-8 md:p-16 flex flex-col items-center"
          >
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-5xl md:text-7xl font-black text-white mb-4 tracking-tight uppercase italic text-center flex items-center justify-center gap-2 md:gap-4"
            >
              <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 224.896 35.894" className="h-[0.8em] fill-current not-italic">
                <path d="M148.51 0c-9.33-.062-20.703 3.807-20.763 17.858-.06 13.91 11.553 18.3 20.763 18.024 8.561-.255 18.013-2.634 18.445-13.105l-9.463.021c-.267 6.58-5.517 7.885-8.982 7.896-3.555.013-10.79-.735-10.904-12.695-.108-11.289 6.533-12.885 10.904-12.837 4.371.048 8.707 2.087 8.756 7.227l9.401-.008C166.571 6.088 161.131.085 148.51 0ZM0 .638V35.2h9.15V19.947h18.518V35.2h9.193V.637h-9.193V14.47H9.15V.637Zm44.452 0v34.56h9.213V.638Zm12.623 0v5.717h13.419v28.838h9.114V6.354H93.03V.637Zm114.367 0V35.2h9.15V19.947h18.518V35.2h9.15V.637h-9.15V14.47h-18.517V.637Zm44.231 0v34.56h9.223V.638ZM101.541.689l-16.385 34.51h10.281l3.195-7.754 17.313-.006 3.187 7.76h10.306L113.128.689Zm5.763 5.836 6.332 15.42-12.717.008z"/>
              </svg>
              <span>Rail <span className="text-[#E60000]">Winners</span></span>
            </motion.h1>
            <p className="text-gray-400 font-bold tracking-[0.3em] uppercase text-sm mb-16">{modeDisplayName}</p>

            {mode === 'birthday' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                {pastWinners.map((w, i) => (
                  (() => {
                    const displayTitle = getDisplayTitle(w.employee.title);

                    return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    key={i} 
                    className="bg-white rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl border-b-8 border-[#E60000]"
                  >
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 overflow-hidden">
                      {w.employee.avatar ? (
                        <img src={w.employee.avatar} alt={w.employee.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black text-[#1A1A1A] mb-1">{w.employee.name}</h3>
                    {displayTitle && <p className="text-gray-500 font-medium mb-6">{displayTitle}</p>}
                    {w.prizeImage && (
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-gray-100">
                        <Image 
                          src={w.prizeImage} 
                          alt={w.prize} 
                          width={300} 
                          height={200} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="bg-red-50 text-[#E60000] px-6 py-2 rounded-full font-bold text-lg w-full">
                      {w.prize}
                    </div>
                  </motion.div>
                    );
                  })()
                ))}
              </div>
            ) : (
              (() => {
                // Build prize groups in config order, falling back to first-seen order from pastWinners
                const configPrizeNames = Array.from(
                  new Map(currentModeConfig.prizes.map((p: any) => [p.name, true])).keys()
                ) as string[];
                const winnerPrizeNames = pastWinners.reduce<string[]>((acc, w) => {
                  if (!acc.includes(w.prize)) acc.push(w.prize);
                  return acc;
                }, []);
                const allPrizeNames = [
                  ...configPrizeNames,
                  ...winnerPrizeNames.filter(n => !configPrizeNames.includes(n)),
                ];
                const prizeGroups = allPrizeNames
                  .map(name => ({ name, winners: pastWinners.filter(w => w.prize === name) }))
                  .filter(g => g.winners.length > 0);

                return (
                  <div className="w-full max-w-7xl flex flex-col gap-12">
                    {prizeGroups.map((group, tierIndex) => {
                      const baseDelay = 0.3 + tierIndex * 0.3;
                      if (tierIndex === 0) {
                        return (
                          <div key={group.name} className="flex flex-wrap justify-center gap-8">
                            {group.winners.map((w, i) => {
                              const displayTitle = getDisplayTitle(w.employee.title);
                              return (
                                <motion.div
                                  key={`prize0-${i}`}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: baseDelay + i * 0.1 }}
                                  className="bg-gradient-to-b from-yellow-50 to-white rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(250,204,21,0.15)] border-4 border-yellow-400 w-full md:w-[400px]"
                                >
                                  <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
                                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-md overflow-hidden">
                                    {w.employee.avatar ? (
                                      <img src={w.employee.avatar} alt={w.employee.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-16 h-16 text-gray-300" />
                                    )}
                                  </div>
                                  <h3 className="text-2xl sm:text-4xl font-black text-[#1A1A1A] mb-1">{w.employee.name}</h3>
                                  {displayTitle && <p className="text-gray-500 font-medium mb-6 text-lg">{displayTitle}</p>}
                                  {w.prizeImage && (
                                    <div className="w-full h-40 rounded-xl overflow-hidden mb-6 border-2 border-yellow-200">
                                      <Image src={w.prizeImage} alt={w.prize} width={400} height={300} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                  <div className="bg-yellow-400 text-yellow-900 px-8 py-3 rounded-full font-black text-xl w-full shadow-inner">
                                    {w.prize}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      } else if (tierIndex === 1) {
                        return (
                          <div key={group.name} className="flex flex-wrap justify-center gap-6">
                            {group.winners.map((w, i) => {
                              const displayTitle = getDisplayTitle(w.employee.title);
                              return (
                                <motion.div
                                  key={`prize1-${i}`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: baseDelay + i * 0.1 }}
                                  className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-xl border-t-4 border-gray-300 w-full md:w-[320px]"
                                >
                                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                                    {w.employee.avatar ? (
                                      <img src={w.employee.avatar} alt={w.employee.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <User className="w-10 h-10 text-gray-400" />
                                    )}
                                  </div>
                                  <h3 className="text-2xl font-black text-[#1A1A1A] mb-1">{w.employee.name}</h3>
                                  {displayTitle && <p className="text-gray-500 font-medium mb-4 text-sm">{displayTitle}</p>}
                                  {w.prizeImage && (
                                    <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-gray-200">
                                      <Image src={w.prizeImage} alt={w.prize} width={300} height={200} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                  <div className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-bold text-md w-full">
                                    {w.prize}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        return (
                          <div key={group.name} className="flex flex-wrap justify-center gap-4">
                            {group.winners.map((w, i) => (
                              <motion.div
                                key={`prize${tierIndex}-${i}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: baseDelay + i * 0.1 }}
                                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 border border-white/10 w-full md:w-[300px]"
                              >
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                                  {w.employee.avatar ? (
                                    <img src={w.employee.avatar} alt={w.employee.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-6 h-6 text-white/70" />
                                  )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <h3 className="text-lg font-bold text-white truncate">{w.employee.name}</h3>
                                  <p className="text-red-400 font-medium text-xs truncate">{w.prize}</p>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })()
            )}

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-20 mb-10 flex gap-4"
            >
              <button 
                onClick={() => setAppState('train')}
                className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                BACK TO DRAW
              </button>
              <button 
                onClick={restartEvent}
                className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white bg-[#E60000] hover:bg-red-600 transition-colors"
              >
                <RotateCcw className="w-5 h-5" /> RESET WINNERS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParticipantsDialog
        isOpen={showParticipantsDialog}
        onClose={() => setShowParticipantsDialog(false)}
        participants={reelEmployees}
        showBirthdayDetails={mode === 'birthday'}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
