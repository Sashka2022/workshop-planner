import { useState } from 'react';
import { PEOPLE, WORKSHOPS } from './workshops';
import { buildResult } from './solver';
import { deleteRanking, saveResult } from './api';
import type { Ranking, Result } from './types';

interface Props {
  rankings: Ranking[];
  result: Result | null;
  isAdmin: boolean;
  onChanged: () => void;
}

type Msg = { kind: 'ok' | 'warn' | 'bad'; text: string } | null;

export default function AssignTab({ rankings, result, isAdmin, onChanged }: Props) {
  const [cap, setCap] = useState(2);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const n = rankings.length;
  const sorted = rankings.slice().sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const status: Msg = !isAdmin
    ? null
    : n < PEOPLE
      ? { kind: 'warn', text: `מחכים לעוד ${PEOPLE - n} מנחים לפני שאפשר לבנות שיבוץ.` }
      : n > PEOPLE
        ? { kind: 'bad', text: `יש יותר מ־${PEOPLE} דירוגים. יש להסיר את העודפים.` }
        : { kind: 'ok', text: `כל ${PEOPLE} המנחים דירגו. אפשר לבנות את השיבוץ.` };

  async function run() {
    setBusy(true);
    setMsg({ kind: 'warn', text: 'בונים את השיבוץ, זה לוקח כמה שניות.' });
    await new Promise((r) => setTimeout(r, 60));
    const res = buildResult(rankings, cap);
    try {
      await saveResult(res);
      setMsg(res.ok ? { kind: 'ok', text: 'השיבוץ מוכן.' } : { kind: 'bad', text: 'לא נמצא שיבוץ שעומד בכל התנאים. כדאי לנסות שוב או לאפשר 3 סבבים לסדנה.' });
      onChanged();
    } catch {
      setMsg({ kind: 'bad', text: 'השיבוץ נבנה אבל לא נשמר. בדקו את החיבור ל־Supabase.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteRanking(id);
      onChanged();
    } catch {
      setMsg({ kind: 'bad', text: 'ההסרה לא הצליחה.' });
    }
  }

  async function copy() {
    if (!result) return;
    let t = '';
    result.rounds.forEach((boxes, ri) => {
      t += `סבב ${ri + 1}\n`;
      boxes.forEach((b) => (t += `· ${WORKSHOPS[b.w]}: ${b.people.map((p) => p.name).join(', ')}\n`));
      t += '\n';
    });
    try {
      await navigator.clipboard.writeText(t.trim());
      setCopied('הועתק.');
    } catch {
      setCopied('ההעתקה נחסמה בדפדפן.');
    }
  }

  const names = result ? result.rounds[0].flatMap((b) => b.people.map((p) => p.name)).sort((a, b) => a.localeCompare(b, 'he')) : [];

  return (
    <>
      <div className="card">
        <h2>מי דירג</h2>
        <p className="sub">{n} מתוך {PEOPLE} מנחים דירגו</p>
        <div className="progress"><i style={{ width: Math.min(100, (n / PEOPLE) * 100) + '%' }} /></div>
        <ul className="people">
          {sorted.length === 0 && <li><span className="po">עדיין אין דירוגים.</span></li>}
          {sorted.map((r) => (
            <li key={r.id}>
              <div>
                <div className="pn">{r.name}</div>
                <div className="po">בחירה ראשונה: {WORKSHOPS[r.order[0]]}</div>
              </div>
              {isAdmin && <button className="btn danger small" onClick={() => remove(r.id)}>הסרה</button>}
            </li>
          ))}
        </ul>

        {isAdmin && (
          <div style={{ marginTop: 16 }}>
            <div className="row">
              <label htmlFor="cap">מספר סבבים מקסימלי לכל סדנה</label>
              <select id="cap" value={cap} onChange={(e) => setCap(parseInt(e.target.value, 10))}>
                <option value={2}>2 (מומלץ, יותר גיוון)</option>
                <option value={3}>3</option>
              </select>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" disabled={n !== PEOPLE || busy} onClick={run}>בניית השיבוץ</button>
            </div>
            <p className="note">
              יש 6 סדנאות ו־9 מקומות בשלושת הסבבים, ולכן חלק מהסדנאות ירוצו בשני סבבים עם משתתפים שונים. בכל סבב 3 סדנאות,
              ובכל סדנה 3 מנחים.
            </p>
          </div>
        )}
        {(msg ?? status) && <div className={'msg ' + (msg ?? status)!.kind}>{(msg ?? status)!.text}</div>}
      </div>

      {result && (
        <>
          <div className="stats">
            <div className="stat"><b>{result.avg}</b><span>דירוג ממוצע של הסדנאות ששובצו (1 הוא הכי רוצים)</span></div>
            <div className="stat"><b>{result.top3} מתוך {result.total}</b><span>שיבוצים ב־3 הבחירות הראשונות</span></div>
            <div className="stat"><b>{result.worst}</b><span>הבחירה הנמוכה ביותר שקרתה</span></div>
          </div>
          {result.rounds.map((boxes, ri) => (
            <div className="card round" key={ri}>
              <h3>סבב {ri + 1}</h3>
              <div className="rgrid">
                {boxes.map((b) => (
                  <div className="rbox" key={b.w}>
                    <h4>{WORKSHOPS[b.w]}</h4>
                    <ul>
                      {b.people.map((p) => (
                        <li key={p.name}>
                          <span>{p.name}</span>
                          <span className={'tag r' + p.rank}>בחירה {p.rank}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="card">
            <h2>לפי מנחה</h2>
            <div className="scroll">
              <table>
                <thead><tr><th>מנחה</th><th>סבב 1</th><th>סבב 2</th><th>סבב 3</th></tr></thead>
                <tbody>
                  {names.map((nm) => (
                    <tr key={nm}>
                      <td>{nm}</td>
                      {result.rounds.map((boxes, ri) => {
                        const hit = boxes.find((b) => b.people.some((p) => p.name === nm));
                        return <td key={ri}>{hit ? WORKSHOPS[hit.w] : ''}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn ghost" onClick={copy}>העתקת השיבוץ כטקסט</button>
            </div>
            {copied && <div className="msg ok">{copied}</div>}
          </div>
        </>
      )}
    </>
  );
}
