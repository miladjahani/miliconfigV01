import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/types';

interface LogProps {
  entries: LogEntry[];
}

export function DeployLog({ entries }: LogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);

  return (
    <div className="mc-log" ref={ref} role="log" aria-live="polite">
      {entries.map((e) => (
        <div key={e.id} className="ln">
          <span className="tm">{e.time}</span>
          <span className={e.level}>
            {e.text}
            {e.caret && <span className="caret" />}
          </span>
        </div>
      ))}
    </div>
  );
}

export function useLog() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const idRef = useRef(0);

  function clear() {
    setEntries([]);
  }

  function add(text: string, level: LogEntry['level'] = 'step'): number {
    const id = ++idRef.current;
    const now = new Date();
    const time =
      ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2) + ':' +
      ('0' + now.getSeconds()).slice(-2);
    setEntries((prev) => [...prev, { id, time, text, level }]);
    return id;
  }

  function addCaret(): void {
    setEntries((prev) => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1], caret: true };
      return [...prev.slice(0, -1), last];
    });
  }

  function removeCaret(): void {
    setEntries((prev) => prev.map((e) => ({ ...e, caret: false })));
  }

  function markOk(id: number, okText: string, elapsed: number): void {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, level: 'ok', text: `✓ ${okText} (${elapsed}ms)`, caret: false } : e
      )
    );
  }

  function timed(label: string): { done: () => void } {
    const id = add(`› ${label}…`, 'step');
    addCaret();
    const t0 = Date.now();
    return {
      done: () => markOk(id, label, Date.now() - t0),
    };
  }

  function logErr(text: string) {
    add(`✗ ${text}`, 'err');
    removeCaret();
  }

  function logWarn(text: string) {
    add(`⚠ ${text}`, 'warn');
  }

  function logOk(text: string) {
    add(`✓ ${text}`, 'ok');
  }

  function logStep(text: string) {
    add(`› ${text}`, 'step');
  }

  return { entries, clear, add, addCaret, removeCaret, timed, logErr, logWarn, logOk, logStep };
}
