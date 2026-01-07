"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface QuantitySelectorProps {
  onQuantityChange?: (quantity: number) => void;
}

// Generate array of numbers 1-100
const QUANTITY_OPTIONS = Array.from({ length: 100 }, (_, i) => i + 1);

export default function QuantitySelector({ onQuantityChange }: QuantitySelectorProps) {
  const [selectedQuantity, setSelectedQuantity] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (quantity: number) => {
    setSelectedQuantity(quantity);
    setIsOpen(false);
    onQuantityChange?.(quantity);
  };

  return (
    <div className="fixed bottom-[228px] right-[54px] z-50" ref={dropdownRef}>
      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute bottom-full left-1/2 mb-2 w-24 -translate-x-1/2 overflow-hidden rounded-lg border border-white/40 bg-slate-900/95 shadow-xl shadow-white/20 backdrop-blur-xl">
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-white/50">
            {QUANTITY_OPTIONS.map((quantity) => (
              <button
                key={quantity}
                onClick={() => handleSelect(quantity)}
                className="w-full px-4 py-2.5 text-center font-mono text-sm text-white transition-colors hover:bg-white/20"
              >
                {quantity}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selector button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-16 w-16 cursor-pointer items-center justify-center gap-1 rounded-full border border-white/40 bg-gradient-to-br from-white/20 to-white/10 shadow-lg shadow-white/20 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-white/40"
        title="Select Contract Quantity"
      >
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-white">{selectedQuantity}</span>
          <ChevronDown className={`h-3 w-3 text-white transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Tooltip */}
        <span className="absolute right-full mr-3 hidden whitespace-nowrap rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-xl group-hover:block">
          Contract Quantity
        </span>
      </button>
    </div>
  );
}
