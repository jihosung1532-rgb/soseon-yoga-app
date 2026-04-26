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
const SUPABASE_URL = 'https://vcemcdzilelnoebupxyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZW1jZHppbGVsbm9lYnVweHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzE1MjAsImV4cCI6MjA5MjYwNzUyMH0._OQ1vEDNgNhyNgV70Ph6Pi6Bwn9fA3HcbZ9bVC6gsv8';

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
  { label: '⭐ 스타터 패키지', special: 'starter', price: 360000, note: '개인 3회 + 소그룹 6회' },
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
    body: `안녕하세요 😊 소선요가입니다

현재 회원님의 수련권이
${fmtKRShort(pass.expiryDate)} / ${pass.totalSessions - pass.usedSessions}회 남음 상태로
마무리되어가고 있습니다 🌿

편하게 이어서 수련하실 수 있도록
미리 안내드려요 😊

원하시면 재등록도 도와드릴게요 🌱`,
  }),
  expired: (member, pass) => ({
    title: '수강권 종료 안내',
    body: `안녕하세요 😊 소선요가입니다

회원님의 수련권이 종료되어
안내드려요 🌿

그동안 수련 함께해주셔서 감사드립니다 🙏

다시 몸이 필요하실 때
편하게 언제든 찾아주세요 😊`,
  }),
  registered: (member, pass) => ({
    title: '수강권 등록 완료',
    body: `안녕하세요 😊 소선요가입니다

회원권 등록 완료 안내드립니다 🌿

▪ 이용 기간
${fmtKRShort(pass.startDate)} ~ ${fmtKRShort(pass.expiryDate)}

▪ 총 횟수
${pass.totalSessions}회

▪ 이용 안내
예약 후 이용 가능하며,
당일 취소는 차감될 수 있습니다 🙏

편하게 수련 이어가시면 됩니다 😊`,
  }),
  hold: (member, pass, holdStart, holdEnd) => ({
    title: '홀딩 안내',
    body: `안녕하세요 😊 소선요가입니다

요청해주신 휴회 처리 완료되었습니다 🌿

▪ 휴회 기간
${fmtKRShort(holdStart)} ~ ${fmtKRShort(holdEnd)}

해당 기간 동안은 수련 이용이 중단되며,
이후 자동으로 이어서 사용 가능합니다 😊

변동사항 있으시면 편하게 말씀 주세요 🌱`,
  }),
  trial: (trial) => ({
    title: '체험 예약 안내',
    body: `안녕하세요 😊 소선요가입니다

${fmtKRShort(trial.date)} ${trial.time} 수련 예약되어 있습니다 🌿

편안한 복장으로
5분 전 도착 부탁드립니다 😊

혹시 일정 변동 시
미리 연락 부탁드립니다 🙏`,
  }),
  upcomingStart: (member, pass) => ({
    title: '수강권 시작 안내',
    body: `안녕하세요 😊 소선요가입니다

${member.name}님 수강권 시작일이
${fmtKRShort(pass.startDate)}로 다가왔습니다 🌿

편안한 복장으로
5분 전 도착 부탁드립니다 😊

변동사항 있으시면
미리 연락 부탁드립니다 🙏`,
  }),
  privateLessonSchedule: (member, schedule) => ({
    title: '개인레슨 일정 안내',
    body: `안녕하세요 😊 소선요가입니다

${member.name}님 현재 협의된
개인레슨 일정 안내드립니다 🌿

${schedule}

변동사항 있으시면
미리 연락 부탁드립니다 🙏`,
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
   Anthropic API
   ========================================================= */
async function callClaude(messages, system) {
  const body = { model: 'claude-sonnet-4-20250514', max_tokens: 1800, messages };
  if (system) body.system = system;
  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
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
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';
  return (
    <span className={`${sz} rounded-full font-medium inline-flex items-center gap-1`}
      style={{ backgroundColor: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: 'nowrap' }}>
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
    if (msg) { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[100]" style={{ bottom: 32 }}>
      <div className="px-4 py-2 rounded-full text-sm shadow-lg"
        style={{ backgroundColor: theme.ink, color: theme.card }}>
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
          <li key={i} className="text-[13px] flex gap-2" style={{ color: theme.ink }}>
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
    { id: 'trials', label: '체험자', icon: UserPlus },
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
function HomeView({ members, sessions, trials, classLog, dashDismiss, setDashDismiss, smsConfirmed = {}, toast, onSendSMS, goto, onOpenSettings }) {
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
  const expiringSoon = members.filter(m => {
    const p = activePass(m);
    if (!p) return false;
    const d = daysBetween(todayYMD, p.expiryDate);
    return d <= 7 && d >= 0;
  }).length;
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const todayTrials = trials.filter(t => t.date === todayYMD && t.status === '예약확정').length;

  return (
    <div className="px-3 pb-28 pt-2 space-y-3">

      {/* 메인 카드: 멘트 + 수업 목록 */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="text-[11px]" style={{ color: theme.inkMute }}>{fmtKR(new Date())}</div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-lg font-bold" style={{ color: theme.ink }}>
            {isWeekend ? '오늘은 푹 쉬면서 충전 😴' : '오늘도 재밌게 수업하자 😘'}
          </div>
          {!isWeekend && (
            <button onClick={() => goto('schedule')} className="text-[11px]" style={{ color: theme.accent }}>
              전체 일정 →
            </button>
          )}
        </div>

        {!isWeekend && todaySessions.length > 0 && (
          <>
            <div className="text-[12px] mt-2 font-medium" style={{ color: theme.inkSoft }}>
              오늘 수업 {todaySessions.length}개
            </div>
            <div className="mt-2 space-y-1.5 pt-2" style={{ borderTop: `1px solid ${theme.lineLight}` }}>
              {todaySessions.map(s => {
                const active = s.participants.filter(p => !p.cancelled);
                const cancelled = s.participants.filter(p => p.cancelled);
                return (
                  <div key={s.date + s.time} className="flex items-start gap-2">
                    <span className="text-[13px] font-bold tabular-nums shrink-0"
                      style={{ color: theme.accent, fontFamily: theme.serif, minWidth: 44 }}>
                      {s.time}
                    </span>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {active.map((p, i) => (
                        <span key={i} className="text-[12px]" style={{ color: theme.ink }}>
                          {p.memberName}
                          {p.sessionNumber && p.totalSessions && (
                            <span style={{ color: theme.inkMute }}> ({p.sessionNumber}/{p.totalSessions})</span>
                          )}
                          {p.isTrial && <span style={{ color: theme.accent2 }}> ·체험</span>}
                          {p.classType === '개인' && <span style={{ color: theme.accent }}> ·개인</span>}
                        </span>
                      ))}
                      {cancelled.map((p, i) => (
                        <span key={'c'+i} className="text-[11px] line-through" style={{ color: theme.inkMute }}>
                          {p.memberName}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!isWeekend && todaySessions.length === 0 && (
          <div className="text-[12px] mt-2" style={{ color: theme.inkMute }}>오늘 예정된 수업이 없어요</div>
        )}
      </div>

      {/* 통계 3칸 */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="활성 회원" value={activeMembers} color={theme.accent} />
        <Stat label="만료 임박" value={expiringSoon} color={expiringSoon > 0 ? theme.accent2 : theme.accent} />
        <Stat label="오늘 체험" value={todayTrials} color={todayTrials > 0 ? theme.accent2 : theme.accent} />
      </div>

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
function ScheduleView({ members, setMembers, sessions, setSessions, groupSlots, setGroupSlots, toast }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slotModal, setSlotModal] = useState(null);
  const [slotsManagerOpen, setSlotsManagerOpen] = useState(false);

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
      isAuto: false, note: explicit.note
    };
    // 공휴일이면 자동 슬롯 표시 안 함
    if (HOLIDAYS.has(toYMD(date))) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (date < today) return null;
    const dow = date.getDay();
    const autoMembers = members.filter(m => m.fixedSlots?.some(fs => fs.dow === dow && fs.time === time));
    if (!autoMembers.length) return null;
    return {
      isAuto: true,
      participants: autoMembers.map(m => ({ memberId: m.id, memberName: m.name })),
    };
  };

  const saveSession = async (date, time, data) => {
    const key = `${toYMD(date)}_${time}`;
    const dateStr = toYMD(date);
    const oldSess = sessions[key];
    const oldParts = oldSess?.participants || [];
    const newParts = data?.participants || [];

    // Charge diff: only non-cancelled participants with passId count
    const chargeOf = (p) => (!p.cancelled || p.cancelled === 'charged') && p.memberId && p.passId ? `${p.memberId}|${p.passId}` : null;
    const oldCharges = oldParts.map(chargeOf).filter(Boolean);
    const newCharges = newParts.map(chargeOf).filter(Boolean);

    const adjustments = {};
    oldCharges.forEach(k => { adjustments[k] = (adjustments[k] || 0) - 1; });
    newCharges.forEach(k => { adjustments[k] = (adjustments[k] || 0) + 1; });

    if (Object.keys(adjustments).length > 0) {
      const updatedMembers = members.map(m => ({
        ...m,
        passes: (m.passes || []).map(p => {
          const k = `${m.id}|${p.id}`;
          if (!(k in adjustments)) return p;
          const delta = adjustments[k];
          const newUsed = Math.max(0, Math.min(p.totalSessions, p.usedSessions + delta));
          let sessionDates = [...(p.sessionDates || [])];
          if (delta > 0) sessionDates.push(dateStr);
          else if (delta < 0) {
            const idx = sessionDates.lastIndexOf(dateStr);
            if (idx >= 0) sessionDates.splice(idx, 1);
          }
          return { ...p, usedSessions: newUsed, sessionDates };
        }),
      }));
      setMembers(updatedMembers);
      await saveKey(K.members, updatedMembers);
    }

    const next = { ...sessions };
    if (!data || !newParts.length) delete next[key];
    else next[key] = { ...data, date: dateStr, time };
    setSessions(next);
    await saveKey(K.sessions, next);
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
        const autoMembers = members.filter(m => 
          m.fixedSlots?.some(fs => fs.dow === dow && fs.time === time)
        );
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
          const dayInfo = getDayClasses(d);
          
          return (
            <div key={dayIdx}>
              {/* Day header */}
              <div className="flex items-baseline gap-2.5 pb-2 mb-2"
                style={{ borderBottom: `1px solid ${theme.line}` }}>
                <div style={{
                  fontFamily: theme.serif, fontSize: 24, fontWeight: 600,
                  color: isHol ? theme.danger : theme.ink, lineHeight: 1,
                }}>
                  {d.getDate()}
                </div>
                <div className="font-semibold text-[13px]"
                  style={{ color: isHol ? theme.danger : isToday ? theme.accent2 : theme.inkSoft }}>
                  {WEEK_KR[d.getDay()]}요일
                </div>
                {isToday && (
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
              </div>

              {/* Day content */}
              {isHol ? (
                <div className="text-center py-3 italic" style={{ color: theme.inkMute, fontFamily: theme.serif }}>
                  — 공휴일 —
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
                      <div key={i} onClick={() => onCardClick(d, item)}
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
                          {item.note && !item.isAuto && (
                            <div className="text-[9px] font-semibold uppercase tracking-wide mb-0.5"
                              style={{ color: theme.accent2 }}>
                              {item.note}
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
                                    {trials.map((p, j) => (
                                      <span key={j}>
                                        <span style={{ fontWeight: 500 }}>{p.memberName}</span>
                                        <span style={{ color: theme.inkMute, fontSize: 10, marginLeft: 3 }}>체험</span>
                                        {j < trials.length - 1 && <span style={{ color: theme.inkMute }}> · </span>}
                                      </span>
                                    ))}
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
            await saveSession(slotModal.date, saveTime, data);
            setSlotModal(null);
            toast('저장되었어요');
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
    setParts([...parts, {
      memberId: m.id, memberName: m.name, passId: pass?.id,
      sessionNumber: pass ? pass.usedSessions + 1 : undefined,
      totalSessions: pass?.totalSessions,
      classType: (pass?.category === 'private' || category === 'private') ? '개인' : undefined,
    }]);
    setAddingMember('');
  };

  const addTrial = () => {
    if (!trialName.trim()) return;
    setParts([...parts, { memberName: trialName.trim(), isTrial: true }]);
    setTrialName('');
  };

  const setCancelled = (idx, kind) => {
    setParts(parts.map((p, i) => i === idx ? { ...p, cancelled: kind } : p));
  };
  const undoCancel = (idx) => {
    setParts(parts.map((p, i) => {
      if (i !== idx) return p;
      const { cancelled, cancelNote, ...rest } = p;
      return rest;
    }));
  };

  const titleText = isNewMode 
    ? `${fmtKR(slot.date)} · 새 수업`
    : `${fmtKR(slot.date)} · ${time}`;

  return (
    <Modal open={true} onClose={onClose} title={titleText} maxWidth="max-w-md">
      <div className="space-y-4">
        {/* 카테고리 토글 (isNew일 때만) */}
        {isNewMode && (
          <div>
            <div className="text-xs font-medium mb-2" style={{ color: theme.inkSoft }}>수업 종류</div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: theme.cardAlt2 }}>
              <button onClick={() => setCategory('group')}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: category === 'group' ? theme.accent : 'transparent',
                  color: category === 'group' ? '#FFF' : theme.inkMute,
                }}>
                소그룹
              </button>
              <button onClick={() => setCategory('private')}
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

        {/* 시간 선택 */}
        {isNewMode && (
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
        )}

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
                  <div key={i} className="rounded-lg p-2"
                    style={{
                      backgroundColor: isCharged ? theme.dangerBg : isCancelled ? theme.cardAlt2 : theme.cardAlt,
                      border: `1px solid ${isCharged ? '#D19B91' : theme.lineLight}`,
                      opacity: isCancelled && !isCharged ? 0.7 : 1,
                    }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{
                          color: isCharged ? theme.danger : theme.ink,
                          textDecoration: isCancelled ? 'line-through' : 'none',
                        }}>
                          {p.memberName}
                        </span>
                        {p.sessionNumber && p.totalSessions && !isCancelled && <Chip tone="accent" size="sm">{p.sessionNumber}/{p.totalSessions}</Chip>}
                        {p.isTrial && <Chip tone="peach" size="sm">체험</Chip>}
                        {p.classType === '개인' && <Chip tone="accent" size="sm">개인</Chip>}
                        {p.cancelled === 'no_charge' && <Chip tone="neutral" size="sm">취소(미차감)</Chip>}
                        {p.cancelled === 'charged' && <Chip tone="danger" size="sm">취소(차감)</Chip>}
                      </div>
                      <button onClick={() => setParts(parts.filter((_, j) => j !== i))} className="p-1 rounded" style={{ color: theme.danger }}>
                        <X size={14} />
                      </button>
                    </div>
                    {p.cancelNote && (
                      <div className="text-[10px] mt-1" style={{ color: theme.inkMute }}>메모: {p.cancelNote}</div>
                    )}
                    {!isCancelled ? (
                      <div className="flex gap-1 mt-1.5">
                        <button onClick={() => setCancelled(i, 'no_charge')}
                          className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ color: theme.inkMute, border: `1px solid ${theme.line}` }}>
                          미차감 취소
                        </button>
                        <button onClick={() => setCancelled(i, 'charged')}
                          className="text-[11px] px-2 py-0.5 rounded-md"
                          style={{ color: theme.danger, border: `1px solid ${theme.danger}` }}>
                          차감 취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => undoCancel(i)}
                        className="text-[11px] mt-1.5 px-2 py-0.5 rounded-md"
                        style={{ color: theme.accent, border: `1px solid ${theme.accent}` }}>
                        취소 해제
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
              options={members.map(m => ({ value: m.id, label: m.name }))} />
            <Button icon={Plus} onClick={addExisting}>추가</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={trialName} onChange={(e) => setTrialName(e.target.value)} placeholder="이름 (예: 박세린)" />
            <Button icon={Plus} onClick={addTrial}>추가</Button>
          </div>
        )}

        <Field label="메모 (선택)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: open class" />
        </Field>

        <div className="flex justify-between gap-2 pt-2">
          {existing && (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => onSave({ participants: [], time })}>수업 삭제</Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose}>취소</Button>
            <Button icon={Check} onClick={() => onSave({ participants: parts, note, time })}>저장</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* =========================================================
   Members View + Detail
   ========================================================= */
function MembersView({ members, setMembers, sessions, toast, onSendSMS }) {
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
    await saveMembers(members.filter(m => m.id !== id));
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
        <Button icon={Camera} variant="soft" size="sm" onClick={() => setPhotoImporting(true)}>사진</Button>
        <Button icon={Plus} onClick={() => setAdding(true)}>추가</Button>
      </div>

      {!members.length ? (
        <EmptyState icon={Users} title="아직 등록된 회원이 없어요" />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Users} title="해당 회원이 없어요" />
      ) : (
        <div className="space-y-2">
          {sorted.map(m => <MemberCard key={m.id} member={m} onClick={() => setOpenId(m.id)} />)}
        </div>
      )}
      {adding && <MemberEditor onClose={() => setAdding(false)} onSave={createMember} />}
      {photoImporting && (
        <MemberPhotoImport
          onClose={() => setPhotoImporting(false)}
          onSave={handlePhotoImport}
          toast={toast}
        />
      )}
      {openMember && (
        <MemberDetail
          member={openMember}
          onClose={() => setOpenId(null)}
          onUpdate={updateMember}
          onDelete={() => deleteMember(openMember.id)}
          sessions={sessions} toast={toast} onSendSMS={onSendSMS}
        />
      )}
    </div>
  );
}

function MemberCard({ member, onClick }) {
  const pass = activePass(member);
  const ps = passStatus(pass);
  const progress = pass ? (pass.usedSessions / pass.totalSessions) : 0;
  const fixedLabel = member.fixedSlots?.length
    ? member.fixedSlots.map(fs => `${WEEK_KR[fs.dow]}${fs.time}`).join(' · ')
    : null;

  return (
    <div onClick={onClick} className="rounded-2xl p-3.5 cursor-pointer transition-all active:scale-[0.99]"
      style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
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
          {ps && (
            <Chip tone={
              ps.label === '진행중' ? 'accent' :
              ps.label === '시작예정' ? 'warn' :
              ps.label === '홀딩' ? 'warn' :
              ps.label === '완료' ? 'success' :
              ps.tone
            }>{ps.label}</Chip>
          )}
          {member.assessment && <Chip tone="accent" size="sm">분석</Chip>}
        </div>
      </div>

      {pass ? (
        <div>
          <div className="flex justify-between text-[12px] mb-1">
            <span style={{ color: theme.inkSoft }}>{pass.type}</span>
            <span className="font-medium tabular-nums" style={{ color: theme.ink }}>
              {ps?.notStarted ? '시작 전' : `${pass.usedSessions}/${pass.totalSessions}회`}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.cardAlt }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${ps?.notStarted ? 0 : progress * 100}%`, backgroundColor: ps?.tone === 'danger' ? theme.danger : theme.accent }} />
          </div>
          <div className="text-[10px] mt-1 flex justify-between items-center" style={{ color: theme.inkMute }}>
            <span>
              {ps?.notStarted
                ? `시작일: ${pass.startDate}`
                : `~ ${pass.expiryDate}`}
              {pass.holdUsed && !ps?.notStarted && <span style={{ color: theme.warn }}> · 홀딩</span>}
            </span>
            {/* D-day 표시: D-7 이내면 빨간색 */}
            {!ps?.notStarted && !ps?.done && ps?.daysLeft !== undefined && (
              <span style={{ color: ps.daysLeft <= 7 ? theme.danger : theme.inkMute, fontWeight: ps.daysLeft <= 7 ? 600 : 400 }}>
                D-{ps.daysLeft}
              </span>
            )}
          </div>
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
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej();
        r.readAsDataURL(f);
      });
      arr.push({ name: f.name, data, media_type: f.type || 'image/png' });
    }
    setImages(arr);
  };

  const analyze = async () => {
    if (!images.length) { toast('사진을 올려주세요'); return; }
    setLoading(true);
    try {
      const system = `당신은 한국 요가원 회원 등록 서류, 회원권 신청서, 결제 영수증, 상담 메모 사진을 읽어서 회원 등록용 JSON으로 정리하는 어시스턴트입니다.

사진 여러 장이 한 사람의 자료일 수 있습니다. 같은 이름이 보이면 하나의 회원으로 합쳐주세요. 손글씨가 불확실하면 빈칸으로 두거나 notes에 "확인 필요"라고 적으세요.

반드시 아래 JSON만 출력하세요. 설명/코드펜스 금지.
{
  "members": [
    {
      "name": "성함",
      "phone": "010-0000-0000",
      "birthYear": "출생년도 숫자만",
      "gender": "여|남|기타|",
      "job": "직업",
      "yogaExperience": "요가/운동 경험",
      "keyPoint": "목·어깨·허리·고관절 등 핵심 주의사항 요약",
      "notes": "상담지/메모/특이사항 요약",
      "fixedSlots": [{"dow": 2, "time": "19:20"}],
      "pass": {
        "type": "스타터 패키지 A / 1개월 8회 / 개인레슨 등",
        "category": "group|private|trial",
        "totalSessions": 8,
        "usedSessions": 0,
        "paymentDate": "YYYY-MM-DD",
        "startDate": "YYYY-MM-DD",
        "expiryDate": "YYYY-MM-DD",
        "price": 200000,
        "note": "결제수단, 특이사항"
      }
    }
  ]
}

날짜 규칙: 4/23, 4.23 같은 날짜는 2026년으로 보정. 화목 19:20이면 fixedSlots에 화=2, 목=4로 넣기.`;

      const content = images.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type, data: img.data },
      }));
      content.push({ type: 'text', text: '소선요가 회원 등록 자료입니다. 회원 정보와 회원권 정보를 JSON으로 정리해주세요.' });

      const resp = await callClaude([{ role: 'user', content }], system);
      const result = tryParseJSON(resp);
      if (result?.members?.length) {
        setParsed(result.members);
      } else {
        toast('읽을 수 없었어요. 더 밝은 사진으로 다시 시도해주세요');
      }
    } catch (e) {
      toast('분석 실패: ' + (e.message || ''));
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
            <div className="text-xs font-semibold" style={{ color: theme.accent }}>읽어온 내용 확인</div>
            {parsed.map((m, i) => (
              <div key={i} className="rounded-2xl p-3 text-[12px] space-y-1"
                style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
                <div className="font-bold text-sm" style={{ color: theme.ink }}>{m.name || '이름 확인 필요'}</div>
                <div style={{ color: theme.inkSoft }}>{m.phone || '연락처 없음'} · {m.gender || ''} · {m.birthYear || ''}년생</div>
                {m.keyPoint && <div style={{ color: theme.accent2 }}>⚠ {m.keyPoint}</div>}
                {m.pass && <div style={{ color: theme.accent }}>수강권: {m.pass.type} · {Number(m.pass.price || 0).toLocaleString()}원</div>}
                {m.notes && <div style={{ color: theme.inkMute }}>{m.notes}</div>}
              </div>
            ))}
            <Button icon={Check} onClick={() => onSave(parsed)} className="w-full">이 내용으로 회원 등록</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function MemberEditor({ member, onClose, onSave }) {
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
            고정 수업 시간 <span style={{ color: theme.inkMute, fontWeight: 400 }}>· 일정에 자동으로 표시돼요</span>
          </div>
          <div className="rounded-2xl p-2" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
            <div className="grid gap-1">
              <div className="grid grid-cols-6 text-center text-[10px] font-semibold">
                <div></div>
                {[1, 2, 3, 4, 5].map(dow => (
                  <div key={dow} style={{ color: (dow === 2 || dow === 4) ? theme.accent2 : theme.inkSoft }}>
                    {WEEK_KR[dow]}
                  </div>
                ))}
              </div>
              {TIME_PRESETS.map(time => (
                <div key={time} className="grid grid-cols-6 gap-0.5 items-center">
                  <div className="text-[10px] text-right pr-1 font-medium tabular-nums" style={{ color: theme.inkSoft }}>{time}</div>
                  {[1, 2, 3, 4, 5].map(dow => {
                    const on = data.fixedSlots?.some(s => s.dow === dow && s.time === time);
                    const smDay = dow === 2 || dow === 4;
                    return (
                      <button key={dow} onClick={() => toggleSlot(dow, time)}
                        className="h-7 rounded-md text-[11px] transition-all"
                        style={{
                          backgroundColor: on ? theme.accent : (smDay ? theme.accentSoft : theme.card),
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

        <Field label="메모">
          <TextArea value={data.notes || ''} onChange={(e) => setData({ ...data, notes: e.target.value })} placeholder="특이사항이 있다면" />
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
function MemberDetail({ member, onClose, onUpdate, onDelete, sessions, toast, onSendSMS }) {
  const [tab, setTab] = useState('passes');
  const [editing, setEditing] = useState(false);
  const [addingPass, setAddingPass] = useState(false);
  const [convertingPass, setConvertingPass] = useState(null);

  const pass = activePass(member);

  const history = useMemo(() => {
    const arr = [];
    Object.values(sessions).forEach(s => {
      s.participants.forEach(p => {
        if (p.memberId === member.id) {
          arr.push({
            date: s.date, time: s.time,
            sessionNumber: p.sessionNumber, totalSessions: p.totalSessions,
            cancelled: p.cancelled, cancelNote: p.cancelNote,
            classType: p.classType,
          });
        }
      });
    });
    return arr.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [sessions, member.id]);

  const addPass = async (passData) => {
    let passes = [...(member.passes || [])];
    if (Array.isArray(passData)) {
      passes = passes.concat(passData.map(p => ({ id: uid(), ...p, usedSessions: 0, sessionDates: [] })));
    } else {
      passes.push({ id: uid(), ...passData, usedSessions: 0, sessionDates: [] });
    }
    await onUpdate({ ...member, passes });
    setAddingPass(false);
    toast('수강권이 추가되었어요');
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
            { id: 'history', label: '이력' },
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
            <InfoRow label="메모" value={member.notes} multiline />
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
              const latestSession = history.length > 0 ? history.find(h => !h.cancelled) : null;
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

            {(member.passes || []).filter(p => !p.archived).map(p => {
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
                      {st && <Chip tone={
                        st.label === '진행중' ? 'accent' :
                        st.label === '시작예정' ? 'warn' :
                        st.label === '홀딩' ? 'warn' :
                        st.label === '완료' ? 'success' :
                        st.tone
                      } size="sm">{st.label}</Chip>}
                    </div>
                  </div>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span style={{ color: theme.inkSoft }}>진행</span>
                    <span className="font-medium tabular-nums">{p.usedSessions}/{p.totalSessions}회</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: theme.card }}>
                    <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: theme.accent }} />
                  </div>
                  <div className="flex gap-1.5 justify-end flex-wrap">
                    {p.canHold && !p.holdUsed && (
                      <Button size="sm" variant="ghost" onClick={() => applyHold(p.id, 7)}>홀딩 7일</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConvertingPass(p)}>
                      <RefreshCw size={11} /> 전환
                    </Button>
                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => deletePass(p.id)}></Button>
                  </div>
                </div>
              );
            })}

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
                  const isCharged = h.cancelled === 'charged';
                  const isNoCharge = h.cancelled === 'no_charge';
                  return (
                    <div key={i} className="px-3 py-2 rounded-lg flex items-start gap-3"
                      style={{
                        backgroundColor: isCharged ? theme.dangerBg : theme.cardAlt,
                        border: `1px solid ${isCharged ? '#D19B91' : theme.lineLight}`,
                      }}>
                      <span className="text-[12px] tabular-nums shrink-0" style={{ color: theme.inkMute }}>{h.date}</span>
                      <span className="text-[12px] font-medium tabular-nums" style={{ color: isCharged ? theme.danger : theme.accent2, fontFamily: theme.serif, fontSize: 13 }}>{h.time}</span>
                      <div className="flex-1 flex flex-wrap items-center gap-1">
                        {h.classType === '개인' && <Chip tone="accent" size="sm">개인</Chip>}
                        {h.sessionNumber && h.totalSessions && !h.cancelled && (
                          <span className="text-[11px]" style={{ color: theme.inkSoft }}>{h.sessionNumber}/{h.totalSessions}</span>
                        )}
                        {isNoCharge && <Chip tone="neutral" size="sm">취소(미차감)</Chip>}
                        {isCharged && <Chip tone="danger" size="sm">취소(차감)</Chip>}
                        {h.cancelNote && <span className="text-[10px]" style={{ color: theme.inkMute }}>· {h.cancelNote}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'memo' && (
          <MemoTimeline items={member.memoTimeline || []} onUpdate={updateMemoTimeline} toast={toast} />
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
            onSave={async (d) => { await onUpdate({ ...member, ...d }); setEditing(false); toast('수정되었어요'); }}
          />
        )}
        {addingPass && (
          <PassEditor
            onClose={() => setAddingPass(false)}
            onSave={async (data) => {
              await addPass(data);
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
function MemoTimeline({ items, onUpdate, toast }) {
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(toYMD(new Date()));
  const [text, setText] = useState('');

  const add = async () => {
    if (!text.trim()) return;
    const next = [{ id: uid(), date, text: text.trim() }, ...items]
      .sort((a, b) => b.date.localeCompare(a.date));
    await onUpdate(next);
    setAdding(false); setText(''); toast('메모 저장됨');
  };

  const del = async (id) => {
    if (!confirm('삭제할까요?')) return;
    await onUpdate(items.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-2">
      {!adding && (
        <Button icon={Plus} variant="soft" onClick={() => setAdding(true)} className="w-full">새 메모</Button>
      )}
      {adding && (
        <div className="rounded-2xl p-3 space-y-2" style={{ backgroundColor: theme.cardAlt, border: `1px solid ${theme.line}` }}>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="회원에 대해 남길 메모 (상담 내용, 변경 사항, 관찰 등)" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setAdding(false); setText(''); }}>취소</Button>
            <Button icon={Check} onClick={add}>저장</Button>
          </div>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState icon={FileText} title="아직 메모가 없어요" />
      ) : (
        <div className="space-y-2">
          {items.map(m => (
            <div key={m.id} className="rounded-2xl p-3" style={{ backgroundColor: theme.card, border: `1px solid ${theme.lineLight}` }}>
              <div className="flex justify-between items-baseline mb-1">
                <div className="text-[12px] font-medium tabular-nums" style={{ color: theme.accent }}>{m.date}</div>
                <button onClick={() => del(m.id)} className="p-1" style={{ color: theme.inkMute }}>
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="text-[13px] whitespace-pre-wrap" style={{ color: theme.ink }}>{m.text}</div>
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
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej();
        r.readAsDataURL(f);
      });
      arr.push({ name: f.name, data, media_type: f.type || 'image/png' });
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
                    <div key={i} className="relative">
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
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej();
        r.readAsDataURL(f);
      });
      arr.push({ name: f.name, data, media_type: f.type || 'image/png' });
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
function PassEditor({ onClose, onSave }) {
  const [presetIdx, setPresetIdx] = useState(1);
  const preset = PASS_PRESETS[presetIdx];
  const [paymentDate, setPaymentDate] = useState(toYMD(new Date()));
  const [startDate, setStartDate] = useState(toYMD(new Date()));
  const [type, setType] = useState(preset.label.replace('⭐ ', ''));
  const [total, setTotal] = useState(preset.total || 1);
  const [days, setDays] = useState(preset.days || 30);
  const [price, setPrice] = useState(preset.price);
  const [pricePerSession, setPricePerSession] = useState(0);
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
        type, category, totalSessions: total,
        paymentDate, startDate, expiryDate: extendedExpiry,
        price, canHold, days, note: note || undefined,
      };
      if (pricePerSession > 0) data.pricePerSession = pricePerSession;
      onSave(data);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title="수강권 추가">
      <div className="space-y-3">
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
function ClassLogView({ classLog, setClassLog, sessions, toast }) {
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
              <button key={i} onClick={() => setEditingDate(key)}
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
                      <span key={i}>
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
                      <span key={'c' + i} style={{ color: p.cancelled === 'charged' ? theme.danger : theme.inkMute, textDecoration: 'line-through' }}>
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
function TrialsView({ trials, setTrials, members, setMembers, toast, onSendSMS }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [filter, setFilter] = useState('all');
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
    setBulkImporting(false);
    toast(`${withIds.length}명 추가 (중복 ${newList.length - filtered.length}명 제외)`);
  };

  const create = async (data) => {
    const t = { id: uid(), ...data, createdAt: toYMD(new Date()), status: data.status || '예약확정' };
    const next = [t, ...trials];
    await saveTrials(next);
    setAdding(false);
    toast('체험자 등록됨');
    if (data.sendSMS && data.phone && data.date && data.time) {
      onSendSMS({ phone: data.phone, name: data.name, template: SMS_TEMPLATES.trial(t) });
    }
  };

  const update = async (id, data) => {
    await saveTrials(trials.map(t => t.id === id ? { ...t, ...data } : t));
    setEditing(null);
    toast('수정됨');
  };

  const del = async (id) => {
    if (!confirm('이 체험자를 삭제할까요?')) return;
    await saveTrials(trials.filter(t => t.id !== id));
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
    if (s === '취소') return 'danger';        // 빨강
    return 'neutral';
  };

  const convertedCount = trials.filter(t => t.status === '회원전환').length;
  const notConvertedCount = trials.filter(t => t.status !== '회원전환').length;
  const filteredTrials = trials
    .filter(t => {
      const filterOk = filter === 'all' ? true :
        filter === 'converted' ? t.status === '회원전환' :
        t.status !== '회원전환';
      const q = search.trim();
      const searchOk = !q || (t.name || '').includes(q) || (t.phone || '').replace(/-/g, '').includes(q.replace(/-/g, ''));
      return filterOk && searchOk;
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
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px]" style={{ color: theme.inkSoft }}>
          전체 <span className="font-bold" style={{ color: theme.ink }}>{trials.length}명</span>
          {trials.length > 0 && (
            <span className="ml-2">· 전환률 <span className="font-bold" style={{ color: theme.accent }}>
              {Math.round(convertedCount / trials.length * 100)}%
            </span></span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button icon={Camera} variant="soft" size="sm" onClick={() => setBulkImporting(true)}>사진</Button>
          <Button icon={Plus} onClick={() => setAdding(true)}>추가</Button>
        </div>
      </div>

      {/* Filter tabs */}
      {trials.length > 0 && (
        <div className="flex gap-1 mb-3">
          {[
            { id: 'all', label: '전체', count: trials.length },
            { id: 'converted', label: '등록', count: convertedCount },
            { id: 'not_converted', label: '미등록', count: notConvertedCount },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="flex-1 py-1.5 rounded-lg text-[12px] transition-all"
              style={{
                backgroundColor: filter === f.id ? theme.accent : 'transparent',
                color: filter === f.id ? theme.card : theme.inkSoft,
                border: `1px solid ${filter === f.id ? theme.accent : theme.line}`,
                fontWeight: filter === f.id ? 600 : 500,
              }}>
              {f.label} <span className="ml-0.5 opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      )}

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
      {bulkImporting && (
        <TrialBulkImport
          onClose={() => setBulkImporting(false)}
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

function TrialBulkImport({ onClose, onSave, toast }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState(null); // array of trials
  const fileRef = useRef();

  const handleFiles = async (files) => {
    const arr = [...images];
    for (const f of files) {
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej();
        r.readAsDataURL(f);
      });
      arr.push({ name: f.name, data, media_type: f.type || 'image/png' });
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
                  <div key={i} className="relative">
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
              options={TIME_PRESETS.map(t => ({ value: t, label: t }))} />
          </Field>
        </div>
        <Field label="요가·운동 경험">
          <Input value={data.experience} onChange={(e) => setData({ ...data, experience: e.target.value })} placeholder="예: 필라테스 1년, 첫 요가" />
        </Field>
        <Field label="몸의 불편한 부분">
          <TextArea value={data.painPoints} onChange={(e) => setData({ ...data, painPoints: e.target.value })}
            placeholder="예: 허리 통증, 거북목, 어깨 뭉침" style={{ minHeight: 60 }} />
        </Field>
        <Field label="상태">
          <Select value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}
            options={[
              { value: '문의', label: '문의' },
              { value: '예약확정', label: '예약확정' },
              { value: '수업완료', label: '수업완료' },
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
          <Chip tone={trial.status === '회원전환' ? 'success' : 'warn'} size="sm">{trial.status}</Chip>
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
      const data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = () => rej();
        r.readAsDataURL(f);
      });
      arr.push({ name: f.name, data, media_type: f.type || 'image/png' });
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
                  <div key={i} className="relative">
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
function StatsView({ members, trials }) {
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);

  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const targetYM = `${targetMonth.getFullYear()}-${pad(targetMonth.getMonth() + 1)}`;

  const stats = useMemo(() => {
    // Revenue: sum pass.price where paymentDate is in target month
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

    // Trial conversion: trials created in target month
    const monthTrials = trials.filter(t => (t.date || t.createdAt || '').startsWith(targetYM));
    const converted = monthTrials.filter(t => t.status === '회원전환').length;
    const conversionRate = monthTrials.length > 0 ? Math.round(converted / monthTrials.length * 100) : 0;

    return { revenue, count, refundTotal, net: revenue - refundTotal, byCat, trialTotal: monthTrials.length, converted, conversionRate };
  }, [members, trials, targetYM]);

  // Active members count
  const activeMembers = members.filter(m => activePass(m)).length;

  return (
    <div className="px-3 pb-28 pt-2 space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonthOffset(monthOffset - 1)} className="p-1.5 rounded-lg" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <div className="text-[11px]" style={{ color: theme.inkMute }}>{targetMonth.getFullYear()}</div>
          <div className="font-bold text-lg" style={{ color: theme.ink }}>{targetMonth.getMonth() + 1}월 통계</div>
        </div>
        <button onClick={() => setMonthOffset(Math.min(0, monthOffset + 1))} disabled={monthOffset >= 0}
          className="p-1.5 rounded-lg disabled:opacity-30" style={{ color: theme.ink, backgroundColor: theme.cardAlt }}>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Revenue */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: theme.accent }}>이번 달 수익</div>
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

        {/* Category breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label="소그룹" value={Math.round(stats.byCat.group / 10000) + '만'} color={theme.accent} />
          <Stat label="개인" value={Math.round(stats.byCat.private / 10000) + '만'} color={theme.accent2} />
          <Stat label="체험" value={Math.round((stats.byCat.trial + stats.byCat.other) / 10000) + '만'} color={theme.inkSoft} />
        </div>
      </div>

      {/* Trial conversion */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: theme.accent }}>체험 → 회원 전환</div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tabular-nums" style={{ color: theme.accent2, fontFamily: theme.serif }}>
            {stats.conversionRate}
          </div>
          <div className="text-sm" style={{ color: theme.inkMute }}>%</div>
        </div>
        <div className="text-[11px] mt-1" style={{ color: theme.inkMute }}>
          체험 {stats.trialTotal}명 중 {stats.converted}명 전환
        </div>
      </div>

      {/* Active members */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.line}` }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: theme.accent }}>전체 현황</div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="전체 회원" value={members.length} color={theme.ink} />
          <Stat label="활성 회원" value={activeMembers} color={theme.accent} />
          <Stat label="전체 체험자" value={trials.length} color={theme.accent2} />
        </div>
      </div>
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
          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg"
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
    setMembers(finalM); setSessions(finalS); setClassLog(finalC); setTrials(finalT);
    setDashDismiss(dd); setSmsConfirmed(sc);
    setGroupSlots(Array.isArray(gs) && gs.length ? gs : DEFAULT_GROUP_SLOTS);
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
          toast={toast} onSendSMS={onSendSMS} goto={setTab}
          onOpenSettings={() => setSettingsOpen(true)} />
      )}
      {tab === 'schedule' && (
        <ScheduleView members={members} setMembers={setMembers}
          sessions={sessions} setSessions={setSessions}
          groupSlots={groupSlots} setGroupSlots={setGroupSlots} toast={toast} />
      )}
      {tab === 'members' && (
        <MembersView members={members} setMembers={setMembers}
          sessions={sessions} toast={toast} onSendSMS={onSendSMS} />
      )}
      {tab === 'trials' && (
        <TrialsView trials={trials} setTrials={setTrials}
          members={members} setMembers={setMembers}
          toast={toast} onSendSMS={onSendSMS} />
      )}
      {tab === 'classlog' && (
        <ClassLogView classLog={classLog} setClassLog={setClassLog} sessions={sessions} toast={toast} />
      )}
      {tab === 'stats' && (
        <StatsView members={members} trials={trials} />
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

