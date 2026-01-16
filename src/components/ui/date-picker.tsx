'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  className
}: DatePickerProps) {
  const parseDateLocal = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? parseDateLocal(value) : null
  );

  useEffect(() => {
    if (value) {
      const parsed = parseDateLocal(value);
      setSelectedDate(parsed);
      setCurrentMonth(parsed);
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    const formatted = formatDateLocal(newDate);
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
    const formatted = formatDateLocal(today);
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedDate(null);
    onChange('');
    setIsOpen(false);
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = formatDateLocal(date);

    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);

  // Ref for the trigger button to calculate position
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Update position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const calendarHeight = 420; // Approximate height of calendar
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // Position above if not enough space below
      const shouldPositionAbove = spaceBelow < calendarHeight && spaceAbove > spaceBelow;

      setPosition({
        top: shouldPositionAbove ? rect.top - calendarHeight - 8 : rect.bottom + 8,
        left: rect.left
      });
    }
  }, [isOpen]);

  // Handle scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, { capture: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  const calendarContent = (
    <>
      <div
        className="fixed inset-0 z-[99]"
        onClick={() => setIsOpen(false)}
      />
      <div
        className="fixed z-[100]"
        style={{ top: position.top, left: position.left }}
      >
        <div className="backdrop-blur-xl bg-popover/95 border border-border rounded-2xl p-5 shadow-2xl min-w-[320px] max-w-[320px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-4 py-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-all"
              >
                <span className="text-foreground font-semibold text-sm">
                  {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </span>
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl hover:bg-muted active:bg-muted/80 transition-all"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {DAYS.map((day, index) => (
              <div
                key={index}
                className="text-center text-xs text-muted-foreground font-semibold py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="aspect-square" />;
              }

              const disabled = isDateDisabled(day);
              const selected = isDateSelected(day);
              const today = isToday(day);

              return (
                <button
                  key={index}
                  onClick={() => !disabled && handleDateSelect(day)}
                  disabled={disabled}
                  className={cn(
                    "aspect-square rounded-xl text-sm font-medium transition-all duration-200",
                    "hover:bg-muted active:scale-95",
                    disabled && "opacity-25 cursor-not-allowed",
                    selected && "bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 hover:bg-primary",
                    !selected && !disabled && "text-foreground hover:bg-muted",
                    today && !selected && !disabled && "border-2 border-primary/40 bg-primary/5"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-[#00FF85] hover:text-[#00FF85]/90 hover:bg-[#00FF85]/10 rounded-xl transition-all font-medium active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm text-[#00FF85] hover:text-[#00FF85]/90 hover:bg-[#00FF85]/10 rounded-xl transition-all font-medium active:scale-95"
            >
              Today
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className={cn('relative inline-block', className)} ref={triggerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          "hover:bg-muted/50 active:bg-muted text-left",
          isOpen && "bg-muted text-foreground ring-1 ring-border shadow-sm",
          !isOpen && "text-muted-foreground hover:text-foreground"
        )}
      >
        <CalendarIcon className={cn("w-4 h-4", isOpen && "text-[#00FF85]")} />
        <span className="text-sm font-medium">
          {value ? formatDisplayDate(parseDateLocal(value)) : placeholder}
        </span>
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(calendarContent, document.body)}
    </div>
  );
}
