import { useCallback, useEffect, useState } from 'react';
import RankTab from './RankTab';
import AssignTab from './AssignTab';
import { getResult, isShared, listRankings } from './api';
import type { Ranking, Result } from './types';

const PIN = (import.meta.env.VITE_ADMIN_PIN as string | undefined) ?? '';

export default function App() {
  const [tab, setTab] = useState<'rank' | 'assign'>('rank');
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => !PIN || sessionStorage.getItem('ws_admin') === '1');

  const refresh = useCallback(async () => {
    try {
      const [r, res] = await Promise.all([listRankings(), getResult()]);
      setRankings(r);
      setResult(res);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  function unlock() {
    if (pinInput === PIN) {
      sessionStorage.setItem('ws_admin', '1');
      setIsAdmin(true);
    }
  }

  return (
    <div className="wrap">
      <header>
        <h1>שיבוץ סדנאות · 3 סבבים</h1>
        <p>כל מנחה מדרג את הסדנאות מהכי רוצים עד הכי פחות, והמערכת בונה שלושה סבבים מאוזנים.</p>
      </header>

      {!isShared && (
        <div className="msg warn">
          לא הוגדר חיבור ל־Supabase, ולכן הנתונים נשמרים רק בדפדפן הזה. ראו את README להגדרה.
        </div>
      )}
      {error && <div className="msg bad">אין חיבור לשרת כרגע. מנסים שוב אוטומטית.</div>}

      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={tab === 'rank'} onClick={() => setTab('rank')}>הדירוג שלי</button>
        <button className="tab" role="tab" aria-selected={tab === 'assign'} onClick={() => setTab('assign')}>השיבוץ</button>
      </div>

      {tab === 'rank' && <RankTab rankings={rankings} onSaved={refresh} />}
      {tab === 'assign' && (
        <>
          <AssignTab rankings={rankings} result={result} isAdmin={isAdmin} onChanged={refresh} />
          {!isAdmin && (
            <div className="card">
              <h2>קוד מארגן</h2>
              <p className="sub">בניית השיבוץ והסרת דירוגים זמינות למארגן/ת בלבד.</p>
              <div className="row">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && unlock()}
                  placeholder="קוד"
                  style={{ maxWidth: 200 }}
                />
                <button className="btn" onClick={unlock}>כניסה</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
