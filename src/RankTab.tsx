import { useEffect, useState } from 'react';
import { WORKSHOPS, W } from './workshops';
import { idFor, saveRanking } from './api';
import type { Ranking } from './types';

interface Props {
  rankings: Ranking[];
  onSaved: () => void;
}

type Msg = { kind: 'ok' | 'warn' | 'bad'; text: string } | null;

export default function RankTab({ rankings, onSaved }: Props) {
  const [name, setName] = useState(() => localStorage.getItem('ws_name') ?? '');
  const [picks, setPicks] = useState<number[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Load an existing ranking when the typed name matches one.
  useEffect(() => {
    if (!name.trim()) return;
    const id = idFor(name);
    if (id === loadedId) return;
    const ex = rankings.find((r) => r.id === id);
    if (ex) {
      setPicks(ex.order.slice());
      setLoadedId(id);
      setMsg({ kind: 'ok', text: 'נמצא דירוג קיים בשם הזה. אפשר לעדכן אותו ולשלוח שוב.' });
    }
  }, [name, rankings, loadedId]);

  const toggle = (i: number) =>
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const canSubmit = picks.length === W && name.trim().length > 1 && !busy;

  async function submit() {
    const clean = name.trim().replace(/\s+/g, ' ');
    setBusy(true);
    try {
      await saveRanking(clean, picks);
      try {
        localStorage.setItem('ws_name', clean);
      } catch {
        /* ignore */
      }
      setMsg({ kind: 'ok', text: `הדירוג נשמר. תודה, ${clean}.` });
      onSaved();
    } catch {
      setMsg({ kind: 'bad', text: 'השמירה לא הצליחה. כדאי לנסות שוב בעוד רגע.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>הדירוג שלי</h2>
      <p className="sub">
        הקישו על הסדנאות לפי הסדר: הראשונה שתקישו היא זו שהכי רוצים להיות בה, האחרונה היא הכי פחות. הקשה נוספת מסירה
        סדנה מהדירוג.
      </p>
      <label className="f" htmlFor="name">שם</label>
      <input
        id="name"
        type="text"
        autoComplete="off"
        placeholder="שם פרטי ושם משפחה"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid" style={{ marginTop: 16 }}>
        {WORKSHOPS.map((w, i) => {
          const pos = picks.indexOf(i);
          return (
            <button key={w} className={'ws' + (pos >= 0 ? ' on' : '')} onClick={() => toggle(i)}>
              <span className="badge">{pos >= 0 ? pos + 1 : ''}</span>
              <span>{w}</span>
            </button>
          );
        })}
      </div>
      <div className="ends"><span>הכי רוצים</span><span>הכי פחות</span></div>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" disabled={!canSubmit} onClick={submit}>שליחת הדירוג</button>
        <button className="btn ghost" onClick={() => { setPicks([]); setLoadedId(null); setMsg(null); }}>איפוס</button>
      </div>
      {msg && <div className={'msg ' + msg.kind}>{msg.text}</div>}
      <p className="note">אפשר לחזור, להקליד את אותו שם ולעדכן את הדירוג עד שהשיבוץ יוצא.</p>
    </div>
  );
}
