#!/usr/bin/env node
// Holt WM-2026-Ergebnisse von football-data.org und schreibt sie in Firebase.
// Wird täglich via GitHub Actions ausgeführt.

const https = require('https');

// ─── TEAM-MAPPING: football-data.org-Englisch → Deutsch ──────────────────────
const EN_TO_DE = {
  'Mexico':'Mexiko', 'South Korea':'Südkorea', 'South Africa':'Südafrika',
  'Czech Republic':'Tschechien', 'Czechia':'Tschechien',
  'Canada':'Kanada', 'Switzerland':'Schweiz', 'Qatar':'Katar',
  'Bosnia & Herzegovina':'Bosnien-Herzegowina',
  'Bosnia and Herzegovina':'Bosnien-Herzegowina',
  'Bosnia-Herzegovina':'Bosnien-Herzegowina',
  'Brazil':'Brasilien', 'Morocco':'Marokko', 'Scotland':'Schottland', 'Haiti':'Haiti',
  'USA':'USA', 'United States':'USA', 'Paraguay':'Paraguay',
  'Australia':'Australien', 'Turkey':'Türkei', 'Türkiye':'Türkei',
  'Germany':'Deutschland',
  'Ivory Coast':'Elfenbeinküste', "Côte d'Ivoire":'Elfenbeinküste',
  'Ecuador':'Ecuador', 'Curaçao':'Curaçao', 'Curacao':'Curaçao',
  'Netherlands':'Niederlande', 'Japan':'Japan', 'Tunisia':'Tunesien', 'Sweden':'Schweden',
  'Belgium':'Belgien', 'Egypt':'Ägypten', 'Iran':'Iran', 'New Zealand':'Neuseeland',
  'Spain':'Spanien',
  'Cape Verde':'Kap Verde', 'Cabo Verde':'Kap Verde',
  'Saudi Arabia':'Saudi-Arabien', 'Uruguay':'Uruguay',
  'France':'Frankreich', 'Senegal':'Senegal', 'Iraq':'Irak', 'Norway':'Norwegen',
  'Argentina':'Argentinien', 'Austria':'Österreich', 'Algeria':'Algerien', 'Jordan':'Jordanien',
  'Portugal':'Portugal', 'Colombia':'Kolumbien', 'Uzbekistan':'Usbekistan',
  'DR Congo':'DR Kongo', 'Congo DR':'DR Kongo', 'Democratic Republic of Congo':'DR Kongo',
  'England':'England', 'Croatia':'Kroatien', 'Ghana':'Ghana', 'Panama':'Panama',
};

// ─── ALLE 72 GRUPPENSPIELE (gespiegelt aus index.html) ────────────────────────
const GROUPS = {
  A:['Mexiko','Südkorea','Südafrika','Tschechien'],
  B:['Kanada','Schweiz','Katar','Bosnien-Herzegowina'],
  C:['Brasilien','Marokko','Schottland','Haiti'],
  D:['USA','Paraguay','Australien','Türkei'],
  E:['Deutschland','Elfenbeinküste','Ecuador','Curaçao'],
  F:['Niederlande','Japan','Tunesien','Schweden'],
  G:['Belgien','Ägypten','Iran','Neuseeland'],
  H:['Spanien','Kap Verde','Saudi-Arabien','Uruguay'],
  I:['Frankreich','Senegal','Irak','Norwegen'],
  J:['Argentinien','Österreich','Algerien','Jordanien'],
  K:['Portugal','Kolumbien','Usbekistan','DR Kongo'],
  L:['England','Kroatien','Ghana','Panama'],
};
const MATCH_DATES = {
  'Mexiko|Südafrika':'2026-06-11',
  'Südkorea|Tschechien':'2026-06-12','Kanada|Bosnien-Herzegowina':'2026-06-12',
  'USA|Paraguay':'2026-06-13','Katar|Schweiz':'2026-06-13','Brasilien|Marokko':'2026-06-14',
  'Haiti|Schottland':'2026-06-14','Australien|Türkei':'2026-06-14','Deutschland|Curaçao':'2026-06-14','Niederlande|Japan':'2026-06-14',
  'Elfenbeinküste|Ecuador':'2026-06-15','Schweden|Tunesien':'2026-06-15','Spanien|Kap Verde':'2026-06-15','Belgien|Ägypten':'2026-06-15','Saudi-Arabien|Uruguay':'2026-06-16',
  'Iran|Neuseeland':'2026-06-16','Frankreich|Senegal':'2026-06-16','Irak|Norwegen':'2026-06-17',
  'Argentinien|Algerien':'2026-06-17','Österreich|Jordanien':'2026-06-17','Portugal|DR Kongo':'2026-06-17','England|Kroatien':'2026-06-17',
  'Ghana|Panama':'2026-06-18','Usbekistan|Kolumbien':'2026-06-18','Tschechien|Südafrika':'2026-06-18','Schweiz|Bosnien-Herzegowina':'2026-06-18','Kanada|Katar':'2026-06-19',
  'Mexiko|Südkorea':'2026-06-19','USA|Australien':'2026-06-19','Schottland|Marokko':'2026-06-20',
  'Brasilien|Haiti':'2026-06-20','Türkei|Paraguay':'2026-06-20','Niederlande|Schweden':'2026-06-20','Deutschland|Elfenbeinküste':'2026-06-20',
  'Ecuador|Curaçao':'2026-06-21','Tunesien|Japan':'2026-06-21','Spanien|Saudi-Arabien':'2026-06-21','Belgien|Iran':'2026-06-21','Uruguay|Kap Verde':'2026-06-21',
  'Neuseeland|Ägypten':'2026-06-22','Argentinien|Österreich':'2026-06-22','Frankreich|Irak':'2026-06-22',
  'Norwegen|Senegal':'2026-06-23','Jordanien|Algerien':'2026-06-23','Portugal|Usbekistan':'2026-06-23','England|Ghana':'2026-06-23',
  'Panama|Kroatien':'2026-06-24','Kolumbien|DR Kongo':'2026-06-24','Schweiz|Kanada':'2026-06-24','Bosnien-Herzegowina|Katar':'2026-06-24','Marokko|Haiti':'2026-06-24','Schottland|Brasilien':'2026-06-24',
  'Südafrika|Südkorea':'2026-06-25','Tschechien|Mexiko':'2026-06-25','Curaçao|Elfenbeinküste':'2026-06-25','Ecuador|Deutschland':'2026-06-25',
  'Tunesien|Niederlande':'2026-06-26','Japan|Schweden':'2026-06-26','Türkei|USA':'2026-06-26','Paraguay|Australien':'2026-06-26','Norwegen|Frankreich':'2026-06-26','Senegal|Irak':'2026-06-26',
  'Kap Verde|Saudi-Arabien':'2026-06-27','Uruguay|Spanien':'2026-06-27','Neuseeland|Belgien':'2026-06-27','Ägypten|Iran':'2026-06-27','Panama|England':'2026-06-27','Kroatien|Ghana':'2026-06-27',
  'Kolumbien|Portugal':'2026-06-28','DR Kongo|Usbekistan':'2026-06-28','Algerien|Österreich':'2026-06-28','Jordanien|Argentinien':'2026-06-28',
};

