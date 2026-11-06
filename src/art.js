/* ===== Original stylized hero emblems (not official artwork) =====
   Each is drawn in a 100x100 box with white strokes/fills.
   To add a hero, add an emblem here keyed by hero id. */
const SV = 'fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"';
const EMBLEMS = {
  reinhardt: `<path d="M44 30h12v52a6 6 0 0 1-12 0z" fill="#fff"/><rect x="18" y="14" width="64" height="26" rx="5" fill="#fff"/><path d="M26 22h48M26 32h48" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`,
  winston: `<circle cx="34" cy="50" r="15" ${SV} stroke-width="7"/><circle cx="66" cy="50" r="15" ${SV} stroke-width="7"/><path d="M49 48q1-4 2 0M19 46l-9-6M81 46l9-6" ${SV} stroke-width="6"/>`,
  dva: `<circle cx="50" cy="60" r="22" fill="#fff"/><path d="M36 44c-6-14-4-28 2-32 7 6 8 20 6 30M64 44c6-14 4-28-2-32-7 6-8 20-6 30" fill="#fff"/><circle cx="42" cy="58" r="3.5" fill="rgba(0,0,0,.35)"/><circle cx="58" cy="58" r="3.5" fill="rgba(0,0,0,.35)"/>`,
  doomfist: `<path d="M26 44q0-12 12-12h28q12 0 12 12v22q0 18-22 20H40q-14-2-14-16z" fill="#fff"/><path d="M40 32v18M53 32v18M66 34v16M26 56h52" stroke="rgba(0,0,0,.3)" stroke-width="4"/>`,
  roadhog: `<path d="M58 12v40a18 18 0 1 1-30-13" ${SV} stroke-width="9"/><path d="M22 34l6 6 7-8" ${SV} stroke-width="7"/><circle cx="58" cy="12" r="6" fill="#fff"/>`,
  sigma: `<circle cx="50" cy="50" r="16" fill="#fff"/><ellipse cx="50" cy="50" rx="38" ry="13" ${SV} stroke-width="5" transform="rotate(-25 50 50)"/><circle cx="82" cy="34" r="5" fill="#fff"/>`,
  soldier: `<path d="M14 44q36-16 72 0v14q-36-10-72 0z" fill="#fff"/><path d="M22 50q28-8 56 0" stroke="#ff4a3d" stroke-width="5" fill="none"/><text x="50" y="86" text-anchor="middle" font-family="Saira Condensed, sans-serif" font-weight="800" font-size="22" fill="#fff">76</text>`,
  cassidy: `<ellipse cx="50" cy="62" rx="40" ry="10" fill="#fff"/><path d="M30 60q0-30 20-30t20 30z" fill="#fff"/><path d="M31 52h38" stroke="rgba(0,0,0,.3)" stroke-width="5"/>`,
  genji: `<path d="M50 10l9 31 31 9-31 9-9 31-9-31-31-9 31-9z" fill="#fff"/><circle cx="50" cy="50" r="6" fill="rgba(0,0,0,.35)"/>`,
  tracer: `<circle cx="50" cy="50" r="30" ${SV} stroke-width="7"/><path d="M50 32v18l12 8" ${SV} stroke-width="7"/><path d="M12 20l14 0M8 32h12M12 44h8" ${SV} stroke-width="5"/>`,
  reaper: `<path d="M50 12c-22 0-32 18-30 38 2 18 14 34 30 38 16-4 28-20 30-38 2-20-8-38-30-38z" fill="#fff"/><path d="M30 46l14 6-14 6zM70 46l-14 6 14 6z" fill="rgba(0,0,0,.6)"/><path d="M50 60v18" stroke="rgba(0,0,0,.4)" stroke-width="4"/>`,
  pharah: `<path d="M50 8l12 30v32l12 14H26l12-14V38z" fill="#fff"/><path d="M42 88l8 8 8-8" ${SV} stroke-width="5"/><circle cx="50" cy="40" r="5" fill="rgba(0,0,0,.35)"/>`,
  junkrat: `<circle cx="50" cy="56" r="30" ${SV} stroke-width="9"/><circle cx="50" cy="56" r="8" fill="#fff"/><path d="M50 26V12q10-4 16 6" ${SV} stroke-width="5"/><path d="M68 14l6-4M70 20l8 0" ${SV} stroke-width="3"/>`,
  sojourn: `<path d="M58 8L26 54h22l-8 38 34-50H52z" fill="#fff"/>`,
  bob: `<rect x="30" y="14" width="40" height="6" rx="2" fill="#fff"/><path d="M36 14q0-10 14-10t14 10z" fill="#fff"/><circle cx="50" cy="38" r="16" fill="#fff"/><rect x="38" y="33" width="24" height="6" rx="3" fill="#000" opacity=".55"/><path d="M40 46q10 6 20 0" ${SV} stroke="#000" opacity=".5" stroke-width="3"/><path d="M24 58q26-10 52 0l-6 34H30z" fill="#fff"/><path d="M24 58l-10 22M76 58l10 22" ${SV} stroke-width="8"/>`,
  ashe: `<path d="M18 36h64v8H18z" fill="#fff"/><path d="M30 36q0-22 20-22t20 22z" fill="#fff"/><rect x="30" y="58" width="10" height="30" rx="2" fill="#fff"/><rect x="45" y="58" width="10" height="30" rx="2" fill="#fff"/><rect x="60" y="58" width="10" height="30" rx="2" fill="#fff"/><path d="M50 58q0-8 8-10" ${SV} stroke-width="3"/>`,
  sombra: `<path d="M50 14c-20 0-30 14-30 30 0 12 6 18 12 22v12h36V66c6-4 12-10 12-22 0-16-10-30-30-30z" fill="#fff"/><circle cx="39" cy="46" r="7" fill="rgba(0,0,0,.55)"/><circle cx="61" cy="46" r="7" fill="rgba(0,0,0,.55)"/><path d="M42 70v8M50 70v8M58 70v8" stroke="rgba(0,0,0,.4)" stroke-width="3"/>`,
  mei: `<g ${SV} stroke-width="6"><path d="M50 12v76M17 31l66 38M17 69l66-38"/><path d="M40 18l10 8 10-8M40 82l10-8 10 8M16 44l12-2 0-12M84 56l-12 2 0 12M16 56l12 2 0 12M84 44l-12-2 0-12"/></g>`,
  symmetra: `<path d="M50 12l38 66H12z" ${SV} stroke-width="6"/><path d="M50 36l17 30H33z" fill="#fff"/>`,
  echo: `<path d="M50 20l18 10v22l-18 10-18-10V30z" fill="#fff"/><path d="M30 36q-18 4-22 26 14-6 22-6M70 36q18 4 22 26-14-6-22-6" fill="#fff"/><path d="M50 66v20" ${SV} stroke-width="5"/>`,
  mercy: `<path d="M50 30v40M30 50h40" stroke="#fff" stroke-width="12"/><path d="M38 40C24 22 10 22 6 26c8 2 14 8 18 16-8-2-14 0-18 4 10 0 16 4 20 8M62 40c14-18 28-18 32-14-8 2-14 8-18 16 8-2 14 0 18 4-10 0-16 4-20 8" fill="#fff"/>`,
  brigitte: `<circle cx="42" cy="54" r="26" fill="#fff"/><circle cx="42" cy="54" r="12" fill="rgba(0,0,0,.25)"/><path d="M64 34l14-14" ${SV} stroke-width="5"/><circle cx="82" cy="16" r="8" fill="#fff"/>`,
  ana: `<path d="M12 46q38-26 76 0-38 26-76 0z" fill="#fff"/><circle cx="50" cy="46" r="10" fill="rgba(0,0,0,.5)"/><path d="M40 60q-2 14-12 24M58 60l12 22" ${SV} stroke-width="5"/>`,
  zenyatta: `<circle cx="50" cy="50" r="12" fill="#fff"/><g fill="#fff"><circle cx="50" cy="18" r="6"/><circle cx="78" cy="34" r="6"/><circle cx="78" cy="66" r="6"/><circle cx="50" cy="82" r="6"/><circle cx="22" cy="66" r="6"/><circle cx="22" cy="34" r="6"/></g>`,
  moira: `<circle cx="50" cy="50" r="32" ${SV} stroke-width="5"/><path d="M50 18a16 16 0 0 1 0 32 16 16 0 0 0 0 32 32 32 0 0 1 0-64z" fill="#fff"/><circle cx="50" cy="34" r="5" fill="rgba(0,0,0,.4)"/><circle cx="50" cy="66" r="5" fill="#fff"/>`,
  baptiste: `<circle cx="50" cy="50" r="34" ${SV} stroke-width="6" stroke-dasharray="10 7"/><path d="M50 32v36M32 50h36" stroke="#fff" stroke-width="10"/>`,
};

