import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from '../../store/queryStore';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const presets = [
    { label: '过去24小时', start: now - oneDayMs, end: now },
    { label: '过去7天', start: now - 7 * oneDayMs, end: now },
    { label: '过去30天', start: now - 30 * oneDayMs, end: now },
    { label: '过去90天', start: now - 90 * oneDayMs, end: now },
  ];

  const handlePreset = (range: DateRange) => {
    onChange(range);
    setIsOpen(false);
  };

  const startDate = format(new Date(value.start), 'yyyy-MM-dd HH:mm');
  const endDate = format(new Date(value.end), 'yyyy-MM-dd HH:mm');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      >
        <Calendar className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">{startDate.split(' ')[0]}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-semibold">开始时间</label>
              <input
                type="datetime-local"
                value={new Date(value.start).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const newStart = new Date(e.target.value).getTime();
                  if (newStart < value.end) {
                    onChange({ ...value, start: newStart });
                  }
                }}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold">结束时间</label>
              <input
                type="datetime-local"
                value={new Date(value.end).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const newEnd = new Date(e.target.value).getTime();
                  if (newEnd > value.start) {
                    onChange({ ...value, end: newEnd });
                  }
                }}
                className="w-full mt-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
              />
            </div>

            <div className="pt-2 border-t border-gray-700">
              <p className="text-xs text-gray-400 font-semibold mb-2">快速预设</p>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset({ start: preset.start, end: preset.end })}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