// Gleiche Paarungen wie in index.html aufbauen
const MATCHES = [];
let id = 1;
const pairs = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
Object.entries(GROUPS).forEach(([g, teams]) => {
  pairs.forEach(([a, b]) => {
    const t1 = teams[a], t2 = teams[b];
    const date = MATCH_DATES[`${t1}|${t2}`] || MATCH_DATES[`${t2}|${t1}`] || null;
    MATCHES.push({ id: id++, group: g, t1, t2, date });
  });
});

// ─── UTILS ───────────────────────────────────────────────────────────────────
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function firebasePatch(path, payload) {
  const dbUrl = (process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DB_URL).replace(/\/$/, '');
  const secret = process.env.FIREBASE_DB_SECRET;
  const body = Buffer.from(JSON.stringify(payload));
  const url = new URL(`${dbUrl}${path}.json?auth=${secret}`);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  const dbUrl  = process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DB_URL;
  const secret = process.env.FIREBASE_DB_SECRET;
  if (!apiKey || !dbUrl || !secret) {
    console.error('Fehlende Umgebungsvariablen: FOOTBALL_API_KEY, FIREBASE_DATABASE_URL, FIREBASE_DB_SECRET');
    process.exit(1);
  }

  // WM 2026 Spiele von football-data.org holen
  console.log('Lade Spielergebnisse von football-data.org…');
  const { status, body } = await fetchJson(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { 'X-Auth-Token': apiKey }
  );
  if (status !== 200) {
    console.error(`API Fehler ${status}:`, JSON.stringify(body).slice(0, 300));
    process.exit(1);
  }

  const finished = (body.matches || []).filter(m => m.status === 'FINISHED');
  console.log(`${finished.length} abgeschlossene Spiele gefunden.`);

  const newResults = {};
  const unmapped = [];

  for (const m of finished) {
    const homeName = m.homeTeam?.name || m.homeTeam?.shortName || '';
    const awayName = m.awayTeam?.name || m.awayTeam?.shortName || '';
    const t1_de = EN_TO_DE[homeName];
    const t2_de = EN_TO_DE[awayName];

    if (!t1_de || !t2_de) {
      unmapped.push(`${homeName} vs ${awayName}`);
      continue;
    }

    // Passendes Spiel in unserer Liste finden (beide Richtungen prüfen)
    const ourMatch =
      MATCHES.find(x => x.t1 === t1_de && x.t2 === t2_de) ||
      MATCHES.find(x => x.t1 === t2_de && x.t2 === t1_de);

    if (!ourMatch) {
      unmapped.push(`${t1_de} vs ${t2_de} (kein Match-Eintrag)`);
      continue;
    }

    // Für Gruppenspiele reicht das reguläre Ergebnis (90 min)
    const score = m.score?.fullTime;
    if (score?.home == null || score?.away == null) continue;

    // Ggf. Heimteam/Auswärtsteam tauschen wenn unsere Reihenfolge anders ist
    const swapped = ourMatch.t1 === t2_de;
    newResults[String(ourMatch.id)] = {
      g1: swapped ? score.away : score.home,
      g2: swapped ? score.home : score.away,
    };
  }

  if (unmapped.length) {
    console.warn('⚠ Nicht gemappte Spiele:', unmapped.join(', '));
  }

  if (Object.keys(newResults).length === 0) {
    console.log('Keine neuen Ergebnisse zum Speichern.');
    return;
  }

  console.log(`Schreibe ${Object.keys(newResults).length} Ergebnisse in Firebase…`);
  const res = await firebasePatch('/wm2026/results', newResults);
  if (res.status === 200) {
    console.log('✅ Ergebnisse erfolgreich gespeichert.');
    for (const [id, r] of Object.entries(newResults)) {
      const match = MATCHES.find(x => String(x.id) === id);
      console.log(`  #${id} ${match?.t1} ${r.g1}:${r.g2} ${match?.t2}`);
    }
  } else {
    console.error(`Firebase-Fehler ${res.status}:`, res.body.slice(0, 200));
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