Object.assign(EMBLEMS, {
  dva_baby: EMBLEMS.dva,
  dva: `<path d="M24 34q0-18 26-18t26 18v26q0 16-26 20-26-4-26-20z" fill="#fff"/><path d="M38 22c-4-8-2-14 2-16 4 4 4 10 3 14M62 22c4-8 2-14-2-16-4 4-4 10-3 14" fill="#fff"/><rect x="8" y="44" width="14" height="30" rx="5" fill="#fff"/><rect x="78" y="44" width="14" height="30" rx="5" fill="#fff"/><circle cx="50" cy="46" r="9" fill="rgba(0,0,0,.35)"/>`,
  orisa: `<path d="M50 8l8 70H42z" fill="#fff"/><path d="M50 4l10 18H40z" fill="#fff"/><circle cx="50" cy="50" r="30" ${SV} stroke-width="6" stroke-dasharray="14 8"/>`,
  zarya: `<circle cx="50" cy="50" r="34" ${SV} stroke-width="5"/><circle cx="50" cy="50" r="22" fill="#fff" opacity=".35"/><rect x="22" y="44" width="56" height="12" rx="4" fill="#fff"/><rect x="16" y="34" width="10" height="32" rx="3" fill="#fff"/><rect x="74" y="34" width="10" height="32" rx="3" fill="#fff"/>`,
  junkerqueen: `<path d="M18 62l8-34 14 18 10-26 10 26 14-18 8 34z" fill="#fff"/><rect x="18" y="66" width="64" height="10" rx="3" fill="#fff"/>`,
  hammond_unused: `<circle cx="50" cy="56" r="28" fill="#fff"/><circle cx="28" cy="32" r="10" fill="#fff"/><circle cx="72" cy="32" r="10" fill="#fff"/><circle cx="40" cy="52" r="4" fill="rgba(0,0,0,.5)"/><circle cx="60" cy="52" r="4" fill="rgba(0,0,0,.5)"/><ellipse cx="50" cy="64" rx="5" ry="3.5" fill="rgba(0,0,0,.4)"/>`,
  wreckingball: `<circle cx="46" cy="56" r="32" fill="#fff"/><path d="M14 56h64M46 24v64" stroke="rgba(0,0,0,.2)" stroke-width="4"/><path d="M70 30l18-20" ${SV} stroke-width="5"/><path d="M84 6l8 4-4 8" ${SV} stroke-width="4"/>`,
  ramattra: `<path d="M50 10l30 17v34L50 78 20 61V27z" fill="#fff"/><path d="M34 44h32" stroke="rgba(0,0,0,.55)" stroke-width="7" stroke-linecap="round"/><path d="M50 78v16" ${SV} stroke-width="6"/>`,
  mauga: `<rect x="10" y="30" width="36" height="14" rx="4" fill="#fff"/><rect x="54" y="30" width="36" height="14" rx="4" fill="#fff"/><rect x="10" y="56" width="36" height="14" rx="4" fill="#fff"/><rect x="54" y="56" width="36" height="14" rx="4" fill="#fff"/><path d="M46 37h8M46 63h8" stroke="#fff" stroke-width="6"/>`,
  hazard: `<path d="M50 8l8 28 26-12-16 24 24 14-28 2 6 28-20-20-20 20 6-28-28-2 24-14-16-24 26 12z" fill="#fff"/>`,
  hanzo: `<path d="M30 10q40 40 0 80" ${SV} stroke-width="6"/><path d="M30 10L30 90" stroke="#fff" stroke-width="2"/><path d="M26 50h62" ${SV} stroke-width="5"/><path d="M76 40l14 10-14 10" fill="#fff"/>`,
  widowmaker: `<circle cx="50" cy="50" r="30" ${SV} stroke-width="5"/><path d="M50 8v24M50 68v24M8 50h24M68 50h24" ${SV} stroke-width="5"/><path d="M50 40l6 10-6 10-6-10z" fill="#fff"/>`,
  bastion: `<rect x="18" y="38" width="46" height="34" rx="8" fill="#fff"/><rect x="62" y="48" width="30" height="12" rx="3" fill="#fff"/><circle cx="34" cy="55" r="7" fill="rgba(0,0,0,.4)"/><path d="M30 38q4-16 16-16 6 0 8 6" ${SV} stroke-width="5"/>`,
  torbjorn: `<rect x="22" y="58" width="56" height="14" rx="3" fill="#fff"/><path d="M30 72h40l-8 16H38z" fill="#fff"/><path d="M58 50L30 22" ${SV} stroke-width="7"/><rect x="18" y="12" width="22" height="16" rx="3" fill="#fff" transform="rotate(-45 29 20)"/>`,
  venture: `<path d="M50 92L30 44h40z" fill="#fff"/><rect x="30" y="20" width="40" height="22" rx="5" fill="#fff"/><path d="M36 54l28 6M40 66l20 5" stroke="rgba(0,0,0,.3)" stroke-width="4"/>`,
  freja: `<path d="M14 50h62" ${SV} stroke-width="6"/><path d="M76 38l16 12-16 12z" fill="#fff"/><path d="M20 18q30 32 0 64" ${SV} stroke-width="6"/><path d="M14 40l-6 10 6 10" ${SV} stroke-width="4"/>`,
  lucio: `<circle cx="50" cy="50" r="12" fill="#fff"/><path d="M30 30a28 28 0 0 0 0 40M70 30a28 28 0 0 1 0 40M20 20a42 42 0 0 0 0 60M80 20a42 42 0 0 1 0 60" ${SV} stroke-width="6"/>`,
  kiriko: `<path d="M20 14l18 22h24l18-22 2 40q-6 28-32 34-26-6-32-34z" fill="#fff"/><path d="M34 52l10 4M66 52l-10 4" stroke="rgba(180,0,30,.8)" stroke-width="5" stroke-linecap="round"/>`,
  lifeweaver: `<g fill="#fff"><ellipse cx="50" cy="28" rx="11" ry="20"/><ellipse cx="50" cy="72" rx="11" ry="20"/><ellipse cx="28" cy="50" rx="20" ry="11"/><ellipse cx="72" cy="50" rx="20" ry="11"/></g><circle cx="50" cy="50" r="10" fill="rgba(0,0,0,.25)"/>`,
  illari: `<circle cx="50" cy="50" r="18" fill="#fff"/><g ${SV} stroke-width="6"><path d="M50 8v14M50 78v14M8 50h14M78 50h14M20 20l10 10M70 70l10 10M80 20L70 30M30 70L20 80"/></g>`,
  juno: `<circle cx="50" cy="50" r="20" fill="#fff"/><ellipse cx="50" cy="50" rx="42" ry="12" ${SV} stroke-width="5" transform="rotate(20 50 50)"/><circle cx="84" cy="64" r="5" fill="#fff"/>`,
  wuyang: `<circle cx="50" cy="40" r="20" fill="#fff"/><path d="M8 72q10-10 21 0t21 0 21 0 21 0M8 86q10-10 21 0t21 0 21 0 21 0" ${SV} stroke-width="5"/>`,
});

