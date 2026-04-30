import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar, Users, ClipboardList, Sparkles, Plus, X, Clock,
  ChevronLeft, ChevronRight, Upload, FileText, Trash2,
  Edit3, Check, Camera, Loader2, CreditCard, Leaf, Home,
  MessageSquare, Bell, RefreshCw, TrendingUp, UserPlus,
  AlertCircle, Copy, Phone, ChevronDown, Settings, Download
} from "lucide-react";

/* =========================================================
   Fonts + Theme — Palette E (Soseon Cool)
   ========================================================= */
const fontLink = document.querySelector('link[data-sosun-fonts]');
if (!fontLink) {
  // preconnect 먼저 추가 (폰트 로드 속도 향상)
  if (!document.querySelector('link[data-sosun-preconnect-1]')) {
    const pc1 = document.createElement('link');
    pc1.rel = 'preconnect';
    pc1.href = 'https://fonts.googleapis.com';
    pc1.setAttribute('data-sosun-preconnect-1', '1');
    document.head.appendChild(pc1);
  }
  if (!document.querySelector('link[data-sosun-preconnect-2]')) {
    const pc2 = document.createElement('link');
    pc2.rel = 'preconnect';
    pc2.href = 'https://fonts.gstatic.com';
    pc2.crossOrigin = 'anonymous';
    pc2.setAttribute('data-sosun-preconnect-2', '1');
    document.head.appendChild(pc2);
  }
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.setAttribute('data-sosun-fonts', '1');
  l.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,500;1,500&display=swap';
  document.head.appendChild(l);
}

const theme = {
  bg: '#FAFAF7',
  card: '#FFFFFF',
  cardAlt: '#F0EFE8',
  cardAlt2: '#F5F4EC',
  cardDark: '#2C4A3B',
  ink: '#1F2A22',
  inkSoft: '#3D4A3E',
  inkMute: '#8A9088',
  line: '#DAD9CC',
  lineLight: '#E8E7DC',
  accent: '#2C4A3B',
  accent2: '#B85A3E',
  accentSoft: '#E8EDE4',
  highlight: '#F3F1E6',
  danger: '#A84535',
  dangerBg: '#F0D8D2',
  warn: '#B8863E',
  warnBg: '#F0E2C4',
  success: '#2C4A3B',
  successBg: '#DDE4D6',
  serif: '"Cormorant Garamond", Georgia, serif',
  sans: '"Noto Sans KR", sans-serif',
  radius: '16px',
};

/* =========================================================
   Storage
   ========================================================= */
/* =========================================================
   Supabase 설정
   ========================================================= */
// Vercel에 등록된 환경변수 우선 사용. 로컬 개발 / 환경변수 누락 시 fallback.
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://vcemcdzilelnoebupxyp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZW1jZHppbGVsbm9lYnVweHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzE1MjAsImV4cCI6MjA5MjYwNzUyMH0._OQ1vEDNgNhyNgV70Ph6Pi6Bwn9fA3HcbZ9bVC6gsv8';

// 인증 상태
const sbAuth = { token: null, user: null };

// Supabase REST API 헬퍼
const sb = {
  headers: () => ({
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${sbAuth.token || SUPABASE_ANON_KEY}`,
  }),

  async from(table) {
    return `${SUPABASE_URL}/rest/v1/${table}`;
  },

  async get(table, id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=data`,
      { headers: sb.headers() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0]?.data ?? null;
  },

  async upsert(table, id, data) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...sb.headers(), 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ id, data, updated_at: new Date().toISOString() }),
    });
  },

  async getAll(table) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=id,data`,
      { headers: sb.headers() }
    );
    if (!res.ok) return null;
    return res.json();
  },
};

// Supabase 로그인
async function sbSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.access_token) {
    sbAuth.token = data.access_token;
    sbAuth.user = data.user;
    // access_token + refresh_token 둘 다 저장
    localStorage.setItem('sb_token', data.access_token);
    localStorage.setItem('sb_refresh', data.refresh_token || '');
    return true;
  }
  return false;
}

// 토큰 갱신
async function sbRefreshToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (data.access_token) {
    sbAuth.token = data.access_token;
    localStorage.setItem('sb_token', data.access_token);
    localStorage.setItem('sb_refresh', data.refresh_token || '');
    return true;
  }
  return false;
}

// 저장된 토큰 복원 — 만료시 refresh_token으로 자동 갱신
async function sbRestoreSession() {
  const token = localStorage.getItem('sb_token');
  const refresh = localStorage.getItem('sb_refresh');
  if (!token && !refresh) return false;

  if (token) {
    sbAuth.token = token;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      sbAuth.user = await res.json();
      return true;
    }
  }

  // access_token 만료 → refresh_token으로 갱신
  if (refresh) {
    const ok = await sbRefreshToken(refresh);
    if (ok) return true;
  }

  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh');
  sbAuth.token = null;
  return false;
}

function sbSignOut() {
  sbAuth.token = null;
  sbAuth.user = null;
  localStorage.removeItem('sb_token');
  localStorage.removeItem('sb_refresh');
}

/* =========================================================
   Storage — Supabase 기반
   K 키 → Supabase 테이블 매핑
   ========================================================= */
const K = {
  members:     { lkey: 'sosun:members:v8',     table: 'members',  id: 'all' },
  sessions:    { lkey: 'sosun:sessions:v8',    table: 'sessions', id: 'all' },
  classlog:    { lkey: 'sosun:classlog:v8',    table: 'classlog', id: 'all' },
  trials:      { lkey: 'sosun:trials:v8',      table: 'trials',   id: 'all' },
  dashDismiss: { lkey: 'sosun:dashDismiss:v8', table: 'settings', id: 'dashDismiss' },
  smsConfirmed:{ lkey: 'sosun:smsConfirmed:v8',table: 'settings', id: 'smsConfirmed' },
  seeded:      { lkey: 'sosun:seeded:v8',      table: 'settings', id: 'seeded' },
  groupSlots:  { lkey: 'sosun:groupSlots:v8',  table: 'settings', id: 'groupSlots' },
  closedDays:  { lkey: 'sosun:closedDays:v8',  table: 'settings', id: 'closedDays' },
};

async function loadKey(k, fallback) {
  try {
    // 토큰이 없으면 (로그인 안 된 상태) localStorage만 사용
    if (!sbAuth.token) {
      const v = localStorage.getItem(k.lkey);
      if (v === null) return fallback;
      return JSON.parse(v);
    }
    // Supabase에서 로드 시도
    const val = await sb.get(k.table, k.id);
    if (val !== null && val !== undefined) {
      // Supabase에 데이터 있으면 localStorage에도 캐시
      try { localStorage.setItem(k.lkey, JSON.stringify(val)); } catch {}
      return val;
    }
    // Supabase에 없으면 localStorage에서 자동 마이그레이션
    const local = localStorage.getItem(k.lkey);
    if (local !== null) {
      const parsed = JSON.parse(local);
      console.log(`[migrate] ${k.id}: localStorage → Supabase`);
      try { await sb.upsert(k.table, k.id, parsed); } catch (e) { console.error('migrate error', k.id, e); }
      return parsed;
    }
    return fallback;
  } catch (e) {
    console.error('load error', k.id, e);
    // 에러 시 localStorage fallback
    try {
      const v = localStorage.getItem(k.lkey);
      if (v !== null) return JSON.parse(v);
    } catch {}
    return fallback;
  }
}

async function saveKey(k, value) {
  // localStorage는 항상 캐시로 저장 (오프라인 대비)
  try { localStorage.setItem(k.lkey, JSON.stringify(value)); } catch {}
  // 로그인된 상태면 Supabase에도 저장
  if (sbAuth.token) {
    try {
      await sb.upsert(k.table, k.id, value);
    } catch (e) {
      console.error('save error', k.id, e);
    }
  }
}


/* =========================================================
   Date utilities
   ========================================================= */
const uid = () => Math.random().toString(36).slice(2, 11);
const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYMD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
// 명시적 로컬 Date 생성 — iOS Safari의 시간대 모호성 회피
// (ISO 형식 'YYYY-MM-DDTHH:MM'은 환경에 따라 UTC로 해석될 수 있어 위험)
const fromYMDHM = (ymd, hm) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const [hh, mm] = (hm || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfWeek = (d) => {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
};
const WEEK_KR = ['일', '월', '화', '수', '목', '금', '토'];
const fmtKR = (d) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK_KR[d.getDay()]})`;
const fmtKRShort = (ymd) => { const d = fromYMD(ymd); return `${d.getMonth() + 1}/${d.getDate()}`; };
const daysBetween = (a, b) => Math.round((fromYMD(b) - fromYMD(a)) / 86400000);

// 친밀한 호칭: 이름 두 글자 + 님 (예: 김재영 → 재영님, 이은조 → 은조님)
// 두 글자 이름은 그대로 (예: 박민 → 박민님)
const friendlyName = (name) => {
  if (!name) return '';
  if (name.length <= 2) return `${name}님`;
  // 3글자 이상 → 마지막 2글자 + 님
  return `${name.slice(-2)}님`;
};

/* =========================================================
   Korean public holidays 2026
   ========================================================= */
const HOLIDAYS = new Set([
  '2026-01-01',
  '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-03-02',
  '2026-05-05',
  '2026-05-24', '2026-05-25',
  '2026-06-06',
  '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26',
  '2026-10-03', '2026-10-05',
  '2026-10-09',
  '2026-12-25',
]);

function countHolidaysIn(startYMD, endYMD) {
  let n = 0;
  let d = fromYMD(startYMD);
  const end = fromYMD(endYMD);
  while (d <= end) {
    if (HOLIDAYS.has(toYMD(d))) n++;
    d = addDays(d, 1);
  }
  return n;
}

function computeExpiry(startDate, days) {
  let end = toYMD(addDays(fromYMD(startDate), days - 1));
  let h = countHolidaysIn(startDate, end);
  let extra = 0;
  while (h > extra) {
    extra = h;
    end = toYMD(addDays(fromYMD(startDate), days - 1 + extra));
    h = countHolidaysIn(startDate, end);
  }
  return end;
}

/* =========================================================
   Pass presets
   ========================================================= */
const PASS_PRESETS = [
  { label: '체험 수업 (1회)', total: 1, days: 14, price: 30000, category: 'trial' },
  { label: '1개월 (8회)', total: 8, days: 42, price: 200000, category: 'group', note: '주 2회 · 6주 이내' },
  { label: '3개월 (24회)', total: 24, days: 112, price: 540000, category: 'group', note: '16주 이내 · 1회 홀딩', canHold: true },
  { label: '횟수권 (10회)', total: 10, days: 70, price: 270000, category: 'group', note: '10주 이내' },
  { label: '개인레슨 1회 (60분)', total: 1, days: 60, price: 80000, category: 'private' },
  { label: '스타터 패키지', special: 'starter', price: 360000, note: '개인 3회 + 소그룹 6회' },
  { label: '커스텀 수강권', special: 'custom', price: 0, note: '할인가·특수 수강권 자유 입력' },
];

// 소그룹 기본 시간 (사용자가 설정에서 변경 가능)
const DEFAULT_GROUP_SLOTS = ['11:00', '19:20', '20:50'];
// 호환성 유지용 (기존 코드에서 사용)
const TIME_PRESETS = ['11:00', '12:30', '15:00', '19:20', '20:50'];

/* =========================================================
   SMS Templates
   ========================================================= */
const SMS_TEMPLATES = {
  expiring: (member, pass) => ({
    title: '수강권 소진 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

수강권이 ${pass.totalSessions - pass.usedSessions}회 남았어요.
${fmtKRShort(pass.expiryDate)}까지 이용 가능합니다.

편하게 이어서 수련하실 수 있도록
미리 안내드려요.

좋은 하루 보내세요 🌿`,
  }),
  expired: (member, pass) => ({
    title: '수강권 종료 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

수강권이 종료되어 안내드려요.

그동안 수련 함께해주셔서 감사드립니다.
다시 몸이 필요하실 때
편하게 언제든 찾아주세요.

좋은 하루 보내세요 🌿`,
  }),
  registered: (member, pass) => ({
    title: '수강권 등록 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

수강권 등록 완료되었어요.

· 이용 기간: ${fmtKRShort(pass.startDate)} ~ ${fmtKRShort(pass.expiryDate)}
· 총 ${pass.totalSessions}회

예약 후 이용 가능하며
당일 취소는 차감될 수 있어요.

편하게 수련 이어가시면 됩니다 🌿`,
  }),
  hold: (member, pass, holdStart, holdEnd) => ({
    title: '홀딩 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

요청하신 휴회 처리 완료되었어요.

· 휴회 기간: ${fmtKRShort(holdStart)} ~ ${fmtKRShort(holdEnd)}

해당 기간 동안은 수련이 중단되고
이후 자동으로 이어서 사용 가능합니다.

변동사항 있으시면 편하게 말씀 주세요 🌿`,
  }),
  trial: (trial) => ({
    title: '체험 예약 안내',
    body: `안녕하세요 ${friendlyName(trial.name)} ☺️
소선요가입니다

${fmtKRShort(trial.date)} ${trial.time} 체험 수업 예약되어 있어요.

편안한 복장으로
5분 전 도착 부탁드려요.

혹시 변동사항 생기시면
미리 말씀 주세요 🌿`,
  }),
  upcomingStart: (member, pass) => ({
    title: '수강권 시작 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

${fmtKRShort(pass.startDate)}부터
수강권이 시작됩니다.

편안한 복장으로
5분 전 도착 부탁드려요.

변동사항 있으시면
미리 말씀 주세요 🌿`,
  }),
  privateLessonSchedule: (member, schedule) => ({
    title: '개인레슨 일정 안내',
    body: `안녕하세요 ${friendlyName(member.name)} ☺️
소선요가입니다

협의해주신 개인레슨 일정
정리해서 보내드려요!

${schedule}

혹시 변동사항 생기시면
편하게 미리 말씀 주세요 🙏🏻

좋은 하루 보내세요 🌿`,
  }),
};

/* =========================================================
   Seed data — 김은화님 샘플 (스타터 → 개인레슨 5회 전환)
   ========================================================= */
const SEED_MEMBERS = [
  // ==========================================================
  // 1. 김은화 (기존 샘플 유지)
  // ==========================================================
  {
    id: 'm_kimunhwa', name: '김은화', birthYear: '',
    gender: '여', phone: '010-5878-4348', job: '치위생사',
    yogaExperience: '요가 3년', notes: '',
    fixedSlots: [{ dow: 2, time: '12:30' }],
    keyPoint: '발목 인대 파열(왼쪽), 종아리 근육 파열 이력',
    createdAt: '2026-03-26',
    memoTimeline: [
      { id: 'mm_kuh1', date: '2026-04-21', text: '전신에 순환이 필요. 개인레슨에서는 순환되는 동작 위주로 사용. 골반의 열림이나 햄스트링 등 유연성이 나쁜 편은 아님.\n\n골반 전방경사가 있고, 무릎 발목 등이 좋지 않으나 순환과 체중 감량이 있으면 요가의 효과를 잘 볼 수 있는 편.' },
      { id: 'mm_kuh2', date: '2026-04-17', text: '4/14 개인레슨 4시간 전 취소 (미차감, 다음에 해주기로 함)\n\n나머지 소그룹 레슨 개인레슨으로 바꿈!\n4/28, 5/12 → 1만원 환불로 진행' },
    ],
    progressLog: [
      { id: 'pg_kuh1', date: '2026-04-02', classType: '개인레슨 1회차', bodyState: '상체 긴장↑, 골반 전방이동, 하체 지지 부족 → 긴장형 + 전방체중, 발 아치X', afterChange: '귀, 어깨, 골반, 발목까지 몸에 중심에 집중 / 상체 긴장 완화', memo: '' },
      { id: 'pg_kuh2', date: '2026-04-07', classType: '개인레슨 2회차', bodyState: '몸의 순환에 초점\n골반의 다양한 열기\n상체 풀기', afterChange: '허리 움직임, 등등\n몸의 상태 양호', memo: '' },
    ],
    assessment: {
      summary: '치위생사로 오래 앉아 있는 생활 습관과 운동 공백이 있고, 왼쪽 발목 인대 파열 및 종아리 근육 파열 이력이 있는 상태입니다. 골반 전방경사와 발 아치 무너짐이 관찰되며, 상체 긴장이 높고 하체 지지가 부족합니다.',
      keyPoint: '발목 인대 파열(왼쪽) · 종아리 근육 파열 → 안정성 우선, 회복 중심으로 접근 필요',
      observations: [
        '자세: 힘 빠짐, 발 아치 무너짐, 긴장 많음',
        '하체: 무릎 오른쪽 / 고관절 오른쪽 굴곡에서 걸림',
        '상체: 전신 긴장형, 어깨 말림 경향',
        '골반: 전방경사 뚜렷, 전방체중',
        '호흡: 움직임에 긴장 반응',
        '스트레스: 높음, 수면 자주 깸',
      ],
      recommendations: [
        '하체 안정성 강화: 발 아치 되살리기, 발목 주변 소근육 활성',
        '골반 중립 훈련: 전방경사 완화, 코어 깨우기',
        '순환 중심 시퀀스: 강한 부하보다 흐름 위주 동작',
        '상체 긴장 이완: 어깨·목·가슴 풀기 충분히',
        '호흡과 함께 천천히 움직임 연결',
      ],
      cautions: [
        '왼쪽 발목 체중 싣는 동작 주의 (전사자세, 나무자세 좌측)',
        '무릎 과신전 유도 동작 피하기',
        '급격한 점프·강한 수축 동작 자제',
        '통증 시 즉시 중단 지시',
      ],
      rawInput: '스타터 패키지 A · 매주 화요일 12:30-13:20 수업',
      updatedAt: '2026-04-21',
    },
    passes: [
      {
        id: 'p_kuh_starter', type: '스타터 패키지 A (개인 3회 부분)', category: 'private',
        totalSessions: 3, usedSessions: 3,
        paymentDate: '2026-03-26', startDate: '2026-04-02', expiryDate: '2026-04-21',
        price: 360000, sessionDates: ['2026-04-02', '2026-04-07', '2026-04-21'],
        bundleOf: '스타터 패키지 A',
        convertedTo: 'p_kuh_private5', convertedAt: '2026-04-21',
        convertedNote: '몸 상태로 인해 소그룹 6회를 개인레슨으로 전환. 1만원 환불.',
        archived: true,
      },
      {
        id: 'p_kuh_private5', type: '개인레슨 5회 (할인가)', category: 'private',
        totalSessions: 5, usedSessions: 3,
        paymentDate: '2026-04-21', startDate: '2026-04-21',
        expiryDate: computeExpiry('2026-04-21', 70),
        price: 350000, pricePerSession: 70000,
        sessionDates: ['2026-04-21', '2026-04-28', '2026-05-12'],
        note: '스타터 패키지 A에서 전환 · 정가 80,000원 → 할인가 70,000원. 협의된 일정: 4/28, 5/12.',
        convertedFrom: 'p_kuh_starter',
      },
    ],
    refunds: [
      { id: 'r_kuh1', date: '2026-04-21', amount: 10000, reason: '스타터 소그룹 6회 → 개인레슨 전환 차액 환불' },
    ],
  },

  // ==========================================================
  // 2. 이은조 (1985.09, 사무직)
  // ==========================================================
  {
    id: 'm_leeeunjo', name: '이은조', birthYear: '1985',
    gender: '여', phone: '010-6383-9220', job: '사무직',
    yogaExperience: '필라테스 1년',
    notes: '스트레스 받을 때 자주 깸',
    fixedSlots: [{ dow: 2, time: '19:20' }, { dow: 4, time: '19:20' }],
    keyPoint: '목·어깨·등·고관절(좌) 불편 / 3개월 이상 지속',
    createdAt: '2026-03-26',
    memoTimeline: [],
    progressLog: [],
    assessment: {
      summary: '40대 초반 사무직 여성으로 오래 앉아 있는 생활 습관과 비대칭 습관이 있습니다. 목·어깨·등·왼쪽 고관절 부위 뻐근함과 찌릿함이 3개월 이상 지속되고 있습니다.',
      keyPoint: '목·어깨·등·고관절(좌) 불편 · 뻐근함·찌릿함 3개월 이상 지속',
      observations: [
        '직업: 사무직, 오래 앉아 있는 습관',
        '불편 부위: 목, 어깨, 등, 왼쪽 고관절',
        '통증 느낌: 뻐근함 + 찌릿함 (3개월 이상)',
        '생활 습관: 비대칭 습관 있음',
        '수면: 잘 자지만 자주 깸',
      ],
      recommendations: [
        '목·어깨 이완 및 가동성 회복 동작',
        '흉추 가동성 늘리기 (등 뻣뻣함 완화)',
        '왼쪽 고관절 주변 이완 + 좌우 균형 맞추기',
        '체형 자세 교정 중심 시퀀스',
        '근력·안정성 강화 점진적 추가',
      ],
      cautions: [
        '왼쪽 고관절에 과도한 부하 피하기',
        '찌릿함 있는 부위는 무리 없이 진행',
      ],
      rawInput: '회원용 상태 기록지 2026-03-26 작성',
      updatedAt: '2026-03-26',
    },
    passes: [{
      id: 'p_lej1', type: '1개월 (8회)', category: 'group',
      totalSessions: 8, usedSessions: 6,
      paymentDate: '2026-03-26', startDate: '2026-03-31',
      expiryDate: computeExpiry('2026-03-31', 42),
      price: 200000, paymentMethod: '지역화폐',
      sessionDates: ['2026-03-31','2026-04-02','2026-04-07','2026-04-09','2026-04-14','2026-04-16'],
    }],
  },

  // ==========================================================
  // 3. 정하니 (1989, 가정주부)
  // ==========================================================
  {
    id: 'm_jeonghani', name: '정하니', birthYear: '1989',
    gender: '여', phone: '010-9597-8967', job: '가정주부',
    yogaExperience: '요가 2개월',
    notes: '',
    fixedSlots: [{ dow: 2, time: '11:00' }, { dow: 4, time: '11:00' }],
    keyPoint: '허리·골반 뻣뻣함 / 골반 후방경사, 햄스트링 타이트',
    createdAt: '2026-04-07',
    memoTimeline: [],
    progressLog: [],
    assessment: {
      summary: '30대 후반 가정주부로 오래 앉아 있는 습관이 있고, 허리와 골반 부위 뻣뻣함을 호소합니다. 어깨와 가슴 뒷면이 말려 고개가 자꾸 아래로 떨어지며, 골반 후방경사와 햄스트링 타이트가 관찰됩니다.',
      keyPoint: '허리·골반 뻣뻣함 / 어깨 말림 + 골반 후방경사 + 햄스트링 타이트',
      observations: [
        '자세: 어깨와 가슴 뒷면이 많이 말려 있어 고개가 자꾸 아래로 떨어짐',
        '골반: 후방경사 추정, 좌우 가동성은 있음',
        '하체: 햄스트링이 매우 타이트',
        '후면 근력: 나쁘지 않음',
        '어깨 비대칭: 오른쪽 어깨 하강',
        '오래 앉아 있을 때 팔 통증 → 근력 부족',
      ],
      recommendations: [
        '흉추 신전 & 어깨 가동성 회복 동작',
        '햄스트링 점진적 스트레칭',
        '골반 중립 훈련 (후방경사 완화)',
        '후면 사슬 활성화 (기본 근력 살리기)',
        '어깨 비대칭 좌우 균형 맞추기',
      ],
      cautions: [
        '처음엔 강한 햄스트링 스트레칭 피하기',
        '앞으로 숙이는 동작에서 허리 무리 주의',
      ],
      rawInput: '상체 긴장도 높음. 하체는 힘 좋음, 하체 쓰는 동작에서 수행력 우수. 바시스타아사나, 셋뚜반다아에서 다리들기, 우티타하스타파당구쉬타 가능.',
      updatedAt: '2026-04-07',
    },
    passes: [{
      id: 'p_jh1', type: '1개월 (8회)', category: 'group',
      totalSessions: 8, usedSessions: 5,
      paymentDate: '2026-04-07', startDate: '2026-04-07',
      expiryDate: computeExpiry('2026-04-07', 42),
      price: 200000, paymentMethod: '카드(제로이체)',
      sessionDates: ['2026-04-07','2026-04-09','2026-04-14','2026-04-16','2026-04-21'],
    }],
  },

  // ==========================================================
  // 4. 김재영 (1974.01.20, 방과후 활동 지도)
  // ==========================================================
  {
    id: 'm_kimjaeyoung', name: '김재영', birthYear: '1974',
    gender: '여', phone: '010-7466-1129',
    job: '방과후 활동 지도 (발달장애 아동, 오후 근무)',
    yogaExperience: '요가 6년, 필라테스 3년',
    notes: '공황장애 이력 있음, 약 복용 후 호전',
    fixedSlots: [{ dow: 2, time: '20:50' }, { dow: 4, time: '20:50' }],
    keyPoint: '목·허리·고관절·무릎 묵직함 / 공황장애 이력(약 복용 후 호전)',
    createdAt: '2026-04-07',
    memoTimeline: [
      { id: 'mm_kjy1', date: '2026-04-07', text: '과거 공황장애 이력 있음. 약 복용 후 현재는 많이 호전됨. 현재는 발달장애 아이들 방과후 활동 지도하시는 일을 하고 계시고, 오후에만 나가서 아이들 돌봐주심.' },
      { id: 'mm_kjy2', date: '2026-04-07', text: '원래 "2개월권 38만원"으로 등록. 체험 1만원 선불 차감해서 실제 결제는 37만원. 이 수강권 종류(2개월 16회 10주)는 현재 소선요가 정식 수강권 리스트에서 단종된 형태.' },
    ],
    progressLog: [],
    assessment: {
      summary: '50대 초반 여성으로 요가 6년, 필라테스 3년 경력이 있습니다. 목·허리·고관절·무릎 부위에 묵직함이 3개월 이상 지속되며, 한쪽 다리 체중 실기·오래 걸을 때·몸 비틀 때 불편합니다. 비대칭 습관과 자주 깨는 수면 패턴도 있습니다.',
      keyPoint: '목·허리·고관절·무릎 묵직함 (3개월 이상) · 공황장애 이력',
      observations: [
        '요가 6년 + 필라테스 3년 경력',
        '불편 부위: 목, 허리, 고관절, 무릎',
        '통증 느낌: 묵직함 (3개월 이상)',
        '상황: 한쪽 다리 체중 실기, 오래 걸을 때, 몸 비틀 때',
        '생활 습관: 비대칭 습관',
        '수면: 자주 깸',
        '운동: 주 2~3회 (요가 외 활동)',
      ],
      recommendations: [
        '관절 가동성 회복 중심 시퀀스 (고관절·무릎)',
        '허리 부담 적은 동작부터 시작',
        '좌우 균형 맞추는 정렬 훈련',
        '호흡 안정화 + 스트레스 완화 포즈 포함',
        '경험자라서 심화 자세도 단계적 가능',
      ],
      cautions: [
        '공황장애 이력 → 급격한 호흡 변화나 긴 유지 자세 주의',
        '무릎 묵직함 있는 동작 회피',
        '회원 컨디션 수시로 체크',
      ],
      rawInput: '회원용 상태 기록지 2026-04-07 작성',
      updatedAt: '2026-04-07',
    },
    passes: [{
      id: 'p_kjy1', type: '2개월권 (16회 · 10주) · 단종', category: 'group',
      totalSessions: 16, usedSessions: 3,
      paymentDate: '2026-04-07', startDate: '2026-04-09',
      expiryDate: computeExpiry('2026-04-09', 70),
      price: 370000, paymentMethod: '지역화폐',
      sessionDates: ['2026-04-14','2026-04-16','2026-04-21'],
      note: '원래 정식 수강권이었던 2개월권(정가 38만원). 체험 1만원 선불 차감 후 37만원 결제. 현재 단종됨.',
    }],
  },

  // ==========================================================
  // 5. 마영선 (1984.02.09)
  // ==========================================================
  {
    id: 'm_mayoungsun', name: '마영선', birthYear: '1984',
    gender: '여', phone: '010-3359-4523', job: '',
    yogaExperience: '필라테스 경력, 발레 경력 조금',
    notes: '',
    fixedSlots: [{ dow: 2, time: '11:00' }, { dow: 4, time: '11:00' }],
    keyPoint: '유연성 좋음, 햄스트링 약간 타이트, 후면 근력 부족 / 머리서기 희망',
    createdAt: '2026-04-09',
    memoTimeline: [
      { id: 'mm_my1', date: '2026-04-14', text: '필라테스 경력, 잠깐의 발레 경력 등. 몸의 유연성이 좋으나 햄스트링 약간 타이트. 몸의 후면의 근력이 부족. 머리서기 희망!' },
      { id: 'mm_my2', date: '2026-04-14', text: '처음 1개월권 19만원 카드 결제 → 취소. 이후 남양주 지역화폐(카드기로 결제 가능)로 25만 + 28만 분할 결제 = 53만원 (정가 54만에서 체험비 1만원 차감).' },
    ],
    progressLog: [],
    assessment: {
      summary: '40대 초반 여성으로 필라테스와 발레 경력이 있습니다. 몸의 유연성은 좋은 편이나 햄스트링이 약간 타이트하고 후면 근력이 부족합니다. 어깨 부위 뻐근함·뻣뻣함이 최근 2주 이내 발생했으며, 머리서기를 희망하십니다.',
      keyPoint: '유연성 좋음 · 햄스트링 약간 타이트 · 후면 근력 부족 · 머리서기 목표',
      observations: [
        '경력: 필라테스 + 발레 조금',
        '유연성: 좋음 (전반적)',
        '햄스트링: 약간 타이트',
        '후면 근력: 부족',
        '어깨 뻐근함·뻣뻣함 (최근 2주 이내)',
        '비대칭 습관 있음, 주 1회 운동',
      ],
      recommendations: [
        '후면 사슬 강화 (몸 뒤쪽 근력 살리기)',
        '햄스트링 점진적 스트레칭 유지',
        '머리서기 준비 단계: 어깨-코어 기초 근력부터',
        '어깨 뻐근함 완화 동작 포함',
        '좌우 균형 정렬 훈련',
      ],
      cautions: [
        '어깨 뻐근함 있는 동안 무리한 머리서기 유보',
        '비대칭 습관 강화되지 않도록 양쪽 균등하게',
      ],
      rawInput: '회원용 상태 기록지 + 강사 메모 4/14',
      updatedAt: '2026-04-14',
    },
    passes: [{
      id: 'p_my1', type: '3개월 (24회, 1회 홀딩 가능)', category: 'group',
      totalSessions: 24, usedSessions: 3,
      paymentDate: '2026-04-14', startDate: '2026-04-14',
      expiryDate: computeExpiry('2026-04-14', 112),
      price: 530000, paymentMethod: '지역화폐 (25만 + 28만 분할)',
      sessionDates: ['2026-04-14','2026-04-16','2026-04-21'], canHold: true,
      note: '정가 54만원 → 체험비 1만원 차감 → 53만원. 처음 카드 19만 결제했다가 취소 후 지역화폐 분할.',
    }],
  },

  // ==========================================================
  // 6. 유연선 (1982, 톨게이트 3교대)
  // ==========================================================
  {
    id: 'm_yuyeonseon', name: '유연선', birthYear: '1982',
    gender: '여', phone: '010-6727-0948',
    job: '톨게이트 3교대 근무',
    yogaExperience: '없음 (다양한 운동 경험 있음)',
    notes: '운동 좋아하심. 유연성 좋음, 골반 좌우 열림 좋음.',
    fixedSlots: [], // 개인레슨 유동적
    keyPoint: '공황장애 이력 · 당뇨(마운자로 처방, 10일간 5kg 감량)',
    createdAt: '2026-04-09',
    memoTimeline: [
      { id: 'mm_yys1', date: '2026-04-09', text: '4/9일 상담 → 2주간 화,목 15시 개인레슨 / 4/14일 지역화폐 결제\n\n당뇨가 심해서 마운자로를 맞고 계심. 10일간 5키로가 빠졌음.\n공황장애가 있었고, 5년전 부터 직장에서 다니면서 많이 좋아짐.\n\n운동을 좋아하는 편 / 유연성도 좋음, 골반의 좌우 열림이 좋음.' },
      { id: 'mm_yys2', date: '2026-04-09', text: '계획: 개인레슨 4회 끝나고 스타터 패키지 결제 예정 (미결제) → 개인레슨 3회 더 추가 후 소그룹 레슨 투입 예정. 소그룹 레슨 들어가기 전까지 개인레슨 7회.' },
    ],
    progressLog: [
      { id: 'pg_yys1', date: '2026-04-14', classType: '개인레슨 1회차', bodyState: '골반의 움직임 나쁘지 않음. 라운드숄더와 코어의 힘 X', afterChange: '손발 간격 / 런지 준비 간격', memo: '' },
      { id: 'pg_yys2', date: '2026-04-20', classType: '개인레슨 2회차', bodyState: '', afterChange: '하이런지 - 전사2', memo: '' },
      { id: 'pg_yys3', date: '2026-04-22', classType: '개인레슨 3회차', bodyState: '', afterChange: '하이런지 전사2 측각도', memo: '' },
      { id: 'pg_yys4', date: '2026-04-24', classType: '개인레슨 4회차', bodyState: '', afterChange: '하이런지 전사2 측각도 삼각자세', memo: '' },
    ],
    assessment: {
      summary: '40대 중반 여성으로 톨게이트 3교대 근무를 하십니다. 당뇨로 마운자로 치료 중이며 10일간 5kg 감량하셨고, 과거 공황장애가 있었으나 5년 전부터 직장 다니면서 많이 호전되셨습니다. 유연성과 골반 좌우 열림은 좋은 편이나, 라운드숄더와 코어 힘이 부족합니다.',
      keyPoint: '당뇨(마운자로) · 공황장애 이력(호전 중) · 라운드숄더 + 코어 약함',
      observations: [
        '직업: 톨게이트 3교대 (불규칙 근무)',
        '건강 이력: 공황장애(5년 전 호전), 당뇨(치료 중)',
        '목·어깨 뻐근함 (3개월 이상, 특별한 상황 없이 지속)',
        '유연성: 좋음',
        '골반 좌우 열림: 좋음',
        '라운드숄더 뚜렷',
        '코어 근력 부족',
        '운동 좋아함, 스트레스 낮음, 자주 깸',
      ],
      recommendations: [
        '코어 안정성 훈련 (복부 활성화부터)',
        '라운드숄더 완화: 흉추 신전, 어깨 정렬',
        '유연성 유지하면서 근력 점진 강화',
        '런지·전사 시퀀스로 하체-코어 연결',
        '3교대라 체력 편차 있으니 컨디션별 강도 조절',
      ],
      cautions: [
        '당뇨 → 공복·저혈당 주의, 수업 전 식사 여부 확인',
        '공황장애 이력 → 긴 호흡 유지나 강한 압박 자세 주의',
        '3교대 근무로 피로 심한 날 강도 조절',
      ],
      rawInput: '4/9 상담 메모 + 회원용 상태 기록지',
      updatedAt: '2026-04-14',
    },
    passes: [
      {
        id: 'p_yys1', type: '개인레슨 4회 (할인가)', category: 'private',
        totalSessions: 4, usedSessions: 4,
        paymentDate: '2026-04-14', startDate: '2026-04-14',
        expiryDate: computeExpiry('2026-04-14', 30),
        price: 280000, pricePerSession: 70000, paymentMethod: '지역화폐',
        sessionDates: ['2026-04-14','2026-04-20','2026-04-22','2026-04-24'],
        note: '정가 80,000원 → 할인가 70,000원 × 4회.',
      },
      {
        id: 'p_yys_starter_pvt', type: '스타터 · 개인레슨 3회', category: 'private',
        totalSessions: 3, usedSessions: 0,
        paymentDate: '2026-04-24', startDate: '2026-04-29',
        expiryDate: computeExpiry('2026-04-29', 90),
        price: 0, bundleOf: '스타터 패키지 A',
        sessionDates: [],
        note: '스타터 패키지 A. 개인레슨 일정: 4/29(수) 16:00, 5/6(수) 15:00, 5/8(금) 15:00.',
      },
      {
        id: 'p_yys_starter_grp', type: '스타터 · 소그룹 6회', category: 'group',
        totalSessions: 6, usedSessions: 0,
        paymentDate: '2026-04-24', startDate: '2026-05-12',
        expiryDate: computeExpiry('2026-05-12', 35),
        price: 360000, paymentMethod: '신한카드 일시불', bundleOf: '스타터 패키지 A',
        sessionDates: [],
        note: '스타터 패키지 A (개인 3회 + 소그룹 6회 = 360,000원). 소그룹 시작일 미정 (3교대 근무로 유동적). 임시로 5/12 기준. 첫 수업일 기준 5주 이내 사용.',
      },
    ],
  },

  // ==========================================================
  // 7. 유민경 (1994)
  // ==========================================================
  {
    id: 'm_yuminkyung', name: '유민경', birthYear: '1994',
    gender: '여', phone: '010-9586-9433', job: '',
    yogaExperience: '요가, 클라이밍',
    notes: '스트레스 시 허리 부분이 굳어서 뻣뻣한 느낌',
    fixedSlots: [{ dow: 2, time: '20:50' }, { dow: 4, time: '20:50' }],
    keyPoint: '허리 뻣뻣함 (3개월 이상) / 유연성 좋으나 힘이 없음',
    createdAt: '2026-04-16',
    memoTimeline: [
      { id: 'mm_ymk1', date: '2026-04-16', text: '20:50 고정 / 4/23일부터 시작\n\n유연성이 좋으나 힘이 없음.' },
      { id: 'mm_ymk2', date: '2026-04-16', text: '4/16 체험(1만원) + 당일 정식 등록 (1개월권 20만원 = 체험비 1만원 + 추가 19만원). 지역화폐 결제.' },
    ],
    progressLog: [],
    assessment: {
      summary: '30대 초반 여성으로 요가와 줄넘이 경험이 있습니다. 허리 부위의 뻐근함·찌릿함·뻣뻣함이 3개월 이상 지속되며, 오래 앉아 있을 때 특히 심해집니다. 유연성은 좋은 편이나 전반적인 근력이 부족합니다.',
      keyPoint: '허리 뻣뻣함 (3개월 이상, 앉아 있을 때) · 유연성 좋음, 힘 부족',
      observations: [
        '요가·줄넘이 경험 있음',
        '불편 부위: 허리',
        '통증 느낌: 뻐근함 + 찌릿함 + 뻣뻣함',
        '지속 기간: 3개월 이상',
        '상황: 오래 앉아 있을 때 심해짐',
        '생활 습관: 오래 앉아 있음, 운동 없음',
        '수면: 잘 잠, 스트레스 보통',
        '스트레스 반응: 허리 부분이 굳어서 뻣뻣함',
      ],
      recommendations: [
        '코어 근력 기초부터 강화',
        '허리 주변 이완 + 흉추 가동성',
        '오래 앉아 있는 습관 보완: 고관절·햄스트링 관리',
        '체형·자세 교정 중심 시퀀스',
        '유연성 활용하되 근력 보완 우선',
      ],
      cautions: [
        '허리 과신전 동작 주의 (뻣뻣함 있을 때)',
        '찌릿함 있는 부위는 무리 없이 진행',
      ],
      rawInput: '회원용 상태 기록지 2026-04-16',
      updatedAt: '2026-04-16',
    },
    passes: [{
      id: 'p_ymk1', type: '1개월 (8회)', category: 'group',
      totalSessions: 8, usedSessions: 0,
      paymentDate: '2026-04-16', startDate: '2026-04-23',
      expiryDate: computeExpiry('2026-04-23', 42),
      price: 200000, paymentMethod: '지역화폐',
      sessionDates: [],
      note: '4/16 체험 당일 등록 (체험비 1만원 + 19만원). 수강권 사용은 4/23부터.',
    }],
  },

  // ==========================================================
  // 8. 권민서 (1991, 인스타 유입 → 4/23 정식 등록)
  // ==========================================================
  {
    id: 'm_kwonminseo', name: '권민서', birthYear: '1991',
    gender: '여', phone: '010-7139-6369', job: '베이킹 가게 운영 (이전)',
    yogaExperience: '웨이트 3~4년, 클라이밍 1년',
    notes: '잠들기 어려움, 스트레스 높음, 비대칭 습관. 스트레스 반응 없음. 잘 부탁드립니다.',
    fixedSlots: [{ dow: 2, time: '11:00' }, { dow: 4, time: '11:00' }],
    keyPoint: '허리 전방경사, 찌릿함 (3개월 이상) · 무리하면 바로 아픔',
    createdAt: '2026-04-23',
    memoTimeline: [
      { id: 'mm_kms1', date: '2026-04-23', text: '4/23 11:00 체험 → 당일 정식 회원 등록. 인스타 유입.\n허리가 좋지 않음. 항상 안 좋은 건 아닌데 무리하면 바로 아파함.' },
    ],
    progressLog: [],
    assessment: {
      summary: '30대 초반 여성으로 웨이트 3~4년, 클라이밍 1년 경력이 있습니다. 허리 부위에 전방경사와 찌릿함이 3개월 이상 지속되며, 무리하면 바로 통증이 나타납니다. 잠들기 어려움과 높은 스트레스가 있으나 몸의 특별한 스트레스 반응은 없다고 하셨습니다.',
      keyPoint: '허리 전방경사 + 찌릿함 · 무리 시 즉시 통증 · 잠들기 어려움',
      observations: [
        '경력: 웨이트 3~4년, 클라이밍 1년',
        '허리 전방경사 + 찌릿함 (3개월 이상)',
        '무리하면 바로 통증 나타남',
        '생활 습관: 비대칭 습관',
        '운동 빈도: 주 1~3회',
        '수면: 잠들기 어려움',
        '스트레스: 높음',
      ],
      recommendations: [
        '체형·자세 교정 중심 시퀀스',
        '코어 안정성 강화 (허리 부담 줄이기)',
        '골반 중립 훈련 (전방경사 완화)',
        '운동 경력 있으니 난이도 조절 가능',
        '이완·호흡 중심 동작으로 수면 개선 도모',
      ],
      cautions: [
        '허리 과신전 동작 주의 (찌릿함 있을 때)',
        '무리한 강도 피하기 — 바로 통증 올 수 있음',
        '클라이밍 경력으로 상체 긴장 있을 수 있음, 이완 충분히',
      ],
      rawInput: '회원용 상태 기록지 2026-04-23',
      updatedAt: '2026-04-23',
    },
    passes: [{
      id: 'p_kms1', type: '1개월 (8회)', category: 'group',
      totalSessions: 8, usedSessions: 0,
      paymentDate: '2026-04-23', startDate: '2026-04-28',
      expiryDate: computeExpiry('2026-04-28', 42),
      price: 200000, paymentMethod: '계좌이체',
      sessionDates: [],
      note: '4/23 체험 후 당일 정식 등록. 인스타 유입. 현금영수증 요청 번호: 010-9262-9664. 4/28부터 수업 카운트 시작.',
    }],
  },

  // ==========================================================
  // 9. 김선정 (1974.04.30, 산책 중 발견 → 4/23 체험 → 등록)
  // ==========================================================
  {
    id: 'm_kimsunjung', name: '김선정', birthYear: '1974',
    gender: '여', phone: '010-2764-1782', job: '프리랜서',
    yogaExperience: '요가 1년 정도 (초보와 다를 것 없음)',
    notes: '체력 매우 약함, 근력 거의 없음. 초보자 수준으로 접근 필요. 시간 유동적.',
    fixedSlots: [{ dow: 2, time: '19:20' }, { dow: 4, time: '19:20' }],
    keyPoint: '골반 후방경사 · 손가락 방아쇠증후군 · 목디스크(경미) · 오른쪽 골반 외회전 · 오른쪽 어깨 올라감 · 근손실 잦음',
    createdAt: '2026-04-23',
    memoTimeline: [
      { id: 'mm_ksj1', date: '2026-04-23', text: '산책 중 발견으로 유입. 4/23 19:20 체험 → 당일 정식 등록 (수강권 시작 5/12).\n본인이 "요가 1년 정도 다녔지만 초보와 다를 것 없다"고 함. 실제로 체력 매우 약함, 근력 거의 없음 — 초보자 수준으로 접근 필요.\n프리랜서라 시간 유동적. 화·목 가능한 시간대로 바꿔가며 수업 가능한지 문의.' },
    ],
    progressLog: [],
    assessment: {
      summary: '50대 초반 프리랜서 여성으로 본인은 요가 1년 경험이 있다고 하나 초보자 수준입니다. 체력과 근력이 매우 약해 기초부터 접근이 필요합니다. 골반 후방경사, 오른쪽 골반 외회전, 오른쪽 어깨 올라감 등 비대칭과 상·하체 약점이 다수 관찰됩니다. 목디스크(경미)와 손가락 방아쇠증후군도 있습니다.',
      keyPoint: '체력·근력 매우 약함 · 초보자 접근 · 골반 후방경사 + 비대칭 다수 · 목디스크(경미) · 손가락 방아쇠증후군',
      observations: [
        '52세 프리랜서 (시간 유동적)',
        '체력·근력 매우 약함 (근손실 잦음)',
        '골반 후방경사',
        '오른쪽 골반 외회전 이슈',
        '오른쪽 어깨 올라감',
        '목디스크 (경미)',
        '손가락 방아쇠증후군',
        '요가 1년 다녔다 하나 초보 수준',
        '통증 강도: 뻣뻣함 (1~3개월)',
        '수면 잘 잠, 스트레스 보통',
      ],
      recommendations: [
        '초보자 기준으로 기초 동작부터',
        '코어 근력 기초 강화 (복부 활성)',
        '골반 중립 훈련 (후방경사 완화)',
        '오른쪽 어깨·골반 비대칭 좌우 균형 맞추기',
        '목 부담 없는 변형 자세로 대체',
        '손가락 부담 덜 주는 프롭(블록·스트랩) 활용',
      ],
      cautions: [
        '과도한 근력 요구 자세 피하기 (근손실 잦음)',
        '목디스크 경미 → 목 과신전·압박 자세 주의',
        '손가락 방아쇠증후군 → 손 무게 싣는 자세(플랭크 등) 주의, 주먹 쥐거나 프롭 활용',
        '컨디션 수시로 체크',
      ],
      rawInput: '회원용 상태 기록지 + 강사 메모 2026-04-23',
      updatedAt: '2026-04-23',
    },
    passes: [{
      id: 'p_ksj1', type: '1개월 (8회)', category: 'group',
      totalSessions: 8, usedSessions: 0,
      paymentDate: '2026-04-23', startDate: '2026-05-12',
      expiryDate: computeExpiry('2026-05-12', 42),
      price: 200000, paymentMethod: '계좌이체',
      sessionDates: [],
      note: '4/23 체험 후 당일 정식 등록. 산책 중 발견으로 유입. 5/12부터 수업 카운트 시작.',
    }],
  },
];

const SEED_TRIALS = [
  // 회원 전환된 사람들 (체험 이력 보존)
  { name: '이은조', phone: '010-6383-9220', date: '2026-03-26', time: '19:20', experience: '필라테스 1년', painPoints: '목·어깨·등·고관절(좌)', status: '회원전환', convertedAt: '2026-03-26', convertedToMemberId: 'm_leeeunjo', memo: 'open class 체험 → 당일 등록', source: 'open class' },
  { name: '정하니', phone: '010-9597-8967', date: '2026-04-02', time: '11:00', experience: '요가 2개월', painPoints: '', status: '회원전환', convertedAt: '2026-04-07', convertedToMemberId: 'm_jeonghani', memo: '화,목 오전 희망' },
  { name: '김재영', phone: '010-7466-1129', date: '2026-04-07', time: '20:50', experience: '요가 6년, 필라테스 3년', painPoints: '목·허리·고관절·무릎', status: '회원전환', convertedAt: '2026-04-07', convertedToMemberId: 'm_kimjaeyoung', memo: '오후 20시50분 요청', source: '카채널', paid: true },
  { name: '마영선', phone: '010-3359-4523', date: '2026-04-09', time: '11:00', experience: '필라테스, 발레 조금', painPoints: '어깨', status: '회원전환', convertedAt: '2026-04-14', convertedToMemberId: 'm_mayoungsun', memo: '입금 완', source: '인스타', paid: true },
  { name: '유민경', phone: '010-9586-9433', date: '2026-04-16', time: '20:50', experience: '요가, 클라이밍', painPoints: '허리', status: '회원전환', convertedAt: '2026-04-16', convertedToMemberId: 'm_yuminkyung', memo: '체험 당일 정식 등록', paid: true },
  { name: '권민서', phone: '010-7139-6369', date: '2026-04-23', time: '11:00', experience: '웨이트 3~4년, 클라이밍 1년', painPoints: '허리 전방경사', status: '회원전환', convertedAt: '2026-04-23', convertedToMemberId: 'm_kwonminseo', memo: '체험 당일 정식 등록', source: '인스타' },

  // 수업완료 (미전환)
  { name: '박세린', phone: '010-8417-5503', date: '2026-03-26', time: '19:20', experience: '요가 잠깐 경험', painPoints: '불편한 곳 없음', status: '수업완료', memo: 'open class 체험' },
  { name: '이유리', phone: '010-7342-2046', date: '2026-03-26', time: '19:20', experience: '', painPoints: '', status: '수업완료', memo: 'open class 체험, 기상담자' },
  { name: '김재원', phone: '010-9930-2709', date: '2026-03-26', time: '19:20', experience: '요가 경험 있음 (최근 한 달 쉼)', painPoints: '승모근·어깨·쇄골 쪽 많이 아픔, 골반 틀어짐, 허벅지 근력 부족', status: '수업완료', memo: 'open class 체험. 원래 자세로 하면서 힘든 자세들이 많음' },
  { name: '정화영', phone: '010-7979-0683', date: '2026-04-02', time: '11:00', experience: '', painPoints: '', status: '수업완료', memo: '' },
  { name: '조상범', date: '2026-03-31', time: '19:20', experience: '', painPoints: '', status: '수업완료', memo: '' },
  { name: '한영원', phone: '010-9497-0136', date: '2026-04-07', time: '20:50', experience: '요가 6년 (코로나 이후 중단)', painPoints: '지금은 몸이 많이 굳음', status: '수업완료', memo: '입금 완', paid: true },
  { name: '문다운', phone: '010-2768-0368', date: '2026-04-14', time: '20:50', experience: '요가 4개월', painPoints: '', status: '수업완료', memo: '', source: '카채널', paid: false },
  { name: '김백준', date: '2026-04-14', time: '20:50', experience: '처음', painPoints: '', status: '수업완료', memo: '20:50 체험 신청', source: '카채널', paid: false },
  { name: '한아영', phone: '010-5032-8983', date: '2026-04-23', time: '11:00', experience: '요가 경험 있음', painPoints: '몸이 잘 붓고 어깨·목 긴장도 높음', status: '수업완료', memo: '', source: '카채널', paid: true },
  { name: '김혜정', phone: '010-3143-3536', date: '2026-04-28', time: '19:20', experience: '요가 경험 무', painPoints: '해당없음', status: '예약확정', memo: '4/23 19:20 요청 → 4/28 19:20으로 변경 요청', source: '카채널', paid: true },
  { name: '고하은', phone: '010-6888-4056', date: '2026-04-28', time: '19:20', experience: '요가 경험 유', painPoints: '해당없음', status: '예약확정', memo: '4/23 19:20 요청 → 4/28 19:20으로 변경 요청', source: '카채널', paid: true },
  { name: '김정락', phone: '010-9182-2222', date: '2026-04-28', time: '19:20', experience: '요가 4~5번', painPoints: '허리, 등', status: '예약확정', memo: '', source: '카채널', paid: true },
  { name: '송유진', phone: '010-7484-0502', date: '2026-04-28', time: '19:20', experience: '요가 경험 없음', painPoints: '불편한 부위 없음', status: '예약확정', memo: '', source: '인스타', paid: true },
  { name: '손보민', phone: '010-2240-2272', date: '2026-04-28', time: '20:50', experience: '없음', painPoints: '거북목, 목·어깨 간헐적 통증', status: '예약확정', memo: '이전에 요가 체험 해봤는데 호흡 하는 게 어려웠음. 호흡이나 이런 것에 대해 알고 싶음.', source: '카채널', paid: false },
  { name: '윤지원', phone: '010-3001-3915', date: '2026-04-28', time: '20:50', experience: '요가 1년 전에 9개월 정도', painPoints: '몸의 불편함 없음', status: '예약확정', memo: '정말 오랜만에 하는 요가!', source: '카채널', paid: false },

  // 예약확정 (아직 체험 전)
  { name: '김선정', phone: '010-2764-1782', date: '2026-04-23', time: '19:20', experience: '요가 1년 정도 (초보 수준)', painPoints: '목디스크(경미), 손가락 방아쇠증후군', status: '회원전환', convertedAt: '2026-04-23', convertedToMemberId: 'm_kimsunjung', memo: '산책 중 발견. 52세. 프리랜서라 시간 유동적. 4/23 체험 당일 정식 등록.', source: '산책 중 발견', paid: false },

  // 취소
  { name: '유진주', phone: '010-9436-8263', date: '2026-04-09', time: '11:00', experience: '', painPoints: '', status: '취소', memo: '몸살로 체험 취소', source: '당근', paid: false },
];

const SEED_CLASSLOG = {
  '2026-03-26': [
    { id: 'cl_0326_1920', time: '19:20', content: 'open class 체험 수업 (4인)\n우카타에서 런지 반복, 등 후면 상체 이완' },
  ],
  '2026-03-31': [
    { id: 'cl_0331_1920', time: '19:20', content: '상체 풀기 & 런지' },
  ],
  '2026-04-02': [
    { id: 'cl_0402_1100', time: '11:00', content: '체험 (2인)' },
    { id: 'cl_0402_1230', time: '12:30', content: '개인레슨\n바르게 선 자세, 상체 풀기' },
    { id: 'cl_0402_1920', time: '19:20', content: '런지에서 삼각자세\n바시스타아사나' },
  ],
  '2026-04-07': [
    { id: 'cl_0407_1100', time: '11:00', content: '골반 풀기' },
    { id: 'cl_0407_1230', time: '12:30', content: '개인레슨\n몸 순환, 골반의 다양한 열기, 상체 풀기' },
    { id: 'cl_0407_1920', time: '19:20', content: '선1, 선2\n셋뚜반다아사나 다리 들기' },
    { id: 'cl_0407_2050', time: '20:50', content: '체험 2인\n셋뚜반다아사나 다리 들기' },
  ],
  '2026-04-09': [
    { id: 'cl_0409_1100', time: '11:00', content: '정하니, 체험 1인' },
    { id: 'cl_0409_1920', time: '19:20', content: '우스트라아사나' },
    { id: 'cl_0409_2050', time: '20:50', content: '감기로 노쇼' },
  ],
  '2026-04-14': [
    { id: 'cl_0414_1100', time: '11:00', content: '다누라아사나' },
    { id: 'cl_0414_1230', time: '12:30', content: '캔슬' },
    { id: 'cl_0414_1500', time: '15:00', content: '개인레슨 · 손발 간격 / 런지 준비 간격' },
    { id: 'cl_0414_1920', time: '19:20', content: '수리야나마스카라 A\n다누라아사나' },
    { id: 'cl_0414_2050', time: '20:50', content: '바시스타아사나' },
  ],
  '2026-04-16': [
    { id: 'cl_0416_1100', time: '11:00', content: '비튼 측각도' },
    { id: 'cl_0416_1500', time: '15:00', content: '캔슬' },
    { id: 'cl_0416_1920', time: '19:20', content: '비튼 측각도' },
    { id: 'cl_0416_2050', time: '20:50', content: '비튼 측각도' },
  ],
  '2026-04-20': [
    { id: 'cl_0420_1500', time: '15:00', content: '개인레슨 · 하이런지 - 전사2' },
  ],
  '2026-04-21': [
    { id: 'cl_0421_1100', time: '11:00', content: '바시스타아사나' },
    { id: 'cl_0421_1230', time: '12:30', content: '개인레슨\n케어링 몸 풀기' },
    { id: 'cl_0421_1920', time: '19:20', content: '캔슬' },
    { id: 'cl_0421_2050', time: '20:50', content: '비둘기 자세' },
  ],
  '2026-04-22': [
    { id: 'cl_0422_1500', time: '15:00', content: '개인레슨 · 하이런지 전사2 측각도' },
  ],
  '2026-04-23': [
    { id: 'cl_0423_1100', time: '11:00', content: '극락조' },
    { id: 'cl_0423_1920', time: '19:20', content: '' },
    { id: 'cl_0423_2050', time: '20:50', content: '' },
  ],
  '2026-04-24': [
    { id: 'cl_0424_1500', time: '15:00', content: '개인레슨 · 하이런지 전사2 측각도 삼각자세' },
  ],
};

const SEED_SESSIONS_RAW = [
  ['2026-03-26', '19:20', [
    { n: '박세린', t: true }, { n: '이유리', t: true },
    { n: '김재원', t: true }, { n: '이은조', t: true },
  ], 'open class'],
  ['2026-03-31', '19:20', [
    { n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 1, tot: 8 },
    { n: '조상범', t: true },
  ]],
  ['2026-04-02', '11:00', [{ n: '정하니', t: true }, { n: '정화영', t: true }]],
  ['2026-04-02', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', pid: 'p_kuh_starter', sn: 1, tot: 3, classType: '개인' }]],
  ['2026-04-02', '19:20', [{ n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 2, tot: 8 }]],
  ['2026-04-07', '11:00', [{ n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 1, tot: 8 }]],
  ['2026-04-07', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', pid: 'p_kuh_starter', sn: 2, tot: 3, classType: '개인' }]],
  ['2026-04-07', '19:20', [{ n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 3, tot: 8 }]],
  ['2026-04-07', '20:50', [{ n: '김재영', t: true }, { n: '한영원', t: true }]],
  ['2026-04-09', '11:00', [
    { n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 2, tot: 8 },
    { n: '마영선', t: true },
  ]],
  ['2026-04-09', '19:20', [{ n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 4, tot: 8 }]],
  ['2026-04-14', '11:00', [
    { n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 3, tot: 8 },
    { n: '마영선', mid: 'm_mayoungsun', pid: 'p_my1', sn: 1, tot: 24 },
  ]],
  // 김은화 4/14 미차감 취소
  ['2026-04-14', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', cancelled: 'no_charge', cancelNote: '4시간 전 취소' }]],
  ['2026-04-14', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys1', sn: 1, tot: 4 }]],
  ['2026-04-14', '19:20', [{ n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 5, tot: 8 }]],
  ['2026-04-14', '20:50', [
    { n: '김재영', mid: 'm_kimjaeyoung', pid: 'p_kjy1', sn: 1, tot: 16 },
    { n: '문다운', t: true }, { n: '김백준', t: true },
  ]],
  ['2026-04-16', '11:00', [
    { n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 4, tot: 8 },
    { n: '마영선', mid: 'm_mayoungsun', pid: 'p_my1', sn: 2, tot: 24 },
    { n: '한영미', t: true }, { n: '최윤형', t: true }, { n: '소정선', t: true },
  ]],
  ['2026-04-16', '19:20', [{ n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 6, tot: 8 }]],
  ['2026-04-16', '20:50', [
    { n: '김재영', mid: 'm_kimjaeyoung', pid: 'p_kjy1', sn: 2, tot: 16 },
    { n: '유민경', t: true },
  ]],
  ['2026-04-20', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys1', sn: 2, tot: 4 }]],
  ['2026-04-21', '11:00', [
    { n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 5, tot: 8 },
    { n: '마영선', mid: 'm_mayoungsun', pid: 'p_my1', sn: 3, tot: 24 },
  ]],
  ['2026-04-21', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', pid: 'p_kuh_starter', sn: 3, tot: 3, classType: '개인' }]],
  ['2026-04-21', '19:20', [
    { n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', cancelled: 'no_charge', cancelNote: '미차감 취소' },
  ]],
  ['2026-04-21', '20:50', [{ n: '김재영', mid: 'm_kimjaeyoung', pid: 'p_kjy1', sn: 3, tot: 16 }]],
  ['2026-04-22', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys1', sn: 3, tot: 4 }]],
  ['2026-04-23', '11:00', [
    { n: '정하니', mid: 'm_jeonghani', pid: 'p_jh1', sn: 6, tot: 8 },
    { n: '마영선', mid: 'm_mayoungsun', pid: 'p_my1', sn: 4, tot: 24 },
    { n: '권민서', t: true },
    { n: '한아영', t: true },
  ]],
  ['2026-04-23', '19:20', [
    { n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', cancelled: 'no_charge', cancelNote: '오늘 수업 빠짐' },
    { n: '김선정', t: true },
  ]],
  ['2026-04-23', '20:50', [
    { n: '김재영', mid: 'm_kimjaeyoung', pid: 'p_kjy1', sn: 4, tot: 16 },
    { n: '유민경', mid: 'm_yuminkyung', pid: 'p_ymk1', sn: 1, tot: 8 },
  ]],
  ['2026-04-24', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys1', sn: 4, tot: 4 }]],
  ['2026-04-29', '16:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys_starter_pvt', sn: 1, tot: 3, classType: '개인' }]],
  ['2026-05-06', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys_starter_pvt', sn: 2, tot: 3, classType: '개인' }]],
  ['2026-05-08', '15:00', [{ n: '유연선', mid: 'm_yuyeonseon', pid: 'p_yys_starter_pvt', sn: 3, tot: 3, classType: '개인' }]],
  ['2026-04-28', '19:20', [
    { n: '이은조', mid: 'm_leeeunjo', pid: 'p_lej1', sn: 7, tot: 8 },
    { n: '김재영', mid: 'm_kimjaeyoung', pid: 'p_kjy1', sn: 5, tot: 16 },
    { n: '김정락', t: true },
    { n: '김혜정', t: true },
    { n: '고하은', t: true },
    { n: '송유진', t: true },
  ]],
  ['2026-04-28', '20:50', [
    { n: '손보민', t: true },
    { n: '윤지원', t: true },
  ]],
  ['2026-04-28', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', pid: 'p_kuh_private5', sn: 4, tot: 5, classType: '개인' }]],
  ['2026-05-12', '12:30', [{ n: '김은화', mid: 'm_kimunhwa', pid: 'p_kuh_private5', sn: 5, tot: 5, classType: '개인' }]],
];

function buildSeedSessions() {
  const out = {};
  for (const [date, time, parts, note] of SEED_SESSIONS_RAW) {
    out[`${date}_${time}`] = {
      date, time, note,
      participants: parts.map(p => ({
        memberName: p.n, memberId: p.mid, passId: p.pid,
        sessionNumber: p.sn, totalSessions: p.tot, isTrial: !!p.t,
        classType: p.classType,
        cancelled: p.cancelled, // 'no_charge' | 'charged' | undefined
        cancelNote: p.cancelNote,
      })),
    };
  }
  return out;
}

/* =========================================================
   Pass / member helpers
   ========================================================= */
function activePass(member, category) {
  if (!member?.passes?.length) return null;
  const today = toYMD(new Date());
  const active = member.passes
    .filter(p => !p.archived && p.usedSessions < p.totalSessions && p.expiryDate >= today)
    .filter(p => !category || p.category === category)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return active[0] || null;
}

// 차감 판정 - 모든 곳에서 이 함수 하나만 사용 (saveSession, 마이그레이션, 통계)
// 차감 대상: 출석(기본), 노쇼, 당일취소(charged)
// 차감 안 함: 예약확정(reserved), 사전취소, 당일취소(no_charge)
function isPartCharged(p) {
  if (!p) return false;
  // 새 status 시스템
  if (p.status === 'reserved') return false;
  if (p.status === 'cancelled_advance') return false;
  if (p.status === 'cancelled_sameday') return p.cancelled === 'charged';
  if (p.status === 'no_show') return true;
  // 옛 cancelled 시스템 호환
  if (p.cancelled === 'no_charge') return false;
  if (p.cancelled === 'charged') return true;
  // 기본: 출석으로 간주 → 차감
  return true;
}

function passStatus(p) {
  if (!p) return null;
  const today = toYMD(new Date());
  const daysLeft = daysBetween(today, p.expiryDate);
  const daysUntilStart = p.startDate > today ? daysBetween(today, p.startDate) : 0;
  const done = p.usedSessions >= p.totalSessions;

  let tone, label;

  if (p.archived && p.convertedTo) {
    return { tone: 'neutral', label: '전환됨', daysLeft, done };
  }
  if (done) {
    return { tone: 'success', label: '완료', daysLeft, done };
  }
  if (p.expiryDate < today) {
    return { tone: 'danger', label: '만료', daysLeft, done };
  }
  // 홀딩 중
  if (p.holdUsed && p.holdStart && p.holdEnd) {
    const holdEndDate = p.holdEnd;
    if (today >= p.holdStart && today <= holdEndDate) {
      return { tone: 'warn', label: '홀딩', daysLeft, done };
    }
  }
  // 아직 시작 안 함
  if (p.startDate > today) {
    if (daysUntilStart <= 7) {
      return { tone: 'warn', label: '시작예정', daysLeft, done, notStarted: true, daysUntilStart };
    }
    return { tone: 'neutral', label: '시작예정', daysLeft, done, notStarted: true };
  }
  // 진행 중 + 만료 임박
  if (daysLeft <= 7) {
    return { tone: 'danger', label: `D-${daysLeft}`, daysLeft, done };
  }
  return { tone: 'accent', label: '진행중', daysLeft, done };
}

/* =========================================================
   Rhythm Reward — 리듬 수련 보상 계산
   1개월(8회): 4주 동안 화·목 빠지지 않고 출석 → +1회
   3개월(24회): 12주 동안 화·목 빠지지 않고 출석 → +3회
   - 면제일 (공휴일 / 휴강일 / 회원 홀딩 기간): 카운트에서 제외
   - 결석 (예약취소·당일취소·노쇼): 1회라도 있으면 탈락
   ========================================================= */
// 두 날짜 사이의 화·목 날짜 목록 (시작일 포함, 종료일 포함)
function tueThuDatesBetween(startYMD, endYMD) {
  const dates = [];
  let d = fromYMD(startYMD);
  const end = fromYMD(endYMD);
  while (d <= end) {
    const dow = d.getDay();
    if (dow === 2 || dow === 4) dates.push(toYMD(d));
    d = addDays(d, 1);
  }
  return dates;
}

// 그날이 면제 대상인가? (공휴일 / 휴강일 / 홀딩 기간)
function isExemptDay(ymd, pass, closedDays) {
  if (HOLIDAYS.has(ymd)) return true;
  if (Array.isArray(closedDays) && closedDays.some(c => c.date === ymd)) return true;
  // 홀딩 기간 (pass.holdStart ~ pass.holdEnd 사이)
  if (pass?.holdStart && pass?.holdEnd && ymd >= pass.holdStart && ymd <= pass.holdEnd) return true;
  return false;
}

function rhythmStatus(p, closedDays = []) {
  if (!p) return null;
  if (p.archived) return null;
  if (p.category === 'trial') return null;
  if (p.category === 'private') return null; // 개인레슨은 대상 X
  
  // 자격 대상 수강권 종류 판단
  let weeks, bonus;
  if (p.totalSessions === 8) {
    weeks = 4; bonus = 1; // 1개월 8회
  } else if (p.totalSessions === 16) {
    weeks = 8; bonus = 2; // 2개월 16회 (단종, 옛 회원만)
  } else if (p.totalSessions === 24) {
    weeks = 12; bonus = 3; // 3개월 24회
  } else {
    return null; // 대상 아님
  }
  
  if (!p.startDate) return null;
  const todayMs = new Date().setHours(0,0,0,0);
  const todayStr = toYMD(new Date());
  
  // 도전 기준일 = 첫 출석일 (sessionDates의 가장 이른 날짜).
  // 출석 0회면 수강권 시작일을 임시 기준으로 함 (시작 전 / 막 시작 회원 표시용).
  const sortedDates = [...(p.sessionDates || [])].sort();
  const firstAttendDate = sortedDates[0] || null;
  const challengeStartYMD = firstAttendDate || p.startDate;
  const challengeStartMs = fromYMD(challengeStartYMD).getTime();
  
  // 도전 종료일 = 기준일 + (weeks * 7 - 1)일
  // 단, 그 기간 안에 면제일(공휴일/휴강일/홀딩)이 끼면 그만큼 연장
  let challengeEndYMD = toYMD(addDays(fromYMD(challengeStartYMD), weeks * 7 - 1));
  // 면제일 만큼 연장 - 화/목인 면제일만 카운트 (다른 요일은 도전과 무관)
  const initialSlotsAll = tueThuDatesBetween(challengeStartYMD, challengeEndYMD);
  const exemptCount = initialSlotsAll.filter(d => isExemptDay(d, p, closedDays)).length;
  if (exemptCount > 0) {
    // 한 주에 화/목 2슬롯 = 7일이 한 주. 면제 슬롯 1개당 한 주 연장이 아닌, 
    // 정확히 슬롯 1개만큼 연장 = 다음 화/목까지 (3.5일 평균)
    // 단순화: 면제 슬롯 1개당 7일(한 주) 연장하면 안전하게 슬롯 한 개 더 확보
    challengeEndYMD = toYMD(addDays(fromYMD(challengeEndYMD), exemptCount * 7));
  }
  const challengeEndMs = fromYMD(challengeEndYMD).getTime();
  
  // 아직 첫 출석 전(=수강권 시작도 안 했거나, 시작했지만 한 번도 안 옴)
  const startMs = fromYMD(p.startDate).getTime();
  if (todayMs < startMs) {
    return { eligible: true, notStarted: true, weeks, bonus, challengeEndYMD };
  }
  // 시작은 했는데 출석이 0회면 — 도전은 첫 출석부터 시작이라 아직 트래커 표시 X
  if (!firstAttendDate) {
    return { eligible: true, notStarted: true, weeks, bonus };
  }
  
  // 도전 기간 내의 모든 화·목 날짜 (첫 출석일부터)
  const allTueThu = tueThuDatesBetween(challengeStartYMD, challengeEndYMD);
  // 면제일 제외 → 진짜 와야 할 슬롯 후보
  const validSlots = allTueThu.filter(d => !isExemptDay(d, p, closedDays));
  
  // 출석한 날짜
  const attendedSet = new Set(sortedDates);
  
  // 결석 검증: validSlots 중 오늘까지 지나간 날들 점검 (화·목인데 안 온 날)
  const passedSlots = validSlots.filter(d => d <= todayStr);
  const missedDays = passedSlots.filter(d => !attendedSet.has(d));
  
  // requiredDays = 수강권 총 회수 (8 / 16 / 24)
  // attendedDays = 실제 출석한 회수 (sessionDates 길이)
  const requiredCount = p.totalSessions;
  const attendedCount = sortedDates.length;
  const remaining = Math.max(0, requiredCount - attendedCount);
  
  // 도전 기간 종료 후 판정
  if (todayMs > challengeEndMs) {
    const allCovered = missedDays.length === 0 && attendedCount >= requiredCount;
    return {
      eligible: true,
      completed: true,
      achieved: allCovered,
      weeks, bonus,
      challengeEndYMD,
      requiredDays: requiredCount,
      attendedDays: attendedCount,
      missedDays,
      message: allCovered 
        ? `${weeks}주 빠짐없이 완주`
        : `${missedDays.length}회 결석 (목표 미달)`,
    };
  }
  
  // 진행 중 — 이미 결석이 있으면 탈락 확정
  if (missedDays.length > 0) {
    return {
      eligible: true,
      completed: false,
      achieved: false,
      challenging: false,
      expired: true,
      weeks, bonus,
      challengeEndYMD,
      requiredDays: requiredCount,
      attendedDays: attendedCount,
      missedDays,
      message: `${missedDays.length}회 결석으로 탈락`,
    };
  }
  
  // 도전 중 — 아직 결석 없음
  return {
    eligible: true,
    completed: false,
    achieved: false,
    challenging: true,
    weeks, bonus,
    challengeEndYMD,
    requiredDays: requiredCount,
    attendedDays: attendedCount,
    remaining,
    message: remaining > 0 
      ? `남은 ${remaining}회 빠짐없이`
      : `완주 직전`,
  };
}

// 회원의 활성 수강권 중 리듬 수련 상태
function memberRhythmStatus(member, closedDays = []) {
  if (!member?.passes) return null;
  // 소그룹 활성 수강권만 (개인레슨은 대상 X)
  const active = member.passes.find(p => !p.archived && p.category === 'group' && p.totalSessions);
  if (!active) return null;
  return rhythmStatus(active, closedDays);
}

/* =========================================================
   Anthropic API
   ========================================================= */
// 이미지를 base64로 변환하면서 자동 압축 (큰 사진을 1568px로 리사이즈, JPEG 80%)
// → fetch body 크기 줄여서 "string did not match the expected pattern" 에러 회피
async function fileToCompressedBase64(file, maxDim = 1280, quality = 0.75) {
  // 이미지 로드 - createImageBitmap 사용해서 EXIF orientation 자동 보정
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    // createImageBitmap 미지원 환경 → 폴백
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('파일 읽기 실패'));
      r.readAsDataURL(file);
    });
    bitmap = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('이미지 디코드 실패'));
      i.src = dataUrl;
    });
  }
  // 리사이즈 비율 계산
  const w0 = bitmap.width, h0 = bitmap.height;
  const ratio = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.round(w0 * ratio);
  const h = Math.round(h0 * ratio);
  // canvas로 압축
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, w, h);
  // JPEG로 인코딩 (PNG보다 훨씬 작음)
  const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
  // base64만 추출 + 정리
  const raw = compressedDataUrl.split(',')[1] || '';
  const clean = raw.replace(/[\r\n\s]/g, '');
  // bitmap 메모리 해제
  if (bitmap.close) bitmap.close();
  return { data: clean, media_type: 'image/jpeg' };
}

async function callClaude(messages, system, modelOverride) {
  const body = { 
    model: modelOverride || 'claude-sonnet-4-5', 
    max_tokens: 4096, 
    messages,
  };
  if (system) body.system = system;
  
  // body 직렬화 단계
  let bodyStr;
  try {
    bodyStr = JSON.stringify(body);
  } catch (e) {
    throw new Error(`JSON.stringify 실패: ${e.message}`);
  }
  
  const sizeMB = (bodyStr.length / 1024 / 1024).toFixed(2);
  
  // fetch 호출
  let res;
  try {
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: bodyStr,
      cache: 'no-store',
    });
  } catch (e) {
    throw new Error(`fetch 실패 (body ${sizeMB}MB): ${e.message}`);
  }
  
  // 응답 파싱
  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`응답 파싱 실패 (status ${res.status}, body ${sizeMB}MB): ${e.message}`);
  }
  
  // 에러 응답 처리
  if (!res.ok || data.error) {
    let errMsg = data.error || data.detail || `API 에러 (${res.status})`;
    if (data.detail && typeof data.detail === 'object') {
      errMsg += ' [' + JSON.stringify(data.detail) + ']';
    }
    if (data.imageInfo) {
      errMsg += ' [imgs: ' + JSON.stringify(data.imageInfo) + ']';
    }
    if (data.anthropicStatus) {
      errMsg += ' [Anthropic ' + data.anthropicStatus + ']';
    }
    errMsg += ` (body ${sizeMB}MB)`;
    throw new Error(errMsg);
  }
  return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
}

function tryParseJSON(text) {
  let t = text.replace(/```json|```/g, '').trim();
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try { return JSON.parse(t); } catch { return null; }
}

/* =========================================================
   Shared UI
   ========================================================= */
function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', type = 'button', icon: Icon }) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium transition-all rounded-lg border';
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-4 py-2.5 text-sm' };
  const variants = {
    primary: 'text-white border-transparent',
    soft: '', ghost: 'border-transparent',
    danger: 'text-white border-transparent',
    accent: 'text-white border-transparent',
  };
  const style = variant === 'primary'
    ? { backgroundColor: theme.accent, color: '#FFFFFF' }
    : variant === 'accent'
    ? { backgroundColor: theme.accent2, color: '#FFFFFF' }
    : variant === 'soft'
    ? { backgroundColor: theme.cardAlt, color: theme.ink, borderColor: theme.line }
    : variant === 'danger'
    ? { backgroundColor: theme.danger, color: '#FFFFFF' }
    : { color: theme.inkSoft };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-95'}`}
      style={style}>
      {Icon && <Icon size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-xs font-medium mb-1" style={{ color: theme.inkSoft }}>{label}</div>
      {children}
      {hint && <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>{hint}</div>}
    </label>
  );
}

function Input(props) {
  return (
    <input {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 ${props.className || ''}`}
      style={{
        backgroundColor: theme.card, color: theme.ink,
        border: `1px solid ${theme.line}`,
        '--tw-ring-color': theme.accent + '55',
        ...(props.style || {}),
      }} />
  );
}

function TextArea(props) {
  return (
    <textarea {...props}
      className={`w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 ${props.className || ''}`}
      style={{
        backgroundColor: theme.card, color: theme.ink,
        border: `1px solid ${theme.line}`,
        minHeight: 90, resize: 'vertical',
        '--tw-ring-color': theme.accent + '55',
      }} />
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value || ''} onChange={onChange}
      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2"
      style={{
        backgroundColor: theme.card, color: theme.ink,
        border: `1px solid ${theme.line}`,
        '--tw-ring-color': theme.accent + '55',
      }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: '#1F2A22CC', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col`}
        style={{ backgroundColor: theme.card }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: theme.line }}>
          <div className="font-bold text-[15px]" style={{ color: theme.ink, fontFamily: theme.sans }}>{title}</div>
          <button onClick={onClose} className="p-1 rounded-md" style={{ color: theme.inkSoft }}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-4" style={{ color: theme.ink }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Chip({ children, tone = 'neutral', size = 'md' }) {
  const tones = {
    neutral: { bg: theme.cardAlt, fg: theme.ink, bd: theme.line },
    peach: { bg: '#F3DCC4', fg: '#5E3A20', bd: '#D4A876' },
    success: { bg: theme.successBg, fg: theme.success, bd: '#A5B69B' },
    warn: { bg: theme.warnBg, fg: '#5E4520', bd: '#C8A366' },
    danger: { bg: theme.dangerBg, fg: theme.danger, bd: '#D19B91' },
    accent: { bg: theme.accentSoft, fg: theme.accent, bd: '#B7C5AB' },
    terra: { bg: '#F3DCD0', fg: theme.accent2, bd: '#D4A28C' },
    gold: { bg: 'linear-gradient(135deg, #F5E5A8 0%, #E5C870 100%)', fg: '#6B5410', bd: '#C9A961' },
    goldSoft: { bg: '#F5EBC8', fg: '#6B5410', bd: '#C9A961' },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';
  const bgStyle = t.bg.startsWith('linear-gradient') 
    ? { backgroundImage: t.bg } 
    : { backgroundColor: t.bg };
  return (
    <span className={`${sz} rounded-full font-medium inline-flex items-center gap-1`}
      style={{ ...bgStyle, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="text-center py-10" style={{ color: theme.inkMute }}>
      {Icon && <Icon size={32} className="mx-auto mb-2 opacity-60" />}
      <div className="text-sm font-medium" style={{ color: theme.inkSoft }}>{title}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  );
}

function Toast({ msg, onDone }) {
  useEffect(() => {
    if (msg) { 
      // 긴 메시지(에러 진단)는 8초, 짧은 건 2.4초
      const duration = msg.length > 60 ? 12000 : 2400;
      const t = setTimeout(onDone, duration); 
      return () => clearTimeout(t); 
    }
  }, [msg, onDone]);
  if (!msg) return null;
  const isLong = msg.length > 60;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100]" style={{ bottom: 32, maxWidth: '92vw' }}>
      <div className={isLong ? "px-4 py-3 rounded-2xl text-xs shadow-lg" : "px-4 py-2 rounded-full text-sm shadow-lg"}
        style={{ backgroundColor: theme.ink, color: theme.card, wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: '40vh', overflow: 'auto' }}
        onClick={onDone}>
        {msg}
      </div>
    </div>
  );
}

function Section({ title, items, color, bullet = '·' }) {
  return (
    <div>
      <div className="text-[11px] font-semibold mb-1" style={{ color }}>{title}</div>
      <ul className="space-y-1">
        {items.map((o, i) => (
          <li key={`${i}-${typeof o === 'string' ? o.slice(0, 20) : ''}`} className="text-[13px] flex gap-2" style={{ color: theme.ink }}>
            <span style={{ color }}>{bullet}</span><span>{o}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* =========================================================
   Header — 소선요가 with 素禪 · So-Seon
   ========================================================= */
function Header({ tab, setTab, onOpenSettings }) {
  const tabs = [
    { id: 'schedule', label: '일정', icon: Calendar },
    { id: 'members', label: '회원', icon: Users },
    { id: 'trials', label: '체험', icon: UserPlus },
    { id: 'classlog', label: '수업 기록', icon: ClipboardList },
    { id: 'stats', label: '통계', icon: TrendingUp },
  ];
  return (
    <div className="sticky top-0 z-40" style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.line}` }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <div onClick={() => setTab('home')} style={{
            fontFamily: theme.serif,
            fontSize: 30, color: theme.ink,
            letterSpacing: '-0.02em', lineHeight: 1,
            cursor: 'pointer',
          }}>
            소선요가
          </div>
        </div>
        <button onClick={onOpenSettings}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: theme.inkSoft }}
          aria-label="설정">
          <Settings size={18} />
        </button>
      </div>
      <div className="flex gap-1 px-2 pt-1 pb-2 overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] whitespace-nowrap transition-all"
              style={{
                backgroundColor: active ? theme.accent : 'transparent',
                color: active ? theme.card : theme.inkSoft,
                border: active ? 'none' : `1px solid ${theme.line}`,
                fontWeight: active ? 600 : 500,
              }}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   SMS helper — opens native SMS app + copy
   ========================================================= */
function openSMS(phone, body) {
  const cleaned = (phone || '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(body);
  // iOS prefers sms:&body= ; Android prefers sms:?body=
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const sep = isIOS ? '&' : '?';
  const url = cleaned
    ? `sms:${cleaned}${sep}body=${encoded}`
    : `sms:${sep}body=${encoded}`;
  window.location.href = url;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function SMSDialog({ open, onClose, phone, name, template, onConfirmed }) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState('compose'); // compose | confirm
  useEffect(() => {
    if (open) setStep('compose');
  }, [open]);
  if (!open || !template) return null;
  const fullBody = template.body;
  return (
    <Modal open={open} onClose={onClose} title={template.title} maxWidth="max-w-md">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone size={14} style={{ color: theme.accent }} />
          <span className="font-medium" style={{ color: theme.ink }}>{name || '이름 없음'}</span>
          {phone && <span style={{ color: theme.inkMute }}>· {phone}</span>}
        </div>

        {step === 'compose' && (
          <>
            <div className="p-3 rounded-2xl text-[13px] whitespace-pre-wrap"
              style={{ backgroundColor: theme.cardAlt, color: theme.ink, border: `1px solid ${theme.lineLight}` }}>
              {fullBody}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={async () => {
                  const ok = await copyText(fullBody);
                  if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1500); }
                }}
                className="py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: theme.cardAlt, color: theme.ink,
                  border: `1px solid ${theme.line}`,
                }}>
                <Copy size={14} /> {copied ? '복사됨' : '내용 복사'}
              </button>
              <button onClick={() => {
                  openSMS(phone, fullBody);
                  setStep('confirm');
                }}
                className="py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                <MessageSquare size={14} /> 문자 앱 열기
              </button>
            </div>
            <div className="text-[11px] text-center" style={{ color: theme.inkMute }}>
              문자는 기기의 기본 문자 앱에서 발송됩니다
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: theme.highlight }}>
              <div className="text-sm font-bold mb-1" style={{ color: theme.ink }}>
                {name || '이 회원'}님께 문자를 보내셨나요?
              </div>
              <div className="text-[11px]" style={{ color: theme.inkSoft }}>
                보냈다고 체크하면 오늘 알림에서 사라져요
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setStep('compose'); }}
                className="py-2.5 rounded-lg text-sm font-medium"
                style={{ backgroundColor: theme.cardAlt, color: theme.ink, border: `1px solid ${theme.line}` }}>
                아직 안 보냈어요
              </button>
              <button onClick={() => {
                  onConfirmed && onConfirmed();
                  onClose();
                }}
                className="py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                <Check size={14} /> 보냈어요
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
   Home Dashboard — today's tasks with dismiss
   ========================================================= */
function HomeView({ members, sessions, trials, classLog, dashDismiss, setDashDismiss, smsConfirmed = {}, closedDays = [], groupSlots = [], toast, onSendSMS, goto, onOpenSettings }) {
  const todayYMD = toYMD(new Date());
  const dismissedToday = (dashDismiss[todayYMD] || []);
  const [daysSinceBackup, setDaysSinceBackup] = useState(null);

  useEffect(() => {
    (async () => {
      const last = await loadKey(K_LAST_BACKUP, null);
      if (!last) { setDaysSinceBackup(999); return; }
      setDaysSinceBackup(Math.floor((Date.now() - new Date(last).getTime()) / 86400000));
    })();
  }, []);

  // Collect today's alerts
  const alerts = useMemo(() => {
    const list = [];
    members.forEach(m => {
      const pass = activePass(m);
      if (!pass) return;
      const remaining = pass.totalSessions - pass.usedSessions;
      const daysLeft = daysBetween(todayYMD, pass.expiryDate);

      // Expiring soon by sessions (≤2 remaining and still active)
      if (remaining <= 2 && remaining > 0) {
        list.push({
          id: `exp-sess-${m.id}-${pass.id}`,
          kind: 'expiring',
          priority: 1,
          member: m, pass,
          title: `${m.name} · 수강권 ${remaining}회 남음`,
          desc: '수강권 소진 안내 문자',
          template: SMS_TEMPLATES.expiring(m, pass),
        });
      }
      // Expired
      if (pass.expiryDate < todayYMD && pass.usedSessions < pass.totalSessions) {
        list.push({
          id: `expired-${m.id}-${pass.id}`,
          kind: 'expired',
          priority: 2,
          member: m, pass,
          title: `${m.name} · 수강권 만료`,
          desc: '수강권 종료 안내 문자',
          template: SMS_TEMPLATES.expired(m, pass),
        });
      }
      // Expiring by date (D-7 이내)
      else if (daysLeft <= 7 && daysLeft >= 0 && remaining > 0) {
        list.push({
          id: `exp-date-${m.id}-${pass.id}`,
          kind: 'expiring_soon',
          priority: 1,
          member: m, pass,
          title: `${m.name} · 만료 D-${daysLeft}`,
          desc: '수강권 소진 안내 문자',
          template: SMS_TEMPLATES.expiring(m, pass),
        });
      }
    });

    // Trial reminders — today or tomorrow trial sessions
    trials.forEach(t => {
      if (t.status === '예약확정' && (t.date === todayYMD || t.date === toYMD(addDays(new Date(), 1)))) {
        list.push({
          id: `trial-${t.id}`,
          kind: 'trial',
          priority: 3,
          trial: t,
          title: `${t.name} · ${fmtKRShort(t.date)} ${t.time} 체험 예약`,
          desc: '체험 예약 안내 문자',
          template: SMS_TEMPLATES.trial(t),
        });
      }
    });

    // Upcoming pass start (D-7 to D-0, not yet started)
    members.forEach(m => {
      (m.passes || []).forEach(p => {
        if (p.archived || p.usedSessions > 0) return;
        if (p.startDate <= todayYMD) return;
        const daysUntilStart = daysBetween(todayYMD, p.startDate);
        if (daysUntilStart <= 7 && daysUntilStart >= 0) {
          list.push({
            id: `startsoon-${m.id}-${p.id}`,
            kind: 'upcoming_start',
            priority: 2,
            member: m, pass: p,
            title: `${m.name} · 수강권 시작 D-${daysUntilStart}`,
            desc: `${fmtKRShort(p.startDate)} 시작 안내 문자`,
            template: SMS_TEMPLATES.upcomingStart(m, p),
          });
        }
      });
    });

    // Private lesson upcoming schedule (members with future private sessions)
    members.forEach(m => {
      const futurePrivate = [];
      Object.values(sessions).forEach(s => {
        if (s.date <= todayYMD) return;
        const part = s.participants.find(p => p.memberId === m.id && !p.cancelled && p.classType === '개인');
        if (part) futurePrivate.push({ date: s.date, time: s.time });
      });
      if (futurePrivate.length > 0) {
        futurePrivate.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        const schedule = futurePrivate.slice(0, 5)
          .map(s => `${fmtKRShort(s.date)} ${s.time}`)
          .join('\n');
        list.push({
          id: `pvtlesson-${m.id}`,
          kind: 'private_schedule',
          priority: 4,
          member: m,
          title: `${m.name} · 개인레슨 ${futurePrivate.length}회 예정`,
          desc: '개인레슨 일정 안내 문자',
          template: SMS_TEMPLATES.privateLessonSchedule(m, schedule),
        });
      }
    });

    const HOUR24 = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return list
      .filter(a => !dismissedToday.includes(a.id))
      .filter(a => {
        const ts = smsConfirmed[a.id];
        if (!ts) return true; // never confirmed → show
        return (now - ts) > HOUR24; // show again if > 24h
      })
      .sort((a, b) => a.priority - b.priority);
  }, [members, trials, sessions, dashDismiss, smsConfirmed, todayYMD]);

  // Today's classes
  const todaySessions = useMemo(() => {
    return Object.values(sessions)
      .filter(s => s.date === todayYMD)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sessions, todayYMD]);

  const dismiss = async (id) => {
    const next = { ...dashDismiss, [todayYMD]: [...dismissedToday, id] };
    setDashDismiss(next);
    await saveKey(K.dashDismiss, next);
  };

  const clearDismissed = async () => {
    const next = { ...dashDismiss };
    delete next[todayYMD];
    setDashDismiss(next);
    await saveKey(K.dashDismiss, next);
  };

  const activeMembers = members.filter(m => activePass(m)).length;
  const expiringMembersList = members.map(m => {
    const p = activePass(m);
    if (!p) return null;
    const d = daysBetween(todayYMD, p.expiryDate);
    if (d > 7 || d < 0) return null;
    return { member: m, pass: p, daysLeft: d };
  }).filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft);
  const expiringSoon = expiringMembersList.length;
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const todayTrials = trials.filter(t => 
    t.date === todayYMD && 
    (t.status === '예약확정' || t.status === '회원전환')
  ).length;
  
  // 모달 state
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  
  // === 정원 현황 (소그룹 화·목 시간대별 등록 인원) ===
  // CAPACITY: 정원 4명 (옵션 1: 거의참=정원의 75% 이상, 마감=정원 다 참)
  const CAPACITY = 4;
  const capacityStatus = useMemo(() => {
    // 각 시간대별로 화/목에 등록된 회원 수 계산
    // fixedSlots 기반 (활성 수강권 + 시작일~만료일 범위 안에 있는 회원만)
    // 화·목 시간대는 groupSlots 활용
    const result = []; // [{ time, tue, thu }]
    (groupSlots || []).forEach(time => {
      const tueMembers = members.filter(m => {
        if (!m.fixedSlots?.some(fs => fs.dow === 2 && fs.time === time)) return false;
        const validPass = (m.passes || []).find(p => 
          !p.archived && p.startDate && p.expiryDate
          && (p.category === 'group')
        );
        return !!validPass;
      });
      const thuMembers = members.filter(m => {
        if (!m.fixedSlots?.some(fs => fs.dow === 4 && fs.time === time)) return false;
        const validPass = (m.passes || []).find(p => 
          !p.archived && p.startDate && p.expiryDate
          && (p.category === 'group')
        );
        return !!validPass;
      });
      result.push({ time, tueCount: tueMembers.length, thuCount: thuMembers.length });
    });
    return result;
  }, [members, groupSlots]);
  
  // 정원 상태 라벨 / 색깔
  const getCapacityState = (count) => {
    if (count >= CAPACITY) return 'full'; // 마감
    if (count >= Math.ceil(CAPACITY * 0.75)) return 'near'; // 거의참 (4명 정원이면 3명+)
    return 'free'; // 여유
  };
  
  // 자동 알림 데이터
  const homeAlerts = useMemo(() => {
    const alerts = [];
    // 오늘 첫 수업 (시작일 = 오늘인 회원 + 오늘 수업 있음)
    members.forEach(m => {
      const pass = activePass(m);
      if (!pass) return;
      if (pass.startDate === todayYMD) {
        const hasToday = todaySessions.some(s => 
          s.participants?.some(p => p.memberId === m.id && !p.cancelled)
        );
        if (hasToday) {
          alerts.push({ icon: '🌱', name: m.name, suffix: '님 첫 수업이에요' });
        }
      }
    });
    // 리듬 수련 대상자
    members.forEach(m => {
      const pass = activePass(m);
      if (!pass) return;
      const rs = rhythmStatus(pass, closedDays);
      if (rs?.achieved) {
        alerts.push({ icon: '🏆', name: m.name, suffix: '님 리듬 수련 대상자에요' });
      }
    });
    // 만료 D-3 이내 (활성)
    expiringMembersList.filter(x => x.daysLeft <= 3).forEach(({ member, daysLeft }) => {
      alerts.push({ 
        icon: '⚠', 
        name: member.name,
        suffix: `님 만료 ${daysLeft === 0 ? '오늘' : `D-${daysLeft}`}`
      });
    });
    return alerts;
  }, [members, todayYMD, todaySessions, expiringMembersList, closedDays]);

  return (
    <div className="px-3 pb-28 pt-2 space-y-3">

      {/* 통합 카드: 인사 + 통계 + 오늘 수업 + 알림 */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        {/* 인사 + 통계 */}
        <div className="p-4">
          <div className="text-[11px]" style={{ color: theme.inkMute }}>{fmtKR(new Date())}</div>
          <div className="text-lg font-bold mt-0.5 mb-3" style={{ color: theme.ink }}>
            {isWeekend ? '오늘은 푹 쉬면서 충전 😴' : '오늘도 재밌게 수업하자 😘'}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => goto('members')} className="rounded-xl p-3 text-center transition-all active:scale-95"
              style={{ backgroundColor: theme.cardAlt2, border: 'none', cursor: 'pointer' }}>
              <div className="font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif, fontSize: 26, lineHeight: 1 }}>
                {activeMembers}
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: theme.inkMute }}>활성 회원</div>
            </button>
            <button 
              onClick={() => expiringSoon > 0 && setShowExpiringModal(true)}
              disabled={expiringSoon === 0}
              className="rounded-xl p-3 text-center transition-all active:scale-95 disabled:opacity-60"
              style={{ backgroundColor: theme.cardAlt2, border: 'none', cursor: expiringSoon > 0 ? 'pointer' : 'default' }}>
              <div className="font-bold tabular-nums" style={{ color: expiringSoon > 0 ? theme.accent2 : theme.accent, fontFamily: theme.serif, fontSize: 26, lineHeight: 1 }}>
                {expiringSoon}
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: theme.inkMute }}>만료 임박</div>
            </button>
            <button onClick={() => goto('trials')} className="rounded-xl p-3 text-center transition-all active:scale-95"
              style={{ backgroundColor: theme.cardAlt2, border: 'none', cursor: 'pointer' }}>
              <div className="font-bold tabular-nums" style={{ color: todayTrials > 0 ? theme.accent2 : theme.accent, fontFamily: theme.serif, fontSize: 26, lineHeight: 1 }}>
                {todayTrials}
              </div>
              <div className="text-[10px] mt-1.5" style={{ color: theme.inkMute }}>오늘 체험</div>
            </button>
          </div>
        </div>

        {/* 오늘 수업 */}
        {!isWeekend && (
          <>
            <div style={{ height: 1, background: theme.cardAlt }} />
            <div onClick={() => goto('schedule')} className="p-4 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: theme.ink }}>
                  <Calendar size={14} style={{ color: theme.accent }} />
                  <span>오늘 수업</span>
                  {todaySessions.length > 0 && (
                    <span className="text-[11px] font-normal" style={{ color: theme.inkMute }}>{todaySessions.length}개</span>
                  )}
                </div>
                <ChevronRight size={14} style={{ color: theme.inkMute }} />
              </div>
              {todaySessions.length === 0 ? (
                <div className="text-[12px]" style={{ color: theme.inkMute }}>오늘 예정된 수업이 없어요</div>
              ) : (
                <div className="space-y-1.5">
                  {todaySessions.map(s => {
                    const active = s.participants.filter(p => !p.cancelled);
                    const cancelled = s.participants.filter(p => p.cancelled);
                    const sortedActive = [...active].sort((a, b) => {
                      if (a.isTrial && !b.isTrial) return 1;
                      if (!a.isTrial && b.isTrial) return -1;
                      return 0;
                    });
                    return (
                      <div key={s.date + s.time} className="flex items-start gap-2">
                        <span className="text-[13px] font-bold tabular-nums shrink-0"
                          style={{ color: theme.accent, fontFamily: theme.serif, minWidth: 44 }}>
                          {s.time}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          {sortedActive.map((p, i) => (
                            <span key={p.memberId || `t-${i}-${p.memberName}`} className="text-[12px]" style={{ color: p.isTrial ? theme.accent2 : theme.ink }}>
                              {p.memberName}
                              {p.sessionNumber && p.totalSessions && (
                                <span style={{ color: theme.inkMute }}> ({p.sessionNumber}/{p.totalSessions})</span>
                              )}
                              {p.isTrial && <span style={{ color: theme.inkMute, fontSize: 10 }}> 체험</span>}
                              {p.classType === '개인' && <span style={{ color: theme.accent, fontSize: 10 }}> 개인</span>}
                            </span>
                          ))}
                          {cancelled.map((p, i) => (
                            <span key={`c-${p.memberId || p.memberName || i}`} className="text-[11px] line-through" style={{ color: theme.inkMute }}>
                              {p.memberName}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
        
        {/* 알림 (자동) */}
        {homeAlerts.length > 0 && (
          <div className="px-4 py-3" style={{ backgroundColor: theme.terraSoft, borderTop: '1px solid #F0D6CB' }}>
            {homeAlerts.map((alert, i) => (
              <div key={`${alert.icon}-${alert.name}-${i}`} className="flex items-center gap-2 text-[12px] py-0.5" style={{ color: '#5E3A20' }}>
                <span className="flex-shrink-0">{alert.icon}</span>
                <span><strong>{alert.name}</strong>{alert.suffix}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 정원 현황 카드 (소그룹 화·목 시간대별 등록 인원) */}
      {capacityStatus.length > 0 && (
        <div className="rounded-2xl p-3.5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
          <div className="flex items-center gap-1.5 mb-3">
            <span style={{ fontSize: 13 }}>📊</span>
            <span className="font-semibold text-[13px]" style={{ color: theme.ink }}>정원 현황</span>
            <span className="text-[11px]" style={{ color: theme.inkMute }}>· 정원 {CAPACITY}명</span>
          </div>
          <div className="grid items-center gap-2" style={{ gridTemplateColumns: '52px 1fr 1fr' }}>
            <div></div>
            <div className="text-[10px] font-semibold text-center" style={{ color: theme.inkMute }}>화요일</div>
            <div className="text-[10px] font-semibold text-center" style={{ color: theme.inkMute }}>목요일</div>
            
            {capacityStatus.map(({ time, tueCount, thuCount }) => {
              const renderCell = (count) => {
                const state = getCapacityState(count);
                const filledDots = '●'.repeat(count);
                const emptyDots = '○'.repeat(Math.max(0, CAPACITY - count));
                const colors = {
                  free: { bg: 'rgba(165, 192, 165, 0.08)', border: '#A5C0A5', label: { bg: '#5C8A5C', text: '여유' } },
                  near: { bg: 'rgba(212, 181, 116, 0.10)', border: '#D4B574', label: { bg: '#C9A961', text: '거의참' } },
                  full: { bg: 'rgba(197, 146, 142, 0.12)', border: '#C5928E', label: { bg: '#B85450', text: '마감' } },
                }[state];
                return (
                  <div className="rounded-lg px-2 py-2 text-center" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}>
                    <div className="mb-1" style={{ fontSize: 13, letterSpacing: 1, lineHeight: 1 }}>
                      <span style={{ color: theme.ink }}>{filledDots}</span>
                      <span style={{ color: '#D0CABB' }}>{emptyDots}</span>
                    </div>
                    <div className="text-[11px] tabular-nums" style={{ color: theme.inkSoft }}>
                      <strong style={{ color: theme.ink, fontWeight: 700 }}>{count}</strong>/{CAPACITY}
                    </div>
                    <div className="inline-block mt-1 px-1.5 py-0.5 rounded-md" style={{ backgroundColor: colors.label.bg, color: 'white', fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
                      {colors.label.text}
                    </div>
                  </div>
                );
              };
              return (
                <React.Fragment key={time}>
                  <div className="text-[13px] font-semibold text-right pr-1" style={{ color: theme.ink }}>{time}</div>
                  {renderCell(tueCount)}
                  {renderCell(thuCount)}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* 만료 임박 모달 */}
      {showExpiringModal && (
        <Modal open={true} onClose={() => setShowExpiringModal(false)} title="⚠ 만료 임박 회원" sub="D-7 이내 만료 예정">
          <div className="space-y-2">
            {expiringMembersList.map(({ member, pass, daysLeft }) => (
              <button key={member.id}
                onClick={() => { setShowExpiringModal(false); goto('members', { openId: member.id }); }}
                className="w-full rounded-xl p-3 text-left transition-all active:scale-[0.99]"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-[14px]" style={{ color: theme.ink }}>{member.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: theme.inkMute }}>
                      {pass.type} · {pass.usedSessions}/{pass.totalSessions}회 사용
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: theme.inkMute }}>
                      만료: {pass.expiryDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold" style={{ color: daysLeft <= 3 ? theme.danger : theme.accent2 }}>
                      D-{daysLeft}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* 🏆 리듬 수련 대상자 */}
      {(() => {
        const achievers = members
          .map(m => {
            const pass = activePass(m);
            const rs = pass ? rhythmStatus(pass, closedDays) : null;
            return rs?.achieved ? { member: m, pass, rs } : null;
          })
          .filter(Boolean);
        if (achievers.length === 0) return null;
        return (
          <div className="rounded-2xl p-3"
            style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
            <div className="flex justify-between items-center mb-2">
              <div className="text-[13px] font-bold" style={{ color: '#6B5410' }}>
                🏆 리듬 수련 대상자
              </div>
              <div className="text-[11px]" style={{ color: '#8B6F30', fontFamily: theme.serif, fontStyle: 'italic' }}>
                {achievers.length}명
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {achievers.map(({ member, rs }) => (
                <button key={member.id} onClick={() => goto?.('members', { openId: member.id })}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{ backgroundColor: '#FFF', borderColor: '#C9A961', color: '#6B5410' }}>
                  {member.name} <span style={{ fontWeight: 400 }}>+{rs.bonus}회</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 🔔 알림 (회원 예약 요청/취소) */}
      {(() => {
        // 임시 데이터 - 나중에 Supabase에서 로드
        const notifications = []; // 일단 빈 배열
        if (notifications.length === 0) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Bell size={14} style={{ color: theme.accent2 }} />
              <div className="text-sm font-semibold" style={{ color: theme.ink }}>알림</div>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: theme.accent2, color: '#FFF' }}>
                {notifications.length}
              </span>
            </div>
            {/* TODO: 알림 카드들 */}
          </div>
        );
      })()}

      {/* Alerts */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="text-sm font-semibold" style={{ color: theme.ink }}>
            <Bell size={14} className="inline mr-1" style={{ color: theme.accent2 }} /> 오늘 보내야 할 문자
          </div>
          {dismissedToday.length > 0 && (
            <button onClick={clearDismissed} className="text-[11px]" style={{ color: theme.inkMute }}>
              숨긴 항목 다시 보기
            </button>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="rounded-2xl p-4 text-center text-[13px]"
            style={{ backgroundColor: theme.successBg, border: `1px solid #A5B69B`, color: theme.success }}>
            <Check size={16} className="inline mr-1" />모두 처리되었어요
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.id} className="rounded-2xl p-3 flex items-start gap-3"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: theme.ink }}>{a.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: theme.inkMute }}>
                    {a.desc}
                    {a.member?.phone && ` · ${a.member.phone}`}
                    {a.trial?.phone && ` · ${a.trial.phone}`}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => onSendSMS({
                      phone: a.member?.phone || a.trial?.phone,
                      name: a.member?.name || a.trial?.name,
                      template: a.template,
                      alertId: a.id,
                    })}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1"
                    style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                    <MessageSquare size={11} /> 문자
                  </button>
                  <button onClick={() => dismiss(a.id)}
                    className="px-3 py-1 rounded-lg text-[11px]"
                    style={{ color: theme.inkMute }}>
                    오늘 닫기
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center py-2 rounded-xl" style={{ backgroundColor: theme.cardAlt2 }}>
      <div className="text-2xl font-bold tabular-nums" style={{ color, fontFamily: theme.serif }}>{value}</div>
      <div className="text-[10px] mt-0.5" style={{ color: theme.inkMute }}>{label}</div>
    </div>
  );
}

/* =========================================================
   Schedule View
   ========================================================= */
function ScheduleView({ members, setMembers, sessions, setSessions, classLog = {}, setClassLog, groupSlots, setGroupSlots, closedDays = [], setClosedDays, toast }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slotModal, setSlotModal] = useState(null);
  const [slotsManagerOpen, setSlotsManagerOpen] = useState(false);

  // 휴강일 토글
  const toggleClosedDay = async (ymd) => {
    const exists = closedDays.some(c => c.date === ymd);
    let next;
    if (exists) {
      next = closedDays.filter(c => c.date !== ymd);
      toast('휴강 표시를 해제했어요');
    } else {
      const reason = prompt('휴강 사유 (선택)', '') || '';
      next = [...closedDays, { date: ymd, reason }].sort((a, b) => a.date.localeCompare(b.date));
      toast('이날 휴강으로 표시했어요');
    }
    setClosedDays(next);
    await saveKey(K.closedDays, next);
  };
  const isClosedDay = (ymd) => closedDays.some(c => c.date === ymd);

  const days = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i));

  const getSlotView = (date, time) => {
    const key = `${toYMD(date)}_${time}`;
    const explicit = sessions[key];
    if (explicit) return {
      participants: [...explicit.participants].sort((a, b) => {
        if (a.isTrial && !b.isTrial) return 1;
        if (!a.isTrial && b.isTrial) return -1;
        return 0;
      }),
      isAuto: false, note: explicit.note, classNote: explicit.classNote
    };
    // 공휴일이면 자동 슬롯 표시 안 함
    if (HOLIDAYS.has(toYMD(date))) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return null;
    const dateStr = toYMD(date);
    const dow = date.getDay();
    // 자동 추가: fixedSlots 일치 + 그날에 활성 수강권 있어야 함 (시작일~만료일 사이, 홀딩 기간 제외)
    const autoMembers = members.filter(m => {
      if (!m.fixedSlots?.some(fs => fs.dow === dow && fs.time === time)) return false;
      // 활성 수강권: 시작일 <= 그날 <= 만료일, archived 아님
      const validPass = (m.passes || []).find(p => 
        !p.archived 
        && p.startDate && p.expiryDate
        && p.startDate <= dateStr 
        && dateStr <= p.expiryDate
        // 홀딩 기간 안이면 제외
        && !(p.holdStart && p.holdEnd && dateStr >= p.holdStart && dateStr <= p.holdEnd)
      );
      return !!validPass;
    });
    if (!autoMembers.length) return null;
    return {
      isAuto: true,
      participants: autoMembers.map(m => ({ memberId: m.id, memberName: m.name })),
    };
  };

  const saveSession = async (date, time, data, oldKey = null) => {
    const key = `${toYMD(date)}_${time}`;
    const dateStr = toYMD(date);
    
    // 키가 바뀌면(이동) 옛 슬롯의 참여자를 먼저 차감 빼기 위해 가져옴
    const isMove = oldKey && oldKey !== key;
    const oldSess = isMove ? sessions[oldKey] : sessions[key];
    const oldParts = oldSess?.participants || [];
    const newParts = data?.participants || [];
    
    // 옛 슬롯의 차감은 옛 날짜 기준으로 빼야 함 (sessionDates 보정)
    const oldDateStr = isMove ? oldKey.slice(0, 10) : dateStr;

    // 차감 판정 - 모듈 레벨 isPartCharged 헬퍼 사용
    const chargeOf = (p) => isPartCharged(p) && p.memberId && p.passId ? `${p.memberId}|${p.passId}` : null;
    const oldCharges = oldParts.map(chargeOf).filter(Boolean);
    const newCharges = newParts.map(chargeOf).filter(Boolean);

    // pass key별로 (delta, 빼야 할 옛 날짜 개수, 더해야 할 새 날짜 개수)를 추적
    const adjustments = {};
    oldCharges.forEach(k => {
      adjustments[k] = adjustments[k] || { delta: 0, removeOld: 0, addNew: 0 };
      adjustments[k].delta -= 1;
      adjustments[k].removeOld += 1;
    });
    newCharges.forEach(k => {
      adjustments[k] = adjustments[k] || { delta: 0, removeOld: 0, addNew: 0 };
      adjustments[k].delta += 1;
      adjustments[k].addNew += 1;
    });

    if (Object.keys(adjustments).length > 0) {
      const updatedMembers = members.map(m => ({
        ...m,
        passes: (m.passes || []).map(p => {
          const k = `${m.id}|${p.id}`;
          if (!(k in adjustments)) return p;
          const { delta, removeOld, addNew } = adjustments[k];
          const newUsed = Math.max(0, Math.min(p.totalSessions, p.usedSessions + delta));
          let sessionDates = [...(p.sessionDates || [])];
          // 옛 날짜에서 removeOld번 제거
          for (let i = 0; i < removeOld; i++) {
            const idx = sessionDates.lastIndexOf(oldDateStr);
            if (idx >= 0) sessionDates.splice(idx, 1);
          }
          // 새 날짜를 addNew번 추가
          for (let i = 0; i < addNew; i++) sessionDates.push(dateStr);
          return { ...p, usedSessions: newUsed, sessionDates };
        }),
      }));
      setMembers(updatedMembers);
      await saveKey(K.members, updatedMembers);
    }

    const next = { ...sessions };
    // 이동인 경우 옛 키 삭제
    if (isMove) delete next[oldKey];
    if (!data || !newParts.length) delete next[key];
    else next[key] = { ...data, date: dateStr, time };
    setSessions(next);
    await saveKey(K.sessions, next);
    
    // 수업기록(classNote) → classLog 자동 동기화
    // 일정에 수업기록(우파비스타코나아사나 등)을 입력하면 수업기록 탭에도 자동 등록
    // 메모(note)는 강사 메모용으로 별도 (open class 등) → classLog에 저장 X
    if (setClassLog && data && data.classNote !== undefined) {
      const classNote = (data.classNote || '').trim();
      const cl = { ...classLog };
      const dayEntries = [...(cl[dateStr] || [])];
      const existingIdx = dayEntries.findIndex(e => e.time === time);
      if (classNote) {
        if (existingIdx >= 0) {
          dayEntries[existingIdx] = { ...dayEntries[existingIdx], content: classNote };
        } else {
          dayEntries.push({ 
            id: `cl_${dateStr}_${time}_${Math.random().toString(36).slice(2, 6)}`,
            time, 
            content: classNote,
          });
        }
        cl[dateStr] = dayEntries.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        setClassLog(cl);
        await saveKey(K.classlog, cl);
      } else if (existingIdx >= 0) {
        dayEntries.splice(existingIdx, 1);
        if (dayEntries.length) cl[dateStr] = dayEntries;
        else delete cl[dateStr];
        setClassLog(cl);
        await saveKey(K.classlog, cl);
      }
    }
    
    // 메모(note) + 수업기록(classNote) → 참여 회원들의 progressLog에 자동 기록
    // 소그룹 수업이면 참여한 모든 회원의 경과에 동일 기록 들어감
    const note = (data?.note || '').trim();
    const classNote = (data?.classNote || '').trim();
    const hasContent = note || classNote;
    
    if (newParts.length > 0) {
      // 진행 가능한 newCharges 회원들 (체험자 X, 차감 대상 회원만)
      const memberIds = newParts
        .filter(p => p.memberId && !p.isTrial)
        .map(p => p.memberId);
      
      if (memberIds.length > 0) {
        // progressLog 엔트리 ID는 sessionKey 기반으로 만들어서 같은 수업의 같은 회원은 1개만
        const entryIdPrefix = `auto_${dateStr}_${time}_`;
        
        const updatedMembers2 = members.map(m => {
          if (!memberIds.includes(m.id)) return m;
          const log = [...(m.progressLog || [])];
          const entryId = entryIdPrefix + m.id;
          const existingIdx = log.findIndex(e => e.id === entryId);
          
          if (hasContent) {
            // 회차 표시 (개인레슨 N회차 형태)
            const memberPart = newParts.find(p => p.memberId === m.id);
            const sn = memberPart?.sessionNumber;
            const tot = memberPart?.totalSessions;
            const pass = (m.passes || []).find(p => p.id === memberPart?.passId);
            const isPrivate = pass?.category === 'private';
            const classType = isPrivate 
              ? `개인레슨${sn ? ` ${sn}회차` : ''}`
              : `소그룹${sn ? ` ${sn}회차` : ''}`;
            
            const newEntry = {
              id: entryId,
              date: dateStr,
              classType,
              afterChange: classNote || '',  // 수업기록(우파비스타코나아사나 등) → 배운 동작
              memo: note || '',  // 메모 (open class 등)
              bodyState: existingIdx >= 0 ? (log[existingIdx].bodyState || '') : '',
              autoGenerated: true,
            };
            
            if (existingIdx >= 0) log[existingIdx] = { ...log[existingIdx], ...newEntry };
            else log.push(newEntry);
          } else if (existingIdx >= 0 && log[existingIdx].autoGenerated) {
            // 메모/수업기록 둘 다 비웠고, 자동 생성된 엔트리면 제거
            log.splice(existingIdx, 1);
          }
          return { ...m, progressLog: log };
        });
        
        // 변화가 있을 때만 저장
        const changed = JSON.stringify(updatedMembers2) !== JSON.stringify(members);
        if (changed) {
          setMembers(updatedMembers2);
          await saveKey(K.members, updatedMembers2);
        }
      }
    }
  };

  const smallGroupDay = (d) => d.getDay() === 2 || d.getDay() === 4;
  const todayYMD = toYMD(new Date());

  // 그날의 모든 수업을 시간순으로 모음 (확정 + 자동추천)
  const getDayClasses = (date) => {
    const ymd = toYMD(date);
    const isHol = HOLIDAYS.has(ymd);
    if (isHol) return { isHoliday: true, items: [] };

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const isPast = date < todayStart;
    const dow = date.getDay();

    // 1) 확정된 수업 (sessions에서 이 날짜로 시작하는 모든 키)
    const explicit = [];
    Object.keys(sessions).forEach(key => {
      if (key.startsWith(ymd + '_')) {
        const time = key.slice(ymd.length + 1);
        const sess = sessions[key];
        if (sess && sess.participants && sess.participants.length > 0) {
          // 개인레슨 여부 판단: 참석자 중 classType === '개인' 있거나, 모든 참석자가 개인 카테고리
          const hasPrivate = sess.participants.some(p => p.classType === '개인');
          // 그룹 슬롯에 포함되면 group, 아니면 private
          const isGroupSlot = groupSlots.includes(time);
          const category = hasPrivate ? 'private' : (isGroupSlot ? 'group' : 'private');
          explicit.push({
            time,
            category,
            isAuto: false,
            note: sess.note,
            classNote: sess.classNote,
            participants: [...sess.participants].sort((a, b) => {
              if (a.isTrial && !b.isTrial) return 1;
              if (!a.isTrial && b.isTrial) return -1;
              return 0;
            }),
            sessionKey: key,
          });
        }
      }
    });

    // 2) 자동 추천 (회원 fixedSlots 기반) - 미래 날짜만, 그룹 슬롯에만
    const autoItems = [];
    if (!isPast) {
      groupSlots.forEach(time => {
        // 이미 확정된 시간이면 스킵
        if (explicit.some(e => e.time === time)) return;
        const autoMembers = members.filter(m => {
          if (!m.fixedSlots?.some(fs => fs.dow === dow && fs.time === time)) return false;
          // 활성 수강권 + 그날 범위 안 + 홀딩 기간 제외
          const validPass = (m.passes || []).find(p => 
            !p.archived 
            && p.startDate && p.expiryDate
            && p.startDate <= ymd 
            && ymd <= p.expiryDate
            && !(p.holdStart && p.holdEnd && ymd >= p.holdStart && ymd <= p.holdEnd)
          );
          return !!validPass;
        });
        if (autoMembers.length > 0) {
          autoItems.push({
            time,
            category: 'group',
            isAuto: true,
            participants: autoMembers.map(m => ({ memberId: m.id, memberName: m.name })),
          });
        }
      });
    }

    const items = [...explicit, ...autoItems].sort((a, b) => a.time.localeCompare(b.time));
    return { isHoliday: false, isPast, items };
  };

  // 다음 수업 찾기 (오늘 이후, 가장 가까운 시간)
  const findNextClassKey = () => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayStr = toYMD(now);
    
    // 1) 오늘 남은 수업 중 가장 빠른 거
    for (const date of days) {
      const ymd = toYMD(date);
      const dayInfo = getDayClasses(date);
      if (dayInfo.isHoliday || dayInfo.isPast) continue;
      
      for (const item of dayInfo.items) {
        if (item.isAuto) continue;
        const [hh, mm] = item.time.split(':').map(Number);
        const itemMin = hh * 60 + mm;
        // 오늘이면 현재 시각 이후만
        if (ymd === todayStr && itemMin <= nowMin) continue;
        return `${ymd}_${item.time}`;
      }
    }
    return null;
  };
  const nextClassKey = findNextClassKey();

  // Swipe to change weeks
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 120 && Math.abs(dy) < 60) {
      if (dx > 0) setWeekStart(addDays(weekStart, -7));
      else setWeekStart(addDays(weekStart, 7));
    }
    touchStartRef.current = null;
  };

  // 카드 탭 핸들러: 확정 카드면 그 카드 모달, 자동 카드면 그 시간대로 새 모달
  const onCardClick = (date, item) => {
    if (HOLIDAYS.has(toYMD(date))) return;
    setSlotModal({
      date,
      time: item.time,
      existing: sessions[`${toYMD(date)}_${item.time}`],
      autoFill: item.isAuto ? item.participants : null,
      category: item.category,
    });
  };

  // "+ 수업 추가" 버튼: 새 수업 모달 (시간/카테고리 선택부터)
  const onAddClass = (date) => {
    if (HOLIDAYS.has(toYMD(date))) return;
    setSlotModal({
      date,
      time: null, // 시간 미정 (모달에서 선택)
      existing: null,
      autoFill: null,
      category: null, // 카테고리 미정
      isNew: true,
    });
  };

  return (
    <div className="px-3 pb-28 pt-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Week navigator */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-[12px]" style={{ color: theme.inkMute, fontFamily: theme.serif, fontStyle: 'italic' }}>{weekStart.getFullYear()}년</div>
          <div className="font-bold" style={{ color: theme.ink }}>
            {weekStart.getMonth() + 1}월 {weekStart.getDate()}일 ~ {addDays(weekStart, 4).getDate()}일
          </div>
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex justify-between items-center mb-3">
        <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-[12px] underline-offset-2 hover:underline" style={{ color: theme.accent }}>
          이번 주로
        </button>
        <button onClick={() => setSlotsManagerOpen(true)}
          className="rounded-full flex items-center justify-center transition-all"
          style={{
            width: 28, height: 28,
            backgroundColor: theme.accentSoft,
            color: theme.accent,
            border: `1px solid ${theme.accent}33`,
          }}
          title="소그룹 시간 관리"
          aria-label="소그룹 시간 관리">
          <Clock size={14} />
        </button>
      </div>

      {/* Day list */}
      <div className="space-y-4">
        {days.map((d, dayIdx) => {
          const ymd = toYMD(d);
          const isToday = ymd === todayYMD;
          const isHol = HOLIDAYS.has(ymd);
          const isClosed = isClosedDay(ymd);
          const isTueThu = d.getDay() === 2 || d.getDay() === 4;
          const dayInfo = getDayClasses(d);
          
          return (
            <div key={dayIdx}>
              {/* Day header */}
              <div className="flex items-baseline gap-2.5 pb-2 mb-2"
                style={{ borderBottom: `1px solid ${theme.line}` }}>
                <div style={{
                  fontFamily: theme.serif, fontSize: 24, fontWeight: 600,
                  color: isHol || isClosed ? theme.danger : theme.ink, lineHeight: 1,
                }}>
                  {d.getDate()}
                </div>
                <div className="font-semibold text-[13px]"
                  style={{ color: isHol || isClosed ? theme.danger : isToday ? theme.accent2 : theme.inkSoft }}>
                  {WEEK_KR[d.getDay()]}요일
                </div>
                {isToday && !isHol && !isClosed && (
                  <div className="ml-auto text-[11px]"
                    style={{ color: theme.accent2, fontFamily: theme.serif, fontStyle: 'italic', fontWeight: 500 }}>
                    오늘
                  </div>
                )}
                {isHol && (
                  <div className="ml-auto text-[10px]"
                    style={{ color: theme.danger, fontFamily: theme.serif, fontStyle: 'italic' }}>
                    공휴일
                  </div>
                )}
                {isClosed && !isHol && (
                  <div className="ml-auto text-[10px]"
                    style={{ color: theme.danger, fontFamily: theme.serif, fontStyle: 'italic' }}>
                    휴강
                  </div>
                )}
                {/* 화/목 휴강 토글 (공휴일 아닐 때만) */}
                {isTueThu && !isHol && (
                  <button onClick={() => toggleClosedDay(ymd)}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${isToday || isClosed ? '' : 'ml-auto'}`}
                    style={{
                      color: isClosed ? theme.danger : theme.inkMute,
                      border: `1px solid ${isClosed ? theme.danger + '60' : theme.line}`,
                      backgroundColor: isClosed ? theme.dangerBg : 'transparent',
                    }}>
                    {isClosed ? '휴강 해제' : '휴강 표시'}
                  </button>
                )}
              </div>

              {/* Day content */}
              {isHol ? (
                <div className="text-center py-3 italic" style={{ color: theme.inkMute, fontFamily: theme.serif }}>
                  — 공휴일 —
                </div>
              ) : isClosed ? (
                <div className="text-center py-3 italic" style={{ color: theme.inkMute, fontFamily: theme.serif }}>
                  — 휴강{closedDays.find(c => c.date === ymd)?.reason ? ` · ${closedDays.find(c => c.date === ymd).reason}` : ''} —
                </div>
              ) : dayInfo.items.length === 0 ? (
                <>
                  <div className="text-center py-3 italic" style={{ color: theme.inkMute, fontFamily: theme.serif, fontSize: 13 }}>
                    — 수업 없음 —
                  </div>
                  {!dayInfo.isPast && (
                    <button onClick={() => onAddClass(d)}
                      className="w-full py-2 rounded-xl text-[12px] mt-1"
                      style={{ border: `1px dashed ${theme.line}`, color: theme.inkMute, backgroundColor: 'transparent' }}>
                      + 수업 추가
                    </button>
                  )}
                </>
              ) : (
                <>
                  {dayInfo.items.map((item, i) => {
                    const isPrivate = item.category === 'private';
                    const cardKey = `${ymd}_${item.time}`;
                    const isNext = cardKey === nextClassKey;
                    
                    return (
                      <div key={cardKey} onClick={() => onCardClick(d, item)}
                        className="rounded-xl mb-1.5 px-3 py-2.5 flex gap-3 cursor-pointer transition-all"
                        style={{
                          backgroundColor: item.isAuto ? 'transparent' : theme.card,
                          border: item.isAuto ? `1px dashed ${theme.line}` 
                                  : isNext ? `1px solid ${theme.accent2}` 
                                  : `1px solid ${theme.line}`,
                        }}>
                        {/* Time block */}
                        <div className="flex flex-col justify-center pr-3 flex-shrink-0"
                          style={{ minWidth: 56, borderRight: `1px solid ${theme.line}` }}>
                          <div style={{
                            fontFamily: theme.serif, fontSize: 18, fontWeight: 600,
                            color: item.isAuto ? theme.inkMute : theme.ink,
                            letterSpacing: '-0.02em', lineHeight: 1,
                          }}>
                            {item.time}
                          </div>
                          <div className="text-[9px] mt-1 font-bold uppercase tracking-wider"
                            style={{ color: isPrivate ? theme.accent2 : theme.accent }}>
                            {isPrivate ? '개인' : '소그룹'}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {item.classNote && !item.isAuto && (
                            <div className="text-[11px] mb-1 italic"
                              style={{ color: theme.inkSoft }}>
                              {item.classNote}
                            </div>
                          )}
                          {/* 일반 회원 (체험자 아님) */}
                          {(() => {
                            const regulars = item.participants.filter(p => !p.isTrial);
                            const trials = item.participants.filter(p => p.isTrial);
                            return (
                              <>
                                {regulars.length > 0 && (
                                  <div className="text-[12.5px] leading-snug"
                                    style={{
                                      color: item.isAuto ? theme.inkMute : theme.ink,
                                      fontStyle: item.isAuto ? 'italic' : 'normal',
                                    }}>
                                    {regulars.map((p, j) => {
                                      const isCancelled = !!p.cancelled;
                                      const isCharged = p.cancelled === 'charged';
                                      return (
                                        <span key={j} style={{
                                          color: isCharged ? theme.danger : 'inherit',
                                          textDecoration: isCancelled ? 'line-through' : 'none',
                                        }}>
                                          <span style={{ fontWeight: 600 }}>{p.memberName}</span>
                                          {p.sessionNumber && p.totalSessions && !isCancelled && (
                                            <span style={{ color: theme.inkMute, fontSize: 11, fontWeight: 400 }}>
                                              {' '}({p.sessionNumber}/{p.totalSessions})
                                            </span>
                                          )}
                                          {j < regulars.length - 1 && <span style={{ color: theme.inkMute }}> · </span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                {trials.length > 0 && (
                                  <div className="text-[11.5px] leading-snug mt-0.5"
                                    style={{ color: theme.accent2 }}>
                                    {trials.map((p, j) => {
                                      const isCancelled = !!p.cancelled;
                                      const isCharged = p.cancelled === 'charged';
                                      return (
                                        <span key={j} style={{
                                          color: isCharged ? theme.danger : isCancelled ? theme.inkMute : theme.accent2,
                                          textDecoration: isCancelled ? 'line-through' : 'none',
                                        }}>
                                          <span style={{ fontWeight: 500 }}>{p.memberName}</span>
                                          <span style={{ color: theme.inkMute, fontSize: 10, marginLeft: 3 }}>체험</span>
                                          {j < trials.length - 1 && <span style={{ color: theme.inkMute }}> · </span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                  {!dayInfo.isPast && (
                    <button onClick={() => onAddClass(d)}
                      className="w-full py-2 rounded-xl text-[11px] mt-1"
                      style={{ border: `1px dashed ${theme.line}`, color: theme.inkMute, backgroundColor: 'transparent' }}>
                      + 수업 추가
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] text-center italic" style={{ color: theme.inkMute, fontFamily: theme.serif }}>
        — 흐린 카드는 자동 표시 · 탭해서 확정 —
      </div>

      {slotModal && (
        <SessionEditor
          slot={slotModal} members={members} groupSlots={groupSlots}
          onClose={() => setSlotModal(null)}
          onSave={async (data) => {
            const saveTime = data.time || slotModal.time;
            const saveDate = data.date ? new Date(data.date + 'T00:00:00') : slotModal.date;
            const newKey = `${toYMD(saveDate)}_${saveTime}`;
            const oldKey = data.originalKey;
            const isMoving = oldKey && oldKey !== newKey;
            const isDelete = !data.participants || data.participants.length === 0;

            // 다른 슬롯으로 이동하는데 그 자리에 이미 다른 수업이 있으면 막기
            if (isMoving && !isDelete && sessions[newKey] && sessions[newKey].participants?.length > 0) {
              toast('이미 그 시간에 수업이 있어요. 다른 시간을 골라주세요.');
              return;
            }

            await saveSession(saveDate, saveTime, data, oldKey);
            setSlotModal(null);
            toast(isMoving && !isDelete ? '옮겨졌어요' : isDelete ? '삭제되었어요' : '저장되었어요');
          }}
        />
      )}

      {slotsManagerOpen && (
        <Modal open={true} onClose={() => setSlotsManagerOpen(false)} title="소그룹 시간 관리" maxWidth="max-w-sm">
          <GroupSlotsManager 
            groupSlots={groupSlots} 
            setGroupSlots={setGroupSlots} 
            toast={toast} 
          />
        </Modal>
      )}
    </div>
  );
}

function SessionEditor({ slot, members, groupSlots, onClose, onSave }) {
  const existing = slot.existing;
  const isNewMode = !!slot.isNew;
  
  // 카테고리 (소그룹/개인) - isNew면 사용자가 선택, 아니면 slot.category로
  const [category, setCategory] = useState(() => {
    if (slot.category) return slot.category;
    if (existing) {
      const hasPrivate = existing.participants?.some(p => p.classType === '개인');
      return hasPrivate ? 'private' : 'group';
    }
    return 'group';
  });
  
  // 시간 - isNew면 처음엔 빈값, 아니면 slot.time
  const [time, setTime] = useState(slot.time || (groupSlots?.[0] || '11:00'));
  // 날짜 (YYYY-MM-DD 문자열로 관리, input[type=date]와 호환)
  const [date, setDate] = useState(slot.date ? toYMD(slot.date) : toYMD(new Date()));
  // 원래 키 (이동 감지용)
  const originalKey = !isNewMode && slot.date && slot.time ? `${toYMD(slot.date)}_${slot.time}` : null;
  
  const initial = existing?.participants
    || (slot.autoFill ? slot.autoFill.map(p => {
        const m = members.find(x => x.id === p.memberId);
        const pass = m && activePass(m, 'group');
        return {
          memberId: p.memberId, memberName: p.memberName,
          passId: pass?.id,
          sessionNumber: pass ? pass.usedSessions + 1 : undefined,
          totalSessions: pass?.totalSessions,
        };
      }) : []);

  const [parts, setParts] = useState(initial);
  const [note, setNote] = useState(existing?.note || '');
  const [classNote, setClassNote] = useState(existing?.classNote || '');
  const [addingMember, setAddingMember] = useState('');
  const [trialName, setTrialName] = useState('');
  const [mode, setMode] = useState('member');

  const addExisting = () => {
    if (!addingMember) return;
    if (parts.some(p => p.memberId === addingMember && !p.cancelled)) { setAddingMember(''); return; }
    const m = members.find(x => x.id === addingMember);
    if (!m) return;
    const preferred = category === 'private' ? 'private' : 'group';
    const pass = activePass(m, preferred) || activePass(m, preferred === 'group' ? 'private' : 'group');
    
    // 미래 날짜면 예약 확정 상태로
    const todayStr = toYMD(new Date());
    const slotDateStr = slot.date ? toYMD(slot.date) : todayStr;
    const isFuture = slotDateStr > todayStr;
    
    setParts([...parts, {
      memberId: m.id, memberName: m.name, passId: pass?.id,
      sessionNumber: pass ? pass.usedSessions + 1 : undefined,
      totalSessions: pass?.totalSessions,
      classType: (pass?.category === 'private' || category === 'private') ? '개인' : undefined,
      ...(isFuture ? { status: 'reserved' } : {}),
    }]);
    setAddingMember('');
  };

  const addTrial = () => {
    if (!trialName.trim()) return;
    setParts([...parts, { memberName: trialName.trim(), isTrial: true }]);
    setTrialName('');
  };

  // 상태 설정 - 'reserved' | 'attended' | 'cancelled_advance' | 'cancelled_sameday' | 'no_show'
  const setStatus = (idx, status, opts = {}) => {
    setParts(parts.map((p, i) => {
      if (i !== idx) return p;
      const next = { ...p, status };
      // 호환성: cancelled 필드도 같이 설정
      if (status === 'cancelled_advance') {
        next.cancelled = 'no_charge';
      } else if (status === 'cancelled_sameday') {
        next.cancelled = opts.charged ? 'charged' : 'no_charge';
      } else if (status === 'no_show') {
        next.cancelled = 'charged';
      } else {
        delete next.cancelled;
      }
      return next;
    }));
  };
  const setCancelled = (idx, kind) => {
    // 호환용 - 기존 코드가 호출
    setParts(parts.map((p, i) => i === idx ? { ...p, cancelled: kind } : p));
  };
  const undoCancel = (idx) => {
    setParts(parts.map((p, i) => {
      if (i !== idx) return p;
      const { cancelled, cancelNote, status, ...rest } = p;
      return rest;
    }));
  };

  const titleText = isNewMode ? '새 수업' : '수업 편집';

  return (
    <Modal open={true} onClose={onClose} title={titleText} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* 카테고리 토글 (isNew일 때만) */}
        {isNewMode && (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: theme.inkSoft }}>수업 종류</div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: theme.cardAlt2 }}>
              <button onClick={() => { setCategory('group'); setAddingMember(''); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: category === 'group' ? theme.accent : 'transparent',
                  color: category === 'group' ? '#FFF' : theme.inkMute,
                }}>
                소그룹
              </button>
              <button onClick={() => { setCategory('private'); setAddingMember(''); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: category === 'private' ? theme.accent2 : 'transparent',
                  color: category === 'private' ? '#FFF' : theme.inkMute,
                }}>
                개인레슨
              </button>
            </div>
          </div>
        )}

        {/* 날짜 선택 (항상 편집 가능) */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: theme.inkSoft }}>날짜</div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm w-full"
            style={{ backgroundColor: theme.cardAlt2, border: `1px solid ${theme.line}` }} />
          <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
            {fmtKR(fromYMD(date))}
          </div>
        </div>

        {/* 시간 선택 (항상 편집 가능) */}
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: theme.inkSoft }}>시간</div>
          {category === 'group' ? (
            <div className="flex gap-1.5 flex-wrap">
              {(groupSlots || []).map(t => (
                <button key={t} onClick={() => setTime(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: time === t ? theme.accent : theme.card,
                    color: time === t ? '#FFF' : theme.inkSoft,
                    border: `1px solid ${time === t ? theme.accent : theme.line}`,
                  }}>
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: theme.cardAlt2, border: `1px solid ${theme.line}`, maxWidth: 140 }} />
              <span className="text-[11px]" style={{ color: theme.inkMute }}>
                분 단위 자유 입력
              </span>
            </div>
          )}
        </div>

        {slot.autoFill && !existing && (
          <div className="text-[12px] p-2 rounded-lg" style={{ backgroundColor: theme.highlight, color: theme.ink }}>
            고정 슬롯에서 자동으로 채워졌어요. 확인 후 저장하시면 수강권이 차감됩니다.
          </div>
        )}

        <div>
          <div className="text-xs font-medium mb-2" style={{ color: theme.inkSoft }}>참여자</div>
          {parts.length === 0 ? (
            <div className="text-xs py-3 text-center rounded-lg" style={{ color: theme.inkMute, backgroundColor: theme.cardAlt }}>아직 없음</div>
          ) : (
            <div className="space-y-1.5">
              {parts.map((p, i) => {
                const isCancelled = !!p.cancelled;
                const isCharged = p.cancelled === 'charged';
                return (
                  <div key={p.memberId || `trial-${i}-${p.memberName || ''}`} className="rounded-lg p-2"
                    style={{
                      backgroundColor: 
                        p.status === 'no_show' || p.cancelled === 'charged' ? theme.dangerBg :
                        p.status === 'cancelled_sameday' ? theme.warnBg :
                        p.status === 'reserved' ? '#F5F4EC' :
                        isCancelled ? theme.cardAlt2 : theme.cardAlt,
                      border: `1px solid ${
                        p.status === 'no_show' || p.cancelled === 'charged' ? '#D19B91' :
                        p.status === 'cancelled_sameday' ? '#C8A366' :
                        theme.lineLight
                      }`,
                      opacity: isCancelled && !isCharged ? 0.7 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{
                          color: p.status === 'no_show' || isCharged ? theme.danger : theme.ink,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}>
                          {p.memberName}
                        </span>
                        {p.sessionNumber && p.totalSessions && !isCancelled && p.status !== 'reserved' && <Chip tone="accent" size="sm">{p.sessionNumber}/{p.totalSessions}</Chip>}
                        {p.isTrial && <Chip tone="peach" size="sm">체험</Chip>}
                        {p.classType === '개인' && <Chip tone="accent" size="sm">개인</Chip>}
                        {/* 상태 칩 */}
                        {p.status === 'reserved' && <Chip tone="accent" size="sm">예약 확정</Chip>}
                        {p.status === 'no_show' && <Chip tone="danger" size="sm">노쇼</Chip>}
                        {p.status === 'cancelled_advance' && <Chip tone="neutral" size="sm">예약 취소</Chip>}
                        {p.status === 'cancelled_sameday' && <Chip tone="warn" size="sm">당일 취소{p.cancelled === 'charged' ? ' (차감)' : ''}</Chip>}
                        {/* 호환: 옛 데이터 */}
                        {!p.status && p.cancelled === 'no_charge' && <Chip tone="neutral" size="sm">취소(미차감)</Chip>}
                        {!p.status && p.cancelled === 'charged' && <Chip tone="danger" size="sm">취소(차감)</Chip>}
                      </div>
                      {/* X 버튼은 활성 회원만 - 취소/노쇼 기록은 통계 보존 위해 유지 (상태 해제로 풀거나 그대로 둠) */}
                      {!isCancelled && p.status !== 'no_show' && (
                        <button onClick={() => setParts(parts.filter((_, j) => j !== i))} className="p-1 rounded" style={{ color: theme.danger }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {p.cancelNote && (
                      <div className="text-[10px] mt-1" style={{ color: theme.inkMute }}>메모: {p.cancelNote}</div>
                    )}
                    {/* 상태 변경 버튼 */}
                    {!isCancelled && p.status !== 'no_show' && p.status !== 'reserved' ? (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        <button onClick={() => setStatus(i, 'cancelled_advance')}
                          className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ color: theme.inkMute, border: `1px solid ${theme.line}` }}>
                          예약 취소
                        </button>
                        <button onClick={() => {
                          const charged = confirm('당일 취소 — 차감하시겠어요?\n\n[확인] 차감\n[취소] 미차감');
                          setStatus(i, 'cancelled_sameday', { charged });
                        }}
                          className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ color: '#5E4520', border: `1px solid #C8A366` }}>
                          당일 취소
                        </button>
                        <button onClick={() => setStatus(i, 'no_show')}
                          className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ color: theme.danger, border: `1px solid ${theme.danger}` }}>
                          노쇼
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => undoCancel(i)}
                        className="text-[11px] mt-1.5 px-2 py-0.5 rounded-md"
                        style={{ color: theme.accent, border: `1px solid ${theme.accent}` }}>
                        상태 해제
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-1 text-[12px]">
          <button onClick={() => setMode('member')} className="flex-1 py-1.5 rounded-md"
            style={{
              backgroundColor: mode === 'member' ? theme.accent : 'transparent',
              color: mode === 'member' ? theme.card : theme.inkSoft,
              border: `1px solid ${theme.line}`,
            }}>회원</button>
          <button onClick={() => setMode('trial')} className="flex-1 py-1.5 rounded-md"
            style={{
              backgroundColor: mode === 'trial' ? theme.accent : 'transparent',
              color: mode === 'trial' ? theme.card : theme.inkSoft,
              border: `1px solid ${theme.line}`,
            }}>체험 / 게스트</button>
        </div>

        {mode === 'member' ? (
          <div className="flex gap-2">
            <Select value={addingMember} onChange={(e) => setAddingMember(e.target.value)} placeholder="회원 선택"
              options={members
                .filter(m => activePass(m, category === 'private' ? 'private' : 'group'))
                .map(m => ({ value: m.id, label: m.name }))} />
            <Button icon={Plus} onClick={addExisting}>추가</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={trialName} onChange={(e) => setTrialName(e.target.value)} placeholder="이름 (예: 박세린)" />
            <Button icon={Plus} onClick={addTrial}>추가</Button>
          </div>
        )}

        <Field label="수업기록 (선택)">
          <Input value={classNote} onChange={(e) => setClassNote(e.target.value)} placeholder="예: 우파비스타코나아사나" />
          <div className="text-[10px] mt-1" style={{ color: theme.inkMute }}>
            ↻ 수업기록 탭과 자동 연동
          </div>
        </Field>

        <Field label="메모 (선택)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: open class" />
        </Field>

        <div className="flex justify-between gap-2 pt-2">
          {existing && (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => onSave({ participants: [], time, date, originalKey, classNote: '' })}>수업 삭제</Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button icon={Check} onClick={() => onSave({ participants: parts, note, classNote, time, date, originalKey })}>저장</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   Members View + Detail
   ========================================================= */
function MembersView({ members, setMembers, sessions, setSessions, groupSlots, closedDays = [], toast, onSendSMS }) {
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [photoImporting, setPhotoImporting] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all | group | private
  const [filterStatus, setFilterStatus] = useState('active'); // all | active | expired
  const [search, setSearch] = useState('');

  const saveMembers = async (list) => {
    setMembers(list);
    await saveKey(K.members, list);
  };

  const createMember = async (data) => {
    const m = { id: uid(), ...data, passes: [], memoTimeline: [], progressLog: [], createdAt: toYMD(new Date()) };
    await saveMembers([...members, m]);
    setAdding(false);
    toast(data.fixedSlots?.length ? '회원 등록 — 고정 슬롯이 일정에 표시됩니다' : '회원이 등록되었어요');
  };

  const handlePhotoImport = async (rows) => {
    const today = toYMD(new Date());
    const normalizePhone = (p) => {
      if (!p) return '';
      const d = String(p).replace(/\D/g, '');
      if (d.length === 11) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;
      if (d.length === 10) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
      return p;
    };
    const buildPasses = (m) => {
      const pass = m.pass || {};
      if (!pass.totalSessions && !pass.type) return [];
      const paymentDate = pass.paymentDate || today;
      const startDate = pass.startDate || today;
      const price = Number(pass.price || 0);
      const totalSessions = Number(pass.totalSessions || 0);
      if (!totalSessions) return [];
      const days = Number(pass.days || 42);
      return [{
        id: uid(),
        type: pass.type || `${totalSessions}회 수강권`,
        category: pass.category === 'starter' ? 'group' : (pass.category || 'group'),
        totalSessions, usedSessions: Number(pass.usedSessions || 0), sessionDates: [],
        days, paymentDate, startDate,
        expiryDate: pass.expiryDate || computeExpiry(startDate, days),
        price, note: pass.note || undefined,
      }];
    };
    const newMembers = rows.filter(m => m?.name).map(m => ({
      id: uid(),
      name: String(m.name || '').trim(),
      phone: normalizePhone(m.phone),
      birthYear: m.birthYear || '',
      gender: m.gender || '',
      job: m.job || '',
      yogaExperience: m.yogaExperience || m.experience || '',
      keyPoint: m.keyPoint || m.painPoints || '',
      notes: m.notes || m.memo || '',
      fixedSlots: Array.isArray(m.fixedSlots) ? m.fixedSlots : [],
      passes: buildPasses(m),
      memoTimeline: m.notes ? [{ id: uid(), date: today, text: m.notes }] : [],
      progressLog: [],
      createdAt: today,
    }));
    if (!newMembers.length) { toast('읽어낸 회원 정보가 없어요'); return; }
    await saveMembers([...members, ...newMembers]);
    setPhotoImporting(false);
    toast(`${newMembers.length}명 회원을 사진에서 등록했어요`);
  };

  const updateMember = async (updated) => {
    await saveMembers(members.map(m => m.id === updated.id ? updated : m));
  };

  const deleteMember = async (id) => {
    // 1) 회원 목록에서 제거
    await saveMembers(members.filter(m => m.id !== id));
    
    // 2) sessions에서 그 회원의 참여 기록 제거 (남은 참여자가 없으면 슬롯 자체 삭제)
    if (sessions && setSessions) {
      const newSessions = {};
      let touched = false;
      Object.entries(sessions).forEach(([key, s]) => {
        if (!s?.participants) { newSessions[key] = s; return; }
        const filtered = s.participants.filter(p => p.memberId !== id);
        if (filtered.length === s.participants.length) {
          newSessions[key] = s; // 변경 없음
          return;
        }
        touched = true;
        if (filtered.length === 0) return; // 슬롯 자체 삭제
        newSessions[key] = { ...s, participants: filtered };
      });
      if (touched) {
        setSessions(newSessions);
        await saveKey(K.sessions, newSessions);
      }
    }
    
    setOpenId(null);
    toast('회원이 삭제되었어요');
  };

  // Classify member by active pass category
  const memberCategory = (m) => {
    const activePasses = (m.passes || []).filter(p => !p.archived);
    if (activePasses.length === 0) return null;
    const hasPrivate = activePasses.some(p => p.category === 'private');
    const hasGroup = activePasses.some(p => p.category === 'group');
    if (hasPrivate && hasGroup) return 'both';
    if (hasPrivate) return 'private';
    if (hasGroup) return 'group';
    return null;
  };

  const filtered = members.filter(m => {
    const typeOk = filterType === 'all' ? true :
      filterType === 'private' ? (memberCategory(m) === 'private' || memberCategory(m) === 'both') :
      filterType === 'group' ? (memberCategory(m) === 'group' || memberCategory(m) === 'both') : true;
    const statusOk = filterStatus === 'all' ? true :
      filterStatus === 'active' ? !!activePass(m) :
      filterStatus === 'expired' ? !activePass(m) : true;
    const q = search.trim();
    const searchOk = !q || m.name.includes(q) || (m.phone || '').replace(/-/g, '').includes(q.replace(/-/g, ''));
    return typeOk && statusOk && searchOk;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pa = activePass(a), pb = activePass(b);
    if (!pa && pb) return 1;
    if (pa && !pb) return -1;
    return a.name.localeCompare(b.name, 'ko');
  });

  const counts = {
    all: members.length,
    group: members.filter(m => { const c = memberCategory(m); return c === 'group' || c === 'both'; }).length,
    private: members.filter(m => { const c = memberCategory(m); return c === 'private' || c === 'both'; }).length,
    active: members.filter(m => activePass(m)).length,
    expired: members.filter(m => !activePass(m)).length,
  };

  const openMember = members.find(m => m.id === openId);

  return (
    <div className="px-3 pb-28 pt-2">
      {/* 검색창 */}
      <div className="relative mb-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 전화번호 검색"
          className="w-full px-4 py-2 rounded-2xl text-[13px] pr-8"
          style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, color: theme.ink, outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: theme.inkMute }}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        {/* 유효/만료/전체 — 맨 앞, 기본값 유효 */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[12px] shrink-0"
          style={{
            backgroundColor: theme.accent,
            color: theme.card,
            border: `1px solid ${theme.accent}`,
            fontWeight: 600,
            outline: 'none', appearance: 'none',
            paddingRight: 22,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 5px center',
          }}>
          <option value="active">유효</option>
          <option value="expired">만료</option>
          <option value="all">전체</option>
        </select>

        {/* 소그룹/개인 드롭다운 */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[12px] shrink-0"
          style={{
            backgroundColor: filterType !== 'all' ? theme.accent : theme.card,
            color: filterType !== 'all' ? theme.card : theme.inkSoft,
            border: `1px solid ${filterType !== 'all' ? theme.accent : theme.line}`,
            fontWeight: filterType !== 'all' ? 600 : 500,
            outline: 'none', appearance: 'none',
            paddingRight: 22,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${filterType !== 'all' ? '%23ffffff' : '%238A9088'}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 5px center',
          }}>
          <option value="all">수련 유형</option>
          <option value="group">소그룹</option>
          <option value="private">개인</option>
        </select>

        <div className="flex-1" />
        <Button icon={Plus} onClick={() => setAdding(true)}>추가</Button>
      </div>

      {!members.length ? (
        <EmptyState icon={Users} title="아직 등록된 회원이 없어요" />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Users} title="해당 회원이 없어요" />
      ) : (
        <div className="space-y-2">
          {sorted.map(m => <MemberCard key={m.id} member={m} onClick={() => setOpenId(m.id)} closedDays={closedDays} />)}
        </div>
      )}
      {adding && <MemberEditor onClose={() => setAdding(false)} onSave={createMember} groupSlots={groupSlots} />}
      {openMember && (
        <MemberDetail
          member={openMember}
          onClose={() => setOpenId(null)}
          onUpdate={updateMember}
          onDelete={() => deleteMember(openMember.id)}
          sessions={sessions} groupSlots={groupSlots} closedDays={closedDays} toast={toast} onSendSMS={onSendSMS}
        />
      )}
    </div>
  );
}

function MemberCard({ member, onClick, closedDays = [] }) {
  const pass = activePass(member);
  const ps = passStatus(pass);
  const rs = pass ? rhythmStatus(pass, closedDays) : null;
  const progress = pass ? (pass.usedSessions / pass.totalSessions) : 0;
  const fixedLabel = member.fixedSlots?.length
    ? member.fixedSlots.map(fs => `${WEEK_KR[fs.dow]}${fs.time}`).join(' · ')
    : null;
  
  // 대상자면 카드 강조
  const isAchiever = rs?.achieved;
  
  // 상태 텍스트 (회수 앞에 인라인 표시)
  const statusText = (() => {
    if (!ps) return null;
    if (rs?.achieved) return { label: '🏆 대상자', color: '#6B5410' };
    if (ps.label === '진행중') return { label: '진행중', color: theme.accent };
    if (ps.label === '시작예정') return { label: '시작예정', color: '#8B6F30' };
    if (ps.label === '홀딩') return { label: '홀딩', color: theme.warn };
    if (ps.label === '완료') return { label: '완료', color: theme.success };
    if (ps.tone === 'danger') return { label: ps.label, color: theme.danger };
    return null;
  })();

  return (
    <div onClick={onClick} className="rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.99]"
      style={{
        backgroundColor: theme.card,
        border: isAchiever ? `1.5px solid #C9A961` : `1px solid ${theme.line}`,
        boxShadow: isAchiever ? `0 0 0 3px rgba(201, 169, 97, 0.12)` : 'none',
      }}>
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[15px]" style={{ color: theme.ink }}>
            {member.name}
          </div>
          {fixedLabel && (
            <div className="text-[10px] mt-0.5" style={{ color: theme.accent }}>
              <Clock size={9} className="inline mb-0.5" /> {fixedLabel}
            </div>
          )}
          {member.keyPoint && (
            <div className="text-[10px] mt-0.5 truncate" style={{ color: theme.accent2, maxWidth: 220 }}>
              ⚠ {member.keyPoint}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {member.assessment && <Chip tone="accent" size="sm">분석</Chip>}
        </div>
      </div>

      {pass ? (
        <div>
          <div className="flex justify-between text-[12px] mb-1">
            <span style={{ color: theme.inkSoft }}>{pass.type}</span>
            <span className="tabular-nums">
              {statusText && (
                <span style={{ color: statusText.color, fontWeight: 600, marginRight: 6 }}>
                  {statusText.label}
                </span>
              )}
              <span style={{ fontWeight: 600, color: rs?.achieved ? '#6B5410' : theme.ink }}>
                {ps?.notStarted ? '0/' + pass.totalSessions + '회' : `${pass.usedSessions}/${pass.totalSessions}회`}
                {rs?.achieved && ' ✓'}
              </span>
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardAlt }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${ps?.notStarted ? 0 : progress * 100}%`,
                backgroundColor: rs?.achieved ? '#C9A961' : ps?.tone === 'danger' ? theme.danger : theme.accent,
                backgroundImage: rs?.achieved ? 'linear-gradient(90deg, #C9A961, #E5C870)' : 'none',
              }} />
          </div>
          <div className="text-[10px] mt-1 flex justify-between items-center" style={{ color: theme.inkMute }}>
            <span>
              {ps?.notStarted
                ? `시작일: ${pass.startDate}`
                : rs?.achieved 
                  ? <span style={{ color: '#C9A961', fontWeight: 600 }}>{rs.message}</span>
                  : `~ ${pass.expiryDate}`}
              {pass.holdUsed && !ps?.notStarted && !rs?.achieved && <span style={{ color: theme.warn }}> · 홀딩</span>}
            </span>
            {!ps?.notStarted && !ps?.done && ps?.daysLeft !== undefined && !rs?.achieved && (
              <span style={{ color: ps.daysLeft <= 7 ? theme.danger : theme.inkMute, fontWeight: ps.daysLeft <= 7 ? 600 : 400 }}>
                D-{ps.daysLeft}
              </span>
            )}
            {rs?.achieved && (
              <span style={{ color: '#C9A961', fontWeight: 600 }}>완료</span>
            )}
          </div>
          {/* 도전중 미니 트래커 - 바 안에 텍스트 */}
          {rs?.challenging && (
            <div className="flex items-center gap-2 mt-1.5 px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#F5EBC8', color: '#6B5410', fontSize: 10 }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>🏆 도전중</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(201,169,97,0.25)' }}>
                <div className="h-full" style={{ width: `${Math.min(100, rs.requiredDays > 0 ? (rs.attendedDays / rs.requiredDays) * 100 : 0)}%`, backgroundColor: '#C9A961' }} />
              </div>
              <span style={{ fontWeight: 600, flexShrink: 0 }}>{rs.attendedDays}/{rs.requiredDays}회</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-[12px]" style={{ color: theme.inkMute }}>활성 수강권 없음</div>
      )}
    </div>
  );
}

function MemberPhotoImport({ onClose, onSave, toast }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null);
  const fileRef = useRef();

  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      try {
        // 이미지 자동 압축 (1568px, JPEG 85%) - fetch 에러 방지
        const { data, media_type } = await fileToCompressedBase64(f);
        arr.push({ name: f.name, data, media_type });
      } catch (e) {
        console.error('이미지 처리 실패:', f.name, e);
        if (toast) toast(`이미지 처리 실패: ${f.name}`);
      }
    }
    setImages(arr);
  };

  const analyze = async () => {
    if (!images.length) { toast('사진을 올려주세요'); return; }
    setLoading(true);
    let stage = 'start';
    try {
      stage = 'building_system';
      const system = `당신은 정직한 OCR 어시스턴트입니다. 사진에 **글자로 적혀있는 것만** 읽습니다.

🛑 가장 중요한 규칙 🛑
빈 칸은 빈 칸입니다. 절대 채우지 마세요.

사진에 회원이 자필로 쓴 정보가 있어야만 회원이 존재합니다.
- 빈 신청서 양식 = 회원 없음 → members: []
- 빈 상태기록지 = 회원 없음 → members: []
- 영수증만 있음 = 회원 없음 → members: []

[자주 보내는 사진 종류]
1. **회원권 신청서** — 양식: 성명/주소/연락처/회원권 종류(체크)/방문 경로/결제 방법/결제 금액/결제일/시작일/신청인 서명
   - 회원이 손으로 직접 쓴 글씨가 있어야 회원 정보입니다.
   - 양식만 있고 칸이 비어있으면 빈 양식입니다 → members: []

2. **상태 기록지 (회원용)** — 양식: 성함/출생년도/성별/요가경험/이유/통증부위/생활습관/회복리듬/경계/자유메모
   - 회원이 직접 표시(체크)와 손글씨로 채워야 회원 정보입니다.
   - 양식 글자 (예: "통증·불편 부위", "오래 앉아 있을 때")는 항목 이름일 뿐 회원 정보가 아닙니다.
   - 빈 체크박스만 있으면 빈 양식 → members: []

3. **카드 결제 영수증** — 자동으로 인쇄됨. 회원 정보 0%.
   - 영수증의 [소선요가] 113-29-01795 010-3040-4404 성지호 경기도 남양주시 가운로2길 63 = **요가원·사장님 정보**.
   - 회원이 아닙니다. 절대 회원 데이터에 쓰지 마세요.
   - 영수증에서 가져올 수 있는 건 결제금액, 거래일시뿐.

🛑 동그라미·체크 인식 🛑
회원이 신청서에서 회원권 종류를 고를 때 **동그라미·체크·밑줄**로 표시합니다.
- 사진에서 동그라미·체크·밑줄이 있는 항목만 선택된 것입니다.
- 동그라미가 "3개월권"에 있으면 → "3개월권" 선택. **"스타터B" 절대 X.**
- 표시가 안 보이거나 헷갈리면 빈칸으로 두세요. 추측 금지.

🛑 절대 만들지 말 것 🛑
- 가짜 이름 (강미란, 김미영, ... 어떤 이름도 사진에 없으면 X)
- 가짜 출생년도 (1990, 1985, ... 추측 X)
- 가짜 전화번호 (010-3040-4404는 요가원 번호, 회원 X)
- 가짜 주소
- 사진에 안 보이는 회원권 종류

[빈 응답이 정답인 경우]
사장님은 **빈 양식만 사진 찍어서 보내는 경우가 많습니다**. 
이때 정답은 **{"members": []}** 입니다. 빈 배열이 정답.
가짜 회원을 만들어내면 사장님이 잘못된 회원을 등록하게 되어 **신뢰가 무너집니다.**

[출력 형식 — JSON만, 설명 금지]
{
  "members": [
    // 회원이 손글씨로 쓴 정보가 있을 때만 객체 추가
    {
      "name": "사진에 손글씨로 적힌 이름. 못 읽거나 없으면 \"\"",
      "phone": "사진에 적힌 010-XXXX-XXXX. 없으면 \"\"",
      "birthYear": "사진에 적힌 4자리. 없으면 \"\"",
      "gender": "사진의 체크/표시. 없으면 \"\"",
      "address": "사진에 손글씨로 적힌 주소. 없으면 \"\". 요가원 주소 X",
      "source": "동그라미/체크된 방문 경로. 없으면 \"\"",
      "passType": "동그라미/체크된 회원권 종류. 안 보이면 \"\"",
      "keyPoint": "통증/주의사항. 없으면 \"\"",
      "notes": "기타. 영수증 결제정보(예: 카드결제 530,000원, 2026-04-30)는 여기에. 사업자번호 113-29-01795 절대 X.",
      "pass": {
        "type": "수강권 명칭. 모르면 \"\"",
        "category": "group/private/trial 중 하나. 모르면 \"\"",
        "totalSessions": 0,
        "paymentDate": "영수증 거래일시. 없으면 \"\"",
        "startDate": "신청서 시작일 손글씨. 없으면 \"\"",
        "price": 0,
        "paymentMethod": "카드/계좌이체/현금/지역화폐. 없으면 \"\""
      }
    }
  ]
}

[다시 강조]
빈 양식이면 → {"members": []}
영수증만 있으면 → {"members": []}
손글씨가 흐릿하면 → 그 필드만 ""
거짓 만들지 말고 빈칸이 100배 낫습니다.`;

      stage = 'building_content';
      const content = images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type, data: img.data },
      }));
      content.push({ type: 'text', text: `소선요가 회원 등록 자료입니다.

🚨 절대 추측하지 마세요. 사진에 손글씨로 적힌 글자만 읽으세요. 🚨

- 영수증의 "성지호"는 사장님(요가원 주인). 회원이 아닙니다.
- "010-3040-4404"는 요가원 전화. 회원이 아닙니다.
- "113-29-01795"는 요가원 사업자번호. 절대 어디에도 쓰지 마세요.
- 회원 정보(이름/전화/생년/주소)는 손으로 쓴 신청서에서만 읽으세요.
- 신청서 글씨가 흐릿하거나 안 보이면 그 필드는 빈 문자열 ""로 두세요.
- 사진에 신청서가 없고 영수증만 있으면 members: []로 반환하세요.

빈칸이 가짜 정보보다 100배 낫습니다.` });

      // base64 클라이언트단 검증 - 진짜 깨끗한지 확인
      stage = 'validating_images';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.data || typeof img.data !== 'string') throw new Error(`이미지 ${i+1}: 데이터 없음`);
        if (img.data.length < 100) throw new Error(`이미지 ${i+1}: 너무 짧음 (${img.data.length}자)`);
        // base64 문자만 있는지
        const bad = img.data.match(/[^A-Za-z0-9+/=]/);
        if (bad) {
          throw new Error(`이미지 ${i+1} (${img.name}): base64에 잘못된 문자 '${bad[0]}' (코드 ${bad[0].charCodeAt(0)}, 위치 ${bad.index})`);
        }
        if (!img.media_type || !img.media_type.startsWith('image/')) {
          throw new Error(`이미지 ${i+1}: media_type 잘못됨 (${img.media_type})`);
        }
      }

      stage = 'calling_api';
      // 사진 분석은 Opus (가장 강력, 환각 적음)
      const resp = await callClaude([{ role: 'user', content }], system, 'claude-opus-4-5');
      stage = 'parsing_response';
      console.log('[사진 분석] AI 응답:', resp);
      const result = tryParseJSON(resp);
      if (result?.members?.length) {
        // 사장님(요가원) 정보가 회원으로 잘못 들어왔으면 제거 — 가드
        const STUDIO_NAME = '성지호';
        const STUDIO_PHONE = '010-3040-4404';
        const STUDIO_BIZ = '113-29-01795';
        const STUDIO_ADDR_KEYWORDS = ['남양주', '가운로2길', '205호'];
        
        const cleaned = result.members.map(m => {
          const cm = { ...m };
          // 이름이 사장님이면 제거
          if (cm.name === STUDIO_NAME || cm.name?.includes(STUDIO_NAME)) cm.name = '';
          // 전화가 요가원이면 제거
          if (cm.phone === STUDIO_PHONE || cm.phone?.replace(/[^0-9]/g, '') === STUDIO_PHONE.replace(/[^0-9]/g, '')) cm.phone = '';
          // 주소가 요가원이면 제거
          if (cm.address && STUDIO_ADDR_KEYWORDS.some(k => cm.address.includes(k))) cm.address = '';
          // 메모/notes에 사업자번호 있으면 제거
          if (cm.notes) {
            cm.notes = cm.notes.replace(STUDIO_BIZ, '').replace(/사업자[등록번호 :]*\s*$/g, '').trim();
            if (cm.notes.includes(STUDIO_NAME)) cm.notes = cm.notes.replace(STUDIO_NAME, '').trim();
          }
          // keyPoint도 같이
          if (cm.keyPoint && (cm.keyPoint.includes(STUDIO_BIZ) || cm.keyPoint.includes(STUDIO_NAME))) {
            cm.keyPoint = cm.keyPoint.replace(STUDIO_BIZ, '').replace(STUDIO_NAME, '').trim();
          }
          return cm;
        }).filter(m => {
          // 이름·전화·주소·메모 다 비어있으면 제거 (사장님 정보만 들어왔던 케이스)
          const empty = !m.name && !m.phone && !m.address && !m.keyPoint && !m.notes;
          return !empty;
        });
        
        if (cleaned.length === 0) {
          toast('회원 정보를 못 찾았어요. 신청서가 있는 사진인지 확인해주세요');
        } else {
          setParsed(cleaned);
        }
      } else if (result) {
        toast('AI가 회원 정보를 못 찾았어요. 신청서/영수증 사진인지 확인해주세요');
      } else {
        const preview = resp.slice(0, 80);
        toast(`읽기 실패: ${preview}...`);
      }
    } catch (e) {
      toast(`분석 실패 [${stage}]: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="사진으로 회원 등록" maxWidth="max-w-lg">
      <div className="space-y-3">
        <div className="text-[12px] leading-relaxed" style={{ color: theme.inkSoft }}>
          회원권 신청서, 상태 기록지, 결제 영수증, 상담 메모 사진을 올리면 AI가 자동으로 읽어옵니다. 여러 장 한 번에 가능해요.
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <button onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl p-6 border-2 border-dashed flex flex-col items-center gap-2"
          style={{ borderColor: theme.line, backgroundColor: theme.cardAlt }}>
          <Upload size={24} style={{ color: theme.accent }} />
          <div className="text-sm font-medium" style={{ color: theme.ink }}>사진 선택</div>
          <div className="text-[11px]" style={{ color: theme.inkMute }}>신청서·영수증·메모 여러 장 가능</div>
        </button>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {images.map((img, i) => (
              <div key={i} className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1"
                style={{ backgroundColor: theme.accentSoft, color: theme.inkSoft }}>
                <FileText size={11} /> {img.name}
                <button onClick={() => setImages(images.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        )}
        <Button icon={loading ? Loader2 : Sparkles} onClick={analyze} disabled={loading || !images.length} className="w-full">
          {loading ? 'AI가 읽는 중...' : 'AI로 회원 정보 읽기'}
        </Button>
        {parsed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold" style={{ color: theme.accent }}>읽어온 내용 확인 · 수정 가능</div>
              <button onClick={() => setParsed(null)} className="text-[10px] underline" style={{ color: theme.inkMute }}>
                다시 읽기
              </button>
            </div>
            {parsed.map((m, i) => (
              <div key={i} className="rounded-2xl p-3 space-y-2"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>이름</div>
                    <Input value={m.name || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="이름" />
                  </div>
                  <div>
                    <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>전화</div>
                    <Input value={m.phone || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} placeholder="010-0000-0000" />
                  </div>
                  <div>
                    <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>성별</div>
                    <Input value={m.gender || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, gender: e.target.value } : x))} placeholder="여 / 남" />
                  </div>
                  <div>
                    <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>출생년도</div>
                    <Input value={m.birthYear || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, birthYear: e.target.value } : x))} placeholder="1990" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>핵심 포인트</div>
                  <TextArea value={m.keyPoint || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, keyPoint: e.target.value } : x))} placeholder="통증·이력·주의사항" style={{ minHeight: 50 }} />
                </div>
                <div>
                  <div className="text-[10px] mb-0.5" style={{ color: theme.inkMute }}>메모</div>
                  <TextArea value={m.notes || ''} onChange={(e) => setParsed(parsed.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} placeholder="기타 메모" style={{ minHeight: 50 }} />
                </div>
                {m.pass && (
                  <div className="rounded-lg p-2" style={{ backgroundColor: theme.cardAlt2 }}>
                    <div className="text-[10px] mb-1" style={{ color: theme.inkMute }}>수강권 (자동 등록)</div>
                    <div className="text-[12px]" style={{ color: theme.accent }}>
                      {m.pass.type} · {Number(m.pass.price || 0).toLocaleString()}원
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button icon={Check} onClick={() => onSave(parsed)} className="w-full">이 내용으로 회원 등록</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MemberEditor({ member, onClose, onSave, groupSlots }) {
  const [data, setData] = useState(member || {
    name: '', birthYear: '', gender: '', phone: '', job: '', yogaExperience: '',
    keyPoint: '', notes: '', fixedSlots: [],
  });

  const toggleSlot = (dow, time) => {
    const slots = data.fixedSlots || [];
    const has = slots.some(s => s.dow === dow && s.time === time);
    setData({
      ...data,
      fixedSlots: has ? slots.filter(s => !(s.dow === dow && s.time === time)) : [...slots, { dow, time }],
    });
  };

  return (
    <Modal open={true} onClose={onClose} title={member ? '회원 정보 수정' : '새 회원'}>
      <div className="space-y-3">
        <Field label="성함 *">
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="홍길동" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="출생년도">
            <Input type="number" value={data.birthYear || ''} onChange={(e) => setData({ ...data, birthYear: e.target.value })} placeholder="1990" />
          </Field>
          <Field label="성별">
            <Select value={data.gender || ''} onChange={(e) => setData({ ...data, gender: e.target.value })}
              placeholder="선택"
              options={[{ value: '여', label: '여' }, { value: '남', label: '남' }, { value: '기타', label: '기타' }]} />
          </Field>
        </div>
        <Field label="연락처">
          <Input value={data.phone || ''} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="010-0000-0000" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="직업">
            <Input value={data.job || ''} onChange={(e) => setData({ ...data, job: e.target.value })} placeholder="예: 사무직" />
          </Field>
          <Field label="요가·운동 경험">
            <Input value={data.yogaExperience || ''} onChange={(e) => setData({ ...data, yogaExperience: e.target.value })} placeholder="예: 요가 2년" />
          </Field>
        </div>
        <Field label="핵심 포인트" hint="일정·회원 목록에 항상 표시됩니다 (부상 · 주의사항)">
          <Input value={data.keyPoint || ''} onChange={(e) => setData({ ...data, keyPoint: e.target.value })} placeholder="예: 발목 인대 파열 왼쪽, 회복 중심" />
        </Field>

        <div>
          <div className="text-xs font-medium mb-1.5" style={{ color: theme.inkSoft }}>
            고정 수업 시간 <span style={{ color: theme.inkMute, fontWeight: 400 }}>· 소그룹 시간만 표시 · 일정에 자동으로 표시돼요</span>
          </div>
          <div className="rounded-2xl p-2" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
            <div className="grid gap-1">
              <div className="grid grid-cols-3 text-center text-[10px] font-semibold">
                <div></div>
                <div style={{ color: theme.accent2 }}>{WEEK_KR[2]}</div>
                <div style={{ color: theme.accent2 }}>{WEEK_KR[4]}</div>
              </div>
              {(groupSlots || ['11:00', '19:20', '20:50']).map(time => (
                <div key={time} className="grid grid-cols-3 gap-0.5 items-center">
                  <div className="text-[10px] text-right pr-1 font-medium tabular-nums" style={{ color: theme.inkSoft }}>{time}</div>
                  {[2, 4].map(dow => {
                    const on = data.fixedSlots?.some(s => s.dow === dow && s.time === time);
                    return (
                      <button key={dow} onClick={() => toggleSlot(dow, time)}
                        className="h-7 rounded-md text-[11px] transition-all"
                        style={{
                          backgroundColor: on ? theme.accent : theme.accentSoft,
                          color: on ? theme.card : theme.inkMute,
                          border: `1px solid ${on ? theme.accent : theme.line}`,
                        }}>
                        {on ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Field label="특이사항">
          <TextArea value={data.notes || ''} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="회원 특이사항 (변하지 않는 정보)" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button icon={Check} onClick={() => data.name && onSave(data)} disabled={!data.name}>저장</Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   Member Detail — passes + history + memo + progress + assessment
   ========================================================= */
function MemberDetail({ member, onClose, onUpdate, onDelete, sessions, groupSlots, closedDays = [], toast, onSendSMS }) {
  const [tab, setTab] = useState('passes');
  const [editing, setEditing] = useState(false);
  const [addingPass, setAddingPass] = useState(false);
  const [convertingPass, setConvertingPass] = useState(null);

  const pass = activePass(member);

  const history = useMemo(() => {
    const arr = [];
    const passById = {};
    (member.passes || []).forEach(p => { passById[p.id] = p; });
    Object.values(sessions).forEach(s => {
      s.participants.forEach(p => {
        if (p.memberId === member.id) {
          // 카테고리 추론: passId가 있으면 그 수강권의 category, 없으면 p.classType
          const pass = p.passId ? passById[p.passId] : null;
          const category = pass?.category || (p.classType === '개인' ? 'private' : null);
          arr.push({
            date: s.date, time: s.time,
            sessionNumber: p.sessionNumber, totalSessions: p.totalSessions,
            cancelled: p.cancelled, cancelNote: p.cancelNote,
            classType: p.classType,
            category, // 'private' | 'group' | null
            status: p.status,
          });
        }
      });
    });
    return arr.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [sessions, member.id, member.passes]);

  const addPass = async (passData, rewardSourceId) => {
    let passes = [...(member.passes || [])];
    if (Array.isArray(passData)) {
      passes = passes.concat(passData.map(p => ({ id: uid(), ...p, usedSessions: 0, sessionDates: [] })));
    } else {
      passes.push({ id: uid(), ...passData, usedSessions: 0, sessionDates: [] });
    }
    // 리듬 수련 보상 사용 표시
    if (rewardSourceId) {
      passes = passes.map(p => p.id === rewardSourceId ? { ...p, rhythmRewardUsed: true } : p);
    }
    await onUpdate({ ...member, passes });
    setAddingPass(false);
    toast(rewardSourceId ? '🏆 보상 포함하여 등록되었어요' : '수강권이 추가되었어요');
  };

  const deletePass = async (pid) => {
    if (!confirm('이 수강권을 삭제할까요?')) return;
    await onUpdate({ ...member, passes: member.passes.filter(p => p.id !== pid) });
  };

  const useSession = async (pid) => {
    await onUpdate({
      ...member,
      passes: member.passes.map(p => p.id === pid
        ? { ...p, usedSessions: Math.min(p.totalSessions, p.usedSessions + 1), sessionDates: [...(p.sessionDates || []), toYMD(new Date())] }
        : p),
    });
    toast('1회 차감');
  };

  const refundSession = async (pid) => {
    await onUpdate({
      ...member,
      passes: member.passes.map(p => p.id === pid
        ? { ...p, usedSessions: Math.max(0, p.usedSessions - 1), sessionDates: (p.sessionDates || []).slice(0, -1) }
        : p),
    });
    toast('1회 복구');
  };

  const applyHold = async (pid, days = 7) => {
    const p = member.passes.find(x => x.id === pid);
    if (!p) return;
    if (p.holdUsed) { toast('홀딩은 1회만 가능해요'); return; }
    const newExpiry = toYMD(addDays(fromYMD(p.expiryDate), days));
    const holdStart = toYMD(new Date());
    const holdEnd = toYMD(addDays(new Date(), days));
    await onUpdate({
      ...member,
      passes: member.passes.map(x => x.id === pid
        ? { ...x, expiryDate: newExpiry, holdUsed: true, holdDays: days, holdStart, holdEnd }
        : x),
    });
    toast(`${days}일 홀딩 적용`);
    // Offer SMS
    onSendSMS({
      phone: member.phone, name: member.name,
      template: SMS_TEMPLATES.hold(member, p, holdStart, holdEnd),
    });
  };
  
  const cancelHold = async (pid) => {
    const p = member.passes.find(x => x.id === pid);
    if (!p) return;
    if (!p.holdUsed) { toast('홀딩이 적용되지 않은 수강권이에요'); return; }
    if (!confirm(`홀딩 ${p.holdDays}일을 취소할까요?\n만료일이 ${p.holdDays}일 앞당겨집니다.`)) return;
    const newExpiry = toYMD(addDays(fromYMD(p.expiryDate), -p.holdDays));
    await onUpdate({
      ...member,
      passes: member.passes.map(x => {
        if (x.id !== pid) return x;
        const { holdUsed, holdDays, holdStart, holdEnd, ...rest } = x;
        return { ...rest, expiryDate: newExpiry };
      }),
    });
    toast('홀딩이 취소되었어요');
  };

  const doConvert = async (oldPass, newPassData, refundAmount) => {
    const passes = [...(member.passes || [])];
    // Archive old
    const oldIdx = passes.findIndex(p => p.id === oldPass.id);
    const newPass = { id: uid(), ...newPassData, usedSessions: 0, sessionDates: [], convertedFrom: oldPass.id };
    if (oldIdx >= 0) {
      passes[oldIdx] = {
        ...oldPass, archived: true,
        convertedTo: newPass.id,
        convertedAt: toYMD(new Date()),
        convertedNote: newPassData.convertNote || '수강권 전환',
      };
    }
    passes.push(newPass);
    const refunds = [...(member.refunds || [])];
    if (refundAmount > 0) {
      refunds.push({
        id: uid(), date: toYMD(new Date()), amount: refundAmount,
        reason: `${oldPass.type} → ${newPass.type} 전환 차액`,
      });
    }
    await onUpdate({ ...member, passes, refunds });
    setConvertingPass(null);
    toast('수강권이 전환되었어요');
  };

  const sendSMSFor = (kind) => {
    if (!member.phone) { toast('연락처가 없어요'); return; }
    const p = activePass(member);
    let template;
    if (kind === 'expiring' && p) template = SMS_TEMPLATES.expiring(member, p);
    else if (kind === 'expired' && p) template = SMS_TEMPLATES.expired(member, p);
    else if (kind === 'registered' && p) template = SMS_TEMPLATES.registered(member, p);
    if (template) onSendSMS({ phone: member.phone, name: member.name, template });
  };

  const updateMemoTimeline = async (memoTimeline) => {
    await onUpdate({ ...member, memoTimeline });
  };
  const updateProgressLog = async (progressLog) => {
    await onUpdate({ ...member, progressLog });
  };

  return (
    <Modal open={true} onClose={onClose} title={member.name} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Key point banner */}
        {member.keyPoint && (
          <div className="p-3 rounded-2xl flex gap-2 items-start" style={{ backgroundColor: theme.warnBg, border: `1px solid #C8A366` }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: theme.warn }} />
            <div>
              <div className="text-[11px] font-semibold" style={{ color: theme.warn }}>핵심 포인트</div>
              <div className="text-sm mt-0.5" style={{ color: theme.ink }}>{member.keyPoint}</div>
            </div>
          </div>
        )}

        {/* Contact + SMS quick */}
        {member.phone && (
          <div className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: theme.cardAlt2 }}>
            <div className="text-[13px]" style={{ color: theme.ink }}>
              <Phone size={12} className="inline mr-1" />{member.phone}
            </div>
            <div className="flex gap-1">
              <button onClick={() => sendSMSFor('expiring')} className="text-[11px] px-2 py-1 rounded" style={{ color: theme.accent, border: `1px solid ${theme.line}` }}>
                소진
              </button>
              <button onClick={() => sendSMSFor('expired')} className="text-[11px] px-2 py-1 rounded" style={{ color: theme.inkSoft, border: `1px solid ${theme.line}` }}>
                종료
              </button>
              <button onClick={() => sendSMSFor('registered')} className="text-[11px] px-2 py-1 rounded" style={{ color: theme.inkSoft, border: `1px solid ${theme.line}` }}>
                등록
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-1 text-[12px] overflow-x-auto no-scrollbar">
          {[
            { id: 'passes', label: '수강권' },
            { id: 'overview', label: '정보' },
            { id: 'history', label: '수강이력' },
            { id: 'memo', label: '메모' },
            { id: 'progress', label: '경과' },
            { id: 'assessment', label: '분석' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="py-1.5 px-3 rounded-md whitespace-nowrap"
              style={{
                backgroundColor: tab === t.id ? theme.accent : 'transparent',
                color: tab === t.id ? theme.card : theme.inkSoft,
                border: `1px solid ${theme.line}`,
              }}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-3 text-sm">
            <InfoRow label="출생년도" value={member.birthYear} />
            <InfoRow label="성별" value={member.gender} />
            <InfoRow label="연락처" value={member.phone} />
            <InfoRow label="직업" value={member.job} />
            <InfoRow label="요가·운동 경험" value={member.yogaExperience} />
            <InfoRow label="고정 수업" value={member.fixedSlots?.map(fs => `${WEEK_KR[fs.dow]}요일 ${fs.time}`).join(', ')} />
            <InfoRow label="특이사항" value={member.notes} multiline />
            <InfoRow label="등록일" value={member.createdAt} />
            {member.refunds?.length > 0 && (
              <div>
                <div className="text-[11px] mb-1" style={{ color: theme.inkMute }}>환불 이력</div>
                <div className="space-y-1">
                  {member.refunds.map(r => (
                    <div key={r.id} className="text-[12px] p-2 rounded" style={{ backgroundColor: theme.cardAlt2 }}>
                      <span className="tabular-nums font-medium" style={{ color: theme.accent2 }}>
                        {r.date} · {r.amount.toLocaleString()}원
                      </span>
                      <div className="text-[11px]" style={{ color: theme.inkMute }}>{r.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t" style={{ borderColor: theme.line }}>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => confirm(`${member.name} 회원을 삭제할까요?`) && onDelete()}>삭제</Button>
              <Button variant="soft" size="sm" icon={Edit3} onClick={() => setEditing(true)}>수정</Button>
            </div>
          </div>
        )}

        {tab === 'passes' && (
          <div className="space-y-3">
            {/* Summary block: key point + latest session */}
            {(() => {
              const activePassSum = activePass(member);
              const todayStr = toYMD(new Date());
              const latestSession = history.length > 0 
                ? history.find(h => !h.cancelled && h.date <= todayStr && h.status !== 'reserved' && h.status !== 'cancelled_advance' && h.status !== 'cancelled_sameday')
                : null;
              return (
                <div className="rounded-2xl p-3" style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}44` }}>
                  {member.keyPoint && (
                    <div className="flex gap-2 items-start mb-2">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: theme.accent2 }} />
                      <div className="text-[13px] font-medium" style={{ color: theme.ink }}>{member.keyPoint}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div style={{ color: theme.inkMute }}>활성 수강권</div>
                      <div className="font-bold" style={{ color: theme.ink }}>
                        {activePassSum ? `${activePassSum.type} (${activePassSum.usedSessions}/${activePassSum.totalSessions})` : '없음'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: theme.inkMute }}>최근 수업</div>
                      <div className="font-bold" style={{ color: theme.ink }}>
                        {latestSession ? `${latestSession.date} ${latestSession.time}` : '없음'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const activePasses = (member.passes || []).filter(p => !p.archived);
              // 묶음 그룹화: bundleOf 있는 것끼리 모으기
              const groups = []; // [{ bundleName, passes: [...] }, { bundleName: null, passes: [singlePass] }]
              const bundleMap = {};
              activePasses.forEach(p => {
                if (p.bundleOf) {
                  if (!bundleMap[p.bundleOf]) {
                    const g = { bundleName: p.bundleOf, passes: [] };
                    bundleMap[p.bundleOf] = g;
                    groups.push(g);
                  }
                  bundleMap[p.bundleOf].passes.push(p);
                } else {
                  groups.push({ bundleName: null, passes: [p] });
                }
              });
              
              // 패키지 카드 (bundleName 있음)
              const renderPassInner = (p) => {
                const st = passStatus(p);
                const progress = p.usedSessions / p.totalSessions;
                return (
                  <div key={p.id} className="rounded-xl p-2.5" style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[13px]" style={{ color: theme.ink }}>{p.type.replace(/^스타터 · /, '')}</span>
                          {p.category === 'private' && <Chip tone="accent" size="sm">개인</Chip>}
                          {p.category === 'group' && <Chip tone="default" size="sm">소그룹</Chip>}
                        </div>
                        <div className="text-[10.5px] mt-0.5" style={{ color: theme.inkMute }}>
                          {p.startDate} ~ {p.expiryDate}
                          {p.holdUsed && <span style={{ color: theme.warn }}> · 홀딩{p.holdDays}일</span>}
                        </div>
                        {p.note && (
                          <div className="text-[10px] mt-1 italic" style={{ color: theme.inkSoft }}>{p.note}</div>
                        )}
                      </div>
                      <Chip tone={st.tone} size="sm">{st.text}</Chip>
                    </div>
                    {/* 진행 바 */}
                    <div className="flex justify-between items-center text-[11px] mb-1" style={{ color: theme.inkSoft }}>
                      <span>진행</span>
                      <span style={{ color: theme.ink, fontWeight: 600 }}>{p.usedSessions}/{p.totalSessions}회</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardAlt2 }}>
                      <div className="h-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: progress >= 1 ? theme.warn : theme.accent }} />
                    </div>
                    {/* 리듬 트래커 박스 */}
                    {(() => {
                      const rsP = rhythmStatus(p, closedDays);
                      if (!rsP) return null;
                      if (rsP.achieved) {
                        return (
                          <div className="rounded-lg p-2 mt-2" style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold" style={{ color: '#6B5410' }}>🏆 리듬 수련 도전 성공</span>
                              <span className="text-[10px]" style={{ color: '#8B6F30' }}>{rsP.weeks}주 빠짐없이</span>
                            </div>
                            <div className="text-[10px]" style={{ color: '#8B6F30' }}>🎁 재등록 시 <strong>+{rsP.bonus}회 보상</strong></div>
                          </div>
                        );
                      }
                      if (rsP.challenging) {
                        const pct = rsP.requiredDays > 0 ? (rsP.attendedDays / rsP.requiredDays) * 100 : 0;
                        return (
                          <div className="rounded-lg p-2 mt-2" style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold" style={{ color: '#6B5410' }}>리듬 수련 도전중</span>
                              <span className="text-[10px]" style={{ color: '#8B6F30' }}>{rsP.attendedDays} / {rsP.requiredDays}회</span>
                            </div>
                            <div className="h-[3px] rounded-full overflow-hidden mb-1" style={{ backgroundColor: 'rgba(201,169,97,0.25)' }}>
                              <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#C9A961' }} />
                            </div>
                            <div className="text-[10px]" style={{ color: '#8B6F30' }}>
                              {rsP.remaining > 0 ? <>남은 {rsP.remaining}회 빠짐없이 → <strong>+{rsP.bonus}회 보상</strong></> : <>완주 직전! → <strong>+{rsP.bonus}회 보상</strong></>}
                            </div>
                          </div>
                        );
                      }
                      if (rsP.expired || (rsP.completed && !rsP.achieved)) {
                        const missDates = (rsP.missedDays || []).map(d => fmtKRShort(d)).join(', ');
                        return (
                          <div className="rounded-lg p-1.5 mt-2" style={{ backgroundColor: theme.cardAlt2, border: `1px solid ${theme.line}` }}>
                            <div className="text-[10.5px]" style={{ color: theme.inkMute }}>
                              리듬 수련 — {rsP.missedDays?.length || 0}회 결석으로 대상 제외
                              {missDates && <span style={{ color: theme.inkSoft }}> · {missDates}</span>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* 액션 버튼 */}
                    <div className="flex gap-1 mt-2 justify-end flex-wrap">
                      {p.canHold && !p.holdUsed && (
                        <Button size="sm" variant="ghost" onClick={() => applyHold(p.id, p.holdDays || 7)}>
                          <Pause size={11} /> 홀딩
                        </Button>
                      )}
                      {p.canHold && p.holdUsed && (
                        <Button size="sm" variant="ghost" onClick={() => cancelHold(p.id)}>
                          <RotateCcw size={11} /> 홀딩취소
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setConvertingPass(p)}>
                        <RefreshCw size={11} /> 전환
                      </Button>
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => deletePass(p.id)}></Button>
                    </div>
                  </div>
                );
              };
              
              return groups.map((group, gi) => {
                if (group.bundleName) {
                  // 패키지 묶음 카드
                  const totalPrice = group.passes.reduce((s, p) => s + (p.price || 0), 0);
                  const earliestPay = group.passes.map(p => p.paymentDate).filter(Boolean).sort()[0];
                  const noteFromBundle = group.passes.find(p => p.note)?.note || '';
                  return (
                    <div key={`bundle-${gi}-${group.bundleName}`} className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 14 }}>🎁</span>
                        <span className="font-bold text-sm" style={{ color: theme.ink }}>{group.bundleName}</span>
                      </div>
                      <div className="text-[11px]" style={{ color: theme.inkMute }}>
                        {earliestPay && `결제 ${earliestPay}`}
                        {totalPrice > 0 && <span style={{ color: theme.accent }}> · {totalPrice.toLocaleString()}원</span>}
                      </div>
                      {/* 묶인 수강권들 */}
                      <div className="space-y-2">
                        {group.passes.map(p => renderPassInner(p))}
                      </div>
                    </div>
                  );
                } else {
                  // 단일 수강권 - 기존 카드 스타일
                  const p = group.passes[0];
                  const st = passStatus(p);
                  const progress = p.usedSessions / p.totalSessions;
                  return (
                    <div key={p.id} className="rounded-2xl p-3" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm" style={{ color: theme.ink }}>{p.type}</span>
                            {p.category === 'private' && <Chip tone="accent" size="sm">개인</Chip>}
                            {p.category === 'trial' && <Chip tone="peach" size="sm">체험</Chip>}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: theme.inkMute }}>
                            {p.paymentDate && `결제 ${p.paymentDate} · `}{p.startDate} ~ {p.expiryDate}
                            {p.holdUsed && <span style={{ color: theme.warn }}> · 홀딩{p.holdDays}일 사용</span>}
                          </div>
                          {p.price > 0 && (
                            <div className="text-[11px] mt-0.5" style={{ color: theme.accent }}>
                              {p.price.toLocaleString()}원
                              {p.pricePerSession && <span style={{ color: theme.inkMute }}> · 회당 {p.pricePerSession.toLocaleString()}원</span>}
                            </div>
                          )}
                          {p.note && (
                            <div className="text-[10px] mt-1 italic" style={{ color: theme.inkSoft }}>{p.note}</div>
                          )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {st && (() => {
                        if (st.label === '진행중') {
                          // 진행중일 땐 리듬 수련 칩으로
                          const rsP = rhythmStatus(p, closedDays);
                          if (rsP?.achieved) return <Chip tone="gold" size="sm">🏆 대상자</Chip>;
                          if (rsP?.challenging) return <Chip tone="goldSoft" size="sm">도전중</Chip>;
                          return null;
                        }
                        return (
                          <Chip tone={
                            st.label === '시작예정' ? 'warn' :
                            st.label === '홀딩' ? 'warn' :
                            st.label === '완료' ? 'success' :
                            st.tone
                          } size="sm">{st.label}</Chip>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: theme.inkSoft }}>진행</span>
                    <span className="font-medium tabular-nums">{p.usedSessions}/{p.totalSessions}회</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: theme.card }}>
                    <div className="h-full rounded-full" style={{
                      width: `${progress * 100}%`,
                      backgroundColor: rhythmStatus(p, closedDays)?.achieved ? '#C9A961' : theme.accent,
                      backgroundImage: rhythmStatus(p, closedDays)?.achieved ? 'linear-gradient(90deg, #C9A961, #E5C870)' : 'none',
                    }} />
                  </div>
                  
                  {/* 리듬 수련 트래커 박스 */}
                  {(() => {
                    const rsP = rhythmStatus(p, closedDays);
                    if (!rsP) return null;
                    if (rsP.achieved) {
                      return (
                        <div className="rounded-lg p-2 mb-2" style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold" style={{ color: '#6B5410' }}>🏆 리듬 수련 도전 성공</span>
                            <span className="text-[10px]" style={{ color: '#8B6F30' }}>{rsP.weeks}주 빠짐없이</span>
                          </div>
                          <div className="h-[3px] rounded-full overflow-hidden mb-1" style={{ backgroundColor: 'rgba(201,169,97,0.25)' }}>
                            <div className="h-full" style={{ width: '100%', backgroundColor: '#C9A961' }} />
                          </div>
                          <div className="text-[10px]" style={{ color: '#8B6F30' }}>
                            🎁 재등록 시 <strong>+{rsP.bonus}회 보상</strong>
                          </div>
                        </div>
                      );
                    }
                    if (rsP.challenging) {
                      const pct = rsP.requiredDays > 0 ? (rsP.attendedDays / rsP.requiredDays) * 100 : 0;
                      return (
                        <div className="rounded-lg p-2 mb-2" style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold" style={{ color: '#6B5410' }}>리듬 수련 도전중</span>
                            <span className="text-[10px]" style={{ color: '#8B6F30' }}>{rsP.attendedDays} / {rsP.requiredDays}회</span>
                          </div>
                          <div className="h-[3px] rounded-full overflow-hidden mb-1" style={{ backgroundColor: 'rgba(201,169,97,0.25)' }}>
                            <div className="h-full" style={{ width: `${pct}%`, backgroundColor: '#C9A961' }} />
                          </div>
                          <div className="text-[10px]" style={{ color: '#8B6F30' }}>
                            {rsP.remaining > 0 
                              ? <>남은 {rsP.remaining}회 빠짐없이 → <strong>+{rsP.bonus}회 보상</strong></>
                              : <>완주 직전! → <strong>+{rsP.bonus}회 보상</strong></>}
                          </div>
                        </div>
                      );
                    }
                    // 탈락(진행 중 결석) 또는 미달성(도전 기간 종료, 결석 있음)
                    if (rsP.expired || (rsP.completed && !rsP.achieved)) {
                      const missDates = (rsP.missedDays || []).map(d => fmtKRShort(d)).join(', ');
                      return (
                        <div className="rounded-lg p-2 mb-2" style={{ backgroundColor: theme.cardAlt2, border: `1px solid ${theme.line}` }}>
                          <div className="text-[10.5px]" style={{ color: theme.inkMute }}>
                            리듬 수련 — {rsP.missedDays?.length || 0}회 결석으로 대상 제외
                            {missDates && <span style={{ color: theme.inkSoft }}> · {missDates}</span>}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="flex gap-1.5 justify-end flex-wrap">
                    {p.canHold && !p.holdUsed && (
                      <Button size="sm" variant="ghost" onClick={() => applyHold(p.id, 7)}>홀딩 7일</Button>
                    )}
                    {p.holdUsed && (
                      <Button size="sm" variant="ghost" onClick={() => cancelHold(p.id)}
                        style={{ color: theme.warn }}>
                        홀딩 취소
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConvertingPass(p)}>
                      <RefreshCw size={11} /> 전환
                    </Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => deletePass(p.id)}></Button>
                  </div>
                </div>
              );
                }
              });
            })()}

            {/* Archived passes (converted) */}
            {(member.passes || []).filter(p => p.archived).length > 0 && (
              <details className="rounded-2xl p-3" style={{ backgroundColor: theme.cardAlt2, border: `1px dashed ${theme.line}` }}>
                <summary className="text-[12px] cursor-pointer font-medium" style={{ color: theme.inkSoft }}>
                  이전 수강권 {(member.passes || []).filter(p => p.archived).length}개
                </summary>
                <div className="space-y-2 mt-2">
                  {(member.passes || []).filter(p => p.archived).map(p => (
                    <div key={p.id} className="p-2 rounded-lg" style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-[13px] font-medium" style={{ color: theme.ink }}>{p.type}</div>
                          <div className="text-[10px]" style={{ color: theme.inkMute }}>
                            {p.startDate} ~ {p.expiryDate} · {p.usedSessions}/{p.totalSessions}회 사용
                          </div>
                          {p.convertedNote && (
                            <div className="text-[11px] mt-1 italic" style={{ color: theme.accent2 }}>
                              → {p.convertedNote}
                            </div>
                          )}
                        </div>
                        <Chip tone="neutral" size="sm">{p.convertedTo ? '전환됨' : '종료'}</Chip>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {!member.passes?.filter(p => !p.archived).length && !member.passes?.filter(p => p.archived).length && (
              <EmptyState icon={CreditCard} title="활성 수강권이 없어요" />
            )}
            <Button icon={Plus} onClick={() => setAddingPass(true)} className="w-full">수강권 추가</Button>
          </div>
        )}

        {tab === 'history' && (
          <div>
            {!history.length ? (
              <EmptyState icon={Clock} title="아직 수업 이력이 없어요" />
            ) : (
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                {history.map((h, i) => {
                  // 상태 판단
                  const todayStr = toYMD(new Date());
                  const isFuture = h.date > todayStr;
                  
                  // 상태 라벨/색상
                  let statusChip = null;
                  let bgColor = theme.cardAlt;
                  let borderColor = theme.lineLight;
                  let timeColor = theme.accent2;
                  
                  if (h.status === 'no_show') {
                    statusChip = <Chip tone="danger" size="sm">노쇼</Chip>;
                    bgColor = theme.dangerBg; borderColor = '#D19B91';
                    timeColor = theme.danger;
                  } else if (h.status === 'cancelled_sameday' || (h.cancelled && !h.status)) {
                    // 기존 cancelled 데이터 호환
                    if (h.cancelled === 'charged' || h.status === 'cancelled_sameday') {
                      statusChip = <Chip tone="warn" size="sm">당일 취소{h.cancelled === 'charged' ? ' (차감)' : ''}</Chip>;
                      bgColor = theme.warnBg; borderColor = '#C8A366';
                    } else if (h.cancelled === 'no_charge') {
                      statusChip = <Chip tone="neutral" size="sm">예약 취소</Chip>;
                    }
                  } else if (h.status === 'cancelled_advance') {
                    statusChip = <Chip tone="neutral" size="sm">예약 취소</Chip>;
                  } else if (h.status === 'reserved' || isFuture) {
                    statusChip = <Chip tone="accent" size="sm">예약 확정</Chip>;
                    bgColor = '#F5F4EC';
                  } else {
                    // 출석 (default)
                    statusChip = <Chip tone="success" size="sm">출석</Chip>;
                  }
                  
                  // 옛 시스템이 자동으로 넣은 cancelNote는 표시 안 함
                  const legacyAutoNotes = ['오늘 수업 빠짐', '미차감 취소', '차감 취소', '취소'];
                  const showCancelNote = h.cancelNote && !legacyAutoNotes.includes(h.cancelNote.trim());
                  
                  return (
                    <div key={`${h.date}_${h.time}`} className="px-3 py-2 rounded-lg flex items-center gap-3"
                      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
                      <span className="text-[12px] tabular-nums shrink-0" style={{ color: theme.inkMute }}>{h.date}</span>
                      <span className="text-[12px] font-medium tabular-nums shrink-0" style={{ color: timeColor, fontFamily: theme.serif, fontSize: 13 }}>{h.time}</span>
                      {showCancelNote && <span className="text-[10px] flex-1" style={{ color: theme.inkMute }}>· {h.cancelNote}</span>}
                      {!showCancelNote && <div className="flex-1"></div>}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {h.category === 'private' && <Chip tone="accent" size="sm">개인</Chip>}
                        {h.sessionNumber && h.totalSessions && !h.cancelled && h.status !== 'cancelled_advance' && h.status !== 'reserved' && !isFuture && (
                          <span className="text-[11px] tabular-nums" style={{ color: theme.inkSoft }}>{h.sessionNumber}/{h.totalSessions}</span>
                        )}
                        {statusChip}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'memo' && (
          <MemoTimeline items={member.memoTimeline || []} onUpdate={updateMemoTimeline} toast={toast} memberName={member.name} />
        )}

        {tab === 'progress' && (
          <ProgressTimeline items={member.progressLog || []} onUpdate={updateProgressLog} toast={toast} memberName={member.name} />
        )}

        {tab === 'assessment' && (
          <AssessmentPanel member={member} onUpdate={onUpdate} toast={toast} />
        )}

        {editing && (
          <MemberEditor
            member={member} onClose={() => setEditing(false)}
            groupSlots={groupSlots}
            onSave={async (d) => { await onUpdate({ ...member, ...d }); setEditing(false); toast('수정되었어요'); }}
          />
        )}
        {addingPass && (
          <PassEditor
            member={member}
            closedDays={closedDays}
            onClose={() => setAddingPass(false)}
            onSave={async (data, rewardSourceId) => {
              await addPass(data, rewardSourceId);
              // Offer registration SMS
              const p = Array.isArray(data) ? data[data.length - 1] : data;
              if (member.phone && p && p.totalSessions) {
                onSendSMS({
                  phone: member.phone, name: member.name,
                  template: SMS_TEMPLATES.registered(member, p),
                });
              }
            }}
          />
        )}
        {convertingPass && (
          <PassConvertDialog
            oldPass={convertingPass}
            onClose={() => setConvertingPass(null)}
            onConvert={doConvert}
          />
        )}
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, multiline }) {
  return (
    <div className={multiline ? '' : 'flex items-baseline justify-between gap-3'}>
      <div className="text-[11px]" style={{ color: theme.inkMute }}>{label}</div>
      <div className={`text-sm ${multiline ? 'mt-1 whitespace-pre-wrap' : 'text-right'}`} style={{ color: value ? theme.ink : theme.inkMute }}>
        {value || '—'}
      </div>
    </div>
  );
}

/* ---------- Memo Timeline (date + text) ---------- */
function MemoTimeline({ items, onUpdate, toast, memberName }) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('text'); // text | kakao
  const [date, setDate] = useState(toYMD(new Date()));
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');
  const [kakaoImages, setKakaoImages] = useState([]);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoParsed, setKakaoParsed] = useState(null);
  const fileRef = useRef();

  const add = async () => {
    if (!text.trim()) return;
    const next = [{ id: uid(), date, text: text.trim() }, ...items]
      .sort((a, b) => b.date.localeCompare(a.date));
    await onUpdate(next);
    setAdding(false); setText(''); toast('메모 저장됨');
  };
  
  const startEdit = (m) => {
    setEditingId(m.id);
    setEditText(m.text);
    setEditDate(m.date);
  };
  
  const saveEdit = async () => {
    if (!editText.trim()) return;
    const next = items
      .map(m => m.id === editingId ? { ...m, text: editText.trim(), date: editDate } : m)
      .sort((a, b) => b.date.localeCompare(a.date));
    await onUpdate(next);
    setEditingId(null);
    toast('수정 완료');
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await onUpdate(items.filter(x => x.id !== id));
  };

  // 카톡 캡처 분석
  const handleKakaoFiles = async (files) => {
    const arr = [...kakaoImages];
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const reader = new FileReader();
      const dataUrl = await new Promise(res => { reader.onload = e => res(e.target.result); reader.readAsDataURL(f); });
      arr.push({ id: uid(), name: f.name, dataUrl, base64: dataUrl.split(',')[1], mediaType: f.type });
    }
    setKakaoImages(arr);
  };

  const analyzeKakao = async () => {
    if (kakaoImages.length === 0) return;
    setKakaoLoading(true);
    try {
      const content = kakaoImages.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
      }));
      content.push({
        type: 'text',
        text: `이 카톡 캡처에서 ${memberName || '회원'}님과의 대화 내용을 정리해주세요.

다음 JSON 형식으로 응답해주세요 (다른 설명 없이 JSON만):
{
  "date": "YYYY-MM-DD (대화가 있었던 날짜, 추정 가능하면)",
  "summary": "대화 요약 (1-2줄)",
  "messages": [
    {"from": "회원" 또는 "강사", "time": "오전 10:30 같은 시간", "text": "메시지 내용"}
  ],
  "actionItems": ["일정 변경 요청", "취소" 등 강사가 처리해야 할 것]
}

날짜를 알 수 없으면 date는 빈 문자열로 두세요.`
      });
      const result = await callClaude([{ role: 'user', content }]);
      const cleaned = result.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setKakaoParsed(parsed);
    } catch (e) {
      console.error(e);
      alert('분석 실패: ' + e.message);
    }
    setKakaoLoading(false);
  };

  const saveKakao = async () => {
    if (!kakaoParsed) return;
    const memoText = `📱 카톡 대화\n${kakaoParsed.summary || ''}\n\n` +
      (kakaoParsed.messages || []).map(m => `[${m.from}${m.time ? ` · ${m.time}` : ''}] ${m.text}`).join('\n') +
      ((kakaoParsed.actionItems || []).length ? `\n\n📌 처리 필요:\n${kakaoParsed.actionItems.map(a => '· ' + a).join('\n')}` : '');
    const memoDate = kakaoParsed.date || toYMD(new Date());
    const next = [{ id: uid(), date: memoDate, text: memoText, source: 'kakao' }, ...items]
      .sort((a, b) => b.date.localeCompare(a.date));
    await onUpdate(next);
    setAdding(false); setKakaoImages([]); setKakaoParsed(null); setMode('text');
    toast('카톡 대화 저장됨');
  };

  return (
    <div className="space-y-2">
      {!adding && (
        <div className="flex gap-2">
          <Button icon={Plus} variant="soft" onClick={() => { setAdding(true); setMode('text'); }} className="flex-1">새 기록</Button>
          <Button icon={Camera} variant="soft" onClick={() => { setAdding(true); setMode('kakao'); }} className="flex-1">카톡 캡처</Button>
        </div>
      )}
      {adding && mode === 'text' && (
        <div className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="수업 내용, 회원 컨디션, 변경 사항, 상담 내용 등" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setAdding(false); setText(''); }}>취소</Button>
            <Button icon={Check} onClick={add}>저장</Button>
          </div>
        </div>
      )}
      {adding && mode === 'kakao' && (
        <div className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: '#FFF8E8', border: `1px solid #C8A366` }}>
          <div className="text-[12px] font-medium" style={{ color: '#5E4520' }}>📱 카톡 캡처 업로드</div>
          <div className="text-[10px]" style={{ color: '#8B6F30' }}>
            카톡 대화 캡처를 올리면 AI가 대화를 정리해서 저장해줘요.
          </div>
          
          {!kakaoParsed ? (
            <>
              <input ref={fileRef} type="file" accept="image/*" multiple
                onChange={(e) => handleKakaoFiles(e.target.files)} style={{ display: 'none' }} />
              <Button variant="soft" icon={Upload} onClick={() => fileRef.current?.click()} className="w-full">
                캡처 선택 ({kakaoImages.length}개)
              </Button>
              {kakaoImages.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {kakaoImages.map(img => (
                    <div key={img.id} className="relative">
                      <img src={img.dataUrl} className="w-full aspect-square object-cover rounded-md" />
                      <button onClick={() => setKakaoImages(kakaoImages.filter(x => x.id !== img.id))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.danger, color: '#FFF' }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setAdding(false); setKakaoImages([]); }}>취소</Button>
                <Button icon={Sparkles} onClick={analyzeKakao} disabled={kakaoLoading || kakaoImages.length === 0}>
                  {kakaoLoading ? '분석 중...' : 'AI 분석'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg p-2" style={{ backgroundColor: '#FFF', border: `1px solid ${theme.line}` }}>
                <div className="text-[11px] font-bold mb-1" style={{ color: theme.accent }}>분석 결과</div>
                {kakaoParsed.date && <div className="text-[11px] mb-1" style={{ color: theme.inkMute }}>날짜: {kakaoParsed.date}</div>}
                <div className="text-[12px] mb-2" style={{ color: theme.ink }}>{kakaoParsed.summary}</div>
                {(kakaoParsed.messages || []).length > 0 && (
                  <div className="space-y-1 mb-2 max-h-32 overflow-y-auto text-[11px]">
                    {kakaoParsed.messages.map((m, i) => (
                      <div key={i} style={{ color: m.from === '강사' ? theme.accent : theme.ink }}>
                        <span style={{ fontWeight: 600 }}>{m.from}</span>
                        {m.time && <span style={{ color: theme.inkMute, fontSize: 10 }}> · {m.time}</span>}
                        <span style={{ marginLeft: 4 }}>{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(kakaoParsed.actionItems || []).length > 0 && (
                  <div className="text-[11px] mt-2 p-2 rounded" style={{ backgroundColor: theme.warnBg, color: '#5E4520' }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>📌 처리 필요</div>
                    {kakaoParsed.actionItems.map((a, i) => <div key={i}>· {a}</div>)}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setKakaoParsed(null); }}>다시 분석</Button>
                <Button icon={Check} onClick={saveKakao}>저장</Button>
              </div>
            </>
          )}
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon={FileText} title="아직 메모가 없어요" />
      ) : (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.id} className="rounded-2xl p-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
              {editingId === m.id ? (
                <div className="space-y-2">
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                  <TextArea value={editText} onChange={(e) => setEditText(e.target.value)} rows={4} />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>취소</Button>
                    <Button icon={Check} size="sm" onClick={saveEdit}>저장</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="text-[12px] font-medium tabular-nums flex items-center gap-1" style={{ color: theme.accent }}>
                      {m.date}
                      {m.source === 'kakao' && <span style={{ fontSize: 10, color: '#C8A366' }}>📱 카톡</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(m)} className="p-1" style={{ color: theme.inkMute }} title="수정">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => del(m.id)} className="p-1" style={{ color: theme.inkMute }} title="삭제">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[13px] whitespace-pre-wrap" style={{ color: theme.ink }}>{m.text}</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Progress Timeline with AI photo import ---------- */
function ProgressTimeline({ items, onUpdate, toast, memberName }) {
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('text'); // text | photo
  const [date, setDate] = useState(toYMD(new Date()));
  const [classType, setClassType] = useState('');
  const [bodyState, setBodyState] = useState('');
  const [afterChange, setAfterChange] = useState('');
  const [memo, setMemo] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const reset = () => {
    setDate(toYMD(new Date())); setClassType('');
    setBodyState(''); setAfterChange(''); setMemo(''); setImages([]);
    setMode('text'); setAdding(false);
  };

  const add = async () => {
    if (!bodyState.trim() && !afterChange.trim() && !memo.trim()) {
      toast('내용을 입력해주세요');
      return;
    }
    const next = [{
      id: uid(), date, classType, bodyState, afterChange, memo,
    }, ...items].sort((a, b) => b.date.localeCompare(a.date));
    await onUpdate(next);
    reset();
    toast('경과 기록 저장됨');
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await onUpdate(items.filter(x => x.id !== id));
  };

  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      try {
        // 이미지 자동 압축 (1568px, JPEG 85%) - fetch 에러 방지
        const { data, media_type } = await fileToCompressedBase64(f);
        arr.push({ name: f.name, data, media_type });
      } catch (e) {
        console.error('이미지 처리 실패:', f.name, e);
        if (toast) toast(`이미지 처리 실패: ${f.name}`);
      }
    }
    setImages(arr);
  };

  const analyzePhoto = async () => {
    if (images.length === 0) { toast('사진을 업로드해주세요'); return; }
    setLoading(true);
    try {
      const system = `당신은 한국 요가 강사의 경과 기록지 사진을 읽어내는 어시스턴트입니다. 사진에서 날짜, 수업 유형, 그날의 몸 상태, 수업 후 변화, 메모를 읽어 아래 JSON으로만 답해주세요. 날짜가 MM/DD 형식이면 2026년으로 보정해 YYYY-MM-DD로 작성해주세요.

{
  "entries": [
    {
      "date": "YYYY-MM-DD",
      "classType": "수업 유형 (예: 개인레슨 1회차)",
      "bodyState": "그날의 몸 상태",
      "afterChange": "수업 후 변화",
      "memo": "메모"
    }
  ]
}

JSON만 출력. 코드펜스 금지.`;
      const content = images.map(img => ({
        type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data },
      }));
      content.push({ type: 'text', text: `${memberName}님의 경과 기록지입니다. 각 행을 읽어서 entries 배열로 반환해주세요.` });
      const resp = await callClaude([{ role: 'user', content }], system);
      const parsed = tryParseJSON(resp);
      if (parsed?.entries?.length) {
        const newEntries = parsed.entries.map(e => ({ id: uid(), ...e }));
        const next = [...newEntries, ...items].sort((a, b) => b.date.localeCompare(a.date));
        await onUpdate(next);
        reset();
        toast(`${newEntries.length}개 경과 기록이 추가됐어요`);
      } else {
        toast('읽을 수 없었어요. 직접 입력해주세요');
      }
    } catch (e) {
      toast('분석 실패: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {!adding && (
        <Button icon={Plus} variant="soft" onClick={() => setAdding(true)} className="w-full">새 경과 기록</Button>
      )}
      {adding && (
        <div className="rounded-2xl p-3 space-y-3" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
          <div className="flex gap-1 text-[12px]">
            <button onClick={() => setMode('text')} className="flex-1 py-1.5 rounded-md"
              style={{
                backgroundColor: mode === 'text' ? theme.accent : 'transparent',
                color: mode === 'text' ? theme.card : theme.inkSoft,
                border: `1px solid ${theme.line}`,
              }}>
              <FileText size={12} className="inline mr-1" /> 직접 입력
            </button>
            <button onClick={() => setMode('photo')} className="flex-1 py-1.5 rounded-md"
              style={{
                backgroundColor: mode === 'photo' ? theme.accent : 'transparent',
                color: mode === 'photo' ? theme.card : theme.inkSoft,
                border: `1px solid ${theme.line}`,
              }}>
              <Camera size={12} className="inline mr-1" /> 사진 업로드
            </button>
          </div>

          {mode === 'text' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="날짜">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="수업 유형">
                  <Input value={classType} onChange={(e) => setClassType(e.target.value)} placeholder="예: 개인레슨 1회차" />
                </Field>
              </div>
              <Field label="그날의 몸 상태">
                <TextArea value={bodyState} onChange={(e) => setBodyState(e.target.value)} style={{ minHeight: 60 }} />
              </Field>
              <Field label="수업 후 변화">
                <TextArea value={afterChange} onChange={(e) => setAfterChange(e.target.value)} style={{ minHeight: 60 }} />
              </Field>
              <Field label="메모 (선택)">
                <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={reset}>취소</Button>
                <Button icon={Check} onClick={add}>저장</Button>
              </div>
            </>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-6 rounded-2xl flex flex-col items-center gap-1.5 border-2 border-dashed"
                style={{ borderColor: theme.line, color: theme.inkSoft, backgroundColor: theme.card }}>
                <Upload size={20} />
                <div className="text-sm font-medium">경과 기록지 사진</div>
                <div className="text-[11px]" style={{ color: theme.inkMute }}>여러 장 가능</div>
              </button>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <div key={`${i}-${(img.data || '').slice(0, 16)}`} className="relative">
                      <img src={`data:${img.media_type};base64,${img.data}`} className="w-16 h-16 object-cover rounded-lg" alt="" />
                      <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.danger, color: 'white' }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={reset}>취소</Button>
                <button onClick={analyzePhoto} disabled={loading || !images.length}
                  className="px-3.5 py-2 text-sm font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-60"
                  style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loading ? '읽는 중...' : 'AI로 읽어서 추가'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="아직 경과 기록이 없어요" hint="개인레슨 중심으로 기록해보세요" />
      ) : (
        <div className="space-y-2">
          {items.map(p => (
            <div key={p.id} className="rounded-2xl p-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
              <div className="flex justify-between items-baseline mb-2">
                <div className="flex items-baseline gap-2">
                  <div className="text-[12px] font-medium tabular-nums" style={{ color: theme.accent }}>{p.date}</div>
                  {p.classType && <Chip tone="accent" size="sm">{p.classType}</Chip>}
                </div>
                <button onClick={() => del(p.id)} className="p-1" style={{ color: theme.inkMute }}>
                  <Trash2 size={12} />
                </button>
              </div>
              {p.bodyState && (
                <div className="mb-1.5">
                  <div className="text-[10px] font-semibold" style={{ color: theme.inkSoft }}>그날의 몸 상태</div>
                  <div className="text-[13px] whitespace-pre-wrap" style={{ color: theme.ink }}>{p.bodyState}</div>
                </div>
              )}
              {p.afterChange && (
                <div className="mb-1.5">
                  <div className="text-[10px] font-semibold" style={{ color: theme.accent2 }}>수업 후 변화</div>
                  <div className="text-[13px] whitespace-pre-wrap" style={{ color: theme.ink }}>{p.afterChange}</div>
                </div>
              )}
              {p.memo && (
                <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>메모: {p.memo}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentPanel({ member, onUpdate, toast }) {
  const [mode, setMode] = useState('view'); // view | edit | photo
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);
  const fileRef = useRef();

  const a = member.assessment;

  // Enter edit mode with current data
  const startEdit = () => {
    setEditData({
      keyPoint: a?.keyPoint || '',
      summary: a?.summary || '',
      observations: (a?.observations || []).join('\n'),
      recommendations: (a?.recommendations || []).join('\n'),
      cautions: (a?.cautions || []).join('\n'),
    });
    setMode('edit');
  };

  const saveEdit = async () => {
    const updated = {
      ...a,
      keyPoint: editData.keyPoint,
      summary: editData.summary,
      observations: editData.observations.split('\n').filter(Boolean),
      recommendations: editData.recommendations.split('\n').filter(Boolean),
      cautions: editData.cautions.split('\n').filter(Boolean),
      updatedAt: toYMD(new Date()),
    };
    await onUpdate({ ...member, assessment: updated });
    toast('분석 내용을 수정했어요');
    setMode('view');
  };

  // Photo re-analysis
  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      try {
        // 이미지 자동 압축 (1568px, JPEG 85%) - fetch 에러 방지
        const { data, media_type } = await fileToCompressedBase64(f);
        arr.push({ name: f.name, data, media_type });
      } catch (e) {
        console.error('이미지 처리 실패:', f.name, e);
        if (toast) toast(`이미지 처리 실패: ${f.name}`);
      }
    }
    setImages(arr);
  };

  const analyzePhotos = async () => {
    if (!images.length) { toast('사진을 올려주세요'); return; }
    setLoading(true);
    try {
      const existing = a ? `\n\n기존 분석 내용:\n${JSON.stringify(a, null, 2)}` : '';
      const system = `당신은 한국 요가원 강사를 돕는 몸 상태 분석 전문 어시스턴트입니다. 회원의 상태 기록지, 메모, 사진을 보고 수업에 활용할 분석을 작성합니다.

기존 분석이 있으면 새 자료와 합쳐서 업데이트하세요.${existing}

반드시 아래 JSON만 출력하세요. 설명/코드펜스 금지.
{
  "keyPoint": "핵심 주의사항 한 줄 요약 (예: 골반 후방경사 · 목디스크 경미 · 손가락 방아쇠증후군)",
  "summary": "전반적인 몸 상태 2-3문장 요약",
  "observations": ["관찰사항1", "관찰사항2"],
  "recommendations": ["추천동작1", "추천동작2"],
  "cautions": ["주의사항1", "주의사항2"]
}`;

      const content = images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type, data: img.data },
      }));
      content.push({ type: 'text', text: `${member.name}님의 자료입니다. 분석해주세요.` });

      const resp = await callClaude([{ role: 'user', content }], system);
      const result = tryParseJSON(resp);
      if (result?.keyPoint || result?.summary) {
        const updated = {
          ...a,
          ...result,
          updatedAt: toYMD(new Date()),
          rawInput: (a?.rawInput ? a.rawInput + '\n---\n' : '') + `사진 ${images.length}장 추가 분석 ${toYMD(new Date())}`,
        };
        await onUpdate({ ...member, assessment: updated });
        toast('분석이 업데이트됐어요');
        setImages([]);
        setMode('view');
      } else {
        toast('읽을 수 없었어요. 더 밝은 사진으로 다시 시도해주세요');
      }
    } catch (e) {
      toast('분석 실패: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // ── 사진 분석 모드 ──
  if (mode === 'photo') return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => { setMode('view'); setImages([]); }} style={{ color: theme.inkSoft }}>
          <ChevronLeft size={16} />
        </button>
        <div className="font-semibold text-sm" style={{ color: theme.ink }}>사진으로 분석 업데이트</div>
      </div>
      <div className="text-[12px]" style={{ color: theme.inkSoft }}>
        상태 기록지, 메모, 사진 등 새 자료를 올리면 기존 분석에 합쳐서 업데이트해요.
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <button onClick={() => fileRef.current?.click()}
        className="w-full rounded-2xl p-5 border-2 border-dashed flex flex-col items-center gap-1.5"
        style={{ borderColor: theme.line, backgroundColor: theme.cardAlt }}>
        <Upload size={20} style={{ color: theme.accent }} />
        <div className="text-sm font-medium" style={{ color: theme.ink }}>사진 선택</div>
        <div className="text-[11px]" style={{ color: theme.inkMute }}>여러 장 가능</div>
      </button>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((img, i) => (
            <div key={i} className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ backgroundColor: theme.accentSoft, color: theme.inkSoft }}>
              <FileText size={11} /> {img.name}
              <button onClick={() => setImages(images.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
      )}
      <Button icon={loading ? Loader2 : Sparkles} onClick={analyzePhotos} disabled={loading || !images.length} className="w-full">
        {loading ? 'AI가 분석 중...' : 'AI로 분석 업데이트'}
      </Button>
    </div>
  );

  // ── 수동 편집 모드 ──
  if (mode === 'edit') return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => setMode('view')} style={{ color: theme.inkSoft }}>
          <ChevronLeft size={16} />
        </button>
        <div className="font-semibold text-sm" style={{ color: theme.ink }}>분석 직접 수정</div>
      </div>
      {[
        { label: '핵심 포인트', key: 'keyPoint', rows: 2 },
        { label: '요약', key: 'summary', rows: 3 },
        { label: '관찰사항 (줄 구분)', key: 'observations', rows: 4 },
        { label: '추천 동작 (줄 구분)', key: 'recommendations', rows: 4 },
        { label: '주의사항 (줄 구분)', key: 'cautions', rows: 3 },
      ].map(({ label, key, rows }) => (
        <Field key={key} label={label}>
          <TextArea rows={rows} value={editData[key]}
            onChange={(e) => setEditData({ ...editData, [key]: e.target.value })} />
        </Field>
      ))}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={() => setMode('view')}>취소</Button>
        <Button icon={Check} onClick={saveEdit}>저장</Button>
      </div>
    </div>
  );

  // ── 보기 모드 ──
  return (
    <div className="space-y-3 text-sm">
      {/* 액션 버튼 */}
      <div className="flex gap-2">
        <Button icon={Edit3} variant="soft" size="sm" onClick={startEdit}>직접 수정</Button>
        <Button icon={Camera} variant="soft" size="sm" onClick={() => setMode('photo')}>사진으로 업데이트</Button>
      </div>

      {!a ? (
        <div className="text-center py-6">
          <Sparkles size={28} className="mx-auto mb-2 opacity-60" style={{ color: theme.accent }} />
          <div className="text-sm" style={{ color: theme.inkSoft }}>아직 분석 자료가 없어요</div>
          <div className="text-xs mt-1" style={{ color: theme.inkMute }}>
            위 버튼으로 직접 입력하거나 사진을 올려주세요
          </div>
        </div>
      ) : (
        <>
          {a.keyPoint && (
            <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.highlight }}>
              <div className="text-[11px] font-semibold mb-1" style={{ color: theme.accent2 }}>핵심 포인트</div>
              <div className="text-sm" style={{ color: theme.ink }}>{a.keyPoint}</div>
            </div>
          )}
          {a.summary && (
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: theme.inkSoft }}>요약</div>
              <div className="text-sm whitespace-pre-wrap" style={{ color: theme.ink }}>{a.summary}</div>
            </div>
          )}
          {a.observations?.length > 0 && <Section title="관찰사항" items={a.observations} color={theme.accent} />}
          {a.recommendations?.length > 0 && <Section title="추천 동작" items={a.recommendations} color={theme.accent2} bullet="▸" />}
          {a.cautions?.length > 0 && <Section title="주의사항" items={a.cautions} color={theme.danger} bullet="⚠" />}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px]" style={{ color: theme.inkMute }}>업데이트 {a.updatedAt}</div>
            <Button variant="ghost" size="sm" icon={Trash2}
              onClick={async () => {
                if (!confirm('분석 내용을 삭제할까요?')) return;
                const u = { ...member }; delete u.assessment;
                await onUpdate(u); toast('삭제됨');
              }}>삭제</Button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   Pass Editor + Pass Converter
   ========================================================= */
function PassEditor({ member, onClose, onSave, closedDays = [] }) {
  const [presetIdx, setPresetIdx] = useState(1);
  const preset = PASS_PRESETS[presetIdx];
  const [paymentDate, setPaymentDate] = useState(toYMD(new Date()));
  const [startDate, setStartDate] = useState(toYMD(new Date()));
  const [type, setType] = useState(preset.label.replace('⭐ ', ''));
  const [total, setTotal] = useState(preset.total || 1);
  const [days, setDays] = useState(preset.days || 30);
  const [price, setPrice] = useState(preset.price);
  const [pricePerSession, setPricePerSession] = useState(0);
  
  // 리듬 수련 보상 - 이전 완료된 수강권 중 대상자
  const eligibleReward = useMemo(() => {
    if (!member?.passes) return null;
    // 가장 최근 완료된(대상자 + 보상 미사용) 수강권 찾기
    const candidates = member.passes
      .filter(p => !p.archived || p.archived) // 모든 수강권 (archived는 전환된 것)
      .map(p => ({ p, rs: rhythmStatus(p, closedDays) }))
      .filter(({ rs }) => rs?.achieved && !rs?.bonusApplied);
    // p.rhythmRewardUsed === true 면 이미 적용됨
    const usable = candidates.find(({ p }) => !p.rhythmRewardUsed);
    return usable || null;
  }, [member, closedDays]);
  
  const [applyBonus, setApplyBonus] = useState(true);
  const bonus = (eligibleReward && applyBonus) ? eligibleReward.rs.bonus : 0;
  const [category, setCategory] = useState(preset.category || 'group');
  const [canHold, setCanHold] = useState(!!preset.canHold);
  const [note, setNote] = useState('');

  useEffect(() => {
    const p = PASS_PRESETS[presetIdx];
    if (p.special) return;
    setType(p.label.replace('⭐ ', ''));
    setTotal(p.total || 1);
    setDays(p.days || 30);
    setPrice(p.price);
    setCategory(p.category || 'group');
    setCanHold(!!p.canHold);
    setPricePerSession(0);
  }, [presetIdx]);

  const rawExpiry = toYMD(addDays(fromYMD(startDate), days - 1));
  const extendedExpiry = computeExpiry(startDate, days);
  const holidayCount = countHolidaysIn(startDate, extendedExpiry);

  const handleSave = () => {
    if (preset.special === 'starter') {
      onSave([
        {
          type: '스타터 · 개인레슨 3회', category: 'private',
          totalSessions: 3, days: 90,
          paymentDate, startDate, expiryDate: computeExpiry(startDate, 90),
          price: 0, bundleOf: '스타터 패키지',
        },
        {
          type: '스타터 · 소그룹 6회', category: 'group',
          totalSessions: 6, days: 35,
          paymentDate, startDate, expiryDate: computeExpiry(startDate, 35),
          price: 360000, bundleOf: '스타터 패키지',
        },
      ]);
    } else {
      const data = {
        type, category, totalSessions: total + bonus,
        paymentDate, startDate, expiryDate: extendedExpiry,
        price, canHold, days, note: note || undefined,
      };
      if (pricePerSession > 0) data.pricePerSession = pricePerSession;
      // 보상 적용 정보
      if (bonus > 0) {
        data.rhythmBonus = bonus;
        data.rhythmBonusFrom = eligibleReward.p.id;
      }
      onSave(data, eligibleReward && applyBonus ? eligibleReward.p.id : null);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="수강권 추가">
      <div className="space-y-3">
        {/* 🏆 리듬 수련 보상 */}
        {eligibleReward && (
          <div className="rounded-xl p-3" style={{ backgroundColor: '#F5EBC8', border: '1px solid #C9A961' }}>
            <div className="text-[12px] font-bold mb-1" style={{ color: '#6B5410' }}>
              🏆 리듬 수련 대상자!
            </div>
            <div className="text-[10.5px] mb-2" style={{ color: '#8B6F30' }}>
              이전 {eligibleReward.p.type}을 {eligibleReward.rs.weeks}주 빠짐없이 완주 → <strong>+{eligibleReward.rs.bonus}회 보상 가능</strong>
            </div>
            <div className="flex justify-between items-center pt-2"
              style={{ borderTop: '1px dashed #C9A961' }}>
              <div>
                <div className="text-[12px] font-bold" style={{ color: '#6B5410' }}>
                  🏆 보상 {eligibleReward.rs.bonus}회 추가
                </div>
                <div className="text-[10px]" style={{ color: '#8B6F30' }}>
                  {applyBonus 
                    ? `${total}회 → ${total + eligibleReward.rs.bonus}회로 등록`
                    : '보상 없이 등록'}
                </div>
              </div>
              <button onClick={() => setApplyBonus(!applyBonus)}
                className="rounded-full transition-all"
                style={{
                  width: 38, height: 22,
                  backgroundColor: applyBonus ? '#C9A961' : '#CCC',
                  position: 'relative',
                  border: 'none',
                  flexShrink: 0,
                }}>
                <div style={{
                  position: 'absolute',
                  width: 18, height: 18,
                  borderRadius: '50%',
                  backgroundColor: '#FFF',
                  top: 2,
                  [applyBonus ? 'right' : 'left']: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                }} />
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-medium mb-1.5" style={{ color: theme.inkSoft }}>소선요가 수강권</div>
          <div className="space-y-1.5">
            {PASS_PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setPresetIdx(i)}
                className="w-full text-left px-3 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: presetIdx === i ? theme.accent : theme.card,
                  color: presetIdx === i ? theme.card : theme.ink,
                  border: `1px solid ${presetIdx === i ? theme.accent : theme.line}`,
                }}>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-[12px] tabular-nums">
                    {p.price > 0 ? `${p.price.toLocaleString()}원` : '자유 입력'}
                  </span>
                </div>
                {p.note && (
                  <div className="text-[11px] mt-0.5" style={{ color: presetIdx === i ? '#FFFFFFCC' : theme.inkMute }}>
                    {p.note}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {preset.special === 'starter' ? (
          <div className="space-y-2 text-sm p-3 rounded-lg" style={{ backgroundColor: theme.highlight, color: theme.ink }}>
            <div className="font-semibold">스타터 패키지 구성</div>
            <div className="text-[12px]">
              · 개인레슨 3회 · 등록 후 선생님과 일정 조율<br />
              · 소그룹 레슨 6회 · 첫 그룹 수업 시작일 기준 5주 이내 사용 (35일)
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Field label="결제일">
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </Field>
              <Field label="소그룹 시작일">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
            </div>
          </div>
        ) : (
          <>
            <Field label="수강권 이름">
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="총 횟수">
                <Input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
              </Field>
              <Field label="유효기간(일)">
                <Input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </Field>
              <Field label="종류">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}
                  options={[
                    { value: 'group', label: '소그룹' },
                    { value: 'private', label: '개인' },
                    { value: 'trial', label: '체험' },
                  ]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="결제일">
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
              </Field>
              <Field label="사용 시작일">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="결제 금액">
                <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
              </Field>
              <Field label="회당 금액 (할인가)" hint="정가와 다를 때만 입력">
                <Input type="number" value={pricePerSession} onChange={(e) => setPricePerSession(Number(e.target.value))} placeholder="0" />
              </Field>
            </div>
            <Field label="메모 (선택)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 할인가 적용, 특별 사항" />
            </Field>

            <div className="text-[12px] p-2.5 rounded-lg space-y-1" style={{ backgroundColor: theme.cardAlt }}>
              <div className="flex justify-between">
                <span style={{ color: theme.inkSoft }}>원래 만료일</span>
                <span className="tabular-nums" style={{ color: theme.ink }}>{rawExpiry}</span>
              </div>
              {holidayCount > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span style={{ color: theme.accent2 }}>공휴일 {holidayCount}일 연장</span>
                    <span className="font-semibold tabular-nums" style={{ color: theme.accent }}>{extendedExpiry}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: theme.inkMute }}>빨간날은 공휴일로 처리해 유효기간이 자동 연장돼요</div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span style={{ color: theme.inkSoft }}>만료일</span>
                  <span className="font-semibold tabular-nums" style={{ color: theme.accent }}>{extendedExpiry}</span>
                </div>
              )}
            </div>
            {canHold && (
              <div className="text-[11px] p-2 rounded-lg" style={{ backgroundColor: theme.highlight, color: theme.ink }}>
                ⏸ 이 수강권은 최대 1주 홀딩이 가능해요 (수강권 상세에서 적용)
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button icon={Check} onClick={handleSave}>저장</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Pass Conversion (one-click) ---------- */
function PassConvertDialog({ oldPass, onClose, onConvert }) {
  const remaining = oldPass.totalSessions - oldPass.usedSessions;
  const [newType, setNewType] = useState(`${oldPass.type} 전환`);
  const [newTotal, setNewTotal] = useState(remaining);
  const [newDays, setNewDays] = useState(oldPass.days || 60);
  const [newPrice, setNewPrice] = useState(0);
  const [newCategory, setNewCategory] = useState(oldPass.category || 'group');
  const [newStartDate, setNewStartDate] = useState(toYMD(new Date()));
  const [refundAmount, setRefundAmount] = useState(0);
  const [convertNote, setConvertNote] = useState('');
  const [presetIdx, setPresetIdx] = useState(-1);

  const applyPreset = (i) => {
    setPresetIdx(i);
    const p = PASS_PRESETS[i];
    if (p.special) return;
    setNewType(p.label.replace('⭐ ', ''));
    setNewTotal(p.total || 1);
    setNewDays(p.days || 30);
    setNewPrice(p.price);
    setNewCategory(p.category || 'group');
  };

  const expiryDate = computeExpiry(newStartDate, newDays);

  const handleConvert = () => {
    onConvert(oldPass, {
      type: newType, category: newCategory,
      totalSessions: newTotal, days: newDays,
      paymentDate: toYMD(new Date()), startDate: newStartDate, expiryDate,
      price: newPrice,
      pricePerSession: newPrice > 0 && newTotal > 0 ? Math.round(newPrice / newTotal) : undefined,
      note: convertNote || `${oldPass.type}에서 전환`,
      convertNote: convertNote || `${oldPass.type} → ${newType}`,
    }, refundAmount);
  };

  return (
    <Modal open={true} onClose={onClose} title="수강권 전환">
      <div className="space-y-3">
        <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.cardAlt }}>
          <div className="text-[11px]" style={{ color: theme.inkMute }}>현재 수강권</div>
          <div className="font-semibold" style={{ color: theme.ink }}>{oldPass.type}</div>
          <div className="text-[12px] mt-1" style={{ color: theme.inkSoft }}>
            사용 {oldPass.usedSessions}/{oldPass.totalSessions}회 · 남은 {remaining}회
          </div>
        </div>

        <div className="text-center text-sm" style={{ color: theme.accent }}>
          <ChevronDown size={20} className="mx-auto" />
          새 수강권으로 전환
        </div>

        <div>
          <div className="text-xs font-medium mb-1.5" style={{ color: theme.inkSoft }}>프리셋 (선택)</div>
          <div className="flex flex-wrap gap-1">
            {PASS_PRESETS.filter(p => !p.special).map((p, i) => (
              <button key={p.label} onClick={() => applyPreset(i)}
                className="text-[11px] px-2 py-1 rounded"
                style={{
                  backgroundColor: presetIdx === i ? theme.accent : theme.cardAlt,
                  color: presetIdx === i ? theme.card : theme.inkSoft,
                  border: `1px solid ${theme.line}`,
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="새 수강권 이름">
          <Input value={newType} onChange={(e) => setNewType(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label="횟수">
            <Input type="number" value={newTotal} onChange={(e) => setNewTotal(Number(e.target.value))} />
          </Field>
          <Field label="유효기간(일)">
            <Input type="number" value={newDays} onChange={(e) => setNewDays(Number(e.target.value))} />
          </Field>
          <Field label="종류">
            <Select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              options={[
                { value: 'group', label: '소그룹' },
                { value: 'private', label: '개인' },
                { value: 'trial', label: '체험' },
              ]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="시작일">
            <Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
          </Field>
          <Field label="결제 금액">
            <Input type="number" value={newPrice} onChange={(e) => setNewPrice(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="환불 금액" hint="차액 환불이 있다면 입력 (없으면 0)">
          <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value))} />
        </Field>
        <Field label="전환 사유 / 메모">
          <TextArea value={convertNote} onChange={(e) => setConvertNote(e.target.value)}
            placeholder="예: 몸 상태로 인해 소그룹 → 개인레슨으로 전환" style={{ minHeight: 60 }} />
        </Field>

        <div className="text-[12px] p-2.5 rounded-lg" style={{ backgroundColor: theme.successBg }}>
          <div className="flex justify-between">
            <span>새 만료일</span>
            <span className="font-bold tabular-nums">{expiryDate}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button icon={RefreshCw} onClick={handleConvert}>전환하기</Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   Class Log — monthly calendar with expanded cells (B option)
   ========================================================= */
function ClassLogView({ classLog, setClassLog, sessions, setSessions, toast }) {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });

  const days = useMemo(() => {
    const first = new Date(month);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    // Monday = 1, Sunday = 0. We show Mon-Fri only.
    // First column index: 0=Mon, 1=Tue, ... 4=Fri
    const firstDow = first.getDay(); // 0=Sun, 1=Mon, ...
    const firstCol = firstDow === 0 || firstDow === 6 ? 0 : firstDow - 1;
    const arr = [];
    for (let i = 0; i < firstCol; i++) arr.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const dow = date.getDay();
      if (dow === 0 || dow === 6) continue; // skip weekends
      arr.push(date);
    }
    while (arr.length % 5 !== 0) arr.push(null);
    return arr;
  }, [month]);

  const [editingDate, setEditingDate] = useState(null);

  const saveEntries = async (date, entries) => {
    const next = { ...classLog };
    if (!entries.length) delete next[date]; else next[date] = entries;
    setClassLog(next);
    await saveKey(K.classlog, next);
    
    // sessions의 classNote도 동기화 (양방향 — 수업 기록에 쓰면 일정의 수업기록 칸에 자동 반영)
    if (setSessions && sessions) {
      const oldEntries = classLog[date] || [];
      const oldByTime = {};
      oldEntries.forEach(e => { if (e.time) oldByTime[e.time] = e.content || ''; });
      const newByTime = {};
      entries.forEach(e => { if (e.time) newByTime[e.time] = e.content || ''; });
      
      const allTimes = new Set([...Object.keys(oldByTime), ...Object.keys(newByTime)]);
      const sessNext = { ...sessions };
      let touched = false;
      allTimes.forEach(time => {
        const newContent = (newByTime[time] || '').trim();
        const sessKey = `${date}_${time}`;
        const sess = sessNext[sessKey];
        if (sess && sess.participants && sess.participants.length > 0) {
          if ((sess.classNote || '') !== newContent) {
            sessNext[sessKey] = { ...sess, classNote: newContent };
            touched = true;
          }
        }
      });
      if (touched) {
        setSessions(sessNext);
        await saveKey(K.sessions, sessNext);
      }
    }
  };

  // Swipe to change months
  const touchStartRef = useRef(null);
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(dx) > 120 && Math.abs(dy) < 60) {
      if (dx > 0) setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
      else setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    }
    touchStartRef.current = null;
  };

  return (
    <div className="px-3 pb-28 pt-2" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-[11px]" style={{ color: theme.inkMute }}>{month.getFullYear()}</div>
          <div className="font-bold text-lg" style={{ color: theme.ink }}>
            {month.getMonth() + 1}월
          </div>
        </div>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="grid grid-cols-5 text-center text-[11px] py-2" style={{ backgroundColor: theme.cardAlt }}>
          {['월', '화', '수', '목', '금'].map((d, i) => (
            <div key={i} style={{ color: (i === 1 || i === 3) ? theme.accent2 : theme.inkSoft, fontWeight: 500 }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-5">
          {days.map((d, i) => {
            if (!d) return <div key={i} className="border-b border-r min-h-[150px]" style={{ borderColor: theme.lineLight }} />;
            const key = toYMD(d);
            const entries = [...(classLog[key] || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const isToday = sameDay(d, new Date());
            const isHoliday = HOLIDAYS.has(key);
            const isSmGroup = d.getDay() === 2 || d.getDay() === 4;
            return (
              <button key={key} onClick={() => setEditingDate(key)}
                className="relative text-left p-1.5 transition-colors overflow-hidden active:scale-95 min-h-[150px]"
                style={{
                  borderBottom: `1px solid ${theme.lineLight}`,
                  borderRight: (i + 1) % 5 === 0 ? 'none' : `1px solid ${theme.lineLight}`,
                  backgroundColor: isToday ? theme.highlight : isHoliday ? theme.dangerBg + '40' : isSmGroup ? theme.accentSoft + '44' : 'transparent',
                }}>
                <div className="text-[12px] font-bold" style={{
                  color: isHoliday ? theme.danger : theme.ink,
                }}>
                  {d.getDate()}
                </div>
                <div className="mt-1 space-y-0.5">
                  {entries.slice(0, 6).map((e, j) => {
                    const isCancelled = /캔슬|노쇼|취소/.test(e.content || '') || !e.content;
                    return (
                      <div key={j} className="text-[10px] leading-[1.3] px-1 py-0.5 rounded"
                        style={{
                          backgroundColor: isCancelled ? theme.cardAlt : theme.accentSoft,
                          color: isCancelled ? theme.inkMute : theme.accent,
                          border: `1px solid ${isCancelled ? theme.line : theme.accent + '33'}`,
                          textDecoration: isCancelled && e.content ? 'line-through' : 'none',
                        }}>
                        {e.time && <span className="font-semibold">{e.time} </span>}
                        {e.content?.slice(0, 26) || '(미기록)'}
                      </div>
                    );
                  })}
                  {entries.length > 6 && <div className="text-[9px]" style={{ color: theme.inkMute }}>+{entries.length - 6}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] justify-center flex-wrap" style={{ color: theme.inkSoft }}>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.accentSoft, border: `1px solid ${theme.accent}33` }} />수업
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.dangerBg + '80' }} />공휴일
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.accentSoft + '66' }} />소그룹(화·목)
        </span>
      </div>

      {editingDate && (
        <DayLogEditor
          date={editingDate} entries={classLog[editingDate] || []}
          sessions={sessions}
          onClose={() => setEditingDate(null)}
          onSave={async (entries) => { await saveEntries(editingDate, entries); setEditingDate(null); toast('저장되었어요'); }}
        />
      )}
    </div>
  );
}

function DayLogEditor({ date, entries, sessions, onClose, onSave }) {
  const [list, setList] = useState(entries);
  const [time, setTime] = useState('11:00');
  const [content, setContent] = useState('');

  const add = () => {
    if (!content.trim()) return;
    const next = [...list, { id: uid(), time, content: content.trim() }]
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    setList(next);
    setContent('');
  };

  // Sort list by time whenever rendering
  const sortedList = [...list].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Get participants for a given time slot from sessions
  const getParticipants = (t) => {
    const key = `${date}_${t}`;
    return sessions?.[key]?.participants || [];
  };

  return (
    <Modal open={true} onClose={onClose} title={fmtKR(fromYMD(date))}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          {sortedList.map((e) => {
            const parts = getParticipants(e.time);
            const active = parts.filter(p => !p.cancelled);
            const cancelled = parts.filter(p => p.cancelled);
            const isCancelledEntry = /캔슬|노쇼|취소/.test(e.content || '') || !e.content;
            return (
              <div key={e.id} className="p-2.5 rounded-lg"
                style={{
                  backgroundColor: isCancelledEntry ? theme.cardAlt : theme.accentSoft,
                  border: `1px solid ${isCancelledEntry ? theme.line : theme.accent + '33'}`,
                }}>
                <div className="flex items-start gap-2">
                  <div className="text-[12px] font-bold tabular-nums min-w-[46px]"
                    style={{ color: isCancelledEntry ? theme.inkMute : theme.accent, fontFamily: theme.serif, fontSize: 14 }}>
                    {e.time}
                  </div>
                  <div className="flex-1 text-sm whitespace-pre-wrap"
                    style={{
                      color: isCancelledEntry ? theme.inkMute : theme.ink,
                      textDecoration: isCancelledEntry && e.content ? 'line-through' : 'none',
                    }}>
                    {e.content || <span style={{ fontStyle: 'italic' }}>(미기록)</span>}
                  </div>
                  <button onClick={() => setList(list.filter(x => x.id !== e.id))} className="p-1" style={{ color: theme.danger }}>
                    <X size={14} />
                  </button>
                </div>
                {(active.length > 0 || cancelled.length > 0) && (
                  <div className="mt-1.5 pl-[54px] text-[11px]" style={{ color: theme.inkSoft }}>
                    {active.map((p, i) => (
                      <span key={p.memberId || `t-${i}-${p.memberName}`}>
                        {i > 0 && ', '}
                        <span style={{ color: theme.ink, fontWeight: p.isTrial ? 400 : 500 }}>{p.memberName}</span>
                        {p.sessionNumber && p.totalSessions && (
                          <span style={{ color: theme.inkMute }}> ({p.sessionNumber}/{p.totalSessions})</span>
                        )}
                        {p.isTrial && <span style={{ color: theme.accent2 }}>·체험</span>}
                        {p.classType === '개인' && <span style={{ color: theme.accent }}>·개인</span>}
                      </span>
                    ))}
                    {cancelled.map((p, i) => (
                      <span key={`c-${p.memberId || p.memberName || i}`} style={{ color: p.cancelled === 'charged' ? theme.danger : theme.inkMute, textDecoration: 'line-through' }}>
                        {(active.length > 0 || i > 0) && ', '}
                        {p.memberName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!list.length && <div className="text-xs py-3 text-center rounded-lg" style={{ color: theme.inkMute, backgroundColor: theme.cardAlt }}>아직 기록이 없어요</div>}
        </div>

        <div className="pt-3 border-t space-y-2" style={{ borderColor: theme.line }}>
          <Field label="시간">
            <Select value={time} onChange={(e) => setTime(e.target.value)}
              options={TIME_PRESETS.map(t => ({ value: t, label: t }))} />
          </Field>
          <Field label="수업 내용">
            <TextArea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="예: 바시스타아사나&#10;다누라아사나 다리 들기" style={{ minHeight: 70 }} />
          </Field>
          <Button icon={Plus} onClick={add} className="w-full">기록 추가</Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button icon={Check} onClick={() => onSave(list)}>저장</Button>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   Trials View — separate tab for trial members
   ========================================================= */
function TrialsView({ trials, setTrials, members, setMembers, sessions, setSessions, toast, onSendSMS }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [textImporting, setTextImporting] = useState(false);
  const [filterTime, setFilterTime] = useState('confirmed'); // confirmed(예약확정) | all(전체)
  const [filterReg, setFilterReg] = useState('all'); // all | converted | not_converted
  const [search, setSearch] = useState('');

  const saveTrials = async (list) => {
    setTrials(list);
    await saveKey(K.trials, list);
  };

  const addManyTrials = async (newList) => {
    const existing = trials.map(t => `${t.name}|${t.phone}`);
    const filtered = newList.filter(t => !existing.includes(`${t.name}|${t.phone}`));
    const withIds = filtered.map(t => ({
      id: uid(), ...t,
      createdAt: toYMD(new Date()),
      status: t.status || '예약확정',
    }));
    const next = [...withIds, ...trials];
    await saveTrials(next);
    
    // 일정에도 자동 등록
    if (sessions && setSessions) {
      const sessionsCopy = { ...sessions };
      withIds.forEach(t => {
        if (!t.date || !t.time) return;
        const key = `${t.date}_${t.time}`;
        const existingSess = sessionsCopy[key] || { date: t.date, time: t.time, participants: [] };
        // 중복 체크
        if (!existingSess.participants.some(p => p.memberName === t.name && p.isTrial)) {
          existingSess.participants = [...existingSess.participants, {
            memberName: t.name,
            isTrial: true,
            status: 'reserved',
          }];
        }
        sessionsCopy[key] = existingSess;
      });
      setSessions(sessionsCopy);
      await saveKey(K.sessions, sessionsCopy);
    }
    
    setBulkImporting(false);
    setTextImporting(false);
    toast(`${withIds.length}명 추가 + 일정 등록 완료 (중복 ${newList.length - filtered.length}명 제외)`);
  };

  const create = async (data) => {
    const t = { id: uid(), ...data, createdAt: toYMD(new Date()), status: data.status || '예약확정' };
    const next = [t, ...trials];
    await saveTrials(next);
    
    // 일정에 자동 등록
    if (sessions && setSessions && t.date && t.time) {
      const key = `${t.date}_${t.time}`;
      const existingSess = sessions[key] || { date: t.date, time: t.time, participants: [] };
      const alreadyIn = existingSess.participants?.some(p => p.memberName === t.name && p.isTrial);
      if (!alreadyIn) {
        const newSess = {
          ...existingSess,
          participants: [...(existingSess.participants || []), {
            memberName: t.name,
            isTrial: true,
            status: 'reserved',
          }],
        };
        const newSessions = { ...sessions, [key]: newSess };
        setSessions(newSessions);
        await saveKey(K.sessions, newSessions);
      }
    }
    
    setAdding(false);
    toast('체험자 등록됨 (일정 등록 완료)');
    if (data.sendSMS && data.phone && data.date && data.time) {
      onSendSMS({ phone: data.phone, name: data.name, template: SMS_TEMPLATES.trial(t) });
    }
  };

  const update = async (id, data) => {
    const oldTrial = trials.find(t => t.id === id);
    await saveTrials(trials.map(t => t.id === id ? { ...t, ...data } : t));
    
    // 시간/날짜 변경 시 일정도 업데이트
    if (sessions && setSessions && oldTrial && (oldTrial.date !== data.date || oldTrial.time !== data.time)) {
      const sessionsCopy = { ...sessions };
      // 옛 슬롯에서 제거
      if (oldTrial.date && oldTrial.time) {
        const oldKey = `${oldTrial.date}_${oldTrial.time}`;
        if (sessionsCopy[oldKey]) {
          sessionsCopy[oldKey] = {
            ...sessionsCopy[oldKey],
            participants: (sessionsCopy[oldKey].participants || []).filter(p => 
              !(p.memberName === oldTrial.name && p.isTrial)
            ),
          };
        }
      }
      // 새 슬롯에 추가
      if (data.date && data.time) {
        const newKey = `${data.date}_${data.time}`;
        const existingSess = sessionsCopy[newKey] || { date: data.date, time: data.time, participants: [] };
        const alreadyIn = existingSess.participants?.some(p => p.memberName === data.name && p.isTrial);
        if (!alreadyIn) {
          sessionsCopy[newKey] = {
            ...existingSess,
            participants: [...(existingSess.participants || []), {
              memberName: data.name,
              isTrial: true,
              status: 'reserved',
            }],
          };
        }
      }
      setSessions(sessionsCopy);
      await saveKey(K.sessions, sessionsCopy);
    }
    
    setEditing(null);
    toast('수정됨');
  };

  const del = async (id) => {
    if (!confirm('이 체험자를 삭제할까요?')) return;
    const trial = trials.find(t => t.id === id);
    await saveTrials(trials.filter(t => t.id !== id));
    
    // 일정에서도 제거
    if (sessions && setSessions && trial?.date && trial?.time) {
      const key = `${trial.date}_${trial.time}`;
      if (sessions[key]) {
        const newSess = {
          ...sessions[key],
          participants: (sessions[key].participants || []).filter(p => 
            !(p.memberName === trial.name && p.isTrial)
          ),
        };
        const newSessions = { ...sessions, [key]: newSess };
        setSessions(newSessions);
        await saveKey(K.sessions, newSessions);
      }
    }
    
    setEditing(null);
  };

  const convertToMember = async (trial) => {
    if (!confirm(`${trial.name}님을 정식 회원으로 전환할까요?`)) return;
    const m = {
      id: uid(), name: trial.name, phone: trial.phone,
      yogaExperience: trial.experience, notes: trial.painPoints,
      keyPoint: trial.painPoints,
      passes: [], memoTimeline: [], progressLog: [],
      fixedSlots: [], createdAt: toYMD(new Date()),
      fromTrial: trial.id,
    };
    setMembers([...members, m]);
    await saveKey(K.members, [...members, m]);
    await saveTrials(trials.map(t => t.id === trial.id ? { ...t, status: '회원전환', convertedAt: toYMD(new Date()), convertedToMemberId: m.id } : t));
    setEditing(null);
    toast('정식 회원으로 전환됨');
  };

  const statusTone = (s) => {
    if (s === '회원전환') return 'success';   // 초록
    if (s === '수업완료') return 'neutral';   // 회색
    if (s === '예약확정') return 'warn';      // 노랑
    if (s === '취소' || s === '미참석') return 'danger';        // 빨강
    return 'neutral';
  };

  const todayStr = toYMD(new Date());
  const convertedCount = trials.filter(t => t.status === '회원전환').length;
  const notConvertedCount = trials.filter(t => t.status !== '회원전환').length;
  
  // 시간 필터 카운트
  const confirmedCount = trials.filter(t => t.status === '예약확정').length;
  
  const filteredTrials = trials
    .filter(t => {
      // 시간 필터: 예약확정 / 전체
      const timeOk = filterTime === 'all' ? true 
        : filterTime === 'confirmed' ? t.status === '예약확정'
        : filterTime === 'completed' ? t.status === '수업완료'
        : filterTime === 'cancelled' ? (t.status === '취소' || t.status === '미참석')
        : true;
      // 등록 필터
      const regOk = filterReg === 'all' ? true :
        filterReg === 'converted' ? t.status === '회원전환' :
        t.status !== '회원전환';
      const q = search.trim();
      const searchOk = !q || (t.name || '').includes(q) || (t.phone || '').replace(/-/g, '').includes(q.replace(/-/g, ''));
      return timeOk && regOk && searchOk;
    })
    .sort((a, b) => {
      const aUpcoming = a.status === '예약확정';
      const bUpcoming = b.status === '예약확정';
      // 예약확정 먼저
      if (aUpcoming && !bUpcoming) return -1;
      if (!aUpcoming && bUpcoming) return 1;
      // 예약확정끼리: 날짜 오름차순 (가까운 날짜 위)
      if (aUpcoming && bUpcoming) return (a.date || '').localeCompare(b.date || '');
      // 나머지: 날짜 내림차순 (최근 날짜 위)
      return (b.date || '').localeCompare(a.date || '');
    });

  return (
    <div className="px-3 pb-28 pt-2">
      {/* 검색창 */}
      <div className="relative mb-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 전화번호 검색"
          className="w-full px-4 py-2 rounded-2xl text-[13px] pr-8"
          style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, color: theme.ink, outline: 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            style={{ color: theme.inkMute }}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        {/* 시간 필터 - 유효(기본)/완료/전체 */}
        <select
          value={filterTime}
          onChange={e => setFilterTime(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[12px] shrink-0"
          style={{
            backgroundColor: theme.accent,
            color: theme.card,
            border: `1px solid ${theme.accent}`,
            fontWeight: 600,
            outline: 'none', appearance: 'none',
            paddingRight: 22,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 5px center',
          }}>
          <option value="confirmed">예약확정</option>
          <option value="completed">수업완료</option>
          <option value="cancelled">취소</option>
          <option value="all">전체</option>
        </select>

        {/* 등록 필터 - 전체/등록/미등록 */}
        <select
          value={filterReg}
          onChange={e => setFilterReg(e.target.value)}
          className="px-2 py-1.5 rounded-lg text-[12px] shrink-0"
          style={{
            backgroundColor: filterReg !== 'all' ? theme.accent : theme.card,
            color: filterReg !== 'all' ? theme.card : theme.inkSoft,
            border: `1px solid ${filterReg !== 'all' ? theme.accent : theme.line}`,
            fontWeight: filterReg !== 'all' ? 600 : 500,
            outline: 'none', appearance: 'none',
            paddingRight: 22,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${filterReg !== 'all' ? '%23ffffff' : '%238A9088'}' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 5px center',
          }}>
          <option value="all">전환 결과</option>
          <option value="converted">등록</option>
          <option value="not_converted">미등록</option>
        </select>

        <div className="flex-1" />
        <Button icon={FileText} variant="soft" size="sm" onClick={() => setTextImporting(true)}>텍스트</Button>
        <Button icon={Plus} onClick={() => setAdding(true)}>추가</Button>
      </div>

      {/* 카운트 표시 */}
      <div className="text-[12px] mb-3 px-1" style={{ color: theme.inkSoft }}>
        {filterTime === 'confirmed' && <span>예약확정 <strong style={{ color: theme.ink }}>{confirmedCount}명</strong></span>}
        {filterTime === 'completed' && <span>수업완료 <strong style={{ color: theme.ink }}>{trials.filter(t => t.status === '수업완료').length}명</strong></span>}
        {filterTime === 'cancelled' && <span>취소 <strong style={{ color: theme.danger }}>{trials.filter(t => t.status === '취소' || t.status === '미참석').length}명</strong></span>}
        {filterTime === 'all' && <span>전체 <strong style={{ color: theme.ink }}>{trials.length}명</strong></span>}
        {trials.length > 0 && (
          <span className="ml-2">· 전환률 <strong style={{ color: theme.accent }}>
            {Math.round(convertedCount / trials.length * 100)}%
          </strong></span>
        )}
      </div>

      {filteredTrials.length === 0 ? (
        <EmptyState icon={UserPlus} title={trials.length === 0 ? '아직 체험자가 없어요' : '해당 체험자가 없어요'} hint={trials.length === 0 ? '체험 예약을 여기서 관리하세요' : null} />
      ) : (
        <div className="space-y-2">
          {filteredTrials.map(t => (
            <div key={t.id} onClick={() => setEditing(t)}
              className="rounded-2xl p-3.5 cursor-pointer active:scale-[0.99]"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
              {/* 이름+칩 왼쪽 · 날짜/시간 오른쪽 — v3 스타일 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="font-bold text-[15px]" style={{ color: theme.ink }}>{t.name}</div>
                  <Chip tone={statusTone(t.status)} size="sm">{t.status}</Chip>
                </div>
                {t.date && (
                  <div className="text-[13px] font-semibold ml-3 shrink-0"
                    style={{ color: theme.inkSoft, fontFamily: theme.serif, fontSize: 15 }}>
                    {fmtKRShort(t.date)}{t.time && ` ${t.time}`}
                  </div>
                )}
              </div>
              {/* 부가정보 */}
              <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
                {[t.source, t.paid === true ? '입금완' : t.paid === false ? '미입금' : null, t.experience].filter(Boolean).join(' · ')}
              </div>
              {/* 메모/불편사항 */}
              {(t.painPoints || t.memo) && (
                <div className="text-[11px] mt-1 leading-relaxed" style={{ color: theme.inkSoft }}>
                  {[t.painPoints, t.memo].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && <TrialEditor onClose={() => setAdding(false)} onSave={create} />}
      {textImporting && (
        <TrialTextImport
          onClose={() => setTextImporting(false)}
          onSave={addManyTrials}
          toast={toast}
        />
      )}
      {editing && (
        <TrialDetail
          trial={editing}
          onClose={() => setEditing(null)}
          onUpdate={update}
          onDelete={() => del(editing.id)}
          onConvert={() => convertToMember(editing)}
          onSendSMS={onSendSMS}
        />
      )}
    </div>
  );
}

function TrialTextImport({ onClose, onSave, toast }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);

  const parseText = (raw) => {
    // 공통 헤더에서 날짜/시간 추출 (예: "4/28 11:00 체험")
    let commonDate = '';
    let commonTime = '';
    const headerMatch = raw.match(/(\d{1,2})\s*[\/\.\-]\s*(\d{1,2})[^\n]*?(\d{1,2})\s*[:시]\s*(\d{0,2})/);
    if (headerMatch) {
      const [, m, d, h, min] = headerMatch;
      commonDate = `2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      commonTime = `${String(h).padStart(2,'0')}:${(min || '00').padStart(2,'0')}`;
    }

    const phoneRegex = /(\d{3}[\-\s]?\d{3,4}[\-\s]?\d{4})/g;
    const phones = [...raw.matchAll(phoneRegex)];
    if (phones.length === 0) return [];

    const trials = [];
    for (let i = 0; i < phones.length; i++) {
      const phoneMatch = phones[i];
      const phoneIdx = phoneMatch.index;
      const phone = phoneMatch[1].replace(/\s/g, '-').replace(/(\d{3})-?(\d{3,4})-?(\d{4})/, '$1-$2-$3');
      const startIdx = i === 0 ? 0 : phones[i-1].index + phones[i-1][0].length;
      const beforePhone = raw.slice(startIdx, phoneIdx);
      const endIdx = i + 1 < phones.length ? phones[i+1].index : raw.length;
      const afterPhone = raw.slice(phoneMatch.index + phoneMatch[0].length, endIdx);

      // 이름 + 괄호 정보
      const nameLine = beforePhone.split('\n').reverse().find(l => /[가-힣]{2,4}/.test(l)) || '';
      const nameMatch = nameLine.match(/([가-힣]{2,4})\s*(?:\(([^)]+)\))?/);
      const name = nameMatch ? nameMatch[1] : '';
      const parenInfo = nameMatch?.[2] || '';

      let source = '';
      let paid = null;
      const memoParts = [];
      if (parenInfo) {
        const tokens = parenInfo.split(/[\/,·]/).map(s => s.trim()).filter(Boolean);
        for (const tk of tokens) {
          if (/인스타/.test(tk)) source = '인스타';
          else if (/카채널|카카오|카톡채널/.test(tk)) source = '카카오채널';
          else if (/당근/.test(tk)) source = '당근';
          else if (/지인|소개/.test(tk)) source = '지인소개';
          else if (/입완|입금완료|완료/.test(tk)) paid = true;
          else if (/미입금|입금전|미수/.test(tk)) paid = false;
          else memoParts.push(tk);
        }
      }

      const lines = afterPhone.split('\n').map(l => l.trim()).filter(Boolean);
      let painPoints = [];
      let experience = '';
      for (const line of lines) {
        if (/요가\s*경험|요가\s*해본|운동\s*경험/.test(line)) {
          if (/없|무|안\s*해|처음/.test(line)) experience = '없음';
          else if (/유|있|함|많/.test(line)) experience = '있음';
          else experience = line;
        } else if (line === '유' || line === '무') {
          experience = line === '유' ? '있음' : '없음';
        } else if (line.length > 0 && line.length < 100) {
          painPoints.push(line);
        }
      }

      if (name) {
        trials.push({
          name, phone,
          date: commonDate, time: commonTime,
          experience,
          painPoints: painPoints.join(', '),
          source,
          paid,
          memo: memoParts.join(', '),
          status: '예약확정',
        });
      }
    }
    return trials;
  };

  const analyze = () => {
    if (!text.trim()) { toast('텍스트를 입력해주세요'); return; }
    const result = parseText(text);
    if (result.length === 0) {
      toast('전화번호를 찾을 수 없어요. 형식을 확인해주세요');
      return;
    }
    setParsed(result);
  };

  const save = () => {
    if (!parsed?.length) return;
    onSave(parsed);
  };

  const removeParsed = (idx) => setParsed(parsed.filter((_, i) => i !== idx));
  const updateParsed = (idx, field, value) => {
    setParsed(parsed.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <Modal open={true} onClose={onClose} title="체험자 텍스트로 일괄 추가" maxWidth="max-w-lg">
      <div className="space-y-3">
        {!parsed && (
          <>
            <div className="text-[12px]" style={{ color: theme.inkSoft, lineHeight: 1.6 }}>
              카톡/문자 메모 그대로 붙여넣으세요.<br/>
              날짜·시간은 맨 위에 한 번만 적으면 모든 사람에게 적용돼요.
            </div>
            <TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'4/28 11:00 체험\n장다연(인스타/미입금)\n010-3573-0912\n발목 삐었음\n요가 경험 없음'}
              rows={12}
              style={{ fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>취소</Button>
              <Button icon={Sparkles} onClick={analyze} disabled={!text.trim()}>
                분석
              </Button>
            </div>
          </>
        )}
        {parsed && (
          <>
            <div className="text-[12px] mb-2" style={{ color: theme.inkSoft }}>
              <strong>{parsed.length}명</strong> 추출됨. 잘못된 부분은 수정 가능.
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {parsed.map((t, i) => (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <input
                      value={t.name || ''}
                      onChange={(e) => updateParsed(i, 'name', e.target.value)}
                      className="font-bold text-sm bg-transparent border-b flex-1"
                      style={{ borderColor: theme.line, color: theme.ink, padding: '2px 0' }}
                    />
                    <button onClick={() => removeParsed(i)} className="text-[11px] flex-shrink-0" style={{ color: theme.danger }}>제거</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <div style={{ color: theme.inkMute }}>전화번호</div>
                      <input value={t.phone || ''} onChange={(e) => updateParsed(i, 'phone', e.target.value)}
                        className="w-full bg-transparent" style={{ color: theme.ink }} />
                    </div>
                    <div>
                      <div style={{ color: theme.inkMute }}>날짜 / 시간</div>
                      <div style={{ color: theme.accent }}>{t.date} {t.time}</div>
                    </div>
                    <div>
                      <div style={{ color: theme.inkMute }}>경험</div>
                      <div style={{ color: theme.ink }}>{t.experience || '-'}</div>
                    </div>
                    <div>
                      <div style={{ color: theme.inkMute }}>경로</div>
                      <div style={{ color: theme.ink }}>{t.source || '-'}</div>
                    </div>
                  </div>
                  {t.painPoints && (
                    <div className="text-[11px] mt-2 p-2 rounded" style={{ backgroundColor: theme.warnBg, color: '#5E4520' }}>
                      ⚠ {t.painPoints}
                    </div>
                  )}
                  {(t.memo || t.paid !== null) && (
                    <div className="text-[10px] mt-1" style={{ color: theme.inkMute }}>
                      {t.paid === true && '입금완료'}
                      {t.paid === false && '미입금'}
                      {t.memo && (t.paid !== null ? ' · ' : '') + t.memo}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setParsed(null)}>다시 입력</Button>
              <Button icon={Check} onClick={save}>{parsed.length}명 저장 + 일정 등록</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}


function TrialBulkImport({ onClose, onSave, toast }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null); // array of trials
  const fileRef = useRef();

  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      try {
        // 이미지 자동 압축 (1568px, JPEG 85%) - fetch 에러 방지
        const { data, media_type } = await fileToCompressedBase64(f);
        arr.push({ name: f.name, data, media_type });
      } catch (e) {
        console.error('이미지 처리 실패:', f.name, e);
        if (toast) toast(`이미지 처리 실패: ${f.name}`);
      }
    }
    setImages(arr);
  };

  const analyze = async () => {
    if (images.length === 0) { toast('사진을 올려주세요'); return; }
    setLoading(true);
    try {
      const system = `당신은 한국 요가원 체험자 메모를 JSON으로 정리하는 어시스턴트입니다. 캡처 이미지에서 체험자들을 읽어내세요.

각 체험자당 아래 필드로 추출:
- name (이름, 필수)
- phone (전화번호, 010-xxxx-xxxx 형식으로 정규화)
- date (체험 날짜, YYYY-MM-DD 형식. 연도는 2026)
- time (체험 시간, HH:MM 형식. 19:20, 20:50 등)
- experience (요가 경험, 있음/없음/구체 내용)
- painPoints (불편한 부위나 몸 상태 메모)
- paid (입금 완료 여부: true | false | null)
- status: "예약확정" | "수업완료" | "미전환" | "취소"
- source: 방문 경로 (카채널, 인스타, 당근, 지인소개 등 있으면)
- memo: 그 외 메모

반드시 JSON만 출력:
{"trials": [{...}, {...}]}

코드펜스 금지, 설명 금지.`;

      const content = images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type, data: img.data },
      }));
      content.push({ type: 'text', text: '체험자 메모를 JSON으로 정리해주세요.' });

      const resp = await callClaude([{ role: 'user', content }], system);
      const result = tryParseJSON(resp);
      if (result?.trials?.length) {
        setParsed(result.trials);
      } else {
        toast('읽을 수 없었어요. 다른 사진을 시도해주세요');
      }
    } catch (e) {
      toast('분석 실패: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!parsed?.length) return;
    onSave(parsed);
  };

  const removeParsed = (idx) => {
    setParsed(parsed.filter((_, i) => i !== idx));
  };

  const updateParsed = (idx, field, value) => {
    setParsed(parsed.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  return (
    <Modal open={true} onClose={onClose} title="체험자 사진으로 일괄 추가" maxWidth="max-w-lg">
      <div className="space-y-3">
        {!parsed && (
          <>
            <div className="text-[12px]" style={{ color: theme.inkSoft }}>
              체험자 메모 캡처를 올리면 AI가 자동으로 정리해드려요. 여러 장 한 번에 가능합니다.
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-1.5 border-2 border-dashed"
              style={{ borderColor: theme.line, color: theme.inkSoft, backgroundColor: theme.cardAlt }}>
              <Upload size={24} />
              <div className="text-sm font-medium">사진 올리기</div>
              <div className="text-[11px]" style={{ color: theme.inkMute }}>여러 장 가능 · 메모 캡처</div>
            </button>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={`${i}-${(img.data || '').slice(0, 16)}`} className="relative">
                    <img src={`data:${img.media_type};base64,${img.data}`} className="w-16 h-16 object-cover rounded-lg" alt="" />
                    <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.danger, color: 'white' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={analyze} disabled={loading || !images.length}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ backgroundColor: theme.accent, color: '#FFF' }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loading ? 'AI가 읽는 중...' : 'AI로 정리하기'}
            </button>
          </>
        )}

        {parsed && (
          <>
            <div className="text-[12px] font-medium" style={{ color: theme.inkSoft }}>
              {parsed.length}명 찾았어요. 확인하고 저장해주세요.
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {parsed.map((t, i) => (
                <div key={i} className="rounded-2xl p-3" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.lineLight}` }}>
                  <div className="flex justify-between items-start mb-1.5">
                    <input value={t.name || ''} onChange={(e) => updateParsed(i, 'name', e.target.value)}
                      className="font-bold text-sm bg-transparent border-b"
                      style={{ color: theme.ink, borderColor: theme.line }} />
                    <button onClick={() => removeParsed(i)} style={{ color: theme.danger }}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <input value={t.phone || ''} onChange={(e) => updateParsed(i, 'phone', e.target.value)}
                      placeholder="전화번호"
                      className="px-1.5 py-1 rounded"
                      style={{ backgroundColor: theme.card, color: theme.ink, border: `1px solid ${theme.lineLight}` }} />
                    <input value={t.date || ''} onChange={(e) => updateParsed(i, 'date', e.target.value)}
                      placeholder="날짜"
                      className="px-1.5 py-1 rounded"
                      style={{ backgroundColor: theme.card, color: theme.ink, border: `1px solid ${theme.lineLight}` }} />
                    <input value={t.time || ''} onChange={(e) => updateParsed(i, 'time', e.target.value)}
                      placeholder="시간"
                      className="px-1.5 py-1 rounded"
                      style={{ backgroundColor: theme.card, color: theme.ink, border: `1px solid ${theme.lineLight}` }} />
                    <input value={t.status || '예약확정'} onChange={(e) => updateParsed(i, 'status', e.target.value)}
                      placeholder="상태"
                      className="px-1.5 py-1 rounded"
                      style={{ backgroundColor: theme.card, color: theme.ink, border: `1px solid ${theme.lineLight}` }} />
                  </div>
                  {t.experience && (
                    <div className="text-[11px] mt-1" style={{ color: theme.inkSoft }}>
                      경험: {t.experience}
                    </div>
                  )}
                  {t.painPoints && (
                    <div className="text-[11px] mt-0.5" style={{ color: theme.accent2 }}>
                      불편: {t.painPoints}
                    </div>
                  )}
                  {t.source && (
                    <div className="text-[10px] mt-0.5" style={{ color: theme.inkMute }}>
                      경로: {t.source} {t.paid === true && '· 입금 완'}{t.paid === false && '· 미입금'}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setParsed(null)}>다시 읽기</Button>
              <Button icon={Check} onClick={save}>
                {parsed.length}명 저장
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function TrialEditor({ trial, onClose, onSave }) {
  const [data, setData] = useState(trial || {
    name: '', phone: '', experience: '', painPoints: '',
    date: toYMD(new Date()), time: '11:00', status: '예약확정',
    sendSMS: true,
  });
  return (
    <Modal open={true} onClose={onClose} title={trial ? '체험자 수정' : '체험자 추가'}>
      <div className="space-y-3">
        <Field label="이름 *">
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="홍길동" />
        </Field>
        <Field label="연락처">
          <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} placeholder="010-0000-0000" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="체험 날짜">
            <Input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} />
          </Field>
          <Field label="시간">
            <Select value={data.time} onChange={(e) => setData({ ...data, time: e.target.value })}
              options={['11:00', '19:20', '20:50'].map(t => ({ value: t, label: t }))} />
          </Field>
        </div>
        <Field label="요가·운동 경험">
          <Input value={data.experience} onChange={(e) => setData({ ...data, experience: e.target.value })} placeholder="예: 필라테스 1년, 첫 요가" />
        </Field>
        <Field label="몸의 불편한 부분">
          <TextArea value={data.painPoints} onChange={(e) => setData({ ...data, painPoints: e.target.value })}
            placeholder="예: 허리 통증, 거북목, 어깨 뭉침" style={{ minHeight: 60 }} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="유입 경로">
            <Select value={data.source || ''} onChange={(e) => setData({ ...data, source: e.target.value })}
              options={[
                { value: '', label: '선택' },
                { value: '인스타', label: '인스타' },
                { value: '카카오채널', label: '카카오채널' },
                { value: '당근', label: '당근' },
                { value: '지인소개', label: '지인소개' },
                { value: 'open class', label: 'open class' },
                { value: '전화/문자', label: '전화/문자' },
              ]} />
          </Field>
          <Field label="입금 여부">
            <Select value={data.paid === true ? 'paid' : data.paid === false ? 'unpaid' : ''}
              onChange={(e) => {
                const v = e.target.value;
                setData({ ...data, paid: v === 'paid' ? true : v === 'unpaid' ? false : null });
              }}
              options={[
                { value: '', label: '선택' },
                { value: 'paid', label: '입금완료' },
                { value: 'unpaid', label: '미입금' },
              ]} />
          </Field>
        </div>
        <Field label="메모">
          <TextArea value={data.memo || ''} onChange={(e) => setData({ ...data, memo: e.target.value })}
            placeholder="기타 메모" style={{ minHeight: 50 }} />
        </Field>
        <Field label="상태">
          <Select value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}
            options={[
              { value: '문의', label: '문의' },
              { value: '예약확정', label: '예약확정' },
              { value: '수업완료', label: '수업완료' },
              { value: '취소', label: '취소' },
              { value: '회원전환', label: '회원전환' },
              { value: '미전환', label: '미전환' },
            ]} />
        </Field>
        {!trial && data.phone && data.date && data.time && data.status === '예약확정' && (
          <label className="flex items-center gap-2 text-sm" style={{ color: theme.ink }}>
            <input type="checkbox" checked={!!data.sendSMS} onChange={(e) => setData({ ...data, sendSMS: e.target.checked })} />
            <span>저장 후 체험 예약 안내 문자 바로 보내기</span>
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button icon={Check} onClick={() => data.name && onSave(data)} disabled={!data.name}>저장</Button>
        </div>
      </div>
    </Modal>
  );
}

function TrialDetail({ trial, onClose, onUpdate, onDelete, onConvert, onSendSMS }) {
  const [editing, setEditing] = useState(false);
  return (
    <Modal open={true} onClose={onClose} title={trial.name} maxWidth="max-w-md">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          <Chip tone={
            trial.status === '회원전환' ? 'success' :
            trial.status === '취소' || trial.status === '미참석' ? 'danger' :
            'warn'
          } size="sm">{trial.status}</Chip>
          {trial.date && <Chip tone="accent" size="sm">{trial.date} {trial.time}</Chip>}
        </div>
        <div className="space-y-2 text-sm">
          <InfoRow label="연락처" value={trial.phone} />
          <InfoRow label="경험" value={trial.experience} />
          <InfoRow label="불편 부위" value={trial.painPoints} multiline />
          <InfoRow label="등록일" value={trial.createdAt} />
          {trial.convertedAt && <InfoRow label="전환일" value={trial.convertedAt} />}
        </div>

        {trial.phone && trial.date && trial.status === '예약확정' && (
          <button onClick={() => onSendSMS({
              phone: trial.phone, name: trial.name,
              template: SMS_TEMPLATES.trial(trial),
            })}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
            style={{ backgroundColor: theme.accent, color: '#FFF' }}>
            <MessageSquare size={14} /> 체험 예약 안내 문자
          </button>
        )}

        {trial.status !== '회원전환' && (
          <button onClick={onConvert}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
            style={{ backgroundColor: theme.accent2, color: '#FFF' }}>
            <UserPlus size={14} /> 정식 회원으로 전환
          </button>
        )}
        
        {/* 취소 버튼 (수업완료 또는 예약확정에서 표시) */}
        {(trial.status === '수업완료' || trial.status === '예약확정') && (
          <button 
            onClick={async () => {
              if (!confirm('취소로 처리할까요?')) return;
              await onUpdate(trial.id, { ...trial, status: '취소' });
            }}
            className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}` }}>
            <X size={14} /> 취소
          </button>
        )}

        <div className="flex justify-between pt-2 border-t" style={{ borderColor: theme.line }}>
          <Button variant="danger" size="sm" icon={Trash2} onClick={onDelete}>삭제</Button>
          <Button variant="soft" size="sm" icon={Edit3} onClick={() => setEditing(true)}>수정</Button>
        </div>

        {editing && (
          <TrialEditor trial={trial} onClose={() => setEditing(false)}
            onSave={async (d) => { await onUpdate(trial.id, d); setEditing(false); }} />
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
   AI Analysis View
   ========================================================= */
function AnalysisView({ members, setMembers, toast }) {
  const [memberId, setMemberId] = useState('');
  const [inputMode, setInputMode] = useState('text');
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [newMemberName, setNewMemberName] = useState('');
  const fileRef = useRef();

  const saveMembers = async (list) => { setMembers(list); await saveKey(K.members, list); };

  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      try {
        // 이미지 자동 압축 (1568px, JPEG 85%) - fetch 에러 방지
        const { data, media_type } = await fileToCompressedBase64(f);
        arr.push({ name: f.name, data, media_type });
      } catch (e) {
        console.error('이미지 처리 실패:', f.name, e);
        if (toast) toast(`이미지 처리 실패: ${f.name}`);
      }
    }
    setImages(arr);
  };

  const analyze = async () => {
    if (!text.trim() && images.length === 0) { toast('사진이나 메모를 입력해 주세요'); return; }
    setLoading(true); setResult(null);
    try {
      const system = `당신은 한국의 요가 강사를 돕는 해부학 & 움직임 분석 어시스턴트입니다. 강사가 올린 회원 관찰 기록 또는 설문 응답을 읽고, 반드시 아래 JSON 형식으로만 답하세요. 한국어로 작성하세요.

{
  "summary": "2~3문장의 전체 요약",
  "keyPoint": "현재 몸의 핵심 포인트 한 줄",
  "observations": ["해부학적 관찰 포인트들 (정렬, 가동범위, 코어, 호흡 등)"],
  "recommendations": ["수업에서 포함하면 좋을 동작/시퀀스 제안"],
  "cautions": ["주의해야 할 점 또는 피할 동작"]
}

응답은 JSON 오브젝트 하나만 출력하고, 설명이나 코드펜스는 넣지 마세요.`;

      const content = [];
      if (text.trim()) content.push({ type: 'text', text: `회원 관찰 메모:\n${text.trim()}` });
      images.forEach(img => {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } });
      });
      if (!text.trim()) content.push({ type: 'text', text: '위 이미지를 분석해 주세요.' });

      const resp = await callClaude([{ role: 'user', content }], system);
      const parsed = tryParseJSON(resp);
      setResult(parsed || { summary: resp, keyPoint: '', observations: [], recommendations: [], cautions: [] });
    } catch (e) {
      toast('분석 실패: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const saveToMember = async () => {
    if (!result) return;
    let targetId = memberId;
    let list = [...members];
    if (!targetId && newMemberName.trim()) {
      const m = { id: uid(), name: newMemberName.trim(), passes: [], memoTimeline: [], progressLog: [], fixedSlots: [], createdAt: toYMD(new Date()) };
      list = [...list, m];
      targetId = m.id;
    }
    if (!targetId) { toast('회원을 선택하거나 새 이름을 입력해 주세요'); return; }
    list = list.map(m => m.id === targetId
      ? {
        ...m,
        keyPoint: result.keyPoint || m.keyPoint,
        assessment: {
          ...result, rawInput: text,
          sourceImages: images.length > 0 ? images : undefined,
          updatedAt: toYMD(new Date()),
        },
      }
      : m);
    await saveMembers(list);
    toast('회원 분석이 저장되었어요');
    setResult(null); setText(''); setImages([]);
    setMemberId(targetId); setNewMemberName('');
  };

  return (
    <div className="px-3 pb-28 pt-2 space-y-4">
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="flex items-center gap-2 mb-1">
          <Leaf size={16} style={{ color: theme.accent }} />
          <div className="font-bold" style={{ color: theme.ink }}>AI 회원 분석</div>
        </div>
        <div className="text-[12px]" style={{ color: theme.inkSoft }}>
          상태 기록지 사진, 특징 메모, 녹음 받아쓴 내용을 올리면 해부학적 관찰 · 수업 방향 · 주의점으로 정리해 드려요.
        </div>
      </div>

      <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="text-[11px] font-medium" style={{ color: theme.inkSoft }}>저장할 회원</div>
        <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="기존 회원 선택"
          options={members.map(m => ({ value: m.id, label: m.name + (m.assessment ? ' · 분석 있음' : '') }))} />
        {!memberId && (
          <>
            <div className="text-[10px] text-center" style={{ color: theme.inkMute }}>— 또는 —</div>
            <Input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="새 회원 이름" />
          </>
        )}
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="flex gap-1">
          {[
            { id: 'text', label: '메모', icon: FileText },
            { id: 'image', label: '사진', icon: Camera },
          ].map(t => {
            const on = inputMode === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setInputMode(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px]"
                style={{
                  backgroundColor: on ? theme.accent : 'transparent',
                  color: on ? theme.card : theme.inkSoft,
                  border: `1px solid ${theme.line}`,
                }}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {inputMode === 'text' ? (
          <TextArea value={text} onChange={(e) => setText(e.target.value)}
            placeholder="관찰 내용 또는 녹음한 메모를 입력하세요&#10;예: 40대 여성, 사무직, 거북목 경향, 어깨 말림, 골반 전방경사 약간, 햄스트링 타이트함..."
            style={{ minHeight: 140 }} />
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-1.5 border-2 border-dashed"
              style={{ borderColor: theme.line, color: theme.inkSoft, backgroundColor: theme.cardAlt2 }}>
              <Upload size={24} />
              <div className="text-sm font-medium">사진 업로드</div>
              <div className="text-[11px]" style={{ color: theme.inkMute }}>상태 기록지, 메모, 사진 모두 가능</div>
            </button>
            {images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={`${i}-${(img.data || '').slice(0, 16)}`} className="relative">
                    <img src={`data:${img.media_type};base64,${img.data}`} className="w-16 h-16 object-cover rounded-lg" alt="" />
                    <button onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: theme.danger, color: 'white' }}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <TextArea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="이미지와 함께 추가 메모 (선택)" className="mt-2" style={{ minHeight: 60 }} />
          </div>
        )}

        <button onClick={analyze} disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition-all active:scale-95 disabled:opacity-60"
          style={{ backgroundColor: theme.accent, color: theme.card }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {loading ? '분석 중...' : '분석하기'}
        </button>
      </div>

      {result && (
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.accent}` }}>
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: theme.accent }} />
            <div className="font-bold text-sm" style={{ color: theme.ink }}>분석 결과</div>
          </div>

          {result.keyPoint && (
            <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.highlight }}>
              <div className="text-[10px] font-semibold mb-1" style={{ color: theme.accent2 }}>핵심 포인트</div>
              <div className="text-sm" style={{ color: theme.ink }}>{result.keyPoint}</div>
            </div>
          )}

          {result.summary && (
            <div>
              <div className="text-[11px] font-semibold mb-1" style={{ color: theme.inkSoft }}>요약</div>
              <div className="text-[13px] whitespace-pre-wrap" style={{ color: theme.ink }}>{result.summary}</div>
            </div>
          )}

          {result.observations?.length > 0 && <Section title="해부학적 관찰" items={result.observations} color={theme.accent} />}
          {result.recommendations?.length > 0 && <Section title="수업에 넣으면 좋을 동작" items={result.recommendations} color={theme.accent2} bullet="▸" />}
          {result.cautions?.length > 0 && <Section title="주의할 점" items={result.cautions} color={theme.danger} bullet="⚠" />}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => setResult(null)}>버리기</Button>
            <Button icon={Check} onClick={saveToMember}>회원에 저장</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Stats View — revenue + trial conversion
   ========================================================= */
function StatsView({ members, trials, sessions, closedDays = [] }) {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);

  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const targetYM = `${targetMonth.getFullYear()}-${pad(targetMonth.getMonth() + 1)}`;

  const stats = useMemo(() => {
    let revenue = 0, count = 0, refundTotal = 0;
    const byCat = { group: 0, private: 0, trial: 0, other: 0 };
    members.forEach(m => {
      (m.passes || []).forEach(p => {
        if (p.paymentDate && p.paymentDate.startsWith(targetYM) && p.price > 0) {
          revenue += p.price; count++;
          const cat = p.category || 'other';
          byCat[cat] = (byCat[cat] || 0) + p.price;
        }
      });
      (m.refunds || []).forEach(r => {
        if (r.date?.startsWith(targetYM)) refundTotal += r.amount;
      });
    });

    const monthTrials = trials.filter(t => (t.date || t.createdAt || '').startsWith(targetYM));
    const converted = monthTrials.filter(t => t.status === '회원전환').length;
    const conversionRate = monthTrials.length > 0 ? Math.round(converted / monthTrials.length * 100) : 0;
    
    // 체험 수익: 미전환 + 입금완료 = 1만원
    const trialRevenue = monthTrials.filter(t => 
      t.status !== '회원전환' && t.paid === true
    ).length * 10000;
    revenue += trialRevenue;
    byCat.trial = (byCat.trial || 0) + trialRevenue;
    count += monthTrials.filter(t => t.status !== '회원전환' && t.paid === true).length;

    return { revenue, count, refundTotal, net: revenue - refundTotal, byCat, trialTotal: monthTrials.length, converted, conversionRate, trialRevenue };
  }, [members, trials, targetYM]);

  // 수업 통계
  const classStats = useMemo(() => {
    if (!sessions) return { total: 0, group: 0, private: 0, weekAvg: 0, weeks: 0 };
    let total = 0, group = 0, privateClass = 0;
    const todayStr = toYMD(new Date());
    Object.entries(sessions).forEach(([key, s]) => {
      if (!s?.date?.startsWith(targetYM)) return;
      // 미래 수업은 제외
      if (s.date > todayStr) return;
      // 출석한 사람이 있는 수업만 카운트 (취소/노쇼 빼고)
      const hasAttended = s.participants?.some(p => 
        !p.cancelled && p.status !== 'reserved' && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'no_show'
      );
      if (!hasAttended) return;
      total++;
      // 카테고리 판단
      const hasPrivate = s.participants?.some(p => p.classType === '개인');
      if (hasPrivate) privateClass++;
      else group++;
    });
    
    // 해당 월의 주 수 (현재 월이면 지난 주까지만)
    const monthStart = new Date(targetMonth);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);
    const isCurrentMonth = monthOffset === 0;
    const lastDay = isCurrentMonth ? new Date() : monthEnd;
    const daysElapsed = Math.ceil((lastDay - monthStart) / (1000*60*60*24)) + 1;
    const weeks = Math.max(1, Math.ceil(daysElapsed / 7));
    const weekAvg = (total / weeks).toFixed(1);
    
    return { total, group, private: privateClass, weekAvg, weeks };
  }, [sessions, targetYM, monthOffset, targetMonth]);
  
  // 출석률 통계
  const attendanceStats = useMemo(() => {
    if (!sessions) return { total: 0, attend: 0, cancel: 0, noShow: 0, attendRate: 0 };
    let attend = 0, cancel = 0, noShow = 0;
    const todayStr = toYMD(new Date());
    Object.values(sessions).forEach(s => {
      if (!s?.date?.startsWith(targetYM)) return;
      if (s.date > todayStr) return; // 미래 제외
      (s.participants || []).forEach(p => {
        if (p.isTrial) return; // 체험자 제외 (회원만)
        // status 또는 cancelled 필드 보고 분류
        if (p.status === 'no_show' || p.cancelled === 'no_show') {
          noShow++;
        } else if (p.status === 'cancelled_advance' || p.status === 'cancelled_sameday' || p.cancelled) {
          cancel++;
        } else if (p.status === 'reserved') {
          // 미래 예약 — 제외
        } else {
          attend++; // 출석 (default)
        }
      });
    });
    const total = attend + cancel + noShow;
    const attendRate = total > 0 ? Math.round(attend / total * 100) : 0;
    const cancelRate = total > 0 ? Math.round(cancel / total * 100) : 0;
    const noShowRate = total > 0 ? Math.round(noShow / total * 100) : 0;
    return { total, attend, cancel, noShow, attendRate, cancelRate, noShowRate };
  }, [sessions, targetYM]);

  const activeMembers = members.filter(m => activePass(m)).length;
  
  const [expanded, setExpanded] = useState(null);
  
  // 수익 인사이트
  const revenueInsight = useMemo(() => {
    // 전월 수익
    const prevMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
    const prevYM = `${prevMonth.getFullYear()}-${pad(prevMonth.getMonth() + 1)}`;
    let prevRevenue = 0;
    members.forEach(m => {
      (m.passes || []).forEach(p => {
        if (p.paymentDate?.startsWith(prevYM) && p.price > 0) prevRevenue += p.price;
      });
    });
    const prevTrials = trials.filter(t => (t.date || t.createdAt || '').startsWith(prevYM) && t.status !== '회원전환' && t.paid === true);
    prevRevenue += prevTrials.length * 10000;
    
    const prevMonthDelta = prevRevenue > 0 ? Math.round(((stats.revenue - prevRevenue) / prevRevenue) * 100) : null;
    const avgPerMember = activeMembers > 0 ? Math.round(stats.revenue / activeMembers / 1000) * 1000 : 0;
    
    // 시작예정 수강권 (다음달 예상)
    const nextMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1);
    const nextYM = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}`;
    let expectedNextMonth = 0;
    let expectedCount = 0;
    members.forEach(m => {
      (m.passes || []).forEach(p => {
        if (p.startDate?.startsWith(nextYM) && p.price > 0 && !p.archived) {
          expectedNextMonth += p.price;
          expectedCount++;
        }
      });
    });
    
    const trialPaidCount = trials.filter(t => 
      (t.date || t.createdAt || '').startsWith(targetYM) && t.status !== '회원전환' && t.paid === true
    ).length;
    
    return {
      prevMonthDelta,
      prevMonthRevenue: prevRevenue,
      prevMonthLabel: `${prevMonth.getMonth() + 1}월`,
      avgPerMember,
      expectedNextMonth,
      expectedCount,
      trialPaidCount,
    };
  }, [members, trials, targetYM, targetMonth, stats.revenue, activeMembers]);
  
  // 회원 인사이트
  const memberInsight = useMemo(() => {
    const todayStr = toYMD(new Date());
    
    // 재등록률: 만료 회원 중 새 수강권 등록한 비율
    let expiredCount = 0, reEnrolledCount = 0;
    members.forEach(m => {
      const passes = m.passes || [];
      const expiredPasses = passes.filter(p => p.expiryDate && p.expiryDate < todayStr && !p.archived);
      if (expiredPasses.length === 0) return;
      expiredCount++;
      // 만료 후 새 수강권이 있으면 재등록
      const lastExpiry = expiredPasses.reduce((max, p) => p.expiryDate > max ? p.expiryDate : max, '');
      const hasNewer = passes.some(p => p.startDate >= lastExpiry && p.startDate <= todayStr && !p.archived && !expiredPasses.includes(p));
      if (hasNewer || activePass(m)) reEnrolledCount++;
    });
    const reEnrollRate = expiredCount > 0 ? Math.round((reEnrolledCount / expiredCount) * 100) : 0;
    
    // 회원별 출석률 + 도전중
    const memberAtt = {};
    Object.values(sessions || {}).forEach(s => {
      if (s.date >= todayStr) return; // 오늘 포함 미래는 카운트 X
      (s.participants || []).forEach(p => {
        if (!p.memberId || p.isTrial) return;
        // status가 명시적이지 않으면 옛 데이터 → sessionNumber 있으면 출석으로 본다
        const status = p.status;
        const isReserved = status === 'reserved' || status === '예약확정';
        if (isReserved) return; // 예약만 잡힌 건 카운트 X
        
        const isCancelledOrNoShow = p.cancelled 
          || status === 'cancelled_advance' 
          || status === 'cancelled_sameday' 
          || status === 'no_show';
        const isAttended = !isCancelledOrNoShow && (p.sessionNumber || status === 'attended' || status === '출석');
        
        // 진짜 결과가 나온 것만 (출석/취소/노쇼) total 카운트
        if (!isAttended && !isCancelledOrNoShow) return;
        
        if (!memberAtt[p.memberId]) memberAtt[p.memberId] = { attend: 0, total: 0, lastDate: '' };
        memberAtt[p.memberId].total++;
        if (isAttended) {
          memberAtt[p.memberId].attend++;
          if (s.date > memberAtt[p.memberId].lastDate) memberAtt[p.memberId].lastDate = s.date;
        }
      });
    });
    
    const consistent = [];
    const needAttention = [];
    let challengingCount = 0;
    
    members.forEach(m => {
      const pass = activePass(m);
      if (!pass) return;
      const att = memberAtt[m.id] || { attend: 0, total: 0, lastDate: '' };
      const attRate = att.total > 0 ? Math.round((att.attend / att.total) * 100) : 0;
      const rs = rhythmStatus(pass, closedDays);
      
      if (rs?.challenging) challengingCount++;
      
      // 꾸준한 회원: 출석률 80%+ 또는 리듬 도전중/대상자
      // 단, 실제 출석 1회 이상이어야 함
      if (rs?.achieved) {
        consistent.push({ id: m.id, name: m.name, badge: '🏆', note: rs.message || '대상자' });
      } else if (rs?.challenging && att.attend >= 1) {
        consistent.push({ id: m.id, name: m.name, badge: '🌿', note: `출석 ${pass.usedSessions}/${pass.totalSessions}회` });
      } else if (attRate >= 80 && att.total >= 3 && att.attend >= 3) {
        consistent.push({ id: m.id, name: m.name, badge: '', note: `출석 ${pass.usedSessions}/${pass.totalSessions}회 · ${attRate}%` });
      }
      
      // 관심 필요: 만료 임박 (D-7 이내) 또는 2주+ 미참석
      const ps = passStatus(pass);
      if (ps && !ps.notStarted && ps.daysLeft !== undefined && ps.daysLeft <= 7 && ps.daysLeft >= 0) {
        needAttention.push({ id: m.id, name: m.name, note: `만료 임박 D-${ps.daysLeft} · 마지막 ${att.lastDate || '없음'}` });
      } else if (att.lastDate) {
        const daysAgo = Math.floor((new Date(todayStr) - new Date(att.lastDate)) / (1000*60*60*24));
        if (daysAgo >= 14) {
          needAttention.push({ id: m.id, name: m.name, note: `${daysAgo}일 미방문 · 마지막 ${att.lastDate}` });
        }
      }
    });
    
    // 정렬 + 상위 N개만
    consistent.sort((a, b) => (b.badge === '🏆' ? 1 : 0) - (a.badge === '🏆' ? 1 : 0));
    
    return {
      reEnrollRate,
      expiredCount,
      reEnrolledCount,
      consistent: consistent.slice(0, 5),
      needAttention: needAttention.slice(0, 5),
      challengingCount,
    };
  }, [members, sessions]);
  
  // 신규 유입 경로
  const sourceStats = useMemo(() => {
    const monthTrials = trials.filter(t => (t.date || t.createdAt || '').startsWith(targetYM));
    const sources = {};
    monthTrials.forEach(t => {
      const src = t.source || '기타';
      if (!sources[src]) sources[src] = { source: src, count: 0, converted: 0, icon: '·' };
      sources[src].count++;
      if (t.status === '회원전환') sources[src].converted++;
    });
    // 아이콘 매핑
    const iconMap = {
      '인스타': '📷',
      '인스타그램': '📷',
      '카카오채널': '💬',
      '카카오 채널': '💬',
      '카채널': '💬',
      '당근': '🥕',
      '지인소개': '🤝',
      '지인 소개': '🤝',
      '소개': '🤝',
    };
    return Object.values(sources).map(s => ({
      ...s,
      icon: iconMap[s.source] || '·',
      rate: s.count > 0 ? Math.round((s.converted / s.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
  }, [trials, targetYM]);
  
  // 인기 시간대
  const timeSlotStats = useMemo(() => {
    if (!sessions) return [];
    const todayStr = toYMD(new Date());
    const slots = {};
    Object.values(sessions).forEach(s => {
      if (!s?.date?.startsWith(targetYM) || s.date > todayStr) return;
      const hasAttended = s.participants?.some(p => 
        !p.cancelled && p.status !== 'reserved' && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'no_show'
      );
      if (!hasAttended) return;
      if (!slots[s.time]) slots[s.time] = { time: s.time, count: 0, totalPpl: 0 };
      slots[s.time].count++;
      const ppl = s.participants?.filter(p => 
        !p.cancelled && p.status !== 'reserved' && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'no_show'
      ).length || 0;
      slots[s.time].totalPpl += ppl;
    });
    return Object.values(slots).map(s => ({
      ...s,
      avgPpl: s.count > 0 ? Math.round(s.totalPpl / s.count * 10) / 10 : 0,
    })).sort((a, b) => b.count - a.count);
  }, [sessions, targetYM]);

  return (
    <div className="px-3 pb-28 pt-2 space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-[11px]" style={{ color: theme.inkMute, fontFamily: theme.serif, fontStyle: 'italic' }}>{targetMonth.getFullYear()}</div>
          <div className="font-bold text-lg" style={{ color: theme.ink }}>{targetMonth.getMonth() + 1}월 통계</div>
        </div>
        <button onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))} disabled={monthOffset >= 0}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 1. 💰 수익 */}
      <ExpandCard
        label="💰 이번 달 수익"
        isOpen={expanded === 'revenue'}
        onToggle={() => setExpanded(expanded === 'revenue' ? null : 'revenue')}
        main={
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif }}>
                {stats.net.toLocaleString()}
              </div>
              <div className="text-sm" style={{ color: theme.inkMute }}>원</div>
            </div>
            <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
              매출 {stats.revenue.toLocaleString()}원
              {stats.refundTotal > 0 && <span style={{ color: theme.accent2 }}> · 환불 -{stats.refundTotal.toLocaleString()}원</span>}
              <span> · 결제 {stats.count}건</span>
            </div>
            <div className="flex gap-3 mt-3 text-[11px]" style={{ color: theme.inkSoft }}>
              <span>소그룹 <strong style={{ color: theme.ink }}>{Math.round(stats.byCat.group / 10000)}만</strong></span>
              <span>개인 <strong style={{ color: theme.ink }}>{Math.round(stats.byCat.private / 10000)}만</strong></span>
              <span>체험 <strong style={{ color: theme.ink }}>{Math.round((stats.byCat.trial + stats.byCat.other + (stats.trialRevenue || 0)) / 10000)}만</strong></span>
            </div>
          </>
        }
        expand={
          <>
            <div className="text-[11px] font-bold mb-2" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>수익 인사이트</div>
            {revenueInsight.prevMonthDelta !== null && (
              <InsightRow label="전월 대비"
                value={
                  <span>
                    <strong style={{ color: revenueInsight.prevMonthDelta >= 0 ? theme.accent : theme.danger }}>
                      {revenueInsight.prevMonthDelta >= 0 ? '+' : ''}{revenueInsight.prevMonthDelta}%
                    </strong>
                    <span style={{ color: theme.inkMute, fontSize: 10 }}> ({revenueInsight.prevMonthLabel} {revenueInsight.prevMonthRevenue.toLocaleString()}원)</span>
                  </span>
                }
              />
            )}
            <InsightRow label="회원당 평균 객단가" value={<strong>{revenueInsight.avgPerMember.toLocaleString()}원</strong>} />
            <InsightRow label="체험 수익" value={<strong>{(stats.trialRevenue || 0).toLocaleString()}원</strong>} sub={`미전환 입금 ${revenueInsight.trialPaidCount}명 × 1만원`} />
            {revenueInsight.expectedNextMonth > 0 && (
              <InsightRow label="예상 다음달 수익" value={<strong>{revenueInsight.expectedNextMonth.toLocaleString()}원</strong>} sub={`시작예정 ${revenueInsight.expectedCount}건`} />
            )}
          </>
        }
      />

      {/* 2. 👥 회원 */}
      <ExpandCard
        label="👥 회원"
        isOpen={expanded === 'members'}
        onToggle={() => setExpanded(expanded === 'members' ? null : 'members')}
        main={
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif }}>
                {activeMembers}
              </div>
              <div className="text-sm" style={{ color: theme.inkMute }}>명 활성</div>
              <div className="ml-auto text-[12px]" style={{ color: theme.inkMute }}>
                전체 <strong style={{ color: theme.ink }}>{members.length}명</strong>
              </div>
            </div>
            <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
              재등록률 <strong style={{ color: theme.accent }}>{memberInsight.reEnrollRate}%</strong>
              {memberInsight.challengingCount > 0 && <span> · 도전중 {memberInsight.challengingCount}명</span>}
            </div>
          </>
        }
        expand={
          <>
            <div className="text-[11px] font-bold mb-2" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>재등록률</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif }}>
                {memberInsight.reEnrollRate}%
              </div>
              <div className="text-[11px] ml-auto" style={{ color: theme.inkMute }}>
                만료 {memberInsight.expiredCount}명 중 {memberInsight.reEnrolledCount}명 재등록
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mt-2 mb-4" style={{ backgroundColor: theme.cardAlt }}>
              <div style={{ width: `${memberInsight.reEnrollRate}%`, height: '100%', backgroundColor: theme.accent }} />
            </div>
            
            {memberInsight.consistent.length > 0 && (
              <>
                <div className="text-[11px] font-bold mb-1 mt-3" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🌿 꾸준한 회원</div>
                <div className="text-[10px] mb-2" style={{ color: theme.inkMute }}>출석률 80% 이상 또는 리듬 도전중</div>
                {memberInsight.consistent.map(m => (
                  <InsightRow key={m.id} label={(m.badge ? m.badge + ' ' : '') + m.name} value={<span style={{ fontSize: 11 }}>{m.note}</span>} />
                ))}
              </>
            )}
            
            {memberInsight.needAttention.length > 0 && (
              <>
                <div className="text-[11px] font-bold mb-1 mt-3" style={{ color: theme.accent2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠ 관심이 필요한 회원</div>
                <div className="text-[10px] mb-2" style={{ color: theme.inkMute }}>2주 이상 미참석 또는 만료 임박</div>
                {memberInsight.needAttention.map(m => (
                  <InsightRow key={m.id} label={m.name} value={<span style={{ fontSize: 11 }}>{m.note}</span>} />
                ))}
              </>
            )}
          </>
        }
      />

      {/* 3. ✨ 체험 → 회원 전환 */}
      <ExpandCard
        label="✨ 체험 → 회원 전환"
        isOpen={expanded === 'conversion'}
        onToggle={() => setExpanded(expanded === 'conversion' ? null : 'conversion')}
        main={
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tabular-nums" style={{ color: theme.accent2, fontFamily: theme.serif }}>
                {stats.conversionRate}
              </div>
              <div className="text-sm" style={{ color: theme.inkMute }}>%</div>
              <div className="ml-auto text-[12px]" style={{ color: theme.inkMute }}>
                체험 <strong style={{ color: theme.accent2 }}>{stats.trialTotal}명</strong> 중 <strong style={{ color: theme.accent2 }}>{stats.converted}명</strong>
              </div>
            </div>
          </>
        }
        expand={
          <>
            <div className="text-[11px] font-bold mb-2" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>신규 유입 경로</div>
            {sourceStats.length === 0 ? (
              <div className="text-[12px] py-2" style={{ color: theme.inkMute }}>이번 달 체험자가 없어요</div>
            ) : sourceStats.map(s => (
              <div key={s.source} className="mb-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span>{s.icon} {s.source}</span>
                  <span style={{ color: theme.inkMute }}>
                    <strong style={{ color: theme.ink }}>{s.count}명</strong> · 전환 {s.converted}명 ({s.rate}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardAlt }}>
                  <div style={{ width: `${(s.count / Math.max(...sourceStats.map(x => x.count))) * 100}%`, height: '100%', backgroundColor: theme.accent }} />
                </div>
              </div>
            ))}
          </>
        }
      />

      {/* 4. 📅 수업 */}
      <ExpandCard
        label="📅 이번 달 수업"
        isOpen={expanded === 'classes'}
        onToggle={() => setExpanded(expanded === 'classes' ? null : 'classes')}
        main={
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif }}>
                {classStats.total}
              </div>
              <div className="text-sm" style={{ color: theme.inkMute }}>회</div>
              <div className="ml-auto text-[12px]" style={{ color: theme.inkMute }}>
                주 평균 <strong style={{ color: theme.accent }}>{classStats.weekAvg}회</strong>
              </div>
            </div>
            <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
              출석률 <strong style={{ color: theme.accent }}>{attendanceStats.attendRate}%</strong>
              <span> · 소그룹 {classStats.group}회 · 개인 {classStats.private}회</span>
            </div>
          </>
        }
        expand={
          <>
            <div className="text-[11px] font-bold mb-2" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>출석률</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tabular-nums" style={{ color: theme.accent, fontFamily: theme.serif }}>
                {attendanceStats.attendRate}%
              </div>
              <div className="text-[11px] ml-auto" style={{ color: theme.inkMute }}>
                총 예약 <strong style={{ color: theme.ink }}>{attendanceStats.total}건</strong>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden mt-2 flex" style={{ backgroundColor: theme.cardAlt }}>
              <div style={{ width: `${attendanceStats.attendRate}%`, backgroundColor: theme.accent }} />
              <div style={{ width: `${attendanceStats.cancelRate}%`, backgroundColor: theme.warn }} />
              <div style={{ width: `${attendanceStats.noShowRate}%`, backgroundColor: theme.danger }} />
            </div>
            <div className="flex gap-3 mt-2 text-[10px] flex-wrap mb-3" style={{ color: theme.inkSoft }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.accent }} />
                출석 {attendanceStats.attend}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.warn }} />
                취소 {attendanceStats.cancel}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.danger }} />
                노쇼 {attendanceStats.noShow}
              </span>
            </div>
            
            {timeSlotStats.length > 0 && (
              <>
                <div className="text-[11px] font-bold mb-2 mt-3" style={{ color: theme.accent, textTransform: 'uppercase', letterSpacing: '0.05em' }}>인기 시간대</div>
                {timeSlotStats.map(t => (
                  <div key={t.time} className="mb-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span>{t.time}</span>
                      <span style={{ color: theme.inkMute }}>
                        <strong style={{ color: theme.ink }}>{t.count}회</strong>
                        {t.avgPpl > 0 && <span> · 평균 {t.avgPpl}명</span>}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardAlt }}>
                      <div style={{ width: `${(t.count / timeSlotStats[0].count) * 100}%`, height: '100%', backgroundColor: theme.accent }} />
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        }
      />
    </div>
  );
}

function ExpandCard({ label, main, expand, isOpen, onToggle }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
      <div onClick={onToggle} className="p-4 cursor-pointer">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold" style={{ color: theme.accent }}>{label}</span>
          <span style={{ color: theme.inkMute, fontSize: 10, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
        </div>
        {main}
      </div>
      {isOpen && (
        <div className="p-4" style={{ borderTop: `1px solid ${theme.cardAlt}`, backgroundColor: theme.cardAlt2 || theme.cardAlt }}>
          {expand}
        </div>
      )}
    </div>
  );
}

function InsightRow({ label, value, sub }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-[12px]" style={{ borderBottom: `1px solid ${theme.cardAlt}` }}>
      <span style={{ color: theme.ink, fontWeight: 500 }}>{label}</span>
      <span style={{ color: theme.inkMute, textAlign: 'right' }}>
        {value}
        {sub && <div style={{ fontSize: 10, color: theme.inkMute, marginTop: 2 }}>{sub}</div>}
      </span>
    </div>
  );
}


/* =========================================================
   Settings Modal — Backup & Restore
   ========================================================= */
const K_LAST_BACKUP = 'sosun:lastBackup:v7';

/* 소그룹 시간 관리 컴포넌트 */
function GroupSlotsManager({ groupSlots, setGroupSlots, toast }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('11:00');

  const validTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditValue(groupSlots[idx]);
  };

  const saveEdit = async () => {
    if (!validTime(editValue)) {
      alert('올바른 시간 형식이 아니에요 (예: 11:00)');
      return;
    }
    if (groupSlots.includes(editValue) && groupSlots[editingIdx] !== editValue) {
      alert('이미 있는 시간이에요.');
      return;
    }
    const next = [...groupSlots];
    next[editingIdx] = editValue;
    next.sort();
    setGroupSlots(next);
    await saveKey(K.groupSlots, next);
    setEditingIdx(null);
    toast?.('시간이 변경되었어요');
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditValue('');
  };

  const removeSlot = async (idx) => {
    if (!confirm(`${groupSlots[idx]} 슬롯을 삭제할까요?\n(이미 등록된 수업은 그대로 유지됩니다)`)) return;
    const next = groupSlots.filter((_, i) => i !== idx);
    setGroupSlots(next);
    await saveKey(K.groupSlots, next);
    toast?.('슬롯이 삭제되었어요');
  };

  const addSlot = async () => {
    if (!validTime(newValue)) {
      alert('올바른 시간 형식이 아니에요 (예: 11:00)');
      return;
    }
    if (groupSlots.includes(newValue)) {
      alert('이미 있는 시간이에요.');
      return;
    }
    const next = [...groupSlots, newValue].sort();
    setGroupSlots(next);
    await saveKey(K.groupSlots, next);
    setAdding(false);
    setNewValue('11:00');
    toast?.('새 슬롯이 추가되었어요');
  };

  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
      <div className="font-bold text-sm mb-1" style={{ color: theme.ink }}>소그룹 시간 관리</div>
      <div className="text-[10.5px] mb-3" style={{ color: theme.inkMute, lineHeight: 1.5 }}>
        ⚠ 시간을 변경해도 기존 등록된 수업은 그대로 유지돼요.<br />
        새로 등록하는 수업부터 변경된 시간이 적용돼요.
      </div>

      <div className="space-y-2">
        {groupSlots.map((time, idx) => (
          <div key={time} className="flex items-center gap-2 p-2 rounded-lg"
            style={{ backgroundColor: theme.cardAlt2 }}>
            {editingIdx === idx ? (
              <>
                <input type="time" value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded text-sm font-medium"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, fontFamily: theme.serif }} />
                <button onClick={saveEdit}
                  className="px-3 py-1 rounded text-[11px] font-semibold"
                  style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                  저장
                </button>
                <button onClick={cancelEdit}
                  className="px-3 py-1 rounded text-[11px]"
                  style={{ backgroundColor: 'transparent', color: theme.inkMute, border: `1px solid ${theme.line}` }}>
                  취소
                </button>
              </>
            ) : (
              <>
                <div className="flex-1" style={{
                  fontFamily: theme.serif, fontSize: 18, fontWeight: 600, color: theme.accent,
                }}>
                  {time}
                </div>
                <button onClick={() => startEdit(idx)}
                  className="px-3 py-1 rounded text-[11px]"
                  style={{ backgroundColor: 'transparent', color: theme.inkSoft, border: `1px solid ${theme.line}` }}>
                  수정
                </button>
                <button onClick={() => removeSlot(idx)}
                  className="px-3 py-1 rounded text-[11px]"
                  style={{ backgroundColor: 'transparent', color: theme.danger, border: `1px solid ${theme.danger}44` }}>
                  삭제
                </button>
              </>
            )}
          </div>
        ))}

        {adding ? (
          <div className="flex items-center gap-2 p-2 rounded-lg"
            style={{ backgroundColor: theme.cardAlt2, border: `1px dashed ${theme.accent}` }}>
            <input type="time" value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="px-2 py-1 rounded text-sm font-medium"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, fontFamily: theme.serif }} />
            <button onClick={addSlot}
              className="px-3 py-1 rounded text-[11px] font-semibold"
              style={{ backgroundColor: theme.accent, color: '#FFF' }}>
              추가
            </button>
            <button onClick={() => { setAdding(false); setNewValue('11:00'); }}
              className="px-3 py-1 rounded text-[11px]"
              style={{ backgroundColor: 'transparent', color: theme.inkMute, border: `1px solid ${theme.line}` }}>
              취소
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full py-2 rounded-lg text-[12px] font-medium"
            style={{
              backgroundColor: theme.accentSoft,
              color: theme.accent,
              border: `1px dashed ${theme.accent}`,
            }}>
            + 새 소그룹 시간 추가
          </button>
        )}
      </div>
    </div>
  );
}

function SettingsModal({ open, onClose, members, sessions, classLog, trials, setMembers, setSessions, setClassLog, setTrials, groupSlots, setGroupSlots, toast }) {
  const fileRef = useRef();
  const [importMode, setImportMode] = useState(null); // null | 'overwrite' | 'merge'
  const [pendingImport, setPendingImport] = useState(null);

  const [lastBackup, setLastBackup] = useState(null);
  useEffect(() => {
    (async () => {
      const v = await loadKey(K_LAST_BACKUP, null);
      setLastBackup(v);
    })();
  }, [open]);

  const exportAll = async () => {
    const data = {
      app: '소선요가',
      version: 3,
      exportedAt: new Date().toISOString(),
      members, sessions, classLog, trials,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = toYMD(new Date());
    a.href = url;
    a.download = `소선요가_백업_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    await saveKey(K_LAST_BACKUP, now);
    setLastBackup(now);
    toast('백업 파일을 다운로드했어요');
  };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!data.app || !data.members) {
        toast('올바른 백업 파일이 아니에요');
        return;
      }
      setPendingImport(data);
      setImportMode('ask');
    } catch (err) {
      toast('파일을 읽을 수 없어요');
    }
  };

  const confirmImport = async (mode) => {
    const data = pendingImport;
    if (!data) return;
    if (mode === 'overwrite') {
      setMembers(data.members || []);
      setSessions(data.sessions || {});
      setClassLog(data.classLog || {});
      setTrials(data.trials || []);
      await saveKey(K.members, data.members || []);
      await saveKey(K.sessions, data.sessions || {});
      await saveKey(K.classlog, data.classLog || {});
      await saveKey(K.trials, data.trials || []);
      toast('복원 완료 (덮어쓰기)');
    } else {
      // Merge: replace by id if exists, add if new
      const mergeById = (current, incoming) => {
        const map = new Map(current.map(x => [x.id, x]));
        (incoming || []).forEach(x => map.set(x.id, x));
        return Array.from(map.values());
      };
      const nextMembers = mergeById(members, data.members);
      const nextTrials = mergeById(trials, data.trials);
      const nextSessions = { ...sessions, ...(data.sessions || {}) };
      const nextClassLog = { ...classLog, ...(data.classLog || {}) };
      setMembers(nextMembers);
      setSessions(nextSessions);
      setClassLog(nextClassLog);
      setTrials(nextTrials);
      await saveKey(K.members, nextMembers);
      await saveKey(K.sessions, nextSessions);
      await saveKey(K.classlog, nextClassLog);
      await saveKey(K.trials, nextTrials);
      toast('복원 완료 (합치기)');
    }
    setPendingImport(null);
    setImportMode(null);
    onClose();
  };

  const daysSinceBackup = lastBackup
    ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86400000)
    : null;

  return (
    <Modal open={open} onClose={onClose} title="설정" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Backup section */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.cardAlt }}>
          <div className="font-bold text-sm mb-2" style={{ color: theme.ink }}>데이터 백업</div>
          <div className="text-[11px] mb-2" style={{ color: theme.inkMute }}>
            {lastBackup
              ? `마지막 백업: ${new Date(lastBackup).toLocaleDateString('ko-KR')} (${daysSinceBackup}일 전)`
              : '아직 백업한 적이 없어요'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={exportAll}
              className="py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ backgroundColor: theme.accent, color: '#FFF' }}>
              <Download size={14} /> 내보내기
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()}
              className="py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
              style={{ backgroundColor: theme.card, color: theme.ink, border: `1px solid ${theme.line}` }}>
              <Upload size={14} /> 불러오기
            </button>
          </div>
          <div className="text-[10px] mt-2" style={{ color: theme.inkMute }}>
            주 1회 정도 백업 추천. 파일을 안전한 곳(이메일·클라우드)에 보관하세요.
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
          <div className="font-bold text-sm mb-2" style={{ color: theme.ink }}>현재 저장된 데이터</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]" style={{ color: theme.inkSoft }}>
            <div>회원: <span className="font-bold" style={{ color: theme.ink }}>{members.length}명</span></div>
            <div>체험자: <span className="font-bold" style={{ color: theme.ink }}>{trials.length}명</span></div>
            <div>수업 일정: <span className="font-bold" style={{ color: theme.ink }}>{Object.keys(sessions).length}개</span></div>
            <div>수업 기록: <span className="font-bold" style={{ color: theme.ink }}>{Object.keys(classLog).length}일</span></div>
          </div>
        </div>

        {/* 🔧 임시 진단/복구 도구 */}
        <div className="rounded-2xl p-3" style={{ backgroundColor: '#FFF4E6', border: `1px solid #F5C46B` }}>
          <div className="font-bold text-sm mb-2" style={{ color: '#8B5A1F' }}>🔧 데이터 진단 & 복구</div>
          <div className="text-[11px] mb-3" style={{ color: '#8B5A1F' }}>
            화면 데이터가 이상하면 먼저 [진단]으로 localStorage 백업 확인. 데이터가 있으면 [localStorage → 화면 복구]로 복구하세요.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                const keys = ['sosun:members:v8', 'sosun:sessions:v8', 'sosun:classlog:v8', 'sosun:trials:v8'];
                const report = keys.map(key => {
                  const v = localStorage.getItem(key);
                  if (!v) return `${key}: 없음`;
                  try {
                    const parsed = JSON.parse(v);
                    if (Array.isArray(parsed)) return `${key.split(':')[1]}: ${parsed.length}개`;
                    if (typeof parsed === 'object') return `${key.split(':')[1]}: ${Object.keys(parsed).length}개`;
                    return `${key.split(':')[1]}: 있음`;
                  } catch { return `${key}: 손상`; }
                }).join('\n');
                alert('localStorage 백업 상태:\n\n' + report);
              }}
              className="py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#FFF', color: '#8B5A1F', border: '1px solid #F5C46B' }}>
              📋 진단
            </button>
            <button
              onClick={async () => {
                if (!confirm('localStorage 백업 데이터를 화면과 Supabase로 복원합니다. 진행할까요?')) return;
                try {
                  const lm = localStorage.getItem('sosun:members:v8');
                  const ls = localStorage.getItem('sosun:sessions:v8');
                  const lc = localStorage.getItem('sosun:classlog:v8');
                  const lt = localStorage.getItem('sosun:trials:v8');
                  if (!lm && !ls && !lc && !lt) {
                    alert('localStorage에 백업이 없어요.');
                    return;
                  }
                  const m = lm ? JSON.parse(lm) : [];
                  const s = ls ? JSON.parse(ls) : {};
                  const c = lc ? JSON.parse(lc) : {};
                  const t = lt ? JSON.parse(lt) : [];
                  setMembers(m); setSessions(s); setClassLog(c); setTrials(t);
                  await saveKey(K.members, m);
                  await saveKey(K.sessions, s);
                  await saveKey(K.classlog, c);
                  await saveKey(K.trials, t);
                  alert(`복구 완료!\n회원 ${m.length}명, 일정 ${Object.keys(s).length}개, 수업기록 ${Object.keys(c).length}일, 체험자 ${t.length}명`);
                  toast?.('localStorage 데이터 복구 완료');
                } catch (e) {
                  alert('복구 실패: ' + e.message);
                  console.error(e);
                }
              }}
              className="py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: '#C26B4A', color: '#FFF' }}>
              💾 복구
            </button>
          </div>
        </div>

        <div className="text-[10px] text-center" style={{ color: theme.inkMute }}>
          소선요가 · 素禪 · So-Seon · v3

        <button onClick={() => { sbSignOut(); window.location.reload(); }}
          className="w-full py-2 rounded-lg text-[12px] mt-2"
          style={{ color: theme.danger, border: `1px solid ${theme.danger}44` }}>
          로그아웃
        </button>
        </div>

        {importMode === 'ask' && pendingImport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ backgroundColor: '#1F2A22CC' }}
            onClick={() => { setImportMode(null); setPendingImport(null); }}>
            <div onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl p-4 shadow-2xl"
              style={{ backgroundColor: theme.card }}>
              <div className="font-bold mb-2" style={{ color: theme.ink }}>복원 방식 선택</div>
              <div className="text-[12px] mb-3" style={{ color: theme.inkSoft }}>
                파일에 회원 {pendingImport.members?.length || 0}명, 체험자 {pendingImport.trials?.length || 0}명이 있어요.
              </div>
              <div className="space-y-2">
                <button onClick={() => confirmImport('overwrite')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: theme.danger, color: '#FFF' }}>
                  덮어쓰기 (현재 데이터 삭제)
                </button>
                <button onClick={() => confirmImport('merge')}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: theme.accent, color: '#FFF' }}>
                  합치기 (같은 ID면 파일 내용으로 교체)
                </button>
                <button onClick={() => { setImportMode(null); setPendingImport(null); }}
                  className="w-full py-2 rounded-lg text-sm"
                  style={{ color: theme.inkSoft }}>
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* =========================================================
   Main App
   ========================================================= */
export default function App() {
  const [tab, setTab] = useState('home');
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState({});
  const [classLog, setClassLog] = useState({});
  const [trials, setTrials] = useState([]);
  const [dashDismiss, setDashDismiss] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [smsDialog, setSmsDialog] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [smsConfirmed, setSmsConfirmed] = useState({});
  const [groupSlots, setGroupSlots] = useState(DEFAULT_GROUP_SLOTS);
  const [closedDays, setClosedDays] = useState([]); // [{date: 'YYYY-MM-DD', reason: '...'}]
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const toast = (m) => setToastMsg(m);
  const onSendSMS = (payload) => setSmsDialog(payload);

  const loadAll = async () => {
    // 먼저 4개 핵심 데이터 로드 (loadKey가 자동 마이그레이션 처리)
    const [m, s, c, t, dd] = await Promise.all([
      loadKey(K.members, null),
      loadKey(K.sessions, null),
      loadKey(K.classlog, null),
      loadKey(K.trials, null),
      loadKey(K.dashDismiss, {}),
    ]);
    
    const seeded = await loadKey(K.seeded, false);
    
    // 데이터 결정: 로드된 게 있으면 그것 사용, 없으면 SEED
    let finalM, finalS, finalC, finalT;
    if (m !== null || s !== null || c !== null || t !== null) {
      // 어딘가에 데이터가 있음 (Supabase 또는 localStorage 마이그레이션됨)
      finalM = m || [];
      finalS = s || {};
      finalC = c || {};
      finalT = t || [];
      // seeded 플래그가 안 켜져있으면 켜주기
      if (!seeded) await saveKey(K.seeded, true);
    } else if (!seeded) {
      // 정말 빈 상태 - SEED로 초기화
      finalM = SEED_MEMBERS;
      finalS = buildSeedSessions();
      finalC = SEED_CLASSLOG;
      finalT = SEED_TRIALS.map(tr => ({ id: uid(), ...tr, createdAt: tr.date || toYMD(new Date()) }));
      await saveKey(K.members, finalM);
      await saveKey(K.sessions, finalS);
      await saveKey(K.classlog, finalC);
      await saveKey(K.trials, finalT);
      await saveKey(K.seeded, true);
    } else {
      // seeded는 true인데 데이터가 없음 (이상한 상태) - 빈 상태로
      finalM = []; finalS = {}; finalC = {}; finalT = [];
    }
    
    const sc = await loadKey(K.smsConfirmed, {});
    const gs = await loadKey(K.groupSlots, DEFAULT_GROUP_SLOTS);
    const cd = await loadKey(K.closedDays, []);
    
    // 마이그레이션: 미래 날짜 sessions의 차감을 되돌리고 status를 'reserved'로 설정
    const migrationFlag = await loadKey({ lkey: 'sosun:migration:reserved-fix:v1', table: 'settings', id: 'migration_reserved_fix_v1' }, false);
    let migratedM = finalM;
    let migratedS = finalS;
    if (!migrationFlag) {
      const todayStr = toYMD(new Date());
      const adjustments = {}; // { memberId|passId: 되돌릴 회수 }
      const sessionsCopy = { ...finalS };
      
      Object.keys(sessionsCopy).forEach(key => {
        const sess = sessionsCopy[key];
        if (!sess || !sess.participants) return;
        if (sess.date <= todayStr) return; // 과거/오늘은 건드리지 않음
        
        // 미래 날짜 - 참석자들 status를 reserved로 (없으면)
        const newParts = sess.participants.map(p => {
          if (p.status) return p; // 이미 status 있으면 패스
          if (p.cancelled) return p; // 취소 처리된 것도 패스
          // 차감된 회원 (memberId + passId 있음) → 차감 되돌림
          if (p.memberId && p.passId) {
            const k = `${p.memberId}|${p.passId}`;
            adjustments[k] = (adjustments[k] || 0) + 1;
          }
          return { ...p, status: 'reserved' };
        });
        sessionsCopy[key] = { ...sess, participants: newParts };
      });
      
      // 회원 데이터 보정
      if (Object.keys(adjustments).length > 0) {
        migratedM = finalM.map(m => ({
          ...m,
          passes: (m.passes || []).map(p => {
            const k = `${m.id}|${p.id}`;
            if (!(k in adjustments)) return p;
            const newUsed = Math.max(0, p.usedSessions - adjustments[k]);
            // 미래 날짜는 sessionDates에서 제거
            const sessionDates = (p.sessionDates || []).filter(d => d <= toYMD(new Date()));
            return { ...p, usedSessions: newUsed, sessionDates };
          }),
        }));
        migratedS = sessionsCopy;
        await saveKey(K.members, migratedM);
        await saveKey(K.sessions, migratedS);
        console.log('[migration] 미래 예약 차감 보정 완료', adjustments);
      }
      await saveKey({ lkey: 'sosun:migration:reserved-fix:v1', table: 'settings', id: 'migration_reserved_fix_v1' }, true);
    }
    
    // 마이그레이션 v2: 체험자 일정 자동 등록 (이미 등록됐지만 sessions에 없는 체험자)
    const trialsMigFlag = await loadKey({ lkey: 'sosun:migration:trials-to-sessions:v1', table: 'settings', id: 'migration_trials_to_sessions_v1' }, false);
    if (!trialsMigFlag) {
      const sessionsCopy2 = { ...migratedS };
      let added = 0;
      finalT.forEach(t => {
        if (!t.date || !t.time) return;
        if (t.status === '회원전환') return; // 회원 전환된 건 별도
        const key = `${t.date}_${t.time}`;
        const sess = sessionsCopy2[key] || { date: t.date, time: t.time, participants: [] };
        const already = sess.participants?.some(p => p.memberName === t.name && p.isTrial);
        if (already) return;
        sess.participants = [...(sess.participants || []), {
          memberName: t.name,
          isTrial: true,
          status: 'reserved',
        }];
        sessionsCopy2[key] = sess;
        added++;
      });
      if (added > 0) {
        migratedS = sessionsCopy2;
        await saveKey(K.sessions, migratedS);
        console.log('[migration] 체험자 일정 등록', added, '명');
      }
      await saveKey({ lkey: 'sosun:migration:trials-to-sessions:v1', table: 'settings', id: 'migration_trials_to_sessions_v1' }, true);
    }
    
    // 마이그레이션 v3: 수강권 사용 회수 sessions와 동기화
    // v2로 올림 - isPartCharged 통일 후 데이터 재보정
    const passSyncFlag = await loadKey({ lkey: 'sosun:migration:pass-sync:v2', table: 'settings', id: 'migration_pass_sync_v2' }, false);
    if (!passSyncFlag) {
      // 회원별 / 수강권별로 sessions에서 차감 대상 회수 카운트
      // (isPartCharged 헬퍼 사용 — saveSession과 완전히 동일한 판정)
      const usageMap = {}; // { 'memberId|passId': { count, dates: [] } }
      Object.values(migratedS).forEach(s => {
        (s.participants || []).forEach(p => {
          if (!p.memberId || !p.passId) return;
          if (p.isTrial) return;
          if (!isPartCharged(p)) return;
          const key = `${p.memberId}|${p.passId}`;
          if (!usageMap[key]) usageMap[key] = { count: 0, dates: [] };
          usageMap[key].count++;
          usageMap[key].dates.push(s.date);
        });
      });
      
      // 회원별로 수강권 업데이트
      let updated = 0;
      const newMembers = migratedM.map(m => {
        if (!m.passes || m.passes.length === 0) return m;
        const newPasses = m.passes.map(p => {
          const key = `${m.id}|${p.id}`;
          const usage = usageMap[key] || { count: 0, dates: [] };
          const sortedNew = [...usage.dates].sort();
          const sortedOld = [...(p.sessionDates || [])].sort();
          // 회수와 날짜 둘 다 일치하면 skip
          if (usage.count === p.usedSessions && JSON.stringify(sortedNew) === JSON.stringify(sortedOld)) return p;
          updated++;
          return {
            ...p,
            usedSessions: usage.count,
            sessionDates: sortedNew,
          };
        });
        return { ...m, passes: newPasses };
      });
      
      if (updated > 0) {
        migratedM = newMembers;
        await saveKey(K.members, migratedM);
        console.log('[migration] 수강권 동기화', updated, '건');
      }
      await saveKey({ lkey: 'sosun:migration:pass-sync:v2', table: 'settings', id: 'migration_pass_sync_v2' }, true);
    }
    
    // 마이그레이션 v2: 기존 sessions의 메모/수업기록 → 회원별 progressLog 일괄 동기화
    // (자동 동기화는 새 입력부터 적용되니, 옛 데이터는 한 번만 일괄 처리)
    const progressSyncFlag = await loadKey({ lkey: 'sosun:migration:progress-sync:v2', table: 'settings', id: 'migration_progress_sync_v2' }, false);
    if (!progressSyncFlag) {
      let progressUpdated = 0;
      const newProgressMembers = migratedM.map(m => {
        const log = [...(m.progressLog || [])];
        let memberChanged = false;
        // 이 회원이 참여한 모든 sessions
        Object.values(migratedS).forEach(s => {
          if (!s?.date || !s?.time || !s.participants) return;
          const part = s.participants.find(p => p.memberId === m.id);
          if (!part) return;
          if (part.isTrial) return;
          
          const note = (s.note || '').trim();
          const classNote = (s.classNote || '').trim();
          if (!note && !classNote) return;
          
          // 자동 생성 ID
          const entryId = `auto_${s.date}_${s.time}_${m.id}`;
          const existingIdx = log.findIndex(e => e.id === entryId);
          
          const sn = part.sessionNumber;
          const pass = (m.passes || []).find(p => p.id === part.passId);
          const isPrivate = pass?.category === 'private';
          const classType = isPrivate 
            ? `개인레슨${sn ? ` ${sn}회차` : ''}`
            : `소그룹${sn ? ` ${sn}회차` : ''}`;
          
          const entry = {
            id: entryId,
            date: s.date,
            classType,
            afterChange: classNote,
            memo: note,
            bodyState: existingIdx >= 0 ? (log[existingIdx].bodyState || '') : '',
            autoGenerated: true,
          };
          
          if (existingIdx >= 0) {
            // 이미 있는 자동 엔트리는 빈 필드만 채우고 기존 내용 보존
            const old = log[existingIdx];
            log[existingIdx] = {
              ...old,
              afterChange: old.afterChange || entry.afterChange,
              memo: old.memo || entry.memo,
              classType: old.classType || entry.classType,
            };
          } else {
            log.push(entry);
          }
          memberChanged = true;
        });
        
        if (memberChanged) {
          progressUpdated++;
          // 날짜순 정렬 (최신 위)
          log.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          return { ...m, progressLog: log };
        }
        return m;
      });
      
      if (progressUpdated > 0) {
        migratedM = newProgressMembers;
        await saveKey(K.members, migratedM);
        console.log('[migration] 경과 동기화 v2', progressUpdated, '명');
      }
      await saveKey({ lkey: 'sosun:migration:progress-sync:v2', table: 'settings', id: 'migration_progress_sync_v2' }, true);
    }
    
    // 마이그레이션 v3: classLog (수업기록 탭의 옛 기록) → sessions의 classNote + 회원 progressLog 일괄 동기화
    // 사장님이 수업기록 탭에 입력한 옛 내용을 일정 카드와 회원 경과에 일괄 반영
    const classLogSyncFlag = await loadKey({ lkey: 'sosun:migration:classlog-sync:v1', table: 'settings', id: 'migration_classlog_sync_v1' }, false);
    if (!classLogSyncFlag) {
      const cl = finalC || {};
      let sessionsTouched = false;
      const newSess = { ...migratedS };
      // classLog → sessions의 classNote (일정 카드에 표시되도록)
      Object.entries(cl).forEach(([dateStr, entries]) => {
        if (!Array.isArray(entries)) return;
        entries.forEach(e => {
          if (!e.time || !e.content) return;
          const sessKey = `${dateStr}_${e.time}`;
          const sess = newSess[sessKey];
          if (!sess) return;
          if (!sess.classNote || sess.classNote.trim() === '') {
            newSess[sessKey] = { ...sess, classNote: e.content };
            sessionsTouched = true;
          }
        });
      });
      
      if (sessionsTouched) {
        migratedS = newSess;
        await saveKey(K.sessions, migratedS);
      }
      
      // sessions의 classNote → 회원 progressLog의 afterChange (경과 탭에 반영)
      let progressTouched = 0;
      const updatedM = migratedM.map(m => {
        if (!m.passes || m.passes.length === 0) return m;
        const log = [...(m.progressLog || [])];
        let memberChanged = false;
        Object.values(migratedS).forEach(s => {
          if (!s?.date || !s?.time || !s.participants) return;
          const part = s.participants.find(p => p.memberId === m.id);
          if (!part) return;
          if (part.isTrial) return;
          const classNote = (s.classNote || '').trim();
          const note = (s.note || '').trim();
          if (!classNote && !note) return;
          
          const entryId = `auto_${s.date}_${s.time}_${m.id}`;
          const existingIdx = log.findIndex(e => e.id === entryId);
          
          const sn = part.sessionNumber;
          const pass = (m.passes || []).find(p => p.id === part.passId);
          const isPrivate = pass?.category === 'private';
          const classType = isPrivate 
            ? `개인레슨${sn ? ` ${sn}회차` : ''}`
            : `소그룹${sn ? ` ${sn}회차` : ''}`;
          
          if (existingIdx >= 0) {
            const old = log[existingIdx];
            // 비어있는 필드만 채움 (기존 사용자 입력 보존)
            const newAfter = old.afterChange || classNote;
            const newMemo = old.memo || note;
            if (newAfter !== old.afterChange || newMemo !== old.memo) {
              log[existingIdx] = { ...old, afterChange: newAfter, memo: newMemo, classType: old.classType || classType };
              memberChanged = true;
            }
          } else {
            log.push({
              id: entryId,
              date: s.date,
              classType,
              afterChange: classNote,
              memo: note,
              bodyState: '',
              autoGenerated: true,
            });
            memberChanged = true;
          }
        });
        if (memberChanged) {
          progressTouched++;
          log.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          return { ...m, progressLog: log };
        }
        return m;
      });
      
      if (progressTouched > 0) {
        migratedM = updatedM;
        await saveKey(K.members, migratedM);
        console.log('[migration] classLog 일괄 동기화', progressTouched, '명');
      }
      await saveKey({ lkey: 'sosun:migration:classlog-sync:v1', table: 'settings', id: 'migration_classlog_sync_v1' }, true);
    }
    
    // 매번 실행: 체험 시간 + 1시간 지났는데 '예약확정' 상태면 '수업완료'로 자동 변경
    const now = new Date();
    let trialsChanged = false;
    const updatedTrials = finalT.map(t => {
      if (t.status !== '예약확정') return t;
      if (!t.date || !t.time) return t;
      try {
        const trialEnd = fromYMDHM(t.date, t.time);
        trialEnd.setHours(trialEnd.getHours() + 1);
        if (now > trialEnd) {
          trialsChanged = true;
          return { ...t, status: '수업완료' };
        }
      } catch (e) { console.warn('체험 자동완료 처리 실패', t?.id, e); }
      return t;
    });
    let migT = finalT;
    if (trialsChanged) {
      migT = updatedTrials;
      await saveKey(K.trials, migT);
      console.log('[auto] 체험 자동 수업완료 처리');
    }
    
    // 취소 체험자 sessions 동기화
    let trialSessionsSynced = false;
    const syncedSessions = { ...migratedS };
    Object.keys(syncedSessions).forEach(key => {
      const s = syncedSessions[key];
      if (!s?.participants) return;
      const newParts = s.participants.map(p => {
        if (!p.isTrial) return p;
        const matchedTrial = migT.find(t => 
          t.name === p.memberName && t.date === s.date && t.time === s.time
        );
        if (!matchedTrial) return p;
        // 취소면 cancelled, 아니면 그대로
        if ((matchedTrial.status === '취소' || matchedTrial.status === '미참석') && !p.cancelled) {
          trialSessionsSynced = true;
          return { ...p, cancelled: 'cancelled' };
        }
        if (matchedTrial.status !== '취소' && matchedTrial.status !== '미참석' && p.cancelled) {
          trialSessionsSynced = true;
          const { cancelled, ...rest } = p;
          return rest;
        }
        return p;
      });
      syncedSessions[key] = { ...s, participants: newParts };
    });
    if (trialSessionsSynced) {
      migratedS = syncedSessions;
      await saveKey(K.sessions, migratedS);
    }
    
    // 마이그레이션 v4: 김은화 스타터→개인레슨5 전환 시 출석 이력 옮기기
    const kuhMigFlag = await loadKey({ lkey: 'sosun:migration:kuh-pass-merge:v2', table: 'settings', id: 'migration_kuh_pass_merge_v2' }, false);
    if (!kuhMigFlag) {
      const kuhSessions = { ...migratedS };
      let changed = false;
      Object.keys(kuhSessions).forEach(key => {
        const s = kuhSessions[key];
        if (!s?.participants) return;
        const newParts = s.participants.map(p => {
          if (p.memberId === 'm_kimunhwa' && p.passId === 'p_kuh_starter') {
            changed = true;
            return { ...p, passId: 'p_kuh_private5', totalSessions: 5 };
          }
          return p;
        });
        if (changed) kuhSessions[key] = { ...s, participants: newParts };
      });
      if (changed) {
        migratedS = kuhSessions;
        await saveKey(K.sessions, migratedS);
        console.log('[migration] 김은화 수강권 통합 v2');
      }
      
      // 김은화 수강권 직접 보정 (4/5회로)
      const newMembers = migratedM.map(m => {
        if (m.id !== 'm_kimunhwa') return m;
        const newPasses = (m.passes || []).map(p => {
          if (p.id !== 'p_kuh_private5') return p;
          return {
            ...p,
            usedSessions: 4,
            sessionDates: ['2026-04-02', '2026-04-07', '2026-04-21', '2026-04-28'],
          };
        });
        return { ...m, passes: newPasses };
      });
      migratedM = newMembers;
      await saveKey(K.members, migratedM);
      
      await saveKey({ lkey: 'sosun:migration:kuh-pass-merge:v2', table: 'settings', id: 'migration_kuh_pass_merge_v2' }, true);
    }
    
    // 매번 실행: 회원 수업 시간 + 1시간 지났는데 'reserved' 상태면 자동 출석 처리
    let sessionsChanged = false;
    const updatedSessions = { ...migratedS };
    Object.keys(updatedSessions).forEach(key => {
      const s = updatedSessions[key];
      if (!s?.date || !s?.time || !s?.participants) return;
      try {
        const sessionEnd = fromYMDHM(s.date, s.time);
        sessionEnd.setHours(sessionEnd.getHours() + 1);
        if (now <= sessionEnd) return; // 아직 안 지남
        
        // status가 'reserved'인 참석자 → 출석으로 변경
        let participantsChanged = false;
        const newParts = s.participants.map(p => {
          if (p.cancelled) return p;
          if (p.status !== 'reserved') return p;
          if (p.isTrial) return p; // 체험자는 별도 처리
          if (!p.memberId || !p.passId) return p;
          
          // 다음 sn 계산: 같은 passId의 sn 최대값 + 1
          // (마이그레이션이 처리하므로 그냥 status만 변경)
          participantsChanged = true;
          return { ...p, status: 'attended', sessionNumber: p.sessionNumber || null };
        });
        if (participantsChanged) {
          updatedSessions[key] = { ...s, participants: newParts };
          sessionsChanged = true;
        }
      } catch (e) { console.warn('수업 자동출석 처리 실패', key, e); }
    });
    
    let migS = migratedS;
    if (sessionsChanged) {
      migS = updatedSessions;
      await saveKey(K.sessions, migS);
      console.log('[auto] 자동 출석 처리');
    }
    
    // === 매번 실행: 수강권 회수+날짜 일관성 검증 (M5) ===
    // saveSession이 정확하면 변화 없음. 어쩌다 꼬인 데이터 자동 보정.
    {
      const usageMap = {};
      Object.values(migS).forEach(s => {
        if (!s?.date) return;
        (s.participants || []).forEach(p => {
          if (!p.memberId || !p.passId || p.isTrial) return;
          if (!isPartCharged(p)) return;
          const k = `${p.memberId}|${p.passId}`;
          if (!usageMap[k]) usageMap[k] = { count: 0, dates: [] };
          usageMap[k].count++;
          usageMap[k].dates.push(s.date);
        });
      });
      
      // sn 부여 (출석 순서대로)
      Object.keys(usageMap).forEach(k => {
        usageMap[k].dates.sort();
        let sn = 1;
        Object.values(migS).forEach(s => {
          (s.participants || []).forEach(p => {
            if (`${p.memberId}|${p.passId}` !== k) return;
            if (p.isTrial) return;
            if (!isPartCharged(p)) return;
            if (!p.sessionNumber) p.sessionNumber = sn;
            sn = Math.max(sn, p.sessionNumber) + 1;
          });
        });
      });
      
      let drift = 0;
      const verified = migratedM.map(m => {
        if (!m.passes || m.passes.length === 0) return m;
        const newPasses = m.passes.map(p => {
          const key = `${m.id}|${p.id}`;
          const usage = usageMap[key] || { count: 0, dates: [] };
          const sortedNew = [...usage.dates].sort();
          const sortedOld = [...(p.sessionDates || [])].sort();
          if (usage.count === p.usedSessions && JSON.stringify(sortedNew) === JSON.stringify(sortedOld)) return p;
          drift++;
          return { ...p, usedSessions: usage.count, sessionDates: sortedNew };
        });
        return { ...m, passes: newPasses };
      });
      if (drift > 0) {
        migratedM = verified;
        await saveKey(K.members, migratedM);
        console.log(`[auto] 회수 일관성 보정 ${drift}건`);
      }
    }
    
    setMembers(migratedM); setSessions(migS); setClassLog(finalC); setTrials(migT);
    setDashDismiss(dd); setSmsConfirmed(sc);
    setGroupSlots(Array.isArray(gs) && gs.length ? gs : DEFAULT_GROUP_SLOTS);
    setClosedDays(Array.isArray(cd) ? cd : []);
    setReady(true);
  };

  // 앱 시작 시 세션 복원
  useEffect(() => {
    (async () => {
      try {
        const restored = await sbRestoreSession();
        if (restored) {
          setAuthed(true);
          await loadAll();
        }
        setReady(true);
      } catch (e) {
        console.error('App init error:', e);
        setReady(true);
      }
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setLoginError('이메일과 비밀번호를 입력해주세요'); return; }
    setLoginLoading(true);
    setLoginError('');
    const ok = await sbSignIn(email, password);
    if (ok) {
      setAuthed(true);
      await loadAll();
    } else {
      setLoginError('이메일 또는 비밀번호가 올바르지 않아요');
    }
    setLoginLoading(false);
  };

  // 로그인 화면
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: theme.bg }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div style={{
              fontFamily: theme.serif,
              fontSize: 36, color: theme.ink, letterSpacing: '-0.02em',
            }}>소선요가</div>
            <div className="text-[13px] mt-1" style={{ color: theme.inkMute }}>강사 전용</div>
          </div>
          <div className="space-y-3">
            <input
              type="email" placeholder="이메일" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-2xl text-[14px]"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, color: theme.ink, outline: 'none' }}
            />
            <input
              type="password" placeholder="비밀번호" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-2xl text-[14px]"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}`, color: theme.ink, outline: 'none' }}
            />
            {loginError && (
              <div className="text-[12px] text-center" style={{ color: theme.danger }}>{loginError}</div>
            )}
            <button onClick={handleLogin} disabled={loginLoading}
              className="w-full py-3 rounded-2xl text-[15px] font-bold disabled:opacity-60"
              style={{ backgroundColor: theme.accent, color: '#fff' }}>
              {loginLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg }}>
        <div className="text-center">
          <Loader2 size={28} className="animate-spin mx-auto mb-2" style={{ color: theme.accent }} />
          <div className="text-[13px]" style={{ color: theme.inkMute }}>불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg, fontFamily: theme.sans, color: theme.ink }}>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; }
        input[type="date"], input[type="time"] { color: ${theme.ink}; }
        select option { background: ${theme.card}; color: ${theme.ink}; }
      `}</style>
      <Header tab={tab} setTab={setTab} onOpenSettings={() => setSettingsOpen(true)} />
      {tab === 'home' && (
        <HomeView members={members} sessions={sessions} trials={trials}
          classLog={classLog}
          dashDismiss={dashDismiss} setDashDismiss={setDashDismiss}
          smsConfirmed={smsConfirmed}
          closedDays={closedDays}
          groupSlots={groupSlots}
          toast={toast} onSendSMS={onSendSMS} goto={setTab}
          onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {tab === 'schedule' && (
        <ScheduleView members={members} setMembers={setMembers}
          sessions={sessions} setSessions={setSessions}
          classLog={classLog} setClassLog={setClassLog}
          groupSlots={groupSlots} setGroupSlots={setGroupSlots}
          closedDays={closedDays} setClosedDays={setClosedDays} toast={toast} />
      )}
      {tab === 'members' && (
        <MembersView members={members} setMembers={setMembers}
          sessions={sessions} setSessions={setSessions} groupSlots={groupSlots}
          closedDays={closedDays} toast={toast} onSendSMS={onSendSMS} />
      )}
      {tab === 'trials' && (
        <TrialsView trials={trials} setTrials={setTrials}
          members={members} setMembers={setMembers}
          sessions={sessions} setSessions={setSessions}
          toast={toast} onSendSMS={onSendSMS} />
      )}
      {tab === 'classlog' && (
        <ClassLogView classLog={classLog} setClassLog={setClassLog} sessions={sessions} setSessions={setSessions} toast={toast} />
      )}
      {tab === 'stats' && (
        <StatsView members={members} trials={trials} sessions={sessions} closedDays={closedDays} />
      )}
      <Toast msg={toastMsg} onDone={() => setToastMsg('')} />
      {settingsOpen && (
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)}
          members={members} sessions={sessions} classLog={classLog} trials={trials}
          setMembers={setMembers} setSessions={setSessions} setClassLog={setClassLog} setTrials={setTrials}
          groupSlots={groupSlots} setGroupSlots={setGroupSlots}
          toast={toast} />
      )}
      {smsDialog && (
        <SMSDialog open={!!smsDialog} onClose={() => setSmsDialog(null)}
          phone={smsDialog.phone} name={smsDialog.name} template={smsDialog.template}
          onConfirmed={async () => {
            if (smsDialog.alertId) {
              const now = Date.now();
              const next = { ...smsConfirmed, [smsDialog.alertId]: now };
              setSmsConfirmed(next);
              await saveKey(K.smsConfirmed, next);
              toast('문자 발송 기록됨');
            }
            setSmsDialog(null);
          }} />
      )}
    </div>
  );
}

