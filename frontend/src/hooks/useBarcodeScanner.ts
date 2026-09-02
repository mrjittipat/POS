import { useEffect, useRef } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeout?: number;
}

/**
 * Hook to detect barcode scanner input globally
 * Barcode scanners typically type very fast and end with Enter
 */
export function useBarcodeScanner({ onScan, minLength = 3, timeout = 100 }: BarcodeScannerOptions) {
  const bufferRef = useRef('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (except for POS-specific inputs)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isPosSearchInput = target.classList.contains('barcode-scan-enabled');

      if (isInput && !isPosSearchInput) {
        return;
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Enter key means scan complete
      if (e.key === 'Enter') {
        e.preventDefault();
        const scanned = bufferRef.current.trim();

        // Convert Thai keyboard layout to English digits (e.g., ๅ/-=... → 1/2/3...)
        // Thai keyboard top row: ๅ/- ภ ถ ุ ึ ค ต จ ข ช
        // English equivalent:     1 2 3 4 5 6 7 8 9 0
        const thaiToEnglishMap: Record<string, string> = {
          'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5',
          'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0',
          '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
          '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
        };

        let normalized = '';
        for (const char of scanned) {
          normalized += thaiToEnglishMap[char] || char;
        }

        if (normalized.length >= minLength) {
          onScan(normalized);
        }
        bufferRef.current = '';
        return;
      }

      // Accumulate characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // Auto-reset buffer after timeout (in case scan didn't end with Enter)
      timeoutRef.current = window.setTimeout(() => {
        const scanned = bufferRef.current.trim();

        // Convert Thai keyboard layout to English digits
        const thaiToEnglishMap: Record<string, string> = {
          'ๅ': '1', '/': '2', '-': '3', 'ภ': '4', 'ถ': '5',
          'ุ': '6', 'ึ': '7', 'ค': '8', 'ต': '9', 'จ': '0',
          '๐': '0', '๑': '1', '๒': '2', '๓': '3', '๔': '4',
          '๕': '5', '๖': '6', '๗': '7', '๘': '8', '๙': '9',
        };

        let normalized = '';
        for (const char of scanned) {
          normalized += thaiToEnglishMap[char] || char;
        }

        if (normalized.length >= minLength) {
          onScan(normalized);
        }
        bufferRef.current = '';
      }, timeout);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onScan, minLength, timeout]);
}