Object.assign(EMBLEMS, {
  domina: `<path d="M50 8l36 14v28c0 22-16 36-36 42-20-6-36-20-36-42V22z" ${SV} stroke-width="6"/><path d="M50 26l20 8v16c0 12-9 20-20 24-11-4-20-12-20-24V34z" fill="#fff"/>`,
  dmon_baby: `<circle cx="50" cy="58" r="22" fill="#fff"/><path d="M30 40l-8-26 20 14M70 40l8-26-20 14" fill="#fff"/><circle cx="42" cy="56" r="3.5" fill="rgba(0,0,0,.35)"/><circle cx="58" cy="56" r="3.5" fill="rgba(0,0,0,.35)"/>`,
  dmon: `<path d="M26 34q0-18 24-18t24 18v26q0 16-24 20-24-4-24-20z" fill="#fff"/><path d="M30 22l-6-16 16 10M70 22l6-16-16 10" fill="#fff"/><path d="M82 16L64 74" ${SV} stroke-width="6"/><circle cx="50" cy="46" r="8" fill="rgba(0,0,0,.35)"/>`,
  vendetta: `<path d="M24 86L70 20l8 6-46 66z" fill="#fff"/><path d="M62 18l20 16" ${SV} stroke-width="7"/><path d="M20 80l12 10" ${SV} stroke-width="6"/>`,
  emre: `<rect x="14" y="40" width="58" height="16" rx="4" fill="#fff"/><rect x="72" y="44" width="16" height="8" fill="#fff"/><rect x="30" y="56" width="12" height="20" rx="3" fill="#fff"/><circle cx="24" cy="30" r="5" fill="#fff"/><circle cx="38" cy="26" r="5" fill="#fff"/><circle cx="52" cy="30" r="5" fill="#fff"/>`,
  anran: `<path d="M50 90c-22 0-30-18-24-34 4 8 10 10 12 10-6-14 2-34 16-46-2 14 10 20 14 32 2-6 2-10 0-14 10 8 12 18 10 28-4 16-14 24-28 24z" fill="#fff"/>`,
  sierra: `<path d="M50 14c12 10 22 6 30 2-2 16-10 26-30 30-20-4-28-14-30-30 8 4 18 8 30-2z" fill="#fff"/><circle cx="50" cy="66" r="18" ${SV} stroke-width="5"/><circle cx="50" cy="66" r="5" fill="#fff"/>`,
  shion: `<circle cx="26" cy="68" r="14" ${SV} stroke-width="6"/><circle cx="76" cy="68" r="14" ${SV} stroke-width="6"/><path d="M26 68l18-26h20l12 26M44 42l-6-12h12" ${SV} stroke-width="6"/>`,
  mizuki: `<path d="M12 46q38-34 76 0z" fill="#fff"/><path d="M50 46v42" ${SV} stroke-width="5"/><path d="M50 88q-10 0-10-8" ${SV} stroke-width="5"/>`,
  jetpackcat: `<path d="M26 40l4-24 14 16h12l14-16 4 24v14q0 22-24 26-24-4-24-26z" fill="#fff"/><circle cx="40" cy="50" r="4" fill="rgba(0,0,0,.45)"/><circle cx="60" cy="50" r="4" fill="rgba(0,0,0,.45)"/><path d="M34 86l-4 8M50 86v10M66 86l4 8" ${SV} stroke-width="4"/>`,
  doctrine: `<path d="M50 30c-8-14-22-18-40-12 8 6 10 14 8 22 8-4 16-2 22 6 2-8 6-12 10-16 4 4 8 8 10 16 6-8 14-10 22-6-2-8 0-16 8-22-18-6-32-2-40 12z" fill="#fff"/><path d="M50 46v44" ${SV} stroke-width="6"/><circle cx="50" cy="48" r="7" fill="#fff"/>`,
});

const ROLE_ICONS = {
  tank: `<svg viewBox="0 0 24 24"><path d="M12 2l9 3v6c0 6-4 10-9 11-5-1-9-5-9-11V5z" fill="currentColor"/></svg>`,
  damage: `<svg viewBox="0 0 24 24"><g fill="currentColor"><rect x="4" y="9" width="4" height="13" rx="1"/><rect x="10" y="5" width="4" height="17" rx="1"/><rect x="16" y="9" width="4" height="13" rx="1"/></g></svg>`,
  support: `<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="currentColor"/></svg>`,
};
