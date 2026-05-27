import React, { useState, useEffect } from 'react';
import {
  Bell, Home, Calendar, ClipboardList, User, Lock, FileText,
  Phone, MessageCircle, ChevronRight, ChevronLeft, X, Check,
  AlertCircle, Settings, LogOut, RefreshCw
} from 'lucide-react';

/* =========================================================
   Supabase 연결
   ========================================================= */
const SUPABASE_URL = 'https://vcemcdzilelnoebupxyp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjZW1jZHppbGVsbm9lYnVweHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzE1MjAsImV4cCI6MjA5MjYwNzUyMH0._OQ1vEDNgNhyNgV70Ph6Pi6Bwn9fA3HcbZ9bVC6gsv8';

// REST API로 데이터 가져오기 (강사 앱과 동일 구조: id, data 컬럼)
async function sbGet(table, id) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}&select=data`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) {
      console.error('sbGet HTTP error', table, id, res.status);
      return null;
    }
    const rows = await res.json();
    return rows[0]?.data ?? null;
  } catch (e) {
    console.error('sbGet error', table, id, e);
    return null;
  }
}

// === RPC 호출 ===
// 회원 앱은 members 테이블을 직접 못 읽고, 이 RPC 함수들을 통해서만 본인 데이터 받음
async function sbRpc(funcName, args) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/${funcName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args || {}),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      console.error('sbRpc error', funcName, res.status, errText);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('sbRpc exception', funcName, e);
    return null;
  }
}

// 폰번호 + 비밀번호로 본인 인증 (로그인)
async function rpcLogin(phone, password) {
  return await sbRpc('get_member_by_phone', { p_phone: phone, p_password: password });
}

// ID로 본인 데이터 갱신 (자동 로그인 / 새로고침)
async function rpcGetMyData(memberId) {
  return await sbRpc('get_member_by_id', { p_id: memberId });
}

// 본인 sessions 데이터 (수업 이력 + 다른 슬롯 인원수)
async function rpcGetMySessions(memberId) {
  const raw = await sbRpc('get_sessions_for_member', { p_member_id: memberId });
  if (!raw) return {};
  // RPC 응답을 기존 sessions 형식으로 변환
  // RPC: { key: { date, time, totalCount, myPart? } }
  // 기존: { key: { date, time, participants: [...] } }
  const converted = {};
  Object.keys(raw).forEach(key => {
    const s = raw[key];
    const participants = [];
    // 본인 참여 정보가 있으면 첫 번째로
    if (s.myPart) participants.push(s.myPart);
    // 나머지는 익명 더미로 채우기 (인원수만 맞추기)
    const others = (s.totalCount || 0) - (s.myPart ? 1 : 0);
    for (let i = 0; i < others; i++) {
      participants.push({ memberName: '회원', _anon: true });
    }
    converted[key] = {
      date: s.date,
      time: s.time,
      note: s.note,
      classNote: s.classNote,
      participants,
    };
  });
  return converted;
}

// 비밀번호 변경
async function rpcChangePassword(memberId, oldPw, newPw) {
  return await sbRpc('change_member_password', { 
    p_member_id: memberId, 
    p_old_password: oldPw, 
    p_new_password: newPw 
  });
}

// 슬롯별 인원수 가져오기 (회원 이름 X, 숫자만)
// 응답: { "2_11:00": 4, "2_19:20": 1, "4_11:00": 4, ... }
async function rpcGetSlotCounts(targetDate) {
  return await sbRpc('get_slot_counts', { p_target_date: targetDate });
}

// 날짜별 슬롯 인원수 (시작일부터 N일치)
// 응답: { "2026-05-12_11:00": 4, "2026-05-12_19:20": 2, ... }
async function rpcGetSlotCountsRange(startDate, days = 28) {
  return await sbRpc('get_slot_counts_range', { p_start_date: startDate, p_days: days });
}

// 휴강일 가져오기
// 응답: [{ date: 'YYYY-MM-DD', reason: '...' }, ...]
async function rpcGetClosedDays() {
  return await sbRpc('get_closed_days', {});
}

// 로컬 시간 기준 YYYY-MM-DD 변환 (toISOString은 UTC라 한국 새벽엔 하루 밀림)
function toYMDLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 한국 공휴일 (2026)
const HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날
  '2026-03-01', '2026-03-02',
  '2026-05-05', // 어린이날
  '2026-05-24', '2026-05-25', // 부처님오신날
  '2026-06-06',
  '2026-08-15', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석
  '2026-10-03', '2026-10-05',
  '2026-10-09',
  '2026-12-25',
]);

// 공휴일 이름 (있는 것만 - 화·목 위주)
const HOLIDAY_NAMES_2026 = {
  '2026-01-01': '신정',
  '2026-02-16': '설날',
  '2026-02-17': '설날',
  '2026-02-18': '설날',
  '2026-03-01': '삼일절',
  '2026-03-02': '삼일절',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '부처님오신날',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '광복절',
  '2026-09-24': '추석',
  '2026-09-25': '추석',
  '2026-09-26': '추석',
  '2026-10-03': '개천절',
  '2026-10-05': '개천절',
  '2026-10-09': '한글날',
  '2026-12-25': '크리스마스',
};

// 날짜 헬퍼
function fromYMD(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// 두 날짜 사이의 화·목 날짜 목록
function tueThuDatesBetween(startYMD, endYMD) {
  const dates = [];
  let d = fromYMD(startYMD);
  const end = fromYMD(endYMD);
  while (d <= end) {
    const dow = d.getDay();
    if (dow === 2 || dow === 4) dates.push(toYMDLocal(d));
    d = addDays(d, 1);
  }
  return dates;
}

// 면제일 체크 (공휴일 / 휴강일 / 홀딩 기간)
function isExemptDay(ymd, pass, closedDays) {
  if (HOLIDAYS_2026.has(ymd)) return true;
  if (Array.isArray(closedDays) && closedDays.some(c => c.date === ymd)) return true;
  if (pass?.holdStart && pass?.holdEnd && ymd >= pass.holdStart && ymd <= pass.holdEnd) return true;
  return false;
}

// 리듬 수련 상태 계산 (강사 앱 동일 로직)
function rhythmStatus(p, closedDays = []) {
  if (!p) return null;
  if (p.archived) return null;
  if (p.category === 'trial' || p.category === 'private') return null;
  
  let weeks, bonus;
  if (p.totalSessions === 8) { weeks = 4; bonus = 1; }
  else if (p.totalSessions === 16) { weeks = 8; bonus = 2; }
  else if (p.totalSessions === 24) { weeks = 12; bonus = 3; }
  else return null;
  
  if (!p.startDate) return null;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const todayStr = toYMDLocal(new Date());
  
  const sortedDates = [...(p.sessionDates || [])].sort();
  const firstAttendDate = sortedDates[0] || null;
  const challengeStartYMD = firstAttendDate || p.startDate;
  
  let challengeEndYMD = toYMDLocal(addDays(fromYMD(challengeStartYMD), weeks * 7 - 1));
  const initialSlotsAll = tueThuDatesBetween(challengeStartYMD, challengeEndYMD);
  const exemptCount = initialSlotsAll.filter(d => isExemptDay(d, p, closedDays)).length;
  if (exemptCount > 0) {
    challengeEndYMD = toYMDLocal(addDays(fromYMD(challengeEndYMD), exemptCount * 7));
  }
  const challengeEndMs = fromYMD(challengeEndYMD).getTime();
  
  const startMs = fromYMD(p.startDate).getTime();
  if (todayMs < startMs) {
    return { status: 'pending', weeks, bonus };
  }
  if (!firstAttendDate) {
    return { status: 'pending', weeks, bonus };
  }
  
  const allTueThu = tueThuDatesBetween(challengeStartYMD, challengeEndYMD);
  const validSlots = allTueThu.filter(d => !isExemptDay(d, p, closedDays));
  const attendedSet = new Set(sortedDates);
  const passedSlots = validSlots.filter(d => d <= todayStr);
  const missedDays = passedSlots.filter(d => !attendedSet.has(d));
  
  const requiredCount = p.totalSessions;
  const attendedCount = sortedDates.length;
  const remaining = Math.max(0, requiredCount - attendedCount);
  
  // 도전 기간 끝
  if (todayMs > challengeEndMs) {
    const allCovered = missedDays.length === 0 && attendedCount >= requiredCount;
    return {
      status: allCovered ? 'achieved' : 'missed',
      weeks, bonus, attendedCount, requiredCount,
    };
  }
  
  // 진행 중 - 이미 결석 있으면 실패 확정
  if (missedDays.length > 0) {
    return {
      status: 'missed',
      weeks, bonus, attendedCount, requiredCount,
    };
  }
  
  // 도전 중
  return {
    status: 'challenging',
    weeks, bonus, attendedCount, requiredCount, remaining,
  };
}

/* =========================================================
   🔙 전역 백 스택 (안드로이드 뒤로가기 통합 처리)
   ========================================================= */
const sosunBackStack = {
  stack: [],
  initialized: false,
  exitArmed: false,
  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof window === 'undefined') return;
    if (!window.history.state || !window.history.state.sosunBase) {
      window.history.replaceState({ sosunBase: true }, '');
    }
    window.addEventListener('popstate', () => {
      const top = this.stack[this.stack.length - 1];
      if (top) {
        this.stack.pop();
        try { top.onClose && top.onClose(); } catch (e) { console.error('back close error', e); }
        window.history.pushState({ sosunBase: true }, '');
        this.exitArmed = false;
      } else {
        if (this.exitArmed) {
          this.exitArmed = false;
        } else {
          window.history.pushState({ sosunBase: true }, '');
          this.exitArmed = true;
          setTimeout(() => { this.exitArmed = false; }, 2000);
        }
      }
    });
  },
  push(onClose) {
    this.init();
    const id = 'b_' + Math.random().toString(36).slice(2, 9);
    this.stack.push({ id, onClose });
    window.history.pushState({ sosunStack: id }, '');
    this.exitArmed = false;
    return id;
  },
  remove(id) {
    const idx = this.stack.findIndex(s => s.id === id);
    if (idx === -1) return;
    this.stack.splice(idx, 1);
    try {
      if (window.history.state && window.history.state.sosunStack) {
        window.history.replaceState({ sosunBase: true }, '');
      }
    } catch (e) {}
  },
};


// bookings 테이블 - 예약 요청 추가
async function sbInsertBooking(booking) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(booking),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error('sbInsertBooking error', err);
      return null;
    }
    const rows = await res.json();
    return rows[0] || null;
  } catch (e) {
    console.error('sbInsertBooking error', e);
    return null;
  }
}

// bookings - 회원 본인 예약 요청 목록 가져오기
async function sbGetBookingsForMember(memberId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?member_id=eq.${encodeURIComponent(memberId)}&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('sbGetBookingsForMember error', e);
    return [];
  }
}

// bookings - 상태 업데이트 (취소 등)
async function sbUpdateBooking(id, updates) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(updates),
      }
    );
    if (!res.ok) {
      console.error('sbUpdateBooking error', await res.text());
      return null;
    }
    const rows = await res.json();
    return rows[0] || null;
  } catch (e) {
    console.error('sbUpdateBooking error', e);
    return null;
  }
}

// 강사 앱에서 사용한 키 매핑 (id: 'all')
const KEYS = {
  members: { table: 'members', id: 'all' },
  sessions: { table: 'sessions', id: 'all' },
  classlog: { table: 'classlog', id: 'all' },
  trials: { table: 'trials', id: 'all' },
  closedDays: { table: 'settings', id: 'closedDays' },
};

// 전화번호 정규화 (010-1234-5678 → 01012345678)
function normalizePhone(phone) {
  return (phone || '').replace(/[^0-9]/g, '');
}

// 회원 데이터에서 비밀번호 = 전화번호 뒷 4자리 검증
function findMemberByPhone(membersList, inputPhone, inputPassword) {
  const normalizedInput = normalizePhone(inputPhone);
  for (const m of (membersList || [])) {
    const memberPhone = normalizePhone(m.phone);
    // 전화번호 일치 (전체 또는 뒷 4자리)
    const match = memberPhone === normalizedInput 
                || memberPhone.endsWith(normalizedInput);
    if (!match) continue;
    // 비밀번호 = 전화번호 뒷 4자리
    const last4 = memberPhone.slice(-4);
    if (inputPassword === last4) return m;
  }
  return null;
}

// 강사 앱 데이터 → 회원 앱 형식 변환
function transformMemberData(rawMember, allSessions, allTrials, today, closedDays = [], reservations = {}, slotCounts = {}) {
  if (!rawMember) return null;
  
  const todayStr = toYMDLocal(today);
  
  // 활성 수강권 (만료 안 된 것 중 가장 최근)
  // 활성 수강권 찾기:
  // 1순위: 진행 중 (시작일~만료일 범위 안 + 회차 남음)
  // 2순위: 시작 예정 (만료 안 됨 + 회차 남음 + 시작일 미래)
  // 3순위: 없음
  const isPassUsable = (p) => {
    if (p.archived) return false;
    if (!p.startDate || !p.expiryDate) return false;
    if (p.expiryDate < todayStr) return false; // 만료됨
    // 진짜 출석 회수 (오늘 이전 sessionDates만)
    const trueUsed = (p.sessionDates || []).filter(d => d <= todayStr).length;
    const total = p.totalSessions || 0;
    if (trueUsed >= total) return false; // 회차 다 씀
    return true;
  };
  
  const activePass = 
    (rawMember.passes || []).find(p => 
      isPassUsable(p) && p.startDate <= todayStr // 진행 중
    ) ||
    (rawMember.passes || []).find(p => 
      isPassUsable(p) && p.startDate > todayStr // 시작 예정
    ) ||
    null;
  
  // 다음 수업 (참여한 sessions 중 미래, 취소 안 된 것만)
  // 오늘 같은 날이면 수업 종료 시간이 안 지난 것만 카운트 (현재 시각 기준)
  const nowHHMM = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
  // 수업 종료 시각 = 시작 시각 + 1시간
  const isAfterClass = (date, time) => {
    if (date !== todayStr) return false;
    if (!time) return false;
    const [h, m] = time.split(':').map(Number);
    const endH = (h + 1) % 24;
    const endHHMM = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return nowHHMM >= endHHMM;
  };
  
  let nextSession = null;
  Object.values(allSessions || {}).forEach(s => {
    if (!s?.date || !s?.participants) return;
    if (s.date < todayStr) return;
    if (isAfterClass(s.date, s.time)) return; // 오늘이고 수업 끝났으면 패스
    const part = s.participants.find(p => 
      p.memberId === rawMember.id 
      && !p.cancelled 
      && p.status !== 'cancelled_advance' 
      && p.status !== 'cancelled_sameday'
    );
    if (!part) return;
    if (!nextSession || s.date < nextSession.date 
        || (s.date === nextSession.date && s.time < nextSession.time)) {
      nextSession = { ...s, _part: part };
    }
  });
  
  // ⭐ 보강: reservations(bookings.approved)도 같이 봄
  // 강사가 예약 승인했으면 무조건 신뢰 (sessions에 같은 슬롯 cancelled가 있어도 무시)
  // 사유: 회원이 한 번 취소했다가 다시 예약 → 새 booking이 approved면 그게 우선
  Object.values(reservations || {}).forEach(r => {
    if (!r?.date || !r?.time) return;
    if (r.state !== 'reserved') return; // approved만
    if (r.date < todayStr) return;
    if (isAfterClass(r.date, r.time)) return;
    if (!nextSession || r.date < nextSession.date 
        || (r.date === nextSession.date && r.time < nextSession.time)) {
      // 같은 슬롯의 sessions가 있으면 participants 정보까지 가져옴 (참여자 수 표시용)
      const sessKey = `${r.date}_${r.time}`;
      const sess = (allSessions || {})[sessKey];
      nextSession = {
        date: r.date,
        time: r.time,
        participants: sess?.participants || [],
        classType: sess?.classType,
        _part: { memberId: rawMember.id },
        _isMine: true, // 본인 예약 — 인원수에 본인 포함
      };
    }
  });
  
  // ⭐ 보강 2: 본인 fixedSlots 기반 가상 다음 수업 (강사가 sessions 안 만들어둔 경우)
  // 패스 활성 + cancelled 아닌 슬롯 중 가장 빠른 것
  const fixedSlots = rawMember.fixedSlots || [];
  if (fixedSlots.length > 0 && activePass) {
    // 오늘부터 28일간 본인 고정 슬롯 화/목 검색
    const passStart = activePass.startDate;
    const passEnd = activePass.expiryDate;
    const searchStart = todayStr > passStart ? todayStr : passStart;
    let cursor = new Date(searchStart);
    const limitDate = new Date(searchStart);
    limitDate.setDate(limitDate.getDate() + 28);
    while (cursor <= limitDate) {
      const cYMD = toYMDLocal(cursor);
      if (cYMD > passEnd) break;
      const cDow = cursor.getDay();
      // 휴일/휴강 체크
      const isHol = HOLIDAYS_2026.has(cYMD);
      const isClosed = (closedDays || []).some(c => c.date === cYMD);
      if (!isHol && !isClosed) {
        fixedSlots.forEach(fs => {
          if (fs.dow !== cDow) return;
          if (isAfterClass(cYMD, fs.time)) return; // 오늘이고 수업 끝났으면 패스
          const k = `${cYMD}_${fs.time}`;
          // 같은 슬롯이 sessions에서 cancelled면 스킵
          const sess = (allSessions || {})[k];
          if (sess) {
            const myCancelled = (sess.participants || []).find(p =>
              p.memberId === rawMember.id 
              && (p.status === 'cancelled_advance' || p.status === 'cancelled_sameday' || p.status === 'cancelled_by_teacher' || p.cancelled)
            );
            if (myCancelled) return;
          }
          // 더 빠른 nextSession 후보면 업데이트 (sessions 있으면 participants 합침)
          if (!nextSession || cYMD < nextSession.date 
              || (cYMD === nextSession.date && fs.time < nextSession.time)) {
            nextSession = {
              date: cYMD,
              time: fs.time,
              participants: sess?.participants || [],
              classType: sess?.classType,
              _part: { memberId: rawMember.id },
              _isMine: true, // 본인 고정 슬롯 — 인원수에 본인 포함되어야 함
            };
          }
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  
  // 수업 이력 (과거 sessions)
  // ⭐ 회차(num)는 part.sessionNumber를 믿지 않고 — 패스의 sessionDates 기준으로 재계산
  //    (강사 앱이 슬롯 만든 순서에 따라 sessionNumber가 잘못 박힐 수 있음)
  // 각 패스별로 sessionDates를 정렬해서 날짜→회차 맵 미리 만듦
  const passDateToNum = {}; // passId → { 'YYYY-MM-DD': 회차 }
  (rawMember.passes || []).forEach(p => {
    const sorted = [...(p.sessionDates || [])].sort();
    const map = {};
    sorted.forEach((dt, i) => { map[dt] = i + 1; });
    passDateToNum[p.id] = { map, total: p.totalSessions };
  });
  
  const history = [];
  Object.values(allSessions || {}).forEach(s => {
    if (!s?.date || !s?.participants) return;
    if (s.date > todayStr) return;
    const part = s.participants.find(p => p.memberId === rawMember.id);
    if (!part) return;
    
    let status = 'attended', label = '출석';
    let isCharged = true; // 회차 차감 여부 (출석/당일취소charged/노쇼 = 차감)
    if (part.cancelled === 'no_charge') { status = 'cancelled_advance'; label = '예약 취소'; isCharged = false; }
    else if (part.status === 'cancelled_advance') { status = 'cancelled_advance'; label = '예약 취소'; isCharged = false; }
    else if (part.status === 'cancelled_by_teacher') { status = 'cancelled_advance'; label = '강사 변경'; isCharged = false; }
    else if (part.cancelled === 'charged') { status = 'cancelled_sameday'; label = '당일 취소'; isCharged = true; }
    else if (part.status === 'cancelled_sameday') { status = 'cancelled_sameday'; label = '당일 취소'; isCharged = true; }
    else if (part.status === 'no_show') { status = 'no_show'; label = '노쇼'; isCharged = true; }
    else if (part.status === 'reserved' && s.date >= todayStr) { status = 'reserved'; label = '예약 확정'; isCharged = false; }
    
    // 개인/그룹 구분 (participant 자체의 classType 우선, 없으면 수강권 카테고리에서)
    let classType = part.classType || null;
    if (!classType && part.passId) {
      const pass = (rawMember.passes || []).find(p => p.id === part.passId);
      if (pass?.category === 'private') classType = '개인';
      else if (pass?.category === 'group') classType = '그룹';
    }
    
    // 회차 계산 — 차감된 경우 + 그 날짜가 패스 sessionDates에 있을 때만
    let num = null, total = null;
    if (isCharged && part.passId && passDateToNum[part.passId]) {
      const pinfo = passDateToNum[part.passId];
      num = pinfo.map[s.date] || null; // sessionDates에 있으면 그 순번, 없으면 null
      total = pinfo.total;
    }
    
    history.push({
      date: s.date,
      time: s.time,
      status, label,
      num,
      total: num != null ? total : null,
      classType: classType || '그룹',
      passId: part.passId || null, // 수강권 그룹핑용
    });
  });
  history.sort((a, b) => b.date.localeCompare(a.date));
  
  // 고정 슬롯 → 텍스트
  const dowMap = ['일', '월', '화', '수', '목', '금', '토'];
  const fixedSlotText = (rawMember.fixedSlots || []).length > 0
    ? rawMember.fixedSlots.map(fs => `${dowMap[fs.dow]} ${fs.time}`).join(' / ')
    : '';
  
  // 추천 자세 (POSE_LIBRARY 기반 - 회원 이름 + 시간대 + 특화/제외)
  const recommendation = getDailyRecommendation(rawMember.name || '');
  
  return {
    id: rawMember.id,
    name: rawMember.name || '회원',
    phone: maskPhone(rawMember.phone),
    initial: (rawMember.name || '회').slice(-1),
    since: rawMember.createdAt || '',
    pass: {
      type: activePass?.type || '활성 수강권 없음',
      used: activePass 
        ? (activePass.sessionDates || []).filter(d => d <= todayStr).length
        : 0,
      total: activePass?.totalSessions || 0,
      paymentDate: activePass?.paymentDate || '',
      startDate: activePass?.startDate || '',
      expiryDate: activePass?.expiryDate || '',
      canHold: activePass?.canHold || false,
      holdUsed: activePass?.holdUsed || false,
      fixedSlot: fixedSlotText || '-',
      rhythm: rhythmStatus(activePass, closedDays) || { status: 'none', bonus: 0 },
    },
    recommendation,
    nextClass: nextSession ? (() => {
      const formatted = formatNextClass(nextSession, today);
      const sckey = `${nextSession.date}_${nextSession.time}`;
      // 인원수 계산 — 예약 화면(generateSchedule)과 동일 로직 사용
      // 1순위: sessions에 강사가 만든 일정이 있으면 participants 직접 카운트 (cancelled 제외)
      //        → reserved 포함해서 정확하게 셈
      // 2순위: sessions 없으면 RPC slotCounts 값 사용
      const sess = (allSessions || {})[sckey];
      const realParticipants = (sess?.participants || []).filter(p =>
        !p.cancelled && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'cancelled_by_teacher'
      );
      let count = null;
      if (realParticipants.length > 0) {
        count = realParticipants.length; // 강사 확정 일정 — 직접 카운트
      } else if (typeof slotCounts[sckey] === 'number' && slotCounts[sckey] > 0) {
        count = slotCounts[sckey]; // sessions 없음 — RPC 값
      }
      if (count != null) {
        const isPrivate = formatted.type === '개인레슨';
        formatted.status = isPrivate ? '개인 수업' : `현재 참여자 ${count}명 / 정원 5명`;
      }
      return formatted;
    })() : {
      date: '', month: '-', day: '-', weekday: '-',
      time: '예정된 수업 없음', type: '-', status: '-', dday: '-',
    },
    history: history.slice(0, 200),
    passes: rawMember.passes || [],
    assessment: rawMember.assessment || rawMember.analysis || null,
    notifications: [], // localStorage에서 따로 관리
  };
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = normalizePhone(phone);
  if (digits.length < 4) return phone;
  return `010-****-${digits.slice(-4)}`;
}

function formatNextClass(s, today) {
  const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const weekdays = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const d = new Date(s.date);
  // 자정 기준으로 날짜 차이 계산 (시각 무관하게)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayDiff = Math.round((d - todayMidnight) / (1000*60*60*24));
  let dday = `D-${dayDiff}`;
  if (dayDiff === 0) dday = '오늘';
  else if (dayDiff === 1) dday = '내일';
  
  const part = s._part || {};
  const isPrivate = part.classType === '개인' || s.classType === '개인';
  const total = (s.participants || []).filter(p => 
    !p.cancelled 
    && p.status !== 'cancelled_advance' 
    && p.status !== 'cancelled_sameday'
  ).length;
  
  // 시간 표시: 24시간 그대로 (예: 19:20)
  const timeText = s.time || '';
  
  return {
    date: s.date,
    month: monthNames[d.getMonth()],
    day: String(d.getDate()),
    weekday: weekdays[d.getDay()],
    time: timeText,
    type: isPrivate ? '개인레슨' : '소그룹',
    status: isPrivate ? '개인 수업' : `현재 참여자 ${total}명 / 정원 5명`,
    dday,
  };
}

/* =========================================================
   Theme
   ========================================================= */
const theme = {
  bg: '#F5F2EC',
  card: '#FFFFFF',
  cardAlt: '#EDE9DF',
  cardDark: '#2D2A26',
  ink: '#2D2A26',
  inkSoft: '#5A554D',
  inkMute: '#9A958C',
  line: '#E5E0D5',
  terra: '#C26B4A',
  terraSoft: '#F3DCD0',
  accent: '#4A6B5C',
  accentSoft: '#DCE4DA',
  gold: '#C9A961',
  goldBg: '#F5EBC8',
  serif: '"Cormorant Garamond", serif',
  sans: '"Noto Sans KR", sans-serif',
};

/* =========================================================
   POSE LIBRARY (오늘의 추천 자세)
   이미지: Supabase Storage poses 버킷
   ========================================================= */
const POSE_IMG_BASE = 'https://vcemcdzilelnoebupxyp.supabase.co/storage/v1/object/public/poses';

const POSE_LIBRARY = {
  P01: { id: 'P01', nameKo: '누운 나비자세', nameSans: 'Supta Baddha Konasana', nameKoTrans: '숩따 받다 코나아사나', category: '골반·이완', level: '초급', short: '발바닥을 마주 붙이고 골반 앞쪽을 부드럽게 열어주는 회복 자세.', tags: ['골반', '이완', '초급', '회복'], desc: '바닥에 누워서 무릎을 세웠다가, 발바닥끼리 마주 붙이고 무릎을 양옆으로 천천히 떨어뜨립니다. 손은 배 위나 양옆 바닥에 편안히 두세요. 호흡을 깊게 들이마시며 골반 앞쪽이 부드럽게 열리는 감각을 느껴봅니다.', caution: '무릎이 너무 안 떨어지거나 당기는 느낌이 강하면 무릎 아래에 쿠션이나 베개를 받쳐주세요. 허리가 뜨면 꼬리뼈를 살짝 내리는 감각으로.' },
  P02: { id: 'P02', nameKo: '고양이-소 자세', nameSans: 'Marjaryasana–Bitilasana', nameKoTrans: '마르자리아사나-비틸라아사나', category: '척추', level: '초급', short: '네발기기로 척추를 부드럽게 풀어주는 기초 자세.', tags: ['척추', '초급', '워밍업', '아침'], desc: '네발기기 자세로 시작합니다. 손은 어깨 바로 아래, 무릎은 골반 바로 아래에 정확히 두세요. 숨 마시며 꼬리뼈를 위로 올리고 가슴을 앞으로 열며 등을 살짝 내려요(소). 숨 내쉬며 배꼽을 등 쪽으로 끌어당기듯 등을 둥글게 말아 올려요(고양이).', caution: '손목이 무리되면 주먹을 쥐고 너클로 받치거나, 팔뚝을 바닥에 대고 진행해도 됩니다. 무릎이 아프면 무릎 아래에 수건을 깔아주세요.' },
  P03: { id: 'P03', nameKo: '다리 벽에 올리기', nameSans: 'Viparita Karani', nameKoTrans: '비파리타 카라니', category: '회복·이완', level: '초급', short: '다리를 벽에 올려 회복하는 깊은 이완 자세.', tags: ['회복', '이완', '저녁', '초급'], desc: '벽 옆에 옆으로 누워서 엉덩이를 벽에 최대한 가깝게 붙입니다. 그 상태에서 몸을 돌려 등을 바닥에 대고 두 다리를 벽에 올려 기대요. 팔은 양옆에 편안히 두고 손바닥은 천장 방향으로. 눈을 감고 호흡에 집중합니다.', caution: '허리가 뜨거나 불편하면 엉덩이 아래에 얇은 쿠션을 받쳐주세요. 일어날 때는 무릎을 굽혀 옆으로 굴러서 천천히 일어나야 어지럽지 않아요.' },
  P04: { id: 'P04', nameKo: '누워서 무릎 좌우 떨구기', nameSans: 'Jathara Parivartanasana', nameKoTrans: '자타라 파리바르타나아사나', category: '트위스트', level: '초급', short: '척추를 부드럽게 비틀어 허리 긴장을 푸는 자세.', tags: ['트위스트', '허리', '초급', '저녁'], desc: '바닥에 누워서 양 무릎을 세우고, 양팔은 어깨 높이에서 T자로 벌립니다. 두 무릎을 모은 상태로 한쪽 옆으로 천천히 떨어뜨려요. 이때 반대쪽 어깨는 바닥에서 떨어지지 않게 붙여둡니다. 시선은 무릎 반대 방향으로.', caution: '무릎이 바닥까지 안 닿아도 괜찮아요. 허리가 아프면 무릎 사이에 쿠션을 끼워주세요. 어깨가 들뜨면 비틀기 강도를 줄이세요.' },
  P05: { id: 'P05', nameKo: '장작자세', nameSans: 'Agnistambhasana', nameKoTrans: '아그니스탐바아사나', category: '고관절', level: '중급', short: '정강이를 포개 고관절 외회전을 깊게 여는 자세.', tags: ['고관절', '중급', '앉기'], desc: '바닥에 앉아서 한쪽 정강이를 바닥과 평행하게 앞에 둡니다. 그 위에 반대쪽 정강이를 그대로 포개서 양 정강이가 장작 쌓듯 위아래로 일직선이 되게 정렬해요. 양쪽 발목과 무릎이 정확히 맞닿게.', caution: '정강이가 안 포개지면 무릎과 발목 사이에 쿠션을 받쳐주세요. 발목에 무게가 실리지 않게 가볍게 얹기만. 통증 있으면 즉시 풀고 일반 책상다리로 대체하세요.' },
  P06: { id: 'P06', nameKo: '코브라 자세', nameSans: 'Bhujangasana', nameKoTrans: '부장가아사나', category: '후굴', level: '초급', short: '흉추 신전과 가슴 열기로 라운드숄더 완화. 아침 5분이면 충분해요.', tags: ['목·어깨', '흉추 신전', '초급', '아침 5분'], desc: '엎드린 자세에서 양손을 가슴 옆 바닥에 두고 팔꿈치를 갈비뼈 옆에 붙입니다. 숨 마시며 가슴을 바닥에서 살짝 들어올려요. 어깨를 귀에서 멀리 떨어뜨리고 팔꿈치는 살짝 굽힌 상태 유지. 시선은 정면 약간 위쪽.', caution: '허리에 무리한 힘을 싣지 말고 등 윗부분(가슴)부터 들어올리세요. 목이 꺾이지 않게 턱을 살짝 당기고, 어깨가 들리면 다시 내려서 견갑을 등 가운데로 모아주세요.' },
  P07: { id: 'P07', nameKo: '독수리 팔 자세', nameSans: 'Garudasana', nameKoTrans: '가루다아사나', category: '어깨', level: '초급', short: '팔을 교차해 견갑 사이를 시원하게 늘리는 자세.', tags: ['어깨', '견갑', '초급'], desc: '바르게 앉거나 선 상태에서 양팔을 앞으로 뻗은 다음, 오른팔을 왼팔 위로 교차시키고 팔꿈치를 직각으로 굽혀요. 손등이 마주보거나 가능하면 손바닥끼리 합장하듯 만나게. 팔꿈치를 어깨 높이까지 천천히 들어올려 견갑 사이가 늘어나는 감각을 느낍니다.', caution: '손바닥이 안 닿으면 손등이 마주보는 정도로만. 어깨가 귀쪽으로 솟지 않게 견갑을 끌어내리고, 호흡이 얕아지지 않게 천천히 마시고 내쉬세요.' },
  P08: { id: 'P08', nameKo: '의자에 앉아 척추 비틀기', nameSans: 'Bharadvajasana', nameKoTrans: '바라드바자아사나', category: '트위스트', level: '초급', short: '의자 등받이를 잡고 부드럽게 비트는 자세.', tags: ['트위스트', '척추', '초급', '점심'], desc: '의자에 옆으로 비스듬히 앉아 두 발을 바닥에 평행하게 둡니다. 숨 마시며 정수리 방향으로 척추를 길게 늘이고, 내쉬며 의자 등받이 쪽으로 상체를 천천히 비틀어요. 양손으로 등받이를 잡아 비틀기를 부드럽게 깊게 만듭니다.', caution: '허리부터 꺾지 말고 배꼽 → 가슴 → 어깨 → 시선 순서로 따라가세요. 어깨가 솟지 않게 끌어내리고, 비틀 때 호흡을 멈추지 마세요.' },
  P09: { id: 'P09', nameKo: '아기 자세', nameSans: 'Balasana', nameKoTrans: '발라아사나', category: '이완', level: '초급', short: '무릎 꿇고 이마를 바닥에 내려놓는 깊은 회복 자세.', tags: ['이완', '회복', '초급'], desc: '무릎을 매트 너비로 벌리고 엄지발가락은 마주 붙인 채 무릎 꿇고 앉아요. 엉덩이를 발뒤꿈치 위에 얹고 상체를 천천히 앞으로 숙여 이마를 바닥에 내려놓습니다. 양팔은 앞으로 길게 뻗거나 몸 옆에 편안히 두세요.', caution: '이마가 바닥에 안 닿으면 주먹을 포개 그 위에 이마를 얹거나 쿠션을 받치세요. 무릎이 불편하면 무릎 사이를 더 넓게 벌려 골반이 편안한 위치를 찾으세요.' },
  P10: { id: 'P10', nameKo: '소얼굴 팔 자세', nameSans: 'Gomukhasana', nameKoTrans: '고무카아사나', category: '어깨', level: '중급', short: '등 뒤에서 양손을 잡아 어깨를 깊게 여는 자세.', tags: ['어깨', '중급', '가슴 열기'], desc: '바르게 앉아서 오른팔을 위로 들어 팔꿈치를 굽혀 손이 등 뒤 어깨뼈 사이로 내려오게 합니다. 왼팔은 아래에서 등 뒤로 돌려 손등을 등에 붙이고 위로 올려 두 손이 등 뒤에서 만나게 해요. 가능하면 깍지를 끼고, 안 되면 수건 양쪽 끝을 잡습니다.', caution: '손이 안 닿아도 절대 무리하지 말고 수건을 활용하세요. 위에 있는 팔의 팔꿈치가 정수리 옆에 오게 하고, 어깨가 솟지 않게 끌어내리세요.' },
  P11: { id: 'P11', nameKo: '브릿지 자세', nameSans: 'Setu Bandha Sarvangasana', nameKoTrans: '세투 반다 사르반가아사나', category: '후면강화', level: '초급', short: '엉덩이 근육과 햄스트링을 깨우는 후면 강화 자세.', tags: ['후면강화', '코어', '초급'], desc: '바닥에 누워서 무릎을 세우고 발은 골반 너비, 발뒤꿈치는 손끝이 닿을 만한 거리에 둡니다. 숨 마시며 발바닥으로 바닥을 밀어내듯 골반을 천장 방향으로 들어올려요. 어깨와 팔뚝으로 바닥을 받치고 손깍지를 등 아래에서 끼워 가슴을 더 열어줍니다.', caution: '허리로 들어올리지 말고 엉덩이 근육과 햄스트링을 써서 골반부터 들어올리세요. 목을 좌우로 돌리지 말고, 시선은 천장 또는 코끝 방향에 고정.' },
  P12: { id: 'P12', nameKo: '메뚜기 자세', nameSans: 'Salabhasana', nameKoTrans: '살라바아사나', category: '후면강화', level: '중급', short: '엎드려 팔다리를 들어 후면 전체를 활성화하는 자세.', tags: ['후면강화', '중급'], desc: '바닥에 엎드린 채 양팔을 몸 옆에 두고 손바닥은 위 또는 아래로. 숨 마시며 가슴, 양팔, 양다리를 동시에 바닥에서 들어올려요. 다리는 곧게 펴고 엉덩이를 조여 다리 뒷면이 바짝 활성화되는 감각을 느낍니다.', caution: '높이 들어올리는 게 목적이 아니라 후면 근육을 깨우는 게 목적이에요. 양다리가 벌어지지 않게 모은 채 들고, 호흡을 멈추지 마세요.' },
  P13: { id: 'P13', nameKo: '누워서 한 다리 햄스트링 스트레칭', nameSans: 'Supta Padangusthasana', nameKoTrans: '숩따 파당구쉬타아사나', category: '햄스트링', level: '초급', short: '누운 채로 다리 뒷면을 천천히 늘리는 자세.', tags: ['햄스트링', '하체', '초급'], desc: '바닥에 누워서 한쪽 다리는 곧게 바닥에 두고, 반대쪽 다리를 천장 방향으로 들어올립니다. 양손으로 종아리나 허벅지 뒤를 잡거나, 발에 수건을 걸어 양 끝을 잡아요. 다리는 무릎을 살짝 굽혀도 좋으니 다리 뒷면이 길어지는 감각을 천천히 느낍니다.', caution: '햄스트링이 타이트한 경우, 무릎을 충분히 굽힌 채로 시작하세요. 엉덩이가 바닥에서 뜨지 않게, 어깨와 목에 힘을 빼고 호흡으로 다리 뒷면을 풀어주세요.' },
  P14: { id: 'P14', nameKo: '다운독 (견상 자세)', nameSans: 'Adho Mukha Svanasana', nameKoTrans: '아도 무카 슈바나아사나', category: '전신', level: '중급', short: '몸을 ㅅ자로 만드는 전신 활성 자세.', tags: ['전신', '중급', '시퀀스'], desc: '네발기기 자세에서 손은 어깨 아래, 무릎은 골반 아래에 둔 다음, 발끝으로 바닥을 밀며 엉덩이를 천장 방향으로 끌어올려요. 몸이 ㅅ 모양이 되게. 손바닥으로 바닥을 밀어내며 등을 길게 펴고, 무릎은 살짝 굽혀도 좋으니 척추를 길게 만드는 게 우선.', caution: '햄스트링이 짧은 경우, 무릎을 굽힌 채로 시작해 등을 먼저 펴세요. 어깨가 귀에 붙지 않게 견갑을 등 뒤로 끌어내리고, 손목이 부담되면 손가락을 활짝 펴 무게를 분산.' },
  P15: { id: 'P15', nameKo: '등 뒤 깍지 가슴 열기', nameSans: '', nameKoTrans: '', category: '가슴·어깨', level: '초급', short: '등 뒤에서 손깍지를 끼워 가슴을 활짝 여는 자세.', tags: ['가슴', '어깨', '초급'], desc: '바르게 서거나 앉은 상태에서 양팔을 등 뒤로 보내 손깍지를 끼웁니다. 깍지 낀 손을 엉덩이에서 멀리, 아래쪽으로 길게 뻗어 내리고 동시에 견갑을 등 가운데로 모으면서 끌어내려요. 가슴이 천장 방향으로 활짝 열리는 감각.', caution: '손깍지가 안 끼워지면 수건 양쪽 끝을 잡고 거리 조절하세요. 어깨가 귀쪽으로 솟지 않게 끌어내리고, 허리를 꺾지 않게 갈비뼈를 살짝 안으로 모으세요.' },
  P16: { id: 'P16', nameKo: '무릎 안고 누운 자세', nameSans: 'Apanasana', nameKoTrans: '아파나아사나', category: '허리이완', level: '초급', short: '무릎을 가슴쪽으로 끌어당겨 허리를 부드럽게 푸는 자세.', tags: ['허리', '이완', '초급'], desc: '바닥에 누워서 양 무릎을 굽혀 가슴 쪽으로 끌어당기고, 양손으로 무릎을 감싸 안아요. 숨 마시며 무릎과 손 사이에 살짝 거리를 두고, 내쉬며 무릎을 가슴 쪽으로 부드럽게 당겨옵니다. 호흡 따라 천천히 반복.', caution: '무릎이 가슴까지 안 와도 괜찮으니 손이 닿는 만큼만 잡으세요. 무릎이 묵직한 날은 허벅지 뒤를 잡아당기는 방식으로 바꾸세요.' },
  P17: { id: 'P17', nameKo: '누워서 척추 비틀기', nameSans: 'Supta Matsyendrasana', nameKoTrans: '숩따 마첸드라아사나', category: '트위스트', level: '초급', short: '누운 채로 척추를 깊게 비틀어 허리 긴장을 푸는 자세.', tags: ['트위스트', '허리', '초급'], desc: '바닥에 누워서 양팔을 어깨 높이에서 T자로 벌립니다. 오른 무릎을 굽혀 가슴 쪽으로 가져온 다음, 왼손으로 오른 무릎을 잡고 천천히 왼쪽 바닥 방향으로 떨어뜨려요. 시선은 오른쪽 손끝 방향. 오른쪽 어깨는 바닥에서 떨어지지 않게 붙여둡니다.', caution: '무릎이 바닥까지 안 닿아도 괜찮아요. 허리나 무릎이 묵직한 날은 무릎 아래에 쿠션을 받쳐주세요. 비틀기는 천천히, 호흡 따라 부드럽게.' },
  P18: { id: 'P18', nameKo: '앉아서 전굴', nameSans: 'Paschimottanasana', nameKoTrans: '파스치모타나아사나', category: '후면', level: '초급', short: '앉아서 상체를 다리 위로 숙이는 후면 늘리기.', tags: ['후면', '햄스트링', '초급'], desc: '다리를 앞으로 뻗고 앉아 무릎을 살짝 굽혀줍니다. 숨 마시며 척추를 길게 늘이고, 내쉬며 골반부터 접듯이 상체를 천천히 다리 위로 숙여요. 손은 정강이나 발목, 또는 닿는 곳에 편안히. 등이 둥글게 말려도 좋으니 머리와 목에 힘을 빼고 호흡으로 후면을 늘려줍니다.', caution: '허리가 묵직한 날은 무릎을 더 굽히고 엉덩이 아래에 쿠션을 받쳐 골반을 들어주세요. 억지로 더 숙이지 말고 호흡 따라 자연스럽게 깊어지게.' },
  P19: { id: 'P19', nameKo: '영웅 자세', nameSans: 'Virasana', nameKoTrans: '비라아사나', category: '앉기', level: '초급', short: '무릎 꿇고 발 사이에 앉아 척추를 길게 세우는 자세.', tags: ['앉기', '초급', '명상'], desc: '무릎을 모으고 발은 엉덩이 너비보다 살짝 넓게 벌려 발등을 바닥에 붙입니다. 엉덩이를 두 발 사이 바닥에 천천히 내려놓아요. 손은 허벅지 위에 편안히. 척추를 길게 세우고 가슴을 열어 호흡합니다.', caution: '무릎이 묵직하거나 엉덩이가 바닥에 안 닿으면 엉덩이 아래에 쿠션이나 블록을 받치세요. 무릎에 통증이 오면 즉시 풀고 책상다리로 바꾸세요.' },
  P20: { id: 'P20', nameKo: '송장 자세', nameSans: 'Savasana', nameKoTrans: '사바아사나', category: '휴식', level: '초급', short: '누워서 온몸의 긴장을 완전히 내려놓는 마무리 자세.', tags: ['휴식', '회복', '초급', '저녁'], desc: '바닥에 누워서 두 다리를 매트보다 살짝 넓게 벌리고 발끝은 자연스럽게 바깥으로 떨어뜨려요. 양팔은 몸에서 한 뼘 정도 떨어뜨려 손바닥은 천장을 향하게. 어깨를 한 번 들썩했다가 내려놓고, 턱을 살짝 당겨 목 뒤를 길게 만듭니다. 눈을 감고 자연스러운 호흡 그대로 둡니다.', caution: '허리가 불편하면 무릎 아래에 쿠션이나 베개를 받쳐주세요. 호흡을 일부러 깊게 하려 하지 말고 그냥 들어오고 나가는 호흡을 관찰하기만 하세요.' },
  P21: { id: 'P21', nameKo: '역 테이블 자세', nameSans: 'Ardha Purvottanasana', nameKoTrans: '아르다 푸르보타나아사나', category: '후면강화', level: '중급', short: '엉덩이를 들어 가슴을 여는 후면 강화 자세.', tags: ['후면강화', '가슴 열기', '중급'], desc: '다리를 앞으로 뻗고 앉은 다음 무릎을 굽혀 발바닥을 바닥에 어깨 너비로 둡니다. 양손은 엉덩이 뒤쪽 바닥에 어깨 너비로 짚고 손가락은 발 방향으로. 숨 마시며 엉덩이를 천장 방향으로 들어올려 무릎-골반-어깨가 일직선이 되는 테이블 모양을 만들어요.', caution: '손목이 부담되면 손가락을 활짝 펴고 무게를 손바닥 전체로 분산하세요. 엉덩이가 처지지 않게 둔근으로 끌어올리고, 목이 뒤로 꺾이지 않게 턱을 살짝 당기세요.' },
  P22: { id: 'P22', nameKo: '슈퍼맨 변형', nameSans: 'Viparita Shalabhasana', nameKoTrans: '비파리타 샬라바아사나', category: '후면강화', level: '중급', short: '엎드려 한 팔과 반대 다리를 들어 후면을 깨우는 자세.', tags: ['후면강화', '코어', '중급'], desc: '바닥에 엎드려서 양팔은 머리 위로 길게 뻗고 다리는 곧게 펴 모아둡니다. 숨 마시며 오른팔과 왼다리를 동시에 바닥에서 들어올려요. 손끝과 발끝이 서로 반대 방향으로 멀어지는 감각으로 길게 뻗어내요. 잠시 머문 뒤 천천히 내려놓고 반대쪽도.', caution: '높이가 아니라 길이가 핵심. 어깨가 솟지 않게 견갑을 끌어내리고, 골반이 좌우로 흔들리지 않게 코어를 잡아주세요.' },
  P23: { id: 'P23', nameKo: '돌핀 자세', nameSans: 'Ardha Pincha Mayurasana', nameKoTrans: '아르다 핀차 마유라아사나', category: '어깨·코어', level: '중급', short: '팔뚝으로 ㅅ자를 만들어 어깨를 강하게 활성화하는 자세.', tags: ['어깨', '코어', '중급'], desc: '네발기기 자세에서 팔뚝을 바닥에 내려놓아요. 팔꿈치는 어깨 아래, 손바닥은 어깨 너비로 펴두거나 깍지를 끼워도 좋아요. 발끝으로 바닥을 밀며 엉덩이를 천장 방향으로 끌어올려 다운독과 비슷한 ㅅ 모양을 만듭니다.', caution: '머리서기 준비에 가장 좋은 자세예요. 어깨가 무너지지 않게 팔꿈치로 바닥을 강하게 밀고, 발뒤꿈치가 안 닿으면 무릎 살짝 굽혀도 됩니다.' },
  P24: { id: 'P24', nameKo: '어깨서기', nameSans: 'Salamba Sarvangasana', nameKoTrans: '살람바 사르반가아사나', category: '역자세', level: '고급', short: '다리를 천장으로 올린 깊은 역자세.', tags: ['역자세', '고급'], desc: '바닥에 누워서 다리를 천장 방향으로 들어올린 다음, 손으로 등을 받치며 골반과 다리를 위로 끌어올려요. 팔꿈치는 어깨 너비로 바닥에 단단히 받치고, 가슴은 턱 쪽으로 가까워지게. 다리는 곧게 펴 천장을 향하고 시선은 발끝 또는 천장.', caution: '머리서기 가기 전에 어깨와 코어를 안정시키는 좋은 준비 자세예요. 목을 좌우로 절대 돌리지 말고, 무리하면 한 다리씩 올려도 좋아요. 시작 전 어깨 아래에 담요를 깔아 목을 보호하세요.' },
  P25: { id: 'P25', nameKo: '보트 자세', nameSans: 'Navasana', nameKoTrans: '나바아사나', category: '코어', level: '중급', short: '몸을 V자로 만들어 코어를 활성화하는 자세.', tags: ['코어', '중급', '오후'], desc: '바닥에 앉아 무릎을 굽히고 발을 바닥에 둡니다. 상체를 약간 뒤로 기울이며 발을 바닥에서 들어올려 정강이가 바닥과 평행하게 만들어요. 가능하면 다리를 곧게 펴 몸이 V 모양이 되게. 양팔은 바닥과 평행하게 앞으로 뻗고 가슴은 활짝 열어요.', caution: '다리를 펴기 어려우면 무릎 굽힌 채로 유지해도 충분해요. 등이 둥글게 말리지 않게 가슴을 들어올리고, 호흡을 멈추지 마세요.' },
  P26: { id: 'P26', nameKo: '여신 자세', nameSans: 'Utthita Utkata Konasana', nameKoTrans: '웃티타 웃카타 코나아사나', category: '하체', level: '초급', short: '다리를 넓게 벌리고 무릎을 굽혀 하체를 활성화.', tags: ['하체', '초급'], desc: '다리를 어깨 두 배 너비로 벌리고 발끝을 바깥쪽 45도로 살짝 돌립니다. 무릎을 발끝과 같은 방향으로 살짝만 굽혀 엉덩이를 의자에 살짝 걸터앉듯 내려요. 처음엔 깊게 앉지 말고 1/3 정도만. 양손은 가슴 앞에 합장하거나 허벅지 위에 편안히 얹어요.', caution: '무릎이 발끝보다 앞으로 나가지 않게, 그리고 안쪽으로 무너지지 않게 발끝과 같은 방향으로 두세요. 힘들면 더 얕게 앉고 머무는 시간을 짧게(10~15초) 잡으세요.' },
  P27: { id: 'P27', nameKo: '의자 자세 (벽 기댄 변형)', nameSans: 'Utkatasana', nameKoTrans: '웃카타아사나', category: '하체', level: '초급', short: '벽에 등을 대고 무릎을 굽혀 하체 힘을 기르는 자세.', tags: ['하체', '초급'], desc: '벽에 등을 대고 발을 벽에서 30~40cm 정도 앞으로 둬요. 등을 벽에 붙인 채 무릎을 천천히 굽혀 허벅지가 바닥과 평행해지기 직전까지(편한 만큼만) 내려갑니다. 무릎은 발목 위에 수직, 발끝과 같은 방향. 양손은 허벅지 위에 얹거나 앞으로 뻗어요.', caution: '끝까지 안 내려가도 됩니다. 무릎이 아프면 더 높은 위치에서 멈추세요. 벽이 받쳐주니 균형 부담 없이 코어와 다리 힘을 길러볼 수 있어요.' },
  P28: { id: 'P28', nameKo: '버드독', nameSans: 'Chakravakasana', nameKoTrans: '차크라바카아사나', category: '코어', level: '초급', short: '네발기기에서 한팔 한다리를 뻗어 코어를 잡는 자세.', tags: ['코어', '초급', '오후'], desc: '네발기기 자세에서 손은 어깨 바로 아래, 무릎은 골반 바로 아래에 둡니다. 숨 마시며 오른팔을 앞으로, 왼다리를 뒤로 동시에 길게 뻗어요. 손끝과 발끝이 서로 반대 방향으로 멀어지는 감각. 골반과 어깨가 바닥과 평행하게 유지되는 게 핵심.', caution: '높이 들어올리는 게 아니라 길게 뻗는 게 중요해요. 골반이 좌우로 흔들리지 않게 코어를 잡고, 허리가 꺾이지 않게 배꼽을 살짝 끌어당겨주세요.' },
  P29: { id: 'P29', nameKo: '한 다리 플랭크 (무릎 대고)', nameSans: 'Eka Pada Phalakasana', nameKoTrans: '에카 파다 팔라카아사나', category: '코어', level: '중급', short: '한쪽 무릎을 바닥에 대고 코어와 후면을 활성화.', tags: ['코어', '중급'], desc: '네발기기 자세에서 양손은 어깨 바로 아래에 두고, 한쪽 무릎은 바닥에 댄 채로 반대쪽 다리만 뒤로 길게 뻗어 발끝으로 바닥을 누릅니다. 머리부터 뻗은 발까지 사선으로 일직선이 되게 만들어요. 배꼽을 척추 쪽으로 끌어당겨 코어를 잡고 어깨는 귀에서 멀리.', caution: '엉덩이가 처지거나 솟지 않게 사선 일직선 유지가 핵심. 손목이 부담되면 팔꿈치를 바닥에 대는 변형으로 바꾸세요. 호흡 멈추지 말고 짧게 여러 번 나눠서.' },
  P30: { id: 'P30', nameKo: '행복한 아기 자세', nameSans: 'Ananda Balasana', nameKoTrans: '아난다 발라아사나', category: '골반이완', level: '초급', short: '누워서 발을 잡고 골반을 부드럽게 푸는 자세.', tags: ['골반', '이완', '초급', '저녁'], desc: '바닥에 누워서 무릎을 굽혀 가슴 양옆으로 가져옵니다. 양손으로 발 바깥쪽 또는 발등을 잡고, 무릎을 겨드랑이 쪽으로 천천히 끌어내려요. 발바닥은 천장을 향하고, 정강이는 바닥과 수직. 등 아래(허리)가 바닥에 편하게 닿는 감각으로.', caution: '손이 발에 안 닿으면 허벅지 뒤나 종아리를 잡으세요. 어깨와 머리가 바닥에서 뜨지 않게 편안히 두고, 호흡을 멈추지 마세요.' },
  P31: { id: 'P31', nameKo: '전사 자세 3 (의자 보조)', nameSans: 'Virabhadrasana III', nameKoTrans: '비라바드라아사나', category: '균형', level: '중급', short: '의자나 벽을 잡고 T자 균형을 잡는 자세.', tags: ['균형', '하체', '중급'], desc: '벽이나 의자 등받이를 양손으로 짚고 1m 정도 떨어져 섭니다. 한쪽 다리에 체중을 싣고 반대쪽 다리를 뒤로 천천히 들어올려 다리부터 머리까지 T자 모양이 되게 만들어요. 들어올린 다리는 발끝을 바닥 방향으로, 골반은 정면을 향하게 평행 유지. 가슴을 앞으로 길게 뻗어내요.', caution: '허리가 꺾이지 않게 배꼽을 척추 쪽으로 끌어당기세요. 처음엔 다리를 높이 안 들어도 됩니다. 균형 잡기 어려우면 의자나 벽에 손 짚은 채로 충분히 머무세요.' },
  P32: { id: 'P32', nameKo: '한 다리 들어 잡기', nameSans: 'Utthita Hasta Padangusthasana', nameKoTrans: '웃티타 하스타 파당구쉬타아사나', category: '균형', level: '초급', short: '서서 한 다리를 가슴쪽으로 끌어올려 균형 잡기.', tags: ['균형', '초급'], desc: '바르게 서서 한쪽 다리에 체중을 싣고, 반대쪽 무릎을 가슴 쪽으로 들어올려요. 양손으로 무릎을 감싸 안고 5초 정도 머문 뒤, 가능하면 손을 종아리나 발쪽으로 옮겨 다리를 앞으로 뻗어봅니다. 척추는 곧게 세우고 시선은 정면.', caution: '다리를 펴기 어려우면 무릎 잡은 상태로 끝내도 충분해요. 허리가 둥글게 말리지 않게 가슴을 들어올린 채로 유지하고, 균형 어려우면 벽 옆에 서서 한 손으로 짚으세요.' },
  P33: { id: 'P33', nameKo: '바르게 앉아 한 다리 들어올리기', nameSans: 'Dandasana', nameKoTrans: '단다아사나', category: '코어·하체', level: '초급', short: '앉아서 다리를 11자로 모으고 한 다리씩 들어올리는 자세.', tags: ['코어', '하체', '초급'], desc: '바닥에 다리를 앞으로 뻗고 바르게 앉아요. 양 무릎을 살짝 굽힌 상태에서 발끝이 양옆으로 벌어지지 않게 11자로 모아 둡니다. 양손은 엉덩이 옆 바닥에 가볍게 짚고 척추를 길게 세워요. 발볼 안쪽을 앞으로 밀어내듯 힘을 주고, 발가락은 천장을 향하도록 당기는 감각으로. 그 상태에서 한쪽 다리를 천천히 바닥에서 들어올렸다가 내리고, 반대쪽도 번갈아.', caution: '다리를 높이 들어올리는 게 아니라 발볼 미는 힘과 다리 앞쪽(허벅지 앞·엉덩이) 근육을 깨우는 게 핵심이에요. 발이 바깥으로 벌어지지 않게 11자 유지, 허리가 둥글게 말리지 않게 정수리를 위로 길게 끌어올려요.' },
  P34: { id: 'P34', nameKo: '누워서 다리 원 그리기', nameSans: 'Supta Pada Chakra', nameKoTrans: '숩따 파다 차크라', category: '고관절', level: '초급', short: '누워서 다리로 원을 그려 고관절을 부드럽게 푸는 자세.', tags: ['고관절', '초급'], desc: '바닥에 누워서 시작합니다. 한쪽 다리를 곧게 펴 천장으로 들어 큰 원 그리기. 5회 시계방향 → 5회 반시계방향. 고관절을 중심으로 다리가 부드럽게 회전하는 감각.', caution: '원을 크게 그리는 게 아니라 고관절이 부드럽게 회전하는 감각이 핵심. 골반이 좌우로 흔들리지 않게 두 손으로 골반을 살짝 잡아 고정해도 좋아요.' },
  P35: { id: 'P35', nameKo: '비둘기 자세', nameSans: 'Eka Pada Rajakapotasana', nameKoTrans: '에카 파다 라자카포타아사나', category: '고관절', level: '중급', short: '앞 무릎을 굽히고 상체를 숙여 엉덩이를 깊게 늘리는 자세.', tags: ['고관절', '중급'], desc: '네발기기 자세에서 오른 무릎을 양손 사이로 가져와 매트 앞쪽에 내려놓고, 오른 정강이를 가능한 만큼 매트와 평행하게 둡니다. 왼 다리는 뒤로 길게 뻗어 발등을 바닥에 내려놓아요. 양손은 오른 무릎 양옆 바닥에 짚고, 숨 마시며 척추를 길게 늘이고, 내쉬며 상체를 천천히 앞으로 숙여 정강이 위에 가슴을 얹듯 내려갑니다.', caution: '오른쪽 엉덩이가 바닥에서 뜨면 엉덩이 아래에 쿠션이나 블록을 받쳐 골반 좌우 균형 맞추세요. 앞 무릎이 아프면 정강이를 매트와 평행보다 살짝 안쪽으로 가져오세요.' },
  P36: { id: 'P36', nameKo: '무릎 안고 좌우 흔들기', nameSans: 'Apanasana', nameKoTrans: '아파나아사나', category: '허리이완', level: '초급', short: '무릎을 안고 좌우로 흔들어 허리를 마사지하듯 푸는 자세.', tags: ['허리', '이완', '초급', '저녁'], desc: '바닥에 누워서 양 무릎을 굽혀 가슴 쪽으로 끌어당기고, 양손으로 무릎이나 허벅지 뒤를 감싸 안아요. 그 상태에서 무릎을 모은 채로 좌우로 천천히 살살 흔들어 허리 아래를 바닥에 마사지하듯 굴립니다. 호흡은 자연스럽게, 1~2분 정도 부드럽게 흔들어요.', caution: '무릎이 가슴까지 안 와도 괜찮으니 손이 닿는 만큼만 잡으세요. 흔드는 폭은 크지 않게, 허리 아래가 마사지받는 감각으로.', imageOverride: 'P16' },
  P37: { id: 'P37', nameKo: '보행 인지', nameSans: '', nameKoTrans: '', category: '발·일상', level: '초급', short: '걸을 때 발바닥 무게 이동을 의식하는 일상 연습.', tags: ['발', '일상', '초급'], desc: '실내에서 천천히 걸으며 매 걸음마다 발바닥의 무게 이동을 의식합니다. 발이 닿을 때 발뒤꿈치 → 발 바깥쪽 → 새끼발가락 아래 → 엄지발가락 아래 순서로 체중이 흘러가게 해요. 특히 마지막에 엄지볼로 바닥을 살짝 밀어내며 다음 발을 내딛는 감각.', caution: '발 안쪽이 무너지지 않게 발날(새끼 쪽)도 함께 의식하세요. 천천히 걷는 게 핵심 — 빨리 걸으면 의식이 안 됩니다.' },
  P38: { id: 'P38', nameKo: '발 정렬 브릿지', nameSans: '', nameKoTrans: '', category: '발·후면', level: '초급', short: '발 11자 정렬을 의식하면서 골반을 들어올리는 브릿지.', tags: ['발', '후면강화', '초급'], desc: '바닥에 누워서 무릎을 세우고 발을 골반 너비, 발끝은 정확히 11자가 되게 정렬합니다. 양발 모두 엄지볼·새끼볼·뒤꿈치 삼각형을 균등하게 누른다는 감각으로. 그 상태에서 숨 마시며 발바닥으로 바닥을 밀어내듯 골반을 천장 방향으로 천천히 들어올려요. 무릎이 바깥이나 안쪽으로 무너지지 않게 평행 유지.', caution: '높이가 아니라 발바닥 정렬과 골반 들기가 핵심. 무릎이 안쪽으로 모이거나 발 안쪽으로 무너지면 골반 들기를 멈추고 정렬부터 다시 잡으세요.', imageOverride: 'P11' },
  P39: { id: 'P39', nameKo: '사이드 밴드', nameSans: 'Parsva Sukhasana', nameKoTrans: '파르스바 수카아사나', category: '옆구리', level: '초급', short: '책상다리 앉기에서 옆구리를 시원하게 늘리는 자세.', tags: ['옆구리', '초급', '점심'], desc: '편안한 책상다리(수카아사나)로 앉습니다. 오른손은 엉덩이 옆 바닥에 가볍게 짚고, 왼팔을 천장 방향으로 길게 뻗은 다음 상체를 오른쪽으로 부드럽게 기울여요. 왼쪽 옆구리부터 겨드랑이까지 시원하게 늘어나는 감각. 시선은 정면 또는 천장 손끝.', caution: '엉덩이가 바닥에서 뜨지 않게 양쪽 좌골을 균등하게 누르세요. 어깨가 솟지 않게 끌어내리고, 가슴이 앞으로 무너지지 않게 천장을 향해 살짝 열어주세요.' },
  P40: { id: 'P40', nameKo: '로우 런지 (초승달 런지)', nameSans: 'Anjaneyasana', nameKoTrans: '안자네야아사나', category: '고관절', level: '초급', short: '한 발을 앞으로 큰 걸음 내딛고 골반 앞쪽을 늘리는 자세.', tags: ['고관절', '초급'], desc: '네발기기 자세에서 오른발을 양손 사이로 가져와 큰 한 걸음 앞에 놓아요. 오른 무릎은 발목 위에 직각으로, 왼 다리는 뒤로 길게 뻗어 무릎을 바닥에 내려놓습니다. 양손은 앞 무릎 위에 얹고 상체를 천천히 일으켜 척추를 길게 세워요. 골반 앞쪽이 시원하게 늘어나는 감각.', caution: '앞 무릎이 발끝보다 앞으로 나가지 않게 발목 위에 수직 유지. 무릎이 아프면 뒤 무릎 아래에 수건을 받치세요. 허리를 꺾지 말고 가슴을 길게 위로 들어올리는 감각으로.' },
  P41: { id: 'P41', nameKo: '수카아사나 골반 원 그리기', nameSans: 'Sukhasana', nameKoTrans: '수카아사나', category: '골반·척추', level: '초급', short: '책상다리에서 골반으로 큰 원을 그려 척추를 깨우는 자세.', tags: ['골반', '척추', '초급', '아침'], desc: '편안한 책상다리(수카아사나)로 앉아 양손을 무릎 위에 얹습니다. 척추를 길게 세운 상태에서 골반을 시계방향으로 큰 원을 그리듯 천천히 돌려요. 앞으로 기울일 때는 척추를 길게, 옆으로 갈 때는 옆구리가 늘어나고, 뒤로 갈 때는 꼬리뼈가 살짝 말리는 감각. 5회 시계방향 → 5회 반시계방향.', caution: '크기보다 천천히 부드럽게 그리는 게 핵심. 무릎이 불편하면 엉덩이 아래에 쿠션을 받쳐 골반을 살짝 들어주세요.' },
  P42: { id: 'P42', nameKo: '하프 수리야 나마스카라', nameSans: 'Half Surya Namaskara', nameKoTrans: '하프 수리야 나마스카라', category: '시퀀스', level: '중급', short: '바닥으로 내려가지 않는 단축 시퀀스. 호흡과 동작을 연결.', tags: ['시퀀스', '중급', '아침'], desc: '바닥으로 내려가지 않는 단축 시퀀스. 한 호흡에 한 동작씩 연결해 흘러갑니다. 타다아사나 → 우르드바 하스타아사나 → 사이드밴드 좌우 → 등 뒤 깍지 전굴 → 아르다 우타나아사나 → 우타나아사나 → 만세 → 시작 자세. 3~5회 반복.', caution: '무릎이 뻣뻣하면 전굴할 때 무릎을 충분히 굽히세요. 호흡과 동작을 일치시키는 게 핵심 — 동작이 빨라지면 호흡을 따라 다시 늦추세요. 어지러우면 잠시 멈추고 자연 호흡으로.' },
  P43: { id: 'P43', nameKo: '수리야 나마스카라 A', nameSans: 'Surya Namaskara A', nameKoTrans: '수리야 나마스카라 A', category: '시퀀스', level: '고급', short: '바닥까지 내려가는 풀버전 시퀀스.', tags: ['시퀀스', '고급', '아침'], desc: '바닥까지 내려가는 풀버전 시퀀스. 한 호흡에 한 동작씩 연결합니다. 타다아사나 → 만세 → 우타나아사나 → 아르다 우타나아사나 → 차투랑가 → 코브라/업독 → 다운독(5호흡) → 다시 위로 → 시작 자세. 3~5회 반복.', caution: '처음에는 동작 하나하나를 분리해서 천천히 익힌 다음, 익숙해지면 호흡과 동작을 연결하세요. 무리되면 무릎 대고 차투랑가, 코브라 대신 업독 생략 가능.' },
  P44: { id: 'P44', nameKo: '손바닥 플랭크', nameSans: 'Phalakasana', nameKoTrans: '팔라카아사나', category: '코어', level: '중급', short: '손바닥으로 사선 일직선을 유지하는 코어 자세.', tags: ['코어', '중급'], desc: '네발기기 자세에서 양손은 어깨 바로 아래에 두고 손바닥 전체로 바닥을 단단히 짚습니다. 두 발을 뒤로 뻗어 발끝으로 바닥을 누르며 머리부터 발뒤꿈치까지 사선 일직선이 되게 만들어요. 배꼽을 척추 쪽으로 끌어당겨 코어를 잡고, 어깨는 귀에서 멀리 떨어뜨려 견갑을 끌어내려요. 시선은 매트 앞쪽 1m 정도. 호흡 멈추지 말고 30초~1분 유지.', caution: '엉덩이가 처지거나 솟지 않게 사선 일직선이 핵심. 손목이 부담되면 무릎 대고 짧게 하거나 팔꿈치 플랭크로 바꾸세요. 어깨가 손목 위에 정확히 오게 정렬.' },
  P45: { id: 'P45', nameKo: '팔꿈치 플랭크', nameSans: 'Forearm Plank', nameKoTrans: '포어암 플랭크', category: '코어', level: '중급', short: '팔뚝으로 받쳐 코어를 안전하게 활성화하는 자세.', tags: ['코어', '중급'], desc: '네발기기 자세에서 팔뚝을 바닥에 내려놓아요. 팔꿈치는 어깨 바로 아래, 손바닥은 펴거나 살짝 주먹을 쥐어도 좋아요. 두 발을 뒤로 뻗어 발끝으로 바닥을 누르며 머리부터 발뒤꿈치까지 사선 일직선. 배꼽을 척추 쪽으로 끌어당겨 코어를 잡고, 어깨는 귀에서 멀리. 시선은 매트 앞쪽. 호흡 멈추지 말고 30초~1분 유지.', caution: '손목이 약하거나 손가락 이슈가 있는 회원에게 손바닥 플랭크 대신 추천. 팔꿈치로 바닥을 강하게 밀어내며 어깨가 무너지지 않게 하세요.' },
  P46: { id: 'P46', nameKo: '기지개 자세', nameSans: '', nameKoTrans: '', category: '전신활성', level: '초급', short: '누워서 온몸을 위아래로 길게 늘리는 활성화 자세.', tags: ['전신', '아침', '초급'], desc: '바닥에 누워서 양팔을 머리 위로 길게 뻗고 양다리는 모아 곧게 폅니다. 숨 마시며 손끝은 위로, 발끝은 아래로 서로 반대 방향으로 멀어지듯 길게 뻗어내요. 온몸이 위아래로 길게 늘어나는 감각. 5초 머문 뒤 숨 내쉬며 힘을 빼고 풀어주기. 5회 반복.', caution: '허리가 뜨면 무릎을 살짝 굽혀도 좋아요. 어깨가 귀쪽으로 솟지 않게 견갑을 끌어내린 채로 손끝만 멀리 보내세요.' },
  P47: { id: 'P47', nameKo: '어깨 으쓱 떨어뜨리기', nameSans: '', nameKoTrans: '', category: '어깨', level: '초급', short: '어깨를 으쓱 들어올렸다 툭 떨어뜨려 긴장을 푸는 자세.', tags: ['어깨', '초급', '오전'], desc: '편안히 앉거나 서서 어깨에 힘을 빼고 시작합니다. 숨 마시며 양 어깨를 귀 쪽으로 최대한 으쓱 들어올린 뒤 잠시 멈춰요. 숨 내쉬며 한 번에 툭 떨어뜨려 어깨에 힘을 완전히 빼냅니다. 5회 반복.', caution: '들어올릴 때는 천천히, 떨어뜨릴 때는 한 번에 툭. 떨어뜨린 후 어깨가 귀에서 멀어지는 감각을 잠시 느껴보세요. 사무직·재택 근무 중 자주 해주면 좋아요.' },
  P48: { id: 'P48', nameKo: '팔꿈치 원 그리기', nameSans: '', nameKoTrans: '', category: '어깨', level: '초급', short: '손끝을 어깨에 얹고 팔꿈치로 큰 원을 그리는 자세.', tags: ['어깨', '견갑', '초급', '점심'], desc: '편안히 앉거나 서서 양 손끝을 같은 쪽 어깨 위에 얹습니다. 팔꿈치를 양옆으로 들어올리고, 그 상태에서 팔꿈치로 큰 원을 그리듯 회전시켜요. 앞으로 5회 → 뒤로 5회. 견갑 주변과 어깨 관절이 부드럽게 풀리는 감각.', caution: '어깨가 귀쪽으로 솟지 않게 견갑을 끌어내린 채로 원을 그리세요. 천천히 큰 원을 그리는 게 핵심 — 작고 빠른 원은 효과가 떨어집니다.' },
  P49: { id: 'P49', nameKo: '목 옆 스트레칭', nameSans: '', nameKoTrans: '', category: '목', level: '초급', short: '고개를 부드럽게 옆으로 기울여 목 옆 라인을 늘리는 자세.', tags: ['목', '초급'], desc: '바르게 앉거나 서서 어깨에 힘을 뺍니다. 고개를 천천히 오른쪽으로 기울여 오른쪽 귀를 오른 어깨 쪽으로 가져가요. 왼쪽 어깨는 끌어내리듯 고정해 왼쪽 목 옆 라인이 시원하게 늘어나는 감각. 20초 머문 뒤 천천히 가운데로 돌아오고 반대쪽도.', caution: '손으로 머리를 누르지 말고 머리 무게만으로 자연스럽게. 어깨가 함께 솟지 않게 반대쪽 어깨를 끌어내려 고정하세요. 호흡을 멈추지 마세요.' },
  P50: { id: 'P50', nameKo: '고개 굴리기', nameSans: '', nameKoTrans: '', category: '목', level: '초급', short: '고개를 부드럽게 반원으로 굴려 목을 풀어주는 자세.', tags: ['목', '초급'], desc: '바르게 앉거나 서서 시작합니다. 고개를 가슴 앞으로 살짝 떨어뜨려 턱이 가슴 가까이 오게 하고, 그 상태에서 천천히 한쪽으로 굴려 귀가 어깨 쪽으로 → 고개가 뒤로 살짝 → 반대쪽 어깨 → 다시 가슴 앞으로 돌아오게 해요. 양방향으로 각 2회씩 천천히.', caution: '목 뒤로 완전히 젖히지 말고 살짝만 — 어지럼 있는 회원은 뒤로 젖히는 구간을 생략하고 좌우 반원만 그려도 좋아요. 호흡 따라 아주 천천히.', imageOverride: 'P49' },
};

// 이미지 URL 헬퍼 (override 처리 포함)
function getPoseImage(pose) {
  const imgId = pose.imageOverride || pose.id;
  return `${POSE_IMG_BASE}/${imgId}.png`;
}

/* =========================================================
   회원별 추천 매트릭스
   ========================================================= */
const USER_PREFERENCES = {
  '김은화': { exclude: ['P31', 'P32'], specialty: ['P01', 'P02', 'P03', 'P05', 'P30'] },
  '이은조': { exclude: [], specialty: ['P06', 'P07', 'P10', 'P15', 'P47', 'P48', 'P49', 'P50'] },
  '정하니': { exclude: [], specialty: ['P11', 'P12', 'P13', 'P14', 'P15', 'P22', 'P06'] },
  '김재영': { exclude: ['P24'], specialty: ['P09', 'P16', 'P17', 'P18', 'P19', 'P20', 'P30'] },
  '마영선': { exclude: [], specialty: ['P21', 'P22', 'P23', 'P24', 'P25', 'P31', 'P43'] },
  '유연선': { exclude: ['P24', 'P43'], specialty: ['P15', 'P26', 'P27', 'P28', 'P29', 'P30', 'P47'] },
  '유민경': { exclude: [], specialty: ['P25', 'P28', 'P31', 'P32', 'P33'] },
  '권민서': { exclude: ['P06', 'P12'], specialty: ['P01', 'P05', 'P30', 'P34', 'P35'] },
  '김선정': { exclude: ['P14', 'P21', 'P23', 'P24', 'P29', 'P31', 'P42', 'P43', 'P44'], specialty: ['P03', 'P19', 'P20', 'P27', 'P36', 'P39'] },
  '장다연': { exclude: [], specialty: ['P11', 'P28', 'P32', 'P37', 'P38'] },
  '한아름': { exclude: [], specialty: ['P07', 'P10', 'P15', 'P47', 'P48', 'P49', 'P50'] },
};

const TIME_PREFERENCES = {
  morning: { hours: [6, 10], categories: ['전신활성', '시퀀스', '척추', '골반·척추'] },
  midMorning: { hours: [10, 12], categories: ['어깨', '목', '후면강화'] },
  noon: { hours: [12, 14], categories: ['옆구리', '어깨', '트위스트'] },
  afternoon: { hours: [14, 18], categories: ['코어', '균형', '하체'] },
  evening: { hours: [18, 22], categories: ['이완', '회복·이완', '허리이완', '골반이완', '휴식'] },
  night: { hours: [22, 24], categories: ['회복·이완', '휴식'] },
};

function getTimeCategories(hour) {
  if (hour >= 6 && hour < 10) return TIME_PREFERENCES.morning.categories;
  if (hour >= 10 && hour < 12) return TIME_PREFERENCES.midMorning.categories;
  if (hour >= 12 && hour < 14) return TIME_PREFERENCES.noon.categories;
  if (hour >= 14 && hour < 18) return TIME_PREFERENCES.afternoon.categories;
  if (hour >= 18 && hour < 22) return TIME_PREFERENCES.evening.categories;
  return TIME_PREFERENCES.night.categories;
}

/* =========================================================
   추천 로직
   - 회원 이름과 현재 시간 기준으로 오늘의 추천 자세 1개 반환
   - 날짜 + 회원이름으로 시드를 만들어, 같은 날엔 같은 자세가 반환됨
   ========================================================= */
function getDailyRecommendation(userName) {
  const prefs = USER_PREFERENCES[userName] || { exclude: [], specialty: [] };
  
  // 1. 추천 가능 풀 (제외 동작 빼기)
  let pool = Object.values(POSE_LIBRARY).filter(p => !prefs.exclude.includes(p.id));
  
  // 2. 시간대 가중치 (해당 카테고리 자세에 +3 가중)
  const hour = new Date().getHours();
  const timeCats = getTimeCategories(hour);
  
  // 3. 가중치 계산
  const weighted = pool.map(p => {
    let weight = 1;
    if (timeCats.some(cat => p.category.includes(cat) || cat.includes(p.category))) weight += 3;
    if (prefs.specialty.includes(p.id)) weight += 4;
    return { pose: p, weight };
  });
  
  // 4. 날짜+이름 시드로 결정론적 선택 (하루 동안 같은 추천)
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const seedStr = `${userName}-${dateStr}`;
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed);
  
  // 5. 가중치 누적 합으로 선택
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  let pick = seed % totalWeight;
  for (const w of weighted) {
    pick -= w.weight;
    if (pick < 0) return w.pose;
  }
  return weighted[0].pose;
}

/* =========================================================
   Mock Data (나중에 Supabase 연동)
   ========================================================= */
const MOCK_USER = {
  name: '조상범',
  phone: '010-****-2202',
  since: '2026-05-02',
  initial: '상',
  pass: {
    type: '1개월 (8회)',
    used: 0,
    total: 8,
    paymentDate: '2026-05-02',
    startDate: '2026-05-02',
    expiryDate: '2026-06-13',
    canHold: true,
    holdUsed: false,
    fixedSlot: '화·목 19:20',
    rhythm: {
      status: 'pending',
      elapsedDays: 0,
      limitDays: 42,
      remaining: 8,
      daysRemaining: 42,
      bonus: 1,
    },
  },
  recommendation: getDailyRecommendation('조상범'),
  nextClass: {
    date: '2026-05-07',
    month: 'MAY',
    day: '7',
    weekday: '목요일',
    time: '오후 7:20 - 8:20',
    type: '소그룹',
    status: '자리 있음 · 첫 수업',
    dday: 'D-5',
  },
  history: [],
  assessment: {
    updatedAt: '2026-05-02',
    checkPoints: [
      '코어 안정성 강화 필요',
      '호흡과 함께 천천히 진행하기',
    ],
    recommendations: [
      '플랭크 변형 - 코어 활성화',
      '호흡 깊이 들이마시기',
      '엉덩이·복부 동시에 사용하기',
      '코어와 호흡 연동 훈련',
    ],
  },
  notifications: [],
};

// 동적 스케줄 생성 - 오늘부터 7일
// 동적 스케줄 생성 - startDate부터 7일
// 데이터 출처:
//   - member: 회원의 fixedSlots, id 정보
//   - allMembers: 전체 회원 목록 (다른 회원의 fixedSlots로 가상 인원 계산)
//   - allSessions: 강사 앱 sessions 테이블 (실제 참여자, 취소 상태)
//   - reservations: 회원 앱에서 보낸 추가 예약 요청 (key: dateStr_time)
//   - pendingCancels: 회원 앱에서 보낸 취소 요청 (key: dateStr_time)
//   - closedDays: 강사가 등록한 휴강일 [{date: 'YYYY-MM-DD', reason: '...'}]
//   - groupSlots: 화·목 시간대 (예: ['11:00', '19:20', '20:50'])
//   - startDate: 시작 날짜 (기본: 오늘)
function generateSchedule(member, slotCounts = {}, allSessions = {}, reservations = {}, pendingCancels = {}, closedDays = [], groupSlots = ['11:00', '19:20', '20:50'], startDate = null) {
  const days = [];
  const today = new Date();
  const now = new Date(); // 현재 시각 (시간 비교용)
  today.setHours(0, 0, 0, 0);
  const todayStr = toYMDLocal(today);
  const start = startDate ? new Date(startDate) : today;
  start.setHours(0, 0, 0, 0);
  const weekdayNames = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const CAPACITY = 5;
  
  // 수업 종료 시각이 지났는지 (1시간 가정)
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isAfterClass = (date, time) => {
    if (date !== todayStr) return false;
    if (!time) return false;
    const [h, m] = time.split(':').map(Number);
    const endH = (h + 1) % 24;
    const endHHMM = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return nowHHMM >= endHHMM;
  };
  
  // 휴강일 셋 (날짜 → reason)
  const closedMap = {};
  (closedDays || []).forEach(c => {
    if (c?.date) closedMap[c.date] = c.reason || '휴강';
  });
  
  // 회원의 고정 슬롯 → "{dow}_{time}" 셋
  const fixedSet = new Set((member?.fixedSlots || []).map(fs => `${fs.dow}_${fs.time}`));
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = toYMDLocal(d);
    const dow = d.getDay();
    const isToday = dateStr === todayStr;
    const dayLabel = `${d.getDate()}`;
    
    // 공휴일/휴강일 체크
    const isHoliday = HOLIDAYS_2026.has(dateStr);
    const closedReason = closedMap[dateStr];
    const isClosed = isHoliday || !!closedReason;
    
    const slots = [];
    
    // 화·목만 수업 (단, 공휴일/휴강일 제외)
    if ((dow === 2 || dow === 4) && !isClosed) {
      // ⭐ 하루 1회 제한: 이 날에 본인이 이미 잡힌 슬롯(고정/예약/대기) 있는지 미리 계산
      // (cancelled_advance/cancelled_sameday는 제외)
      const myExistingSlotsToday = (() => {
        const taken = []; // 본인이 이미 잡은 슬롯 시간 목록
        groupSlots.forEach(t => {
          const k = `${dateStr}_${t}`;
          const s = allSessions[k];
          
          // 1) 강사 sessions에 본인이 정상 등록되어 있나?
          const myReg = (s?.participants || []).find(p => 
            p.memberId === member?.id 
            && !p.cancelled
            && p.status !== 'cancelled_advance' 
            && p.status !== 'cancelled_sameday'
          );
          if (myReg) { taken.push(t); return; }
          
          // 2) 본인이 보낸 예약 요청 (pending) 또는 승인된 예약 (reserved)
          const myReq = reservations[k];
          if (myReq?.state === 'pending' || myReq?.state === 'reserved') {
            taken.push(t); return;
          }
          
          // 3) 본인 고정 슬롯이고 패스 활성 + 회수 남음 + sessions에서 취소 안 됐으면
          const isFixedSlot = fixedSet.has(`${dow}_${t}`);
          if (isFixedSlot) {
            const myCancelled = (s?.participants || []).find(p =>
              p.memberId === member?.id 
              && (p.status === 'cancelled_advance' || p.status === 'cancelled_sameday' || p.status === 'cancelled_by_teacher' || p.cancelled)
            );
            if (!myCancelled) {
              const myActivePass = (member?.passes || []).find(p =>
                !p.archived && p.category === 'group' 
                && p.startDate && p.expiryDate
                && p.startDate <= dateStr && p.expiryDate >= dateStr
              );
              if (myActivePass) {
                // ⭐ 회수 체크 — 이 날짜까지 본인이 잡은 슬롯 수가 회수 안 넘는지
                const realUsed = (myActivePass.sessionDates || [])
                  .filter(d => d <= todayStr).length;
                // 오늘 다음날부터 dateStr 이전까지 본인 미래 예약 카운트
                let futureBefore = 0;
                let cur = new Date(todayStr);
                cur.setDate(cur.getDate() + 1);
                while (true) {
                  const cYMD = toYMDLocal(cur);
                  if (cYMD >= dateStr) break;
                  if (cYMD > myActivePass.expiryDate) break;
                  const cDow2 = cur.getDay();
                  if (cDow2 === 2 || cDow2 === 4) {
                    const isExempt = HOLIDAYS_2026.has(cYMD) || closedMap[cYMD]
                      || (myActivePass.holdStart && myActivePass.holdEnd 
                          && cYMD >= myActivePass.holdStart && cYMD <= myActivePass.holdEnd);
                    if (!isExempt) {
                      (member?.fixedSlots || []).forEach(fs => {
                        if (fs.dow !== cDow2) return;
                        futureBefore++;
                      });
                    }
                  }
                  cur.setDate(cur.getDate() + 1);
                }
                if ((realUsed + futureBefore + 1) <= (myActivePass.totalSessions || 0)) {
                  taken.push(t);
                }
              }
            }
          }
        });
        return taken;
      })();
      
      groupSlots.forEach(time => {
        const key = `${dateStr}_${time}`;
        const sess = allSessions[key];
        // 실제 참여자 수 (취소 안 된 것만)
        const realParticipants = (sess?.participants || []).filter(p => !p.cancelled && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'cancelled_by_teacher');
        const realCount = realParticipants.length;
        const hasRealSession = realCount > 0; // 강사가 이미 일정을 만들었나?
        
        // RPC에서 받은 슬롯별 고정 인원수 — 날짜별로 다름
        // 새 형식: "2026-05-12_19:20"
        // 옛 형식 fallback: "2_19:20"
        const slotKeyDated = `${dateStr}_${time}`;
        const slotKeyDow = `${dow}_${time}`;
        const fixedCount = slotCounts[slotKeyDated] ?? slotCounts[slotKeyDow] ?? 0;
        
        // 가상 인원: 강사 일정이 있으면 그걸 우선, 없으면 RPC 인원수
        const virtualCount = hasRealSession ? realCount : fixedCount;
        
        // 이 회원이 이 슬롯에 들어있나? (강사 sessions 기준)
        const myPart = realParticipants.find(p => p.memberId === member?.id);
        
        // 회원이 보낸 예약 요청
        const myRequest = reservations[key];
        
        // 회원이 보낸 취소 요청
        const myCancelPending = pendingCancels[key];
        
        // 고정 슬롯인가? (회원 본인의 fixedSlots 기준)
        const isFixed = fixedSet.has(`${dow}_${time}`);
        // 본인 활성 수강권이 이 날짜에도 유효한가?
        // - 시작일 ≤ dateStr ≤ 만료일 
        // - 그 날짜 시점에 회차 남았는가?
        //   = 진짜 출석 회수 + 미래에 본인이 예약/고정으로 잡힌 슬롯 수 < total
        const fixedActive = isFixed && (() => {
          const myActivePass = (member?.passes || []).find(p => 
            !p.archived && p.category === 'group' 
            && p.startDate && p.expiryDate
            && p.startDate <= dateStr && p.expiryDate >= dateStr
          );
          if (!myActivePass) return false;
          
          // ⭐ 이 슬롯의 sessions에 본인이 취소된 상태로 등록되어 있으면 → 고정 슬롯이라도 빠진 걸로 처리
          // (강사가 회원 앱 취소 요청을 승인한 경우 cancelled_advance로 들어감)
          // (강사가 자동 추천에서 회원을 뺀 경우 cancelled_by_teacher로 들어감)
          const myCancelledInSess = (sess?.participants || []).find(p =>
            p.memberId === member?.id 
            && (p.status === 'cancelled_advance' || p.status === 'cancelled_sameday' || p.status === 'cancelled_by_teacher' || p.cancelled)
          );
          if (myCancelledInSess) return false;
          
          // 진짜 출석 회수 (오늘까지)
          const realUsed = (myActivePass.sessionDates || [])
            .filter(d => d <= todayStr).length;
          
          // dateStr 이전의 본인 미래 예약 카운트 (오늘 < d < dateStr)
          // 1) 강사 sessions에 등록된 것
          // 2) 강사 sessions에 없으면 fixedSlots 가상 예약 (본인 고정 슬롯)
          let futureBookings = 0;
          // 만료일까지의 모든 화/목 날짜를 순회
          const passEnd = myActivePass.expiryDate;
          let cursor = new Date(todayStr);
          cursor.setDate(cursor.getDate() + 1); // 내일부터
          while (true) {
            const cYMD = toYMDLocal(cursor);
            if (cYMD >= dateStr) break; // dateStr 이전까지만
            if (cYMD > passEnd) break; // 만료일 넘으면 멈춤
            const cDow = cursor.getDay();
            // 화/목만
            if (cDow === 2 || cDow === 4) {
              // 공휴일/휴강일 제외
              const isExempt = HOLIDAYS_2026.has(cYMD) 
                || closedMap[cYMD]
                || (myActivePass.holdStart && myActivePass.holdEnd 
                    && cYMD >= myActivePass.holdStart && cYMD <= myActivePass.holdEnd);
              if (!isExempt) {
                // 본인 고정 시간 중 어느 슬롯이 이 날짜에 잡힐지 검사
                (member?.fixedSlots || []).forEach(fs => {
                  if (fs.dow !== cDow) return;
                  const k = `${cYMD}_${fs.time}`;
                  const sess = allSessions[k];
                  // 강사가 이미 등록한 경우 (cancelled 아닌 것)
                  if (sess) {
                    const myReg = (sess.participants || []).find(p => 
                      p.memberId === member?.id && !p.cancelled
                      && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'cancelled_by_teacher'
                      && p.status !== 'cancelled_by_teacher'
                    );
                    if (myReg) {
                      futureBookings++;
                      return;
                    }
                    // sessions에 본인이 cancelled_by_teacher로 박혀있으면 → 그 슬롯에서 빠진 거, 카운트 안 함
                    const myCancelledByTeacher = (sess.participants || []).find(p =>
                      p.memberId === member?.id && p.status === 'cancelled_by_teacher'
                    );
                    if (myCancelledByTeacher) {
                      return; // 카운트 안 함
                    }
                    // sessions에 등록 안 됐어도 그 슬롯이 비어있는 게 아니라면 그냥 +1
                    // (강사가 미래 일정을 안 만들어둔 경우라도 본인 고정 슬롯 = 가상 예약)
                  }
                  // sessions에 그 슬롯 자체가 없거나 본인 등록 안 돼있어도
                  // 본인 고정 슬롯이면 가상 예약으로 카운트
                  futureBookings++;
                });
              }
            }
            cursor.setDate(cursor.getDate() + 1);
          }
          
          // 이번 슬롯까지 포함해서 회차 안 넘으면 OK (+1)
          return (realUsed + futureBookings + 1) <= (myActivePass.totalSessions || 0);
        })();
        
        // myPart에도 동일 체크 적용 — 미래 슬롯이지만 이 시점에 회차 0이면 안 보이게
        const myPartActive = myPart && (() => {
          // 오늘 이전이면 무조건 표시 (이미 출석한 거)
          if (dateStr <= todayStr) return true;
          // 미래 슬롯: 이 슬롯이 본인 수강권의 한계 안인지
          // ⭐ myPart에 박힌 passId를 사용 — 옛 다 쓴 패스로 잘못 잡히는 거 방지
          let myPass = null;
          if (myPart.passId) {
            myPass = (member?.passes || []).find(p => p.id === myPart.passId && !p.archived);
          }
          // passId 없으면 fallback: 활성 그룹 패스 중 dateStr 포함하고 안 다 쓴 것
          if (!myPass) {
            myPass = (member?.passes || []).find(p => 
              !p.archived && p.category === 'group' 
              && p.startDate && p.expiryDate
              && p.startDate <= dateStr && p.expiryDate >= dateStr
              && (p.usedSessions || (p.sessionDates || []).length) < (p.totalSessions || 0)
            );
          }
          if (!myPass) return false;
          const realUsed = (myPass.sessionDates || [])
            .filter(d => d <= todayStr).length;
          // dateStr 이전 미래 예약 카운트 (같은 패스만)
          let futureBookings = 0;
          Object.keys(allSessions || {}).forEach(k => {
            const [d2] = k.split('_');
            if (d2 <= todayStr || d2 >= dateStr) return;
            const s = allSessions[k];
            const has = (s?.participants || []).some(p => 
              p.memberId === member?.id && !p.cancelled 
              && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday' && p.status !== 'cancelled_by_teacher'
              && (!myPart.passId || p.passId === myPass.id)
            );
            if (has) futureBookings++;
          });
          // 이 슬롯까지 포함해서 회차 안 넘으면 OK
          return (realUsed + futureBookings + 1) <= (myPass.totalSessions || 0);
        })();
        
        // 시간 표시
        const endTime = (() => {
          const [h, m] = time.split(':').map(Number);
          const eh = h + 1;
          return `${String(eh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        })();
        const timeLabel = `${time} ~ ${endTime}`;
        
        // 상태 결정
        let info;
        const slotEnded = isAfterClass(dateStr, time);
        // 본인이 이 슬롯을 취소한 상태인지 (sessions에 cancelled로 박혀있음)
        const myCancelledInSess = (sess?.participants || []).find(p =>
          p.memberId === member?.id 
          && (p.status === 'cancelled_advance' || p.status === 'cancelled_sameday' || p.status === 'cancelled_by_teacher' || p.cancelled)
        );
        if (slotEnded) {
          // 수업 종료된 슬롯 — 회색으로 비활성 표시
          // ⭐ 본인이 취소한 슬롯이면 '수업 완료'가 아니라 '취소함'으로 (안 갔으니까)
          if (myCancelledInSess) {
            info = { cap: '취소함', state: 'finished' };
          } else {
            info = { cap: '수업 완료', state: 'finished' };
          }
        } else if (myCancelPending) {
          // 내가 취소 요청 보냄 (강사 승인 대기)
          info = { cap: '취소 요청 중 · 강사 확인 대기', state: 'cancel_pending', cancelBookingId: myCancelPending.bookingId };
        } else if (myPart && myPartActive) {
          // 강사 sessions에 내가 등록돼 있고, 회차 안에 있음 → 확정 예약
          info = { cap: `예약됨 · ${virtualCount}/${CAPACITY}`, state: 'reserved', isFixed };
        } else if (myPart && !myPartActive) {
          // 강사가 등록은 했지만 본인 회차 초과 → 화면에서 숨김 (skip)
          return; // forEach continue
        } else if (myRequest?.state === 'pending') {
          info = { cap: '강사 승인 대기 중', state: 'pending', bookingId: myRequest.bookingId };
        } else if (myRequest?.state === 'reserved') {
          info = { cap: `예약됨 · ${virtualCount + 1}/${CAPACITY}`, state: 'reserved', bookingId: myRequest.bookingId };
        } else if (fixedActive) {
          // 고정 슬롯이고 수강권 시작일 이후 → "예약됨" 표시
          // virtualCount는 이미 본인 포함이라 그대로 사용
          info = { cap: `예약됨 · ${virtualCount}/${CAPACITY} · 고정`, state: 'reserved', isFixed: true, virtualFixed: true };
        } else if (virtualCount >= CAPACITY) {
          info = { cap: `마감됨 · ${virtualCount}/${CAPACITY}`, state: 'full' };
        } else if (myExistingSlotsToday.length > 0 && !myExistingSlotsToday.includes(time)) {
          // ⭐ 하루 1회 제한: 본인이 이 날 다른 슬롯에 이미 잡혀있음 (인원수도 같이 표시)
          info = { cap: `하루 한 수업만 예약 가능 · ${virtualCount}/${CAPACITY}`, state: 'limited' };
        } else {
          info = { cap: `자리 있음 · ${virtualCount}/${CAPACITY}`, state: 'available' };
        }
        
        slots.push({
          key,
          time: timeLabel,
          type: '소그룹',
          ...info,
        });
      });
    }
    
    // 본인 개인레슨 일정 (요일 무관) — 휴강일이어도 표시 (강사가 명시적으로 잡은 거니까)
    Object.keys(allSessions || {}).forEach(key => {
      if (!key.startsWith(dateStr + '_')) return;
      const sess = allSessions[key];
      if (!sess?.participants) return;
      const myPart = sess.participants.find(p => p.memberId === member?.id && !p.cancelled);
      if (!myPart) return;
      // 개인레슨인지 확인 (classType 직접 또는 수강권 카테고리)
      let isPrivate = myPart.classType === '개인';
      if (!isPrivate && myPart.passId) {
        const pass = (member?.passes || []).find(p => p.id === myPart.passId);
        if (pass?.category === 'private') isPrivate = true;
      }
      if (!isPrivate) return; // 개인레슨만
      
      const time = key.slice(dateStr.length + 1);
      // 이미 슬롯에 들어있으면 중복 방지 (예: 그룹 슬롯이 우연히 같은 시간일 때)
      if (slots.find(s => s.time.startsWith(time))) return;
      
      const myCancelPending = pendingCancels[key];
      const endTime = (() => {
        const [h, m] = time.split(':').map(Number);
        const eh = h + 1;
        return `${String(eh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      })();
      const timeLabel = `${time} ~ ${endTime}`;
      
      let info;
      if (myCancelPending) {
        info = { cap: '취소 요청 중 · 강사 확인 대기', state: 'cancel_pending', cancelBookingId: myCancelPending.bookingId };
      } else {
        info = { cap: '강사님과 협의된 일정', state: 'reserved', isPrivate: true };
      }
      
      slots.push({
        key,
        time: timeLabel,
        type: '개인',
        ...info,
      });
    });
    
    // 슬롯 시간순 정렬
    slots.sort((a, b) => a.time.localeCompare(b.time));
    
    days.push({
      date: dayLabel,
      dateStr,
      weekday: weekdayNames[dow],
      isToday,
      slots,
      empty: slots.length === 0,
      isClosed,
      closedReason: isHoliday 
        ? (HOLIDAY_NAMES_2026[dateStr] || '공휴일') 
        : (closedReason || ''),
    });
  }
  return days;
}

const QUOTES = [
  '지금 이 순간이 전부입니다.\n다른 시간은 없어요.',
  '과거를 붙잡지 않고,\n미래를 미리 살지 않을 때\n지금이 열립니다.',
  '호흡 하나에 머무르세요.\n그것이 시작입니다.',
  '생각이 흘러가도 괜찮아요.\n당신은 생각이 아니에요.',
  '지금 이 자리,\n다른 어디도 아닙니다.',
  '멈추는 순간\n모든 것이 말을 겁니다.',
  '들이쉬는 숨에 도착하고,\n내쉬는 숨에 내려놓으세요.',
  '몸이 있는 곳에\n마음을 데려오세요.',
  '지금 이 호흡만이\n당신의 진짜입니다.',
  '무엇도 되려 하지 마세요.\n이미 충분합니다.',
  '고요함은 멀리 있지 않아요.\n지금 이 숨 안에 있습니다.',
  '흘러가는 것을 흘러가게,\n오는 것을 오게 하세요.',
];

const dailyQuote = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
};

/* =========================================================
   Shared Components
   ========================================================= */
function Chip({ children, tone = 'neutral', size = 'sm' }) {
  const tones = {
    neutral: { bg: theme.cardAlt, fg: theme.inkMute, bd: theme.line },
    green: { bg: theme.accentSoft, fg: theme.accent, bd: '#B7C5AB' },
    terra: { bg: theme.terraSoft, fg: theme.terra, bd: '#E5B5A0' },
    gold: { bg: 'linear-gradient(135deg, #F5E5A8, #E5C870)', fg: '#6B5410', bd: theme.gold },
    warn: { bg: '#F5E8C8', fg: '#5E4520', bd: '#C8A366' },
    danger: { bg: '#FBE4DD', fg: theme.terra, bd: '#D19B91' },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'sm' ? { fontSize: 10, padding: '2px 8px' } : { fontSize: 11, padding: '3px 10px' };
  const bgStyle = t.bg.startsWith('linear-gradient') ? { backgroundImage: t.bg } : { backgroundColor: t.bg };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      ...bgStyle, color: t.fg,
      border: `1px solid ${t.bd}`, borderRadius: 999,
      fontWeight: 600, whiteSpace: 'nowrap',
      ...sz,
    }}>
      {children}
    </span>
  );
}

function Modal({ open, onClose, title, sub, children, maxHeight = '88%' }) {
  // 🔙 안드로이드 뒤로가기 처리 (전역 스택 사용)
  useEffect(() => {
    if (!open) return;
    const id = sosunBackStack.push(onClose);
    return () => sosunBackStack.remove(id);
  }, [open]);
  
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'flex-end', zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: theme.bg,
        borderRadius: '24px 24px 0 0', padding: 20,
        maxHeight, overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: theme.inkMute, borderRadius: 2, margin: '0 auto 14px', opacity: 0.3 }} />
        {title && (
          <>
            <div style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 600, marginBottom: 6 }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: theme.inkMute, marginBottom: 16 }}>{sub}</div>}
          </>
        )}
        {children}
      </div>
    </div>
  );
}

function ModalBtn({ children, onClick, variant = 'primary', icon: Icon, disabled }) {
  const styles = {
    primary: { background: theme.accent, color: '#FFF', border: 'none' },
    terra: { background: theme.terra, color: '#FFF', border: 'none' },
    dark: { background: theme.cardDark, color: '#FFF', border: 'none' },
    kakao: { background: '#FEE500', color: '#3C1E1E', border: 'none' },
    ghost: { background: 'transparent', color: theme.inkSoft, border: `1px solid ${theme.line}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: 14, borderRadius: 12,
      fontSize: 14, fontWeight: 600, cursor: disabled ? 'wait' : 'pointer',
      marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      opacity: disabled ? 0.6 : 1,
      ...styles[variant],
    }}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

function InfoBox({ children, tone = 'neutral' }) {
  const styles = {
    neutral: { background: theme.cardAlt, color: theme.inkSoft },
    terra: { background: theme.terraSoft, color: '#5E3A20' },
    gold: { background: theme.goldBg, color: '#6B5410' },
  };
  return (
    <div style={{
      borderRadius: 12, padding: 12, marginBottom: 8,
      fontSize: 12, lineHeight: 1.5,
      ...styles[tone],
    }}>
      {children}
    </div>
  );
}

/* =========================================================
   HOME
   ========================================================= */
function HomeView({ user, onShowModal, onGoTo, onRefresh, refreshing, closedDays = [], onDismissNotif }) {
  const [showRecModal, setShowRecModal] = useState(false);
  return (
    <div style={{ paddingBottom: 80 }}>
      {/* 상단 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 4px' }}>
        <div style={{ fontFamily: theme.serif, fontSize: 24, fontWeight: 500, color: theme.ink, letterSpacing: '-0.01em' }}>소선요가</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: theme.serif, fontSize: 18, fontWeight: 500, color: theme.ink }}>{(user.name || '회원').slice(-2)}님</span>
          <button onClick={() => onShowModal('bell')} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: theme.card, border: `1px solid ${theme.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.inkSoft, cursor: 'pointer', position: 'relative',
          }}>
            <Bell size={16} />
            {user.notifications?.some(n => n.unread) && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, background: theme.terra,
                borderRadius: '50%', border: `2px solid ${theme.card}`,
              }} />
            )}
          </button>
          {/* 새로고침 버튼 */}
          <button onClick={onRefresh} disabled={refreshing} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: theme.card, border: `1px solid ${theme.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.inkSoft, cursor: refreshing ? 'wait' : 'pointer',
            opacity: refreshing ? 0.5 : 1,
          }}>
            <RefreshCw size={15} style={{
              animation: refreshing ? 'sosun-spin 0.8s linear infinite' : 'none',
            }} />
          </button>
        </div>
      </div>

      {/* 명상 문구 - 한 줄 */}
      <div style={{
        fontFamily: theme.serif, fontStyle: 'italic',
        fontSize: 12, color: theme.inkMute,
        padding: '4px 24px 12px', lineHeight: 1.5,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {dailyQuote().replace(/\n/g, ' ')}
      </div>

      {/* MY PASS */}
      <div onClick={() => onShowModal('passDetail')} style={{
        margin: '16px 24px',
        background: 'linear-gradient(135deg, #2D2A26 0%, #3D3A36 100%)',
        borderRadius: 20, padding: 18, color: '#FFF',
        position: 'relative', overflow: 'hidden', cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute', top: '-50%', right: '-30%',
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(194,107,74,0.3) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>MY PASS</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 20 }}>{user.pass.type}</div>
          {/* 남은 횟수 - 라벨 위, 숫자 아래 */}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>남은 횟수</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: theme.serif, fontSize: 56, fontWeight: 500, lineHeight: 1 }}>{user.pass.total - user.pass.used}</span>
            <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>/ {user.pass.total}회</span>
          </div>
          {/* 기간 - 한 줄 */}
          <div style={{
            marginTop: 14, paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>기간</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
              {user.pass.startDate} ~ {user.pass.expiryDate}
            </span>
          </div>
          {/* 2박스: 리듬 / 내 수련 시간 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>리듬 수련</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#FFB892', lineHeight: 1.3 }}>
                {(() => {
                  const r = user.pass.rhythm;
                  if (!r) return '-';
                  if (r.status === 'pending') return '시작 예정';
                  if (r.status === 'achieved') return '🏆 완주 성공!';
                  if (r.status === 'challenging') {
                    return r.remaining > 0 
                      ? `🏆 ${r.remaining}회 더 힘내세요`
                      : '🏆 완주 직전';
                  }
                  if (r.status === 'missed') return '다음 도전 응원해요 🌱';
                  return '-';
                })()}
              </div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>내 수련 시간</div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>
                {user.pass.fixedSlot || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 다음 수업 */}
      <div style={{
        fontFamily: theme.serif, fontSize: 16, fontWeight: 500,
        color: theme.ink, margin: '0 24px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span>다음 수업</span>
        <span onClick={() => onGoTo('reservation')} style={{ fontSize: 11, color: theme.terra, cursor: 'pointer', fontFamily: theme.sans, fontWeight: 500 }}>전체 →</span>
      </div>
      <div onClick={() => onShowModal('classDetail')} style={{
        margin: '0 24px 20px',
        background: theme.card, border: `1px solid ${theme.line}`,
        borderRadius: 14, padding: '10px 14px 10px 12px',
        display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
      }}>
        <div style={{ textAlign: 'center', paddingRight: 10, borderRight: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 9, color: theme.terra, letterSpacing: '0.1em', fontWeight: 600 }}>{user.nextClass.month}</div>
          <div style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 500, color: theme.ink, lineHeight: 1, marginTop: 2 }}>{user.nextClass.day}</div>
          <div style={{ fontSize: 10, color: theme.inkMute, marginTop: 2 }}>{user.nextClass.weekday}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: theme.terra, fontWeight: 600, fontFamily: theme.serif }}>{user.nextClass.time}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.ink, marginTop: 1 }}>{user.nextClass.type}</div>
          <div style={{ fontSize: 10, color: theme.inkMute, marginTop: 1 }}>{user.nextClass.status}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ background: theme.terra, color: '#FFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{user.nextClass.dday}</span>
          <ChevronRight size={14} color={theme.inkMute} />
        </div>
      </div>

      {/* 최근 안 읽은 알림 배너 (가장 최신 1건만, X로 닫기 가능) */}
      {(() => {
        const unread = (user?.notifications || []).filter(n => n.unread && !n.dismissedFromHome);
        if (unread.length === 0) return null;
        const n = unread[0]; // 가장 최신
        return (
          <div
            onClick={() => onShowModal('bell')}
            style={{
              margin: '0 24px 10px',
              background: '#FFF8ED',
              border: '1px solid #D4B574',
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(212, 181, 116, 0.15)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8A6418', marginBottom: 3, letterSpacing: '0.02em' }}>
                🔔 {n.tag}
              </div>
              <div style={{ fontSize: 13, color: theme.ink, lineHeight: 1.4 }}>
                {n.msg}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissNotif?.(n.id);
              }}
              aria-label="알림 닫기"
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'transparent', border: 'none',
                color: '#8A6418', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })()}

      {/* 공지: 오늘 이후 가장 가까운 휴무 (있을 때만) */}
      {(() => {
        const todayStr = toYMDLocal(new Date());
        // closedDays(강사 등록) + HOLIDAYS_2026 합쳐서 오늘 이후 가장 빠른 휴무 찾기
        const upcomingHolidays = [];
        // 1) closedDays (강사 직접 등록 휴무)
        (closedDays || []).forEach(c => {
          if (c?.date && c.date > todayStr) {
            upcomingHolidays.push({ date: c.date, reason: c.reason || '휴무' });
          }
        });
        // 2) HOLIDAYS_2026 (공휴일)
        Array.from(HOLIDAYS_2026).forEach(d => {
          if (d > todayStr) {
            const reason = HOLIDAY_NAMES_2026[d] || '공휴일';
            // 중복 방지
            if (!upcomingHolidays.some(h => h.date === d)) {
              upcomingHolidays.push({ date: d, reason });
            }
          }
        });
        // 가장 가까운 거 1개
        upcomingHolidays.sort((a, b) => a.date.localeCompare(b.date));
        const nearest = upcomingHolidays[0];
        if (!nearest) return null;
        // M/D 포맷
        const [, mm, dd] = nearest.date.split('-');
        const monthLabel = `${parseInt(mm)}월`;
        const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`;
        return (
          <div onClick={() => onShowModal('notice')} style={{
            margin: '0 24px',
            background: theme.cardAlt, border: `1px dashed ${theme.line}`,
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: theme.inkSoft, cursor: 'pointer',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.inkMute }} />
            <span><strong style={{ color: theme.ink }}>{monthLabel} 휴무 안내</strong> · {dateLabel} {nearest.reason} 휴무</span>
          </div>
        );
      })()}

      {/* 오늘의 추천 */}
      {user.recommendation && (
        <>
          {/* 일러스트 미리 받아두기 (모달 열 때 빠르게 표시) */}
          <img
            src={getPoseImage(user.recommendation)}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          />
          <div style={{
            fontFamily: theme.serif, fontSize: 16, fontWeight: 500,
            color: theme.ink, margin: '20px 24px 10px',
          }}>
            오늘의 추천
          </div>
          <div
            onClick={() => setShowRecModal(true)}
            style={{
              margin: '0 24px',
              background: 'linear-gradient(135deg, #FFF8ED 0%, #F5EBC8 100%)',
              border: '1px solid #D4B574',
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 169, 97, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* 🌿 + "은조님께" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>🌿</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#6B8E5A', letterSpacing: '0.04em' }}>
                {(user.name || '회원').slice(-2)}님께
              </span>
            </div>
            
            {/* 자세 이름 (한글 + 산스크리트) */}
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.ink, lineHeight: 1.25, marginBottom: 10 }}>
              {user.recommendation.nameKo}
              {user.recommendation.nameSans && (
                <span style={{ fontSize: 14, fontWeight: 500, fontStyle: 'italic', color: theme.inkMute, marginLeft: 6 }}>
                  ({user.recommendation.nameSans})
                </span>
              )}
            </div>
            
            {/* 짧은 설명 */}
            <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.6, marginBottom: 12 }}>
              {user.recommendation.short}
            </div>
            
            {/* "탭해서 자세히 보기" */}
            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#8A6418', letterSpacing: '0.02em' }}>
              → 탭해서 자세히 보기
            </div>
          </div>
        </>
      )}
      
      {/* 상세 모달 */}
      {showRecModal && user.recommendation && (
        <PoseDetailModal pose={user.recommendation} onClose={() => setShowRecModal(false)} />
      )}
    </div>
  );
}

/* =========================================================
   POSE DETAIL MODAL (상세 모달)
   ========================================================= */
function PoseDetailModal({ pose, onClose }) {
  const [zoomed, setZoomed] = useState(false);
  if (!pose) return null;
  return (
    <>
      {/* 배경 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(45, 42, 38, 0.5)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}
      />
      
      {/* 시트 */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        maxHeight: '88vh',
        background: theme.bg,
        borderRadius: '24px 24px 0 0',
        zIndex: 1001,
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease',
        paddingBottom: 32,
      }}>
        {/* 핸들바 (탭하면 닫힘) */}
        <div
          onClick={onClose}
          style={{
            display: 'flex', justifyContent: 'center',
            paddingTop: 12, paddingBottom: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{ width: 44, height: 5, borderRadius: 3, background: theme.line }} />
        </div>
        
        <div style={{ padding: '12px 24px 0' }}>
          {/* 🌿 + 오늘의 추천 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>🌿</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B8E5A', letterSpacing: '0.04em' }}>
              오늘의 추천
            </span>
          </div>
          
          {/* 자세 이름 + 일러스트 */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <div style={{ position: 'absolute', top: 0, right: 0 }}>
              <img
                src={getPoseImage(pose)}
                alt={pose.nameKo}
                loading="eager"
                decoding="async"
                onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
                style={{ 
                  width: 130, height: 110, objectFit: 'contain',
                  cursor: 'zoom-in',
                  borderRadius: 8,
                  transition: 'transform 0.15s ease',
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              {/* "탭해서 크게 보기" 힌트 */}
              <div style={{ 
                fontSize: 10, color: theme.inkMute, textAlign: 'center', 
                marginTop: 4, fontStyle: 'italic',
                pointerEvents: 'none',
              }}>
                탭해서 크게 보기
              </div>
            </div>
            <div style={{
              fontSize: 24, fontWeight: 700, color: theme.ink,
              lineHeight: 1.15, letterSpacing: '-0.01em',
              marginBottom: 6, paddingRight: 140,
            }}>
              {pose.nameKo}
            </div>
            {pose.nameSans && (
              <div style={{ fontSize: 14, fontStyle: 'italic', color: theme.inkMute, paddingRight: 140 }}>
                {pose.nameSans}
                {pose.nameKoTrans && !pose.nameKo.includes(pose.nameKoTrans) && ` · ${pose.nameKoTrans}`}
              </div>
            )}
          </div>
          
          {/* 태그들 — 카테고리별 1개씩 (비슷한 의미 중복 제거) */}
          {Array.isArray(pose.tags) && pose.tags.length > 0 && (() => {
            // 카테고리 정의 — 우선순위 순서대로 1개씩 선택, 최대 3개
            const TAG_CATEGORIES = [
              { name: '부위', tags: ['목·어깨','목','어깨','견갑','가슴','허리','척추','코어','골반','고관절','햄스트링','옆구리','하체','발','후면','전신'] },
              { name: '동작', tags: ['흉추 신전','트위스트','역자세','균형','후면강화','가슴 열기','워밍업','시퀀스'] },
              { name: '효과', tags: ['이완','회복','휴식','명상'] },
              { name: '난이도', tags: ['초급','중급','고급'] },
              { name: '시간', tags: ['아침','아침 5분','오전','점심','오후','저녁','일상','앉기'] },
            ];
            // 자세 태그를 카테고리별로 분류해서 각 카테고리의 첫 매칭만 선택
            const picked = [];
            const seenCat = new Set();
            for (const cat of TAG_CATEGORIES) {
              if (seenCat.has(cat.name)) continue;
              const match = pose.tags.find(t => cat.tags.includes(t));
              if (match) {
                picked.push(match);
                seenCat.add(cat.name);
              }
              if (picked.length >= 3) break;
            }
            // 카테고리 안 잡힌 태그(기타)는 자리 남으면 추가
            if (picked.length < 3) {
              pose.tags.forEach(t => {
                if (picked.length < 3 && !picked.includes(t)) {
                  const inAnyCat = TAG_CATEGORIES.some(c => c.tags.includes(t));
                  if (!inAnyCat) picked.push(t);
                }
              });
            }
            if (picked.length === 0) return null;
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                {picked.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 12, fontWeight: 600, color: theme.inkSoft,
                    background: '#FFFFFF', border: `1px solid ${theme.line}`,
                    borderRadius: 999, padding: '7px 14px',
                    letterSpacing: '0.01em',
                    boxShadow: '0 1px 2px rgba(45, 42, 38, 0.04)',
                  }}>{tag}</span>
                ))}
              </div>
            );
          })()}
          
          {/* 자세 설명 */}
          {pose.desc && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>🌱</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.accent, letterSpacing: '-0.01em' }}>
                  자세 설명
                </span>
              </div>
              <div style={{ fontSize: 14, color: theme.ink, lineHeight: 1.75 }}>
                {pose.desc}
              </div>
            </div>
          )}
          
          {/* 주의 / 팁 */}
          {pose.caution && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>⚠️</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: theme.terra, letterSpacing: '-0.01em' }}>
                  주의 / 팁
                </span>
              </div>
              <div style={{
                background: '#FFF6DC', border: '1px solid #EAD9A8',
                borderRadius: 12, padding: '14px 16px',
                fontSize: 14, color: theme.ink, lineHeight: 1.7,
              }}>
                {pose.caution}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes zoomIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
      
      {/* 풀스크린 자세 사진 확대 모달 */}
      {zoomed && (
        <div
          onClick={() => setZoomed(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 10000,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.2s ease',
            cursor: 'zoom-out',
          }}
        >
          {/* 자세 이름 */}
          <div style={{
            color: '#FFF', fontSize: 18, fontWeight: 600,
            marginBottom: 20, textAlign: 'center',
            letterSpacing: '-0.01em',
          }}>
            {pose.nameKo}
            {pose.nameSans && (
              <div style={{ fontSize: 13, fontWeight: 400, fontStyle: 'italic', opacity: 0.7, marginTop: 4 }}>
                {pose.nameSans}
              </div>
            )}
          </div>
          
          {/* 확대 이미지 */}
          <div style={{
            background: '#FFF',
            borderRadius: 20,
            padding: 24,
            maxWidth: 'min(85vw, 500px)',
            maxHeight: '70vh',
            animation: 'zoomIn 0.25s ease',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          }}>
            <img
              src={getPoseImage(pose)}
              alt={pose.nameKo}
              style={{
                width: '100%',
                maxHeight: 'calc(70vh - 80px)',
                objectFit: 'contain',
                display: 'block',
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          
          {/* 닫기 힌트 */}
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)', fontSize: 12,
            marginTop: 24, fontStyle: 'italic',
          }}>
            화면을 탭하면 닫혀요
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   RESERVATION
   ========================================================= */
function ReservationView({ member, slotCounts, allSessions, reservations, pendingCancels, closedDays, onShowModal, onRefresh, refreshing }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0=이번 주, 1=다음 주, ... 최대 3 (4주)
  const MAX_WEEKS = 4; // 4주까지만 (한 달)
  
  // 시작 날짜: 오늘 + (weekOffset * 7일)
  const startDate = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  })();
  // 종료 날짜: 시작 + 6일
  const endDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6);
    return d;
  })();
  
  const fmtRange = (s, e) => {
    const sm = s.getMonth() + 1, sd = s.getDate();
    const em = e.getMonth() + 1, ed = e.getDate();
    return `${sm}월 ${sd}일 ~ ${em === sm ? '' : em + '월 '}${ed}일`;
  };
  const yearLabel = startDate.getFullYear();
  
  const schedule = generateSchedule(member, slotCounts, allSessions, reservations, pendingCancels, closedDays, ['11:00', '19:20', '20:50'], startDate);
  
  const refreshBtn = (
    <button onClick={onRefresh} disabled={refreshing} style={{
      width: 36, height: 36, borderRadius: '50%',
      background: theme.card, border: `1px solid ${theme.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: theme.inkSoft, cursor: refreshing ? 'wait' : 'pointer',
      opacity: refreshing ? 0.5 : 1,
    }}>
      <RefreshCw size={15} style={{
        animation: refreshing ? 'sosun-spin 0.8s linear infinite' : 'none',
      }} />
    </button>
  );
  
  const canPrev = weekOffset > 0;
  const canNext = weekOffset < MAX_WEEKS - 1;
  
  return (
    <div style={{ paddingBottom: 80 }}>
      <TopBar title="예약하기" right={refreshBtn} />
      
      {/* 주차 네비 */}
      <div style={{
        margin: '0 24px 16px', background: theme.card,
        border: `1px solid ${theme.line}`, borderRadius: 14,
        padding: '10px 14px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button 
          onClick={() => canPrev && setWeekOffset(weekOffset - 1)}
          disabled={!canPrev}
          style={{ 
            width: 28, height: 28, borderRadius: '50%', 
            background: canPrev ? theme.cardAlt : 'transparent', 
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: canPrev ? theme.inkSoft : theme.line, 
            cursor: canPrev ? 'pointer' : 'not-allowed',
            opacity: canPrev ? 1 : 0.4,
          }}>
          <ChevronLeft size={14} />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 11, color: theme.inkMute }}>{yearLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.ink }}>
            {fmtRange(startDate, endDate)}
          </div>
          <div style={{ fontSize: 10, color: theme.inkMute, marginTop: 2 }}>
            {weekOffset === 0 ? '이번 주' : `${weekOffset}주 뒤`} · {weekOffset + 1} / {MAX_WEEKS}
          </div>
        </div>
        <button 
          onClick={() => canNext && setWeekOffset(weekOffset + 1)}
          disabled={!canNext}
          style={{ 
            width: 28, height: 28, borderRadius: '50%', 
            background: canNext ? theme.cardAlt : 'transparent', 
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            color: canNext ? theme.inkSoft : theme.line, 
            cursor: canNext ? 'pointer' : 'not-allowed',
            opacity: canNext ? 1 : 0.4,
          }}>
          <ChevronRight size={14} />
        </button>
      </div>

      <div style={{ padding: '0 24px' }}>
        {schedule.filter(day => {
          // 화·목은 항상 보여줌 (휴강이어도 안내 박스로)
          const dow = new Date(day.dateStr).getDay();
          if (dow === 2 || dow === 4) return true;
          // 그 외 요일은 슬롯이 있을 때만 (개인레슨 일정 등)
          return day.slots && day.slots.length > 0;
        }).map((day, di) => (
          <div key={di} style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 10,
              marginBottom: 10, paddingBottom: 6,
              borderBottom: `1px solid ${theme.line}`,
            }}>
              <span style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{day.date}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: day.isToday ? theme.terra : theme.inkSoft }}>{day.weekday}</span>
              {day.isToday && <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.inkMute, fontStyle: 'italic', fontFamily: theme.serif }}>오늘</span>}
            </div>
            {day.isClosed && (
              <div style={{ 
                textAlign: 'center', padding: 14, 
                color: theme.inkSoft, 
                background: theme.cardAlt,
                border: `1px dashed ${theme.line}`,
                borderRadius: 12,
                fontSize: 12, fontWeight: 600,
              }}>
                🌿 {day.closedReason} · 휴무
              </div>
            )}
            {day.slots.map((slot, si) => (
              <SlotCard key={si} slot={slot} day={day} onShowModal={onShowModal} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotCard({ slot, day, onShowModal }) {
  const bg = slot.state === 'reserved' ? theme.terraSoft 
    : slot.state === 'pending' ? theme.goldBg 
    : slot.state === 'cancel_pending' ? theme.cardAlt
    : slot.state === 'finished' ? theme.cardAlt
    : theme.card;
  const border = slot.state === 'reserved' ? '#E5B5A0' 
    : slot.state === 'pending' ? theme.gold 
    : slot.state === 'cancel_pending' ? theme.line
    : slot.state === 'finished' ? theme.line
    : theme.line;
  
  const slotInfo = { ...slot, dateStr: day?.dateStr, dateLabel: `${day?.date} (${day?.weekday})` };
  const isDimmed = slot.state === 'cancel_pending' || slot.state === 'finished';
  
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 14, padding: '10px 12px',
      marginBottom: 8, display: 'flex',
      alignItems: 'center', gap: 12,
      opacity: isDimmed ? 0.65 : 1,
    }}>
      {/* 알약 칩 */}
      <div style={{
        background: '#FFF', color: slot.type === '개인' ? theme.terra : theme.ink,
        padding: '8px 12px', borderRadius: 999,
        fontSize: 12, fontWeight: 700,
        border: `1px solid ${theme.line}`,
        minWidth: 64, textAlign: 'center', flexShrink: 0,
      }}>
        {slot.type}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontFamily: theme.serif, fontSize: 16, fontWeight: 600, 
          color: isDimmed ? theme.inkMute : theme.terra, 
          lineHeight: 1.2,
          textDecoration: slot.state === 'cancel_pending' ? 'line-through' : 'none',
        }}>{slot.time}</div>
        <div style={{ fontSize: 10.5, color: theme.inkSoft, marginTop: 2 }}>{slot.cap}</div>
      </div>
      {slot.state === 'reserved' && (
        <button onClick={() => onShowModal('cancel', slotInfo)} style={{
          background: 'transparent', color: theme.terra,
          border: `1px solid ${theme.terra}`, borderRadius: 999,
          padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>취소</button>
      )}
      {slot.state === 'available' && (
        <button onClick={() => onShowModal('book', slotInfo)} style={{
          background: theme.accent, color: '#FFF',
          border: 'none', borderRadius: 999,
          padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>예약</button>
      )}
      {slot.state === 'pending' && (
        <button onClick={() => onShowModal('cancel', slotInfo)} style={{
          background: '#C8A366', color: '#FFF',
          border: 'none', borderRadius: 999,
          padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>대기 중</button>
      )}
      {slot.state === 'cancel_pending' && (
        <button onClick={() => onShowModal('undoCancel', slotInfo)} style={{
          background: 'transparent', color: theme.inkSoft,
          border: `1px solid ${theme.line}`, borderRadius: 999,
          padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>되돌리기</button>
      )}
      {slot.state === 'full' && (
        <button style={{
          background: theme.cardAlt, color: theme.inkMute,
          border: 'none', borderRadius: 999,
          padding: '6px 12px', fontSize: 11, fontWeight: 600,
        }}>마감</button>
      )}
    </div>
  );
}

/* =========================================================
   HISTORY
   ========================================================= */
function HistoryView({ history, passes = [] }) {
  // 토글 상태
  // viewMode: 'active' = 활성 수강권만 / 'all' = 전체 / pass.id = 특정 수강권만
  const [viewMode, setViewMode] = useState('active');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // 활성/옛 수강권 분리 (옛 = archived 또는 만료 또는 다 씀)
  const todayStr = toYMDLocal(new Date());
  const isActivePass = (p) => {
    if (p.archived) return false;
    if (p.expiryDate && p.expiryDate < todayStr) return false;
    // 다 쓴 패스도 옛 패스로 (회수가 더 이상 안 차감되니까)
    const used = p.usedSessions || (p.sessionDates || []).length;
    if (used >= (p.totalSessions || 0)) return false;
    return true;
  };
  const activePasses = (passes || []).filter(isActivePass);
  const archivedPasses = (passes || []).filter(p => !isActivePass(p));
  const allPasses = [...activePasses, ...archivedPasses];
  
  // history를 패스별로 그룹핑
  // viewMode에 따라 필터
  let visiblePasses = activePasses;
  if (viewMode === 'all') visiblePasses = allPasses;
  else if (viewMode !== 'active') {
    // 특정 패스 ID
    visiblePasses = allPasses.filter(p => p.id === viewMode);
  }
  
  const visiblePassIds = new Set(visiblePasses.map(p => p.id));
  
  // 패스별로 history 그룹핑 (패스 시작일 내림차순)
  const sortedPasses = [...visiblePasses].sort((a, b) => 
    (b.startDate || '').localeCompare(a.startDate || '')
  );
  
  const groups = sortedPasses.map(p => {
    const records = (history || []).filter(h => h.passId === p.id);
    return { pass: p, records };
  }).filter(g => g.records.length > 0);
  
  // passId 없는 history (개인레슨 등 옛 데이터)
  const orphans = (history || []).filter(h => !h.passId);
  
  // 패스 라벨 — "5월 수강권 · 1개월 (8회)"
  const sameMonth = (passes || []).reduce((acc, p) => {
    const mm = p.startDate ? p.startDate.slice(0, 7) : '?';
    acc[mm] = (acc[mm] || 0) + 1;
    return acc;
  }, {});
  const passLabel = (p) => {
    const mm = p.startDate ? p.startDate.slice(0, 7) : '';
    const m = mm ? parseInt(mm.slice(5, 7)) : null;
    const dayPart = (sameMonth[mm] > 1 && p.startDate) 
      ? `${m}월 ${parseInt(p.startDate.slice(8, 10))}일~ ` 
      : (m ? `${m}월 ` : '');
    return `${dayPart}수강권 · ${p.type || `${p.totalSessions || ''}회`}`;
  };
  const passPeriod = (p) => {
    if (!p.startDate) return '';
    const s = `${parseInt(p.startDate.slice(5, 7))}/${parseInt(p.startDate.slice(8, 10))}`;
    const e = p.expiryDate ? `${parseInt(p.expiryDate.slice(5, 7))}/${parseInt(p.expiryDate.slice(8, 10))}` : '';
    return e ? `${s} ~ ${e}` : s;
  };
  
  const filterLabel = (() => {
    if (viewMode === 'active') return '현재 진행 수강권만';
    if (viewMode === 'all') return '전체 수강권';
    const p = allPasses.find(pp => pp.id === viewMode);
    return p ? passLabel(p) : '수강권 선택';
  })();
  
  const hasArchived = archivedPasses.length > 0;
  const hasAnyHistory = (history || []).length > 0;
  
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="수업 이력" />
      
      {!hasAnyHistory && (
        <div style={{
          margin: '40px 24px', textAlign: 'center',
          padding: '40px 20px',
          background: theme.card, border: `1px solid ${theme.line}`,
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🌱</div>
          <div style={{ fontFamily: theme.serif, fontSize: 16, color: theme.ink, marginBottom: 4 }}>
            아직 수업 이력이 없어요
          </div>
          <div style={{ fontSize: 12, color: theme.inkMute }}>
            첫 수업이 끝나면 여기 표시됩니다
          </div>
        </div>
      )}
      
      {hasAnyHistory && (
        <div style={{ padding: '0 24px' }}>
          {/* 필터 바 */}
          {(allPasses.length > 0) && (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                background: dropdownOpen ? theme.goldBg : theme.card,
                border: `1px solid ${dropdownOpen ? theme.gold : theme.line}`,
                borderRadius: 12,
                transition: 'all 0.15s ease',
              }}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, color: theme.ink, padding: 0,
                  }}>
                  {filterLabel}
                  <span style={{ fontSize: 10, color: theme.inkMute }}>
                    {dropdownOpen ? '▴' : '▾'}
                  </span>
                </button>
                {hasArchived && (
                  <button
                    onClick={() => setViewMode(viewMode === 'all' ? 'active' : 'all')}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, padding: 0,
                      color: viewMode === 'all' ? theme.inkMute : theme.terra,
                    }}>
                    {viewMode === 'all' ? '현재만 ←' : '전체 보기 →'}
                  </button>
                )}
              </div>
              
              {/* 드롭다운 메뉴 */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  marginTop: 6, zIndex: 100,
                  background: theme.card, borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  border: `1px solid ${theme.line}`,
                  padding: 6,
                }}>
                  {[
                    { id: 'active', label: '현재 진행 수강권만' },
                    ...activePasses.map(p => ({ id: p.id, label: passLabel(p) + ' · ' + passPeriod(p) })),
                    ...archivedPasses.map(p => ({ id: p.id, label: passLabel(p) + ' · ' + passPeriod(p), archived: true })),
                    { id: 'all', label: '전체 수강권' },
                  ].map(opt => {
                    const selected = viewMode === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => { setViewMode(opt.id); setDropdownOpen(false); }}
                        style={{
                          padding: '10px 12px', fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 8,
                          borderRadius: 8, cursor: 'pointer',
                          background: selected ? theme.goldBg : 'transparent',
                          color: selected ? '#8A6418' : (opt.archived ? theme.inkMute : theme.ink),
                          fontWeight: selected ? 600 : 400,
                        }}>
                        <span style={{ width: 14, color: theme.terra, fontWeight: 700 }}>
                          {selected ? '✓' : ''}
                        </span>
                        <span>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* 수강권별 섹션 */}
          {groups.length === 0 && orphans.length === 0 && (
            <div style={{ 
              textAlign: 'center', color: theme.inkMute, 
              fontSize: 13, padding: '40px 0', fontStyle: 'italic',
            }}>
              표시할 수업 이력이 없어요
            </div>
          )}
          
          {groups.map(({ pass, records }) => {
            const isArchivedPass = !isActivePass(pass);
            return (
              <div key={pass.id} style={{ 
                marginBottom: 20, 
                opacity: isArchivedPass ? 0.85 : 1,
              }}>
                <div style={{ 
                  display: 'flex', alignItems: 'baseline', gap: 8,
                  padding: '0 4px', marginBottom: 10,
                }}>
                  <div style={{ 
                    fontSize: 13, fontWeight: 700, 
                    color: isArchivedPass ? theme.inkMute : theme.ink,
                  }}>
                    {passLabel(pass)}
                  </div>
                  <div style={{ fontSize: 11, color: theme.inkMute }}>
                    {passPeriod(pass)}
                    {isArchivedPass && ' · 완료'}
                  </div>
                </div>
                {records.map((h, i) => {
                  const isPrivate = h.classType === '개인';
                  return (
                    <div key={i} style={{
                      background: theme.card, border: `1px solid ${theme.line}`,
                      borderRadius: 12, padding: '12px 14px',
                      marginBottom: 6, display: 'flex',
                      alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 12, color: theme.inkMute, fontWeight: 500, minWidth: 36 }}>{h.date.slice(5)}</span>
                      <span style={{ fontFamily: theme.serif, fontSize: 13, fontWeight: 600, color: theme.terra }}>{h.time}</span>
                      <Chip tone={isPrivate ? 'terra' : 'neutral'} size="sm">
                        {isPrivate ? '개인' : '그룹'}
                      </Chip>
                      <div style={{ flex: 1 }} />
                      {h.num && h.total && (
                        <span style={{ fontSize: 11, color: theme.inkSoft, fontWeight: 500 }}>
                          {h.num}/{h.total}
                        </span>
                      )}
                      <Chip tone={
                        h.status === 'attended' ? 'green' :
                        h.status === 'reserved' ? 'terra' :
                        h.status === 'cancelled_advance' ? 'neutral' :
                        h.status === 'cancelled_sameday' ? 'warn' :
                        h.status === 'no_show' ? 'danger' : 'neutral'
                      } size="sm">
                        {h.label}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            );
          })}
          
          {/* passId 없는 옛 기록 (개인레슨 등) */}
          {orphans.length > 0 && viewMode === 'all' && (
            <div style={{ marginBottom: 20, opacity: 0.85 }}>
              <div style={{ 
                fontSize: 13, fontWeight: 700, color: theme.inkMute,
                padding: '0 4px', marginBottom: 10,
              }}>
                기타 기록
              </div>
              {orphans.map((h, i) => {
                const isPrivate = h.classType === '개인';
                return (
                  <div key={i} style={{
                    background: theme.card, border: `1px solid ${theme.line}`,
                    borderRadius: 12, padding: '12px 14px',
                    marginBottom: 6, display: 'flex',
                    alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 12, color: theme.inkMute, fontWeight: 500, minWidth: 36 }}>{h.date.slice(5)}</span>
                    <span style={{ fontFamily: theme.serif, fontSize: 13, fontWeight: 600, color: theme.terra }}>{h.time}</span>
                    <Chip tone={isPrivate ? 'terra' : 'neutral'} size="sm">
                      {isPrivate ? '개인' : '그룹'}
                    </Chip>
                    <div style={{ flex: 1 }} />
                    <Chip tone="neutral" size="sm">{h.label}</Chip>
                  </div>
                );
              })}
            </div>
          )}
          
          {hasArchived && viewMode === 'active' && (
            <div style={{
              textAlign: 'center', color: theme.inkMute,
              fontSize: 12, fontStyle: 'italic',
              padding: '20px 0 10px',
            }}>
              — 옛 수강권 기록은 '전체 보기' →
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MY (내 정보)
   ========================================================= */
function MyView({ user, onShowModal, onGoTo }) {
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="내 정보" />
      
      {/* 프로필 */}
      <div style={{
        margin: '16px 24px',
        background: `linear-gradient(135deg, ${theme.card} 0%, ${theme.cardAlt} 100%)`,
        border: `1px solid ${theme.line}`, borderRadius: 16,
        padding: '24px 20px', textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: theme.cardDark, color: '#FFF',
          margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: theme.serif, fontSize: 28,
        }}>{user.initial}</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{user.name}</div>
        <div style={{ fontSize: 12, color: theme.inkMute, marginTop: 2 }}>{user.phone}</div>
        <div style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 11, color: theme.inkMute, marginTop: 8 }}>since {user.since.replace(/-/g, '. ')}</div>
      </div>
      
      {/* 통계 */}
      <div style={{
        display: 'flex', margin: '0 24px 20px',
        background: theme.card, border: `1px solid ${theme.line}`,
        borderRadius: 14, padding: 14, gap: 8,
      }}>
        <Stat num={user.pass.used} label="출석" />
        <Divider />
        <Stat num={user.pass.total - user.pass.used} label="남은 횟수" />
        <Divider />
        <Stat num={`D-${Math.ceil((new Date(user.pass.expiryDate) - new Date()) / (1000*60*60*24))}`} label="만료까지" />
      </div>
      
      {/* 메뉴 */}
      <div style={{ margin: '0 24px' }}>
        <MenuSection title="건강 관리">
          <MenuItem icon="🌿" label="분석 결과 보기" onClick={() => onGoTo('assessment')} badge="NEW" />
        </MenuSection>
        
        <MenuSection title="계정">
          <MenuItem icon="🔒" label="비밀번호 변경" onClick={() => onShowModal('passwordChange')} />
        </MenuSection>
        
        <MenuSection title="소선요가">
          <MenuItem icon="📞" label="문의하기" onClick={() => onShowModal('contact')} />
          <MenuItem icon="📋" label="이용 안내" onClick={() => onShowModal('guide')} />
          <MenuItem icon="📄" label="이용 약관" onClick={() => onShowModal('terms')} />
        </MenuSection>
        
        <div style={{ marginTop: 20 }}>
          <MenuItem icon="↩" label="로그아웃" onClick={() => onShowModal('logout')} muted />
        </div>
      </div>
    </div>
  );
}

function Stat({ num, label }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 600 }}>{num}</div>
      <div style={{ fontSize: 10, color: theme.inkMute, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Divider() {
  return <div style={{ width: 1, background: theme.line }} />;
}

function MenuSection({ title, children }) {
  return (
    <>
      <div style={{
        fontSize: 11, color: theme.inkMute, fontWeight: 600,
        margin: '16px 0 8px', paddingLeft: 4,
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>{title}</div>
      {children}
    </>
  );
}

function MenuItem({ icon, label, onClick, badge, muted }) {
  return (
    <div onClick={onClick} style={{
      background: theme.card, border: `1px solid ${theme.line}`,
      borderRadius: 12, padding: '14px 16px',
      marginBottom: 6, display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      cursor: 'pointer', fontSize: 14,
      color: muted ? theme.inkMute : theme.ink,
    }}>
      <span><span style={{ marginRight: 10, fontSize: 16 }}>{icon}</span>{label}</span>
      {badge && <Chip tone="terra" size="sm">{badge}</Chip>}
      {!badge && !muted && <ChevronRight size={14} color={theme.inkMute} />}
    </div>
  );
}

function TopBar({ title, onBack, right }) {
  return (
    <div style={{
      padding: '12px 20px', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      background: theme.bg, position: 'sticky', top: 0, zIndex: 10,
    }}>
      {onBack ? (
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: theme.card, border: `1px solid ${theme.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <ChevronLeft size={16} />
        </button>
      ) : <div style={{ width: 36 }} />}
      <div style={{ fontFamily: theme.serif, fontSize: 22, fontWeight: 500 }}>{title}</div>
      {right ? right : <div style={{ width: 36 }} />}
    </div>
  );
}

/* =========================================================
   ASSESSMENT
   ========================================================= */
function AssessmentView({ user, onBack }) {
  const a = user.assessment;
  
  const hasRecs = Array.isArray(a?.recommendations) && a.recommendations.length > 0;
  const hasCautions = Array.isArray(a?.cautions) && a.cautions.length > 0;
  
  // 추천이나 주의 둘 다 없으면 빈 상태
  if (!a || (!hasRecs && !hasCautions)) {
    return (
      <div style={{ paddingBottom: 100 }}>
        <TopBar title="분석 결과" onBack={onBack} />
        <div style={{ 
          margin: '40px 24px', textAlign: 'center', 
          padding: '40px 20px',
          background: theme.card, border: `1px solid ${theme.line}`,
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
          <div style={{ fontFamily: theme.serif, fontSize: 18, color: theme.ink, marginBottom: 6 }}>
            아직 분석 내용이 없어요
          </div>
          <div style={{ fontSize: 12, color: theme.inkMute, lineHeight: 1.6 }}>
            강사님이 회원님의 몸 상태를 보고<br />
            분석 내용을 작성해주실 거예요
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="분석 결과" onBack={onBack} />
      
      {/* 인사말 */}
      <div style={{
        margin: '0 24px 12px',
        padding: '14px 16px',
        background: theme.card, border: `1px solid ${theme.line}`,
        borderRadius: 14,
        fontSize: 13, color: theme.inkSoft, lineHeight: 1.6,
      }}>
        <span style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 14, color: theme.ink }}>
          {(user.name || '회원').slice(-2)}님을 위해 강사님이 준비한 안내예요 🌿
        </span>
      </div>
      
      {/* 추천 동작 */}
      {hasRecs && (
        <div style={{
          background: theme.card, border: `1px solid ${theme.line}`,
          borderRadius: 14, padding: 16, margin: '0 24px 12px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: theme.accent,
            marginBottom: 10, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>🌿</span> 추천 동작
          </div>
          {a.recommendations.map((r, i) => (
            <div key={i} style={{
              fontSize: 13, color: theme.ink,
              lineHeight: 1.7, padding: '6px 0',
              display: 'flex', gap: 8,
              borderTop: i > 0 ? `1px dashed ${theme.line}` : 'none',
              marginTop: i > 0 ? 4 : 0,
              paddingTop: i > 0 ? 10 : 0,
            }}>
              <span style={{ color: theme.accent, fontWeight: 700, flexShrink: 0 }}>·</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* 주의 사항 */}
      {hasCautions && (
        <div style={{
          background: '#FFF8ED', border: '1px solid #D4B574',
          borderRadius: 14, padding: 16, margin: '0 24px 12px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: '#8A6418',
            marginBottom: 10, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>⚠️</span> 주의 사항
          </div>
          {a.cautions.map((r, i) => (
            <div key={i} style={{
              fontSize: 13, color: '#5E4520',
              lineHeight: 1.7, padding: '6px 0',
              display: 'flex', gap: 8,
              borderTop: i > 0 ? '1px dashed rgba(212, 181, 116, 0.4)' : 'none',
              marginTop: i > 0 ? 4 : 0,
              paddingTop: i > 0 ? 10 : 0,
            }}>
              <span style={{ color: '#8A6418', fontWeight: 700, flexShrink: 0 }}>·</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
      
      <div style={{
        margin: '0 24px',
        fontSize: 11, color: theme.inkMute,
        textAlign: 'center', padding: '14px 0',
        fontFamily: theme.serif, fontStyle: 'italic',
      }}>
        {a.updatedAt && <>업데이트: {a.updatedAt}<br /></>}
        강사님이 직접 작성하신 내용이에요
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */
// 로그인 화면 (테스트용 - 전화번호 뒷4자리 + 비밀번호)
// ===== PWA 설치 hook =====
// Android Chrome: beforeinstallprompt 이벤트로 설치 가능 여부 감지
// iOS Safari: standalone 모드 체크로 이미 설치됐는지 감지
function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState('other'); // 'android' | 'ios' | 'other'

  useEffect(() => {
    // 플랫폼 감지
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'other');

    // 이미 설치된 상태 감지
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // Android Chrome — beforeinstallprompt 가로채기
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // 설치 완료 이벤트
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return { ok: false };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return { ok: choice.outcome === 'accepted' };
  };

  return { canInstall: !!deferredPrompt, isInstalled, platform, install };
}

function LoginView({ onLogin, loading }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const pwa = usePWAInstall();

  const handleLogin = async () => {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await onLogin(phone, password);
      if (!result.ok) {
        setError(result.error || '전화번호 또는 비밀번호가 맞지 않아요');
      }
    } catch (e) {
      setError('로그인 오류: ' + (e.message || ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: theme.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 32px',
    }}>
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{ fontFamily: theme.serif, fontSize: 32, fontWeight: 500, color: theme.ink, marginBottom: 8 }}>
          소선요가
        </div>
        <div style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 13, color: theme.inkMute }}>
          호흡 하나에 머무르세요
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 360,
        background: 'white', border: `1px solid ${theme.line}`,
        borderRadius: 18, padding: 24,
      }}>
        <div style={{ fontSize: 11, color: theme.inkMute, marginBottom: 6 }}>전화번호</div>
        <input
          type="tel"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setError(''); }}
          placeholder="010-0000-0000"
          style={{
            width: '100%', padding: '12px 14px',
            border: `1px solid ${theme.line}`, borderRadius: 10,
            fontSize: 14, marginBottom: 14,
            background: theme.bg, color: theme.ink,
            outline: 'none',
          }}
        />
        <div style={{ fontSize: 11, color: theme.inkMute, marginBottom: 6 }}>비밀번호</div>
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder="전화번호 뒷 4자리"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{
            width: '100%', padding: '12px 14px',
            border: `1px solid ${theme.line}`, borderRadius: 10,
            fontSize: 14, marginBottom: 14,
            background: theme.bg, color: theme.ink,
            outline: 'none',
          }}
        />
        {error && (
          <div style={{ fontSize: 11, color: theme.terra, marginBottom: 10 }}>{error}</div>
        )}
        <button
          onClick={handleLogin}
          disabled={busy}
          style={{
            width: '100%', padding: '13px',
            background: theme.ink, color: 'white',
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '확인 중...' : '로그인'}
        </button>
        
        {/* 비밀번호 잊으셨나요? */}
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            onClick={() => setShowForgot(true)}
            style={{
              background: 'transparent', border: 'none',
              fontSize: 12, color: theme.inkMute,
              textDecoration: 'underline', cursor: 'pointer',
              padding: '4px 8px',
            }}>
            비밀번호 잊으셨나요?
          </button>
        </div>
        
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: theme.bg, borderRadius: 8,
          fontSize: 10, color: theme.inkMute, lineHeight: 1.6,
        }}>
          🔒 비밀번호는 본인 전화번호 뒷 4자리예요
        </div>

        {/* PWA 설치 버튼 — 이미 설치 안 한 경우에만 노출 */}
        {!pwa.isInstalled && pwa.platform !== 'other' && (
          <button
            onClick={async () => {
              if (pwa.canInstall) {
                // Android Chrome — 한 번에 설치
                const result = await pwa.install();
                if (!result.ok) {
                  // 사용자가 거절했거나 prompt 자체가 없으면 안내 모달
                  setShowInstallGuide(true);
                }
              } else {
                // iOS Safari 또는 prompt 못 받은 경우 — 안내 모달
                setShowInstallGuide(true);
              }
            }}
            style={{
              width: '100%', marginTop: 12,
              padding: '12px 14px',
              background: 'linear-gradient(135deg, #FFF8ED 0%, #F5EBC8 100%)',
              border: '1px solid #D4B574',
              borderRadius: 10,
              fontSize: 13, fontWeight: 600,
              color: '#8B6F2E',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            📱 홈 화면에 추가하기
          </button>
        )}
      </div>
      
      {/* 비밀번호 안내 모달 */}
      <Modal open={showForgot} onClose={() => setShowForgot(false)} title="비밀번호 잊으셨나요?" sub="">
        <InfoBox tone="terra">
          <strong>강사님께 연락 주세요</strong><br />
          비밀번호 초기화 후 안내드릴게요.
        </InfoBox>
        <div style={{ fontSize: 12, color: theme.inkSoft, lineHeight: 1.7, padding: '4px 4px 12px' }}>
          초기화하면 비밀번호가 본인 전화번호 뒷 4자리로 돌아가요. 다시 로그인하시고 새로운 비밀번호로 변경하시면 됩니다 🌿
        </div>
        <ModalBtn variant="dark" icon={Phone} onClick={() => window.location.href = 'tel:010-3040-4404'}>010-3040-4404 전화하기</ModalBtn>
        <ModalBtn variant="kakao" icon={MessageCircle} onClick={() => window.open('http://pf.kakao.com/_sPxjqX', '_blank')}>카카오톡 채널 문의</ModalBtn>
        <ModalBtn variant="ghost" onClick={() => setShowForgot(false)}>닫기</ModalBtn>
      </Modal>

      {/* PWA 설치 안내 모달 — iOS 또는 Android 자동 prompt 못 받은 경우 */}
      <Modal open={showInstallGuide} onClose={() => setShowInstallGuide(false)} title="홈 화면에 추가하기" sub="앱처럼 빠르게 열 수 있어요">
        {pwa.platform === 'ios' ? (
          <div style={{ padding: '4px 0 12px', fontSize: 13, color: theme.inkSoft, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>1</div>
              <div>하단 <strong>공유 버튼</strong> 누르기 (네모에 ↑ 화살표)</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>2</div>
              <div>스크롤 → <strong>"홈 화면에 추가"</strong> 선택</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>3</div>
              <div>우측 상단 <strong>"추가"</strong> 누르면 끝</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '4px 0 12px', fontSize: 13, color: theme.inkSoft, lineHeight: 1.8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>1</div>
              <div>브라우저 우측 상단 <strong>⋮ 메뉴</strong> 누르기</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>2</div>
              <div><strong>"홈 화면에 추가"</strong> 또는 <strong>"앱 설치"</strong> 선택</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.bg, borderRadius: 10 }}>
              <div style={{ width: 24, height: 24, background: '#C26B4A', color: '#FFF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>3</div>
              <div><strong>"설치"</strong> 또는 <strong>"추가"</strong> 누르면 끝</div>
            </div>
          </div>
        )}
        <ModalBtn variant="ghost" onClick={() => setShowInstallGuide(false)}>알겠어요</ModalBtn>
      </Modal>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('home');
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState([]);
  const [allSessions, setAllSessions] = useState({});
  const [allTrials, setAllTrials] = useState([]);
  const [reservations, setReservations] = useState({}); // 사용자가 예약 요청한 것들
  const [pendingCancels, setPendingCancels] = useState({}); // 사용자가 보낸 취소 요청 (강사 승인 대기)
  const [slotCounts, setSlotCounts] = useState({}); // 슬롯별 고정 인원수 (RPC)
  const [closedDays, setClosedDays] = useState([]); // 강사 등록 휴강일 (RPC)
  const [toast, setToast] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]); // 알림 (localStorage 동기화)
  
  // 알림 추가 helper (localStorage에 저장) — user별로 분리
  const addNotification = React.useCallback((notif) => {
    setNotifications(prev => {
      const newList = [{
        id: Date.now() + Math.random(),
        unread: true,
        time: '방금',
        ...notif,
      }, ...prev].slice(0, 30); // 최근 30개만
      try {
        if (user?.id) {
          localStorage.setItem(`soseon_notifications_${user.id}`, JSON.stringify(newList));
        }
      } catch (e) {}
      return newList;
    });
  }, [user?.id]);
  
  // 알림 모두 읽음 처리
  const markAllNotificationsRead = React.useCallback(() => {
    setNotifications(prev => {
      const newList = prev.map(n => ({ ...n, unread: false }));
      try {
        if (user?.id) {
          localStorage.setItem(`soseon_notifications_${user.id}`, JSON.stringify(newList));
        }
      } catch (e) {}
      return newList;
    });
  }, [user?.id]);
  
  // 메인 화면 배너에서 알림 닫기 (종 모달엔 그대로 남음)
  const dismissNotificationFromHome = React.useCallback((id) => {
    setNotifications(prev => {
      const newList = prev.map(n => 
        n.id === id ? { ...n, dismissedFromHome: true } : n
      );
      try {
        if (user?.id) {
          localStorage.setItem(`soseon_notifications_${user.id}`, JSON.stringify(newList));
        }
      } catch (e) {}
      return newList;
    });
  }, [user?.id]);
  
  // 로그인 직후 localStorage에서 알림 복원
  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`soseon_notifications_${user.id}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (e) {}
  }, [user?.id]);
  
  // user 객체에 notifications 합쳐서 내보내기 (HomeView 등에서 user.notifications 쓰기 때문)
  const userWithNotifs = React.useMemo(() => {
    if (!user) return null;
    return { ...user, notifications };
  }, [user, notifications]);
  
  // 토스트 메시지 자동 사라짐
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  
  // 🔙 탭/하위화면 전환 시 스택에 push
  // - 다른 탭으로 가면 이전 탭으로 돌아갈 수 있는 close 등록
  // - 모달은 자체 push/remove
  const prevTabRef = React.useRef('home');
  useEffect(() => {
    if (!user) return;
    sosunBackStack.init();
    const prev = prevTabRef.current;
    if (tab !== prev) {
      const id = sosunBackStack.push(() => {
        setTab(prev);
      });
      prevTabRef.current = tab;
      return () => sosunBackStack.remove(id);
    }
  }, [tab, user]);
  
  // 모달 열 때 slot 정보도 같이
  const openModal = (modalName, data = null) => {
    setModalData(data);
    setModal(modalName);
  };
  const closeModal = () => {
    setModal(null);
    setModalData(null);
  };
  
  // 예약 요청 보내기 (Supabase bookings 테이블에 저장)
  const sendBookingRequest = async () => {
    if (!modalData || !user) return;
    closeModal();
    setToast('전송 중...');
    
    const dateStr = modalData.dateStr;
    const timeStr = (modalData.time || '').split(' ')[0]; // "11:00 ~ 12:00" → "11:00"
    
    // 1) INSERT 시도
    let inserted = await sbInsertBooking({
      member_id: user.id,
      member_name: user.name,
      member_phone: user.phone,
      date: dateStr,
      time: timeStr,
      class_type: modalData.type || '소그룹',
      status: 'pending',
      note: '회원 앱에서 요청',
    });
    
    // 2) INSERT 실패하면 — DB UNIQUE 제약 가능성. 같은 슬롯 기존 booking 찾아 UPDATE 시도
    if (!inserted) {
      try {
        const existing = (await sbGetBookingsForMember(user.id))
          .filter(b => b.date === dateStr && b.time === timeStr)
          // 가장 최근 것 우선
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        
        if (existing.length > 0) {
          const target = existing[0];
          const result = await sbUpdateBooking(target.id, {
            status: 'pending',
            note: '회원 앱에서 재요청',
            responded_at: null,
          });
          if (result) {
            inserted = { ...target, status: 'pending', id: target.id };
          }
        }
      } catch (e) {
        console.error('재예약 UPDATE fallback 실패', e);
      }
    }
    
    if (inserted) {
      // 로컬에 반영
      const newReservations = { ...reservations, [modalData.key]: { 
        state: 'pending', 
        date: dateStr, 
        time: modalData.time,
        bookingId: inserted.id,
      } };
      setReservations(newReservations);
      localStorage.setItem('soseon_reservations', JSON.stringify(newReservations));
      setToast('✓ 예약 요청을 보냈어요. 강사 승인 대기 중');
      // bookings 새로 가져오기
      await loadMyBookings();
    } else {
      setToast('⚠️ 전송 실패. 다시 시도해주세요');
    }
  };
  
  // 예약 취소
  // 케이스 A: 추가 예약 요청을 본인이 취소 (reservations에 있는 것)
  //   → bookings UPDATE: status='cancelled_by_member' (간단)
  // 케이스 B: 고정 슬롯 / 강사 sessions에 등록된 슬롯 취소
  //   → bookings INSERT: type='cancel', status='pending' (강사 승인 대기)
  const cancelBooking = async (reason = '') => {
    if (!modalData) return;
    closeModal();
    setToast('취소 처리 중...');
    
    const reservation = reservations[modalData.key];
    
    // ── 케이스 A: 본인이 보낸 예약 요청 취소 ──
    if (reservation?.bookingId) {
      const result = await sbUpdateBooking(reservation.bookingId, {
        status: 'cancelled_by_member',
        responded_at: new Date().toISOString(),
      });
      if (!result) {
        setToast('⚠️ 취소 실패. 다시 시도해주세요');
        return;
      }
      // 로컬에서 즉시 제거
      const newReservations = { ...reservations };
      delete newReservations[modalData.key];
      setReservations(newReservations);
      localStorage.setItem('soseon_reservations', JSON.stringify(newReservations));
      setToast('✓ 예약 요청이 취소되었어요');
      await loadMyBookings();
      return;
    }
    
    // ── 케이스 B: 고정 슬롯 / 강사 등록 슬롯 취소 → 강사에게 취소 요청 INSERT ──
    const time24 = (modalData.time || '').split(' ')[0];
    const noteText = reason 
      ? `[회원 앱 취소 요청] ${reason}`
      : '[회원 앱 취소 요청]';
    const inserted = await sbInsertBooking({
      member_id: user.id,
      member_name: user.name,
      member_phone: user.phone,
      date: modalData.dateStr,
      time: time24,
      class_type: modalData.type || '소그룹',
      status: 'pending_cancel', // 강사 승인 대기 (취소 요청)
      note: noteText,
    });
    
    if (!inserted) {
      setToast('⚠️ 취소 요청 실패. 다시 시도해주세요');
      return;
    }
    
    // 로컬에서 즉시 "취소 요청 중"으로 표시
    const newCancels = { ...pendingCancels, [modalData.key]: {
      bookingId: inserted.id,
      date: modalData.dateStr,
      time: time24,
    } };
    setPendingCancels(newCancels);
    localStorage.setItem('soseon_pending_cancels', JSON.stringify(newCancels));
    setToast('✓ 취소 요청을 보냈어요. 강사 확인 후 적용됩니다');
    await loadMyBookings();
  };
  
  // 취소 요청 되돌리기 (강사가 승인하기 전이면 회원이 직접 취소 가능)
  const undoCancelRequest = async () => {
    if (!modalData) return;
    const cancelInfo = pendingCancels[modalData.key];
    if (!cancelInfo?.bookingId) { closeModal(); return; }
    closeModal();
    setToast('되돌리는 중...');
    
    const result = await sbUpdateBooking(cancelInfo.bookingId, {
      status: 'cancelled_by_member', // 본인이 취소 요청을 다시 취소
      responded_at: new Date().toISOString(),
    });
    if (!result) {
      setToast('⚠️ 되돌리기 실패');
      return;
    }
    
    const newCancels = { ...pendingCancels };
    delete newCancels[modalData.key];
    setPendingCancels(newCancels);
    localStorage.setItem('soseon_pending_cancels', JSON.stringify(newCancels));
    setToast('✓ 취소 요청을 되돌렸어요');
    await loadMyBookings();
  };
  
  // 본인 예약 목록 불러오기 (reservations + pendingCancels 둘 다 갱신)
  // 추가: 이전 상태와 비교해서 강사 승인/거절을 감지하면 알림 생성
  const loadMyBookings = async (opts = {}) => {
    if (!user) return;
    const { silent = false } = opts; // 첫 로드 시에는 알림 생성 안 함
    
    const bookings = await sbGetBookingsForMember(user.id);
    const newReservations = {};
    const newCancels = {};
    const allBookingsByKey = {}; // 모든 booking을 key별로 (status 포함)
    
    // ⭐ 같은 (date, time)에 여러 booking이 있으면 가장 최신 것만 유지
    // (예: 예약 → 취소승인 → 재예약 → 다시취소 등의 흐름에서 옛날 row가 덮어쓰는 버그 방지)
    // sbGetBookingsForMember는 created_at.desc로 옴 → 가장 먼저 보이는 게 최신
    const seenKeys = new Set();
    const latestBookings = [];
    bookings.forEach(b => {
      const key = `${b.date}_${b.time}`;
      if (seenKeys.has(key)) return; // 이미 더 최신 것이 있음
      seenKeys.add(key);
      latestBookings.push(b);
    });
    
    latestBookings.forEach(b => {
      const key = `${b.date}_${b.time}`;
      allBookingsByKey[key] = b;
      
      // 추가 예약 요청 (pending/approved)
      if (b.status === 'pending') {
        newReservations[key] = { state: 'pending', date: b.date, time: b.time, bookingId: b.id };
      } else if (b.status === 'approved') {
        newReservations[key] = { state: 'reserved', date: b.date, time: b.time, bookingId: b.id };
      }
      // 취소 요청 (pending_cancel만)
      else if (b.status === 'pending_cancel') {
        newCancels[key] = { bookingId: b.id, date: b.date, time: b.time };
      }
    });
    
    // ── 변경 감지: 이전 pendingCancels에 있었는데 지금 사라졌으면 강사가 응답한 것 ──
    if (!silent) {
      const prevCancels = pendingCancels || {};
      Object.keys(prevCancels).forEach(key => {
        if (newCancels[key]) return; // 여전히 대기 중
        const b = allBookingsByKey[key];
        if (!b) return;
        const [, mm, dd] = key.split(/[-_]/); // key = YYYY-MM-DD_HH:MM
        const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`;
        const time = key.split('_')[1];
        // 강사가 취소 승인 (실제로 취소됨)
        if (b.status === 'cancelled_advance' || b.status === 'cancelled_sameday' || b.status === 'cancelled') {
          addNotification({
            tag: '취소 승인',
            terra: true,
            msg: `${dateLabel} ${time} 수업 취소 요청이 승인되었어요`,
          });
        }
        // 강사가 거절 (예: status가 다시 approved로 돌아감)
        else if (b.status === 'approved' || b.status === 'fixed') {
          addNotification({
            tag: '취소 거절',
            msg: `${dateLabel} ${time} 수업 취소가 거절되었어요. 자세한 내용은 강사님께 문의해주세요`,
          });
        }
      });
      
      // ── 변경 감지: 이전 reservations에 pending이었는데 approved로 바뀌었으면 예약 승인 ──
      const prevReservations = reservations || {};
      Object.entries(prevReservations).forEach(([key, prev]) => {
        if (prev.state !== 'pending') return;
        const now = newReservations[key];
        const [, mm, dd] = key.split(/[-_]/);
        const dateLabel = `${parseInt(mm)}/${parseInt(dd)}`;
        const time = key.split('_')[1];
        if (now?.state === 'reserved') {
          addNotification({
            tag: '예약 승인',
            terra: true,
            msg: `${dateLabel} ${time} 예약 요청이 승인되었어요`,
          });
        }
        // 예약 자체가 사라졌으면 거절
        else if (!now) {
          const b = allBookingsByKey[key];
          if (b && (b.status === 'rejected' || b.status === 'cancelled_by_teacher')) {
            addNotification({
              tag: '예약 거절',
              msg: `${dateLabel} ${time} 예약 요청이 거절되었어요. 자세한 내용은 강사님께 문의해주세요`,
            });
          }
        }
      });
    }
    
    setReservations(newReservations);
    setPendingCancels(newCancels);
    localStorage.setItem('soseon_reservations', JSON.stringify(newReservations));
    localStorage.setItem('soseon_pending_cancels', JSON.stringify(newCancels));
    
    // ⭐ reservations가 바뀌었으니 user(다음 수업 등) 재변환
    // 강사가 예약 승인하면 sessions에 안 들어가도 reservations(approved) 기반으로 다음 수업 잡힘
    const found = allMembers.find(m => m.id === user.id);
    if (found) {
      const transformed = transformMemberData(
        found, allSessions, [], new Date(),
        closedDays, newReservations, slotCounts
      );
      setUser(transformed);
    }
  };
  
  // 전체 새로고침 (회원·세션·예약 다 다시 가져오기)
  const refreshAll = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      const todayStr = toYMDLocal(new Date());
      // RPC로 본인 데이터만 갱신 + 슬롯 인원수 + 휴강일
      const [found, sessions, counts, closed] = await Promise.all([
        rpcGetMyData(user.id),
        rpcGetMySessions(user.id),
        rpcGetSlotCountsRange(todayStr, 28),
        rpcGetClosedDays(),
      ]);
      
      if (found) {
        setAllMembers([found]);
        setAllSessions(sessions || {});
        setSlotCounts(counts || {});
        setClosedDays(Array.isArray(closed) ? closed : []);
        const transformed = transformMemberData(found, sessions || {}, [], new Date(), Array.isArray(closed) ? closed : [], reservations, counts || {});
        setUser(transformed);
      }
      
      // 본인 예약도 새로 가져오기
      await loadMyBookings();
      setToast('✓ 새로고침 완료');
    } catch (e) {
      console.error('refreshAll 실패', e);
      setToast('⚠️ 새로고침 실패');
    } finally {
      setRefreshing(false);
    }
  };
  
  // 앱이 백그라운드에서 돌아왔을 때 자동 새로고침
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && user) {
        // 마지막 새로고침 후 30초 이상 지났으면만 자동 새로고침
        const lastRefresh = Number(sessionStorage.getItem('soseon_last_refresh') || 0);
        const now = Date.now();
        if (now - lastRefresh > 30000) {
          sessionStorage.setItem('soseon_last_refresh', String(now));
          refreshAll();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user?.id]);
  
  // user 변경 시 본인 예약 자동 로드 (첫 로드는 silent: 알림 X)
  useEffect(() => {
    if (user) loadMyBookings({ silent: true });
  }, [user?.id]);
  
  // 30초마다 자동 폴링 (앱이 보이는 상태일 때만, 변경 감지로 알림 생성)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        // bookings + sessions + closedDays 다 갱신
        const todayStr = toYMDLocal(new Date());
        const [sessions, counts, closed] = await Promise.all([
          rpcGetMySessions(user.id),
          rpcGetSlotCountsRange(todayStr, 28),
          rpcGetClosedDays(),
        ]);
        if (sessions) setAllSessions(sessions);
        if (counts) setSlotCounts(counts);
        if (Array.isArray(closed)) setClosedDays(closed);
        // user 데이터(transformedMember)도 갱신
        const found = await rpcGetMyData(user.id);
        if (found) {
          setAllMembers([found]);
          const transformed = transformMemberData(
            found, sessions || {}, [], new Date(),
            Array.isArray(closed) ? closed : [], reservations, counts || {}
          );
          setUser(transformed);
        }
        // bookings 갱신 (알림 생성 포함)
        await loadMyBookings();
      } catch (e) {
        console.error('자동 폴링 실패', e);
      }
    }, 30000); // 30초
    return () => clearInterval(interval);
  }, [user?.id]);
  
  // 페이지 진입 시 자동 로그인 시도
  useEffect(() => {
    (async () => {
      try {
        // 예약 정보 복원
        const savedRes = localStorage.getItem('soseon_reservations');
        if (savedRes) {
          try { setReservations(JSON.parse(savedRes)); } catch {}
        }
        const savedCancels = localStorage.getItem('soseon_pending_cancels');
        if (savedCancels) {
          try { setPendingCancels(JSON.parse(savedCancels)); } catch {}
        }
        
        // 자동 로그인: 저장된 ID로 본인 데이터만 가져오기
        const savedId = localStorage.getItem('soseon_member_id');
        if (savedId) {
          const found = await rpcGetMyData(savedId);
          if (found) {
            // 본인의 sessions + 슬롯 인원수 + 휴강일
            const todayStr = toYMDLocal(new Date());
            const [sessions, counts, closed] = await Promise.all([
              rpcGetMySessions(savedId),
              rpcGetSlotCountsRange(todayStr, 28),
              rpcGetClosedDays(),
            ]);
            setAllSessions(sessions || {});
            setSlotCounts(counts || {});
            setClosedDays(Array.isArray(closed) ? closed : []);
            setAllMembers([found]); // 본인만 저장
            const transformed = transformMemberData(found, sessions || {}, [], new Date(), Array.isArray(closed) ? closed : [], reservations, counts || {});
            setUser(transformed);
          }
        }
      } catch (e) {
        console.error('초기 로드 실패', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  // 로그인 처리 (RPC로 본인 인증)
  const handleLogin = async (phone, password) => {
    try {
      const found = await rpcLogin(phone, password);
      if (!found) {
        return { ok: false, error: '전화번호 또는 비밀번호가 맞지 않아요' };
      }
      
      // 본인 sessions + 슬롯 인원수 + 휴강일
      const todayStr = toYMDLocal(new Date());
      const [sessions, counts, closed] = await Promise.all([
        rpcGetMySessions(found.id),
        rpcGetSlotCountsRange(todayStr, 28),
        rpcGetClosedDays(),
      ]);
      setAllSessions(sessions || {});
      setSlotCounts(counts || {});
      setClosedDays(Array.isArray(closed) ? closed : []);
      setAllMembers([found]);
      setAllTrials([]);
      
      // 데이터 변환 후 user state에 저장
      // (이 시점엔 reservations가 아직 안 로드돼있어서 빈 객체로 시작 — loadMyBookings가 끝나면 폴링/refreshAll에서 다시 transform됨)
      const transformed = transformMemberData(found, sessions || {}, [], new Date(), Array.isArray(closed) ? closed : [], reservations, counts || {});
      setUser(transformed);
      // 자동 로그인용 ID 저장
      localStorage.setItem('soseon_member_id', found.id);
      return { ok: true };
    } catch (e) {
      console.error('로그인 실패', e);
      return { ok: false, error: '서버 연결 오류. 잠시 후 다시 시도해주세요.' };
    }
  };
  
  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('soseon_member_id');
    localStorage.removeItem('soseon_reservations');
    localStorage.removeItem('soseon_pending_cancels');
    setReservations({});
    setPendingCancels({});
    setUser(null);
    setTab('home');
  };
  
  // 로딩 중
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: theme.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontFamily: theme.serif, fontSize: 24, color: theme.ink }}>소선요가</div>
        <div style={{ fontSize: 11, color: theme.inkMute }}>데이터 불러오는 중...</div>
      </div>
    );
  }
  
  // 미로그인
  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }
  
  return (
    <div style={{
      minHeight: '100vh', background: theme.bg,
      maxWidth: 480, margin: '0 auto',
      position: 'relative',
    }}>
      {/* 회전 애니메이션용 keyframes */}
      <style>{`
        @keyframes sosun-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {/* 화면 */}
      <div style={{ paddingBottom: 80 }}>
        {tab === 'home' && <HomeView user={userWithNotifs} onShowModal={openModal} onGoTo={setTab} onRefresh={refreshAll} refreshing={refreshing} closedDays={closedDays} onDismissNotif={dismissNotificationFromHome} />}
        {tab === 'reservation' && <ReservationView 
          member={allMembers.find(m => m.id === user.id)}
          slotCounts={slotCounts}
          allSessions={allSessions}
          reservations={reservations}
          pendingCancels={pendingCancels}
          closedDays={closedDays}
          onShowModal={openModal} 
          onRefresh={refreshAll} 
          refreshing={refreshing} 
        />}
        {tab === 'history' && <HistoryView history={user.history} passes={user.passes} />}
        {tab === 'my' && <MyView user={user} onShowModal={setModal} onGoTo={setTab} />}
        {tab === 'assessment' && <AssessmentView user={user} onBack={() => setTab('my')} />}
      </div>
      
      {/* 모달들 */}
      <Modal open={modal === 'bell'} onClose={() => { markAllNotificationsRead(); setModal(null); }} title="🔔 알림" sub="최근 30일">
        {notifications.length === 0 ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            fontSize: 13, color: theme.inkMute,
          }}>
            아직 알림이 없어요 🌿
          </div>
        ) : notifications.map(n => (
          <div key={n.id} style={{
            background: n.unread ? theme.terraSoft : theme.card,
            border: `1px solid ${n.unread ? '#E5B5A0' : theme.line}`,
            borderRadius: 12, padding: 12, marginBottom: 8,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: n.terra ? theme.terra : theme.inkMute, marginBottom: 4 }}>{n.tag}</div>
            <div style={{ fontSize: 13, color: theme.ink, marginBottom: 4 }}>{n.msg}</div>
            <div style={{ fontSize: 10, color: theme.inkMute }}>{n.time}</div>
          </div>
        ))}
        <ModalBtn variant="ghost" onClick={() => { markAllNotificationsRead(); setModal(null); }}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'passDetail'} onClose={() => setModal(null)} title="수강권 상세" sub={`${user.pass.type} · 진행중`}>
        <div style={{
          background: theme.cardDark, color: '#FFF',
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
            <span>결제일</span><span>시작일 ~ 만료일</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
            <span>{user.pass.paymentDate}</span>
            <span>{user.pass.startDate} ~ {user.pass.expiryDate}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>진행률</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontFamily: theme.serif, fontSize: 28, fontWeight: 600 }}>{user.pass.used} / {user.pass.total}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{Math.round(user.pass.used / user.pass.total * 100)}% 진행</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${user.pass.used / user.pass.total * 100}%`, background: theme.terra }} />
          </div>
        </div>
        
        {user.pass.rhythm && user.pass.rhythm.status !== 'none' && (() => {
          const r = user.pass.rhythm;
          if (r.status === 'pending') {
            return (
              <InfoBox tone="gold">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🌿 리듬 수련 시작 예정</div>
                <div style={{ fontSize: 11 }}>
                  {r.weeks}주 동안 빠짐없이 출석하면 다음 등록 시 <strong>+{r.bonus}회 보상</strong>!
                </div>
              </InfoBox>
            );
          }
          if (r.status === 'challenging') {
            return (
              <InfoBox tone="gold">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🏆 리듬 수련 도전 중</div>
                <div style={{ fontSize: 11 }}>
                  {r.remaining > 0 
                    ? <>남은 {r.remaining}회 빠짐없이 완주하면 <strong>+{r.bonus}회 보상</strong>!</>
                    : <>완주 직전! 마지막까지 화이팅 🌿</>}
                </div>
              </InfoBox>
            );
          }
          if (r.status === 'achieved') {
            return (
              <InfoBox tone="gold">
                <div style={{ fontWeight: 700, marginBottom: 4 }}>🏆 완주 성공!</div>
                <div style={{ fontSize: 11 }}>
                  다음 등록 시 <strong>+{r.bonus}회 보상</strong>이 함께해요 🌿
                </div>
              </InfoBox>
            );
          }
          if (r.status === 'missed') {
            return (
              <InfoBox>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>🌿 리듬 수련 다음에 다시 도전해요</div>
                <div style={{ fontSize: 11, color: theme.inkSoft }}>
                  꾸준히 와주신 만큼 충분해요. 다음 수강권에서 또 도전해볼까요?
                </div>
              </InfoBox>
            );
          }
          return null;
        })()}
        
        {user.pass.canHold && <InfoBox>홀딩 1회 사용 가능 · {user.pass.holdUsed ? '사용 완료' : '미사용'}</InfoBox>}
        
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal 
        open={modal === 'classDetail'} 
        onClose={() => setModal(null)} 
        title={(() => {
          const nc = user.nextClass;
          if (!nc?.date) return '다음 수업';
          const d = new Date(nc.date);
          const m = d.getMonth() + 1;
          const day = d.getDate();
          const w = ['일','월','화','수','목','금','토'][d.getDay()];
          return `${m}월 ${day}일 (${w}) ${nc.time || ''}`;
        })()}
        sub={`${user.nextClass.type === '개인레슨' ? '개인레슨' : '소그룹 수업'} · 60분`}
      >
        {user.nextClass?.date ? (
          <>
            <InfoBox tone="terra">
              <div style={{ fontWeight: 700, marginBottom: 4 }}>예약 확정 ✓</div>
              <div>
                {user.nextClass.dday === '오늘' && '오늘 수업이에요. 5분 전까지 도착해주세요.'}
                {user.nextClass.dday === '내일' && '내일 수업이에요. 컨디션 잘 챙기세요 🌿'}
                {user.nextClass.dday !== '오늘' && user.nextClass.dday !== '내일' && `${user.nextClass.dday} · 수업 5분 전까지 도착해주세요.`}
              </div>
            </InfoBox>
            <InfoBox><strong>{user.nextClass.status}</strong></InfoBox>
          </>
        ) : (
          <InfoBox>예정된 수업이 없어요.</InfoBox>
        )}
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'book'} onClose={closeModal} title="예약 요청" sub={modalData ? `${modalData.dateLabel} ${modalData.time} ${modalData.type} 수업` : ''}>
        <InfoBox>
          <strong>고정 예약 시간 외 추가 예약</strong><br />
          강사 승인 후 확정됩니다.<br />
          승인 시 알림으로 안내드려요.
        </InfoBox>
        <InfoBox tone="terra">
          💎 차감 예정: <strong>1회</strong><br />
          남은 횟수: {user?.pass?.total - user?.pass?.used || 0}회 → {Math.max(0, (user?.pass?.total - user?.pass?.used || 0) - 1)}회 (예약 시)
        </InfoBox>
        <ModalBtn onClick={sendBookingRequest}>예약 요청 보내기</ModalBtn>
        <ModalBtn variant="ghost" onClick={closeModal}>취소</ModalBtn>
      </Modal>
      
      <CancelBookingModal
        open={modal === 'cancel'}
        onClose={closeModal}
        modalData={modalData}
        onConfirm={(reason) => cancelBooking(reason)}
      />
      
      <Modal open={modal === 'undoCancel'} onClose={closeModal} title="취소 요청 되돌리기" sub={modalData ? `${modalData.dateLabel} ${modalData.time} ${modalData.type} 수업` : ''}>
        <InfoBox>
          <strong>취소 요청을 되돌릴까요?</strong><br />
          아직 강사 확인 전이라 되돌릴 수 있어요.<br />
          되돌리면 원래대로 예약 상태가 됩니다.
        </InfoBox>
        <ModalBtn onClick={undoCancelRequest}>되돌리기</ModalBtn>
        <ModalBtn variant="ghost" onClick={closeModal}>그대로 두기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'notice'} onClose={() => setModal(null)} title="휴무 안내" sub="소선요가">
        {(() => {
          const todayStr = toYMDLocal(new Date());
          // 오늘 이후 가장 가까운 휴무
          const upcoming = [];
          (closedDays || []).forEach(c => {
            if (c?.date && c.date > todayStr) {
              upcoming.push({ date: c.date, reason: c.reason || '휴무' });
            }
          });
          Array.from(HOLIDAYS_2026).forEach(d => {
            if (d > todayStr && !upcoming.some(h => h.date === d)) {
              upcoming.push({ date: d, reason: HOLIDAY_NAMES_2026[d] || '공휴일' });
            }
          });
          upcoming.sort((a, b) => a.date.localeCompare(b.date));
          const nearest = upcoming[0];
          if (!nearest) {
            return (
              <div style={{ fontSize: 13, color: theme.ink, lineHeight: 1.7 }}>
                예정된 휴무가 없습니다 🌿
              </div>
            );
          }
          // 요일 계산
          const d = new Date(nearest.date);
          const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
          const [, mm, dd] = nearest.date.split('-');
          const label = `${parseInt(mm)}/${parseInt(dd)} (${dowNames[d.getDay()]})`;
          return (
            <>
              <InfoBox tone="terra"><strong>{label} {nearest.reason} 휴무</strong></InfoBox>
              <div style={{ fontSize: 13, color: theme.ink, lineHeight: 1.7, marginTop: 8 }}>
                안녕하세요 회원님 ☺️<br />
                소선요가입니다.<br /><br />
                {label} {nearest.reason}은(는) 휴무입니다.<br />
                해당 시간 수업 예약하신 회원님께는<br />
                개별 안내 드리겠습니다.<br /><br />
                좋은 한 주 보내세요 🌿
              </div>
            </>
          );
        })()}
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>확인</ModalBtn>
      </Modal>
      
      <PasswordChangeModal 
        open={modal === 'passwordChange'} 
        onClose={() => setModal(null)} 
        userId={user?.id}
        onDone={(msg) => { setModal(null); setToast(msg); }}
      />
      
      <Modal open={modal === 'contact'} onClose={() => setModal(null)} title="문의하기" sub="편하게 연락 주세요 🌿">
        <ModalBtn variant="dark" icon={Phone} onClick={() => window.location.href = 'tel:010-3040-4404'}>010-3040-4404</ModalBtn>
        <ModalBtn variant="kakao" icon={MessageCircle} onClick={() => window.open('http://pf.kakao.com/_sPxjqX', '_blank')}>카카오톡 채널 문의</ModalBtn>
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'guide'} onClose={() => setModal(null)} title="이용 안내">
        <div style={{ fontSize: 13, lineHeight: 1.8 }}>
          <Heading>⏳ 이용 안내</Heading>
          · 모든 수업은 사전 예약제<br />
          · 수업 6시간 전까지 취소·변경 가능<br />
          · 당일 6시간 이전 취소·노쇼 시 1회 차감
          
          <Heading>✔ 운영 안내</Heading>
          · 소그룹 수련 운영: 화·목<br />
          · 소규모 정원: 정원 5명<br />
          · 예약 후 방문을 원칙으로 합니다
          
          <Heading>🌿 수련 리듬 보너스</Heading>
          <div style={{ fontSize: 12, color: theme.inkSoft, marginTop: 4, marginBottom: 6 }}>
            소선은 주 2회 수련 리듬을 권장합니다.<br />
            권장 리듬에 맞춰 등록 횟수를 모두 사용한 경우<br />
            재등록 시 보너스 수업이 제공됩니다.
          </div>
          · 1개월권 4주 내 8회 → +1회<br />
          · 3개월권 12주 내 24회 → +3회<br />
          <span style={{ fontSize: 11, color: theme.inkMute }}>※ 보너스는 다음 등록 시 제공</span>
          
          <Heading>🌱 수업 에티켓</Heading>
          · 수련 20분 전 요가원 입장 가능합니다<br />
          · 5분 전 도착해 주세요<br />
          · 핸드폰은 무음으로 해주세요<br />
          · 수련 시작 5분 후까지만 출석 가능합니다
        </div>
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'terms'} onClose={() => setModal(null)} title="이용 약관" sub="소선요가 회원권 규정">
        <div style={{ fontSize: 12, lineHeight: 1.7, color: theme.inkSoft }}>
          본 약관은 소선요가(이하 "스튜디오")의 회원권 이용 규정 및 회원과 스튜디오 간의 권리·의무를 규정합니다.
          
          <TermTitle>제 1조 회원권 종류 및 이용</TermTitle>
          소선요가는 소그룹 예약제 요가 스튜디오로 모든 수업은 사전 예약 후 이용 가능합니다. 예약 취소 및 변경은 수업 시작 12시간 전까지 가능하며 이후 취소 또는 무단 결석(No-show)은 1회 차감됩니다.<br /><br />
          <strong>회원권 종류</strong><br />
          · 정기 수련 회원권: 1개월권(8회/6주, 42일), 3개월권(24회/16주, 112일)<br />
          · 스타터 패키지: 개인레슨 3회 + 소그룹 레슨 6회(5주, 35일) 또는 8회(6주, 42일)
          
          <TermTitle>제 2조 정지(휴회)</TermTitle>
          정지는 3개월권에 한해 1회, 최대 1주 가능하며 사전 요청 시 적용됩니다.
          
          <TermTitle>제 3조 환불 및 양도</TermTitle>
          환불 및 정산 시 적용되는 정상가는 소그룹 레슨 1회 30,000원, 개인레슨 1회 80,000원입니다.<br /><br />
          <strong>환불 규정</strong>: 회원권 이용 시작 이후 환불 시 결제금액에서 ① 정상가 기준 이용금액 ② 위약금 10% ③ 카드 결제 및 현금영수증 발행 수수료 10%를 차감한 금액을 환불합니다.<br /><br />
          <strong>양도 규정</strong>: 회원권은 원칙적으로 양도 불가합니다. 단, 부득이한 경우 협의 후 1회에 한해 양도 가능합니다. 수수료 20,000원이 발생합니다.
          
          <TermTitle>제 4조 개인레슨</TermTitle>
          개인레슨은 사전 예약 후 진행하며 24시간 전까지 변경·취소 가능합니다.
          
          <TermTitle>제 5조 안전 및 책임</TermTitle>
          회원은 수련 전 건강 상태 및 부상 여부를 스튜디오에 고지해야 합니다. 회원의 부주의, 기존 질환 또는 개인 건강 상태로 인한 사고에 대해 스튜디오는 책임을 지지 않습니다.
          
          <TermTitle>제 6조 개인정보</TermTitle>
          스튜디오는 회원 등록 및 운영을 위해 개인정보를 수집할 수 있으며 예약 안내 및 운영 공지 목적으로 사용합니다. 개인정보는 제3자에게 제공되지 않습니다.
          
          <TermTitle>제 7조 효력발생</TermTitle>
          본 약관은 회원이 회원권 결제 후 서명한 날로부터 효력이 발생합니다.
        </div>
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'logout'} onClose={() => setModal(null)} title="로그아웃" sub="정말 로그아웃 하시겠어요?">
        <ModalBtn variant="terra" onClick={() => { setModal(null); handleLogout(); }}>로그아웃</ModalBtn>
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>취소</ModalBtn>
      </Modal>
      
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%',
          transform: 'translateX(-50%)',
          background: theme.cardDark, color: 'white',
          padding: '10px 20px', borderRadius: 999,
          fontSize: 13, fontWeight: 500,
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}
      
      {/* Tab Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: '0 auto',
        height: 70, background: theme.card,
        borderTop: `1px solid ${theme.line}`,
        display: 'flex', padding: '8px 0 14px', zIndex: 50,
      }}>
        <Tab icon={Home} label="홈" active={tab === 'home'} onClick={() => setTab('home')} />
        <Tab icon={Calendar} label="예약" active={tab === 'reservation'} onClick={() => setTab('reservation')} />
        <Tab icon={ClipboardList} label="이력" active={tab === 'history'} onClick={() => setTab('history')} />
        <Tab icon={User} label="내정보" active={tab === 'my' || tab === 'assessment'} onClick={() => setTab('my')} />
      </div>
    </div>
  );
}

function Tab({ icon: Icon, label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 3, cursor: 'pointer',
      color: active ? theme.terra : theme.inkMute,
    }}>
      <Icon size={20} />
      <div style={{ fontSize: 10, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{
    fontSize: 11, fontWeight: 600, color: theme.inkSoft,
    margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em',
  }}>{children}</div>;
}

function Input({ type = 'text', placeholder, value, onChange }) {
  return <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{
    width: '100%', padding: 12,
    border: `1px solid ${theme.line}`, background: theme.card,
    borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
  }} />;
}

function Heading({ children }) {
  return <h3 style={{
    fontSize: 14, fontWeight: 700, color: theme.terra,
    margin: '16px 0 6px',
  }}>{children}</h3>;
}

function TermTitle({ children }) {
  return <div style={{
    fontWeight: 700, color: theme.ink, fontSize: 13,
    margin: '14px 0 4px',
  }}>{children}</div>;
}

function CancelBookingModal({ open, onClose, modalData, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  
  const isPrivate = modalData?.type === '개인' || modalData?.isPrivate;
  const isPending = modalData?.state === 'pending';
  const isFixed = modalData?.isFixed;
  
  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) { setReason(''); setBusy(false); }
  }, [open]);
  
  const submit = async () => {
    if (busy) return;
    // 개인레슨은 사유 필수
    if (isPrivate && !reason.trim()) return;
    setBusy(true);
    await onConfirm(reason.trim());
    // 모달은 onConfirm 안에서 닫힘
  };
  
  if (!modalData) return null;
  
  return (
    <Modal open={open} onClose={onClose} title="예약 취소" sub={`${modalData.dateLabel} ${modalData.time} ${modalData.type} 수업`}>
      <InfoBox>
        {isPending ? (
          <>
            <strong>예약 요청 취소</strong><br />
            아직 강사 승인 전이라 바로 취소돼요.
          </>
        ) : isPrivate ? (
          <>
            <strong>개인레슨 취소 요청</strong><br />
            강사님께 사유와 함께 알림이 가요.<br />
            강사 확인 후 일정에서 빠집니다.
          </>
        ) : isFixed ? (
          <>
            <strong>이번 회차만 취소</strong><br />
            강사님 확인 후 적용됩니다.<br />
            다음 주 같은 시간은 그대로 유지돼요.
          </>
        ) : (
          <>
            <strong>예약 취소</strong><br />
            강사님께 자동으로 알림이 가요.<br />
            강사 확인 후 일정에서 빠집니다.
          </>
        )}
      </InfoBox>
      
      {/* 사유 입력 (개인레슨은 필수, 다른 건 선택) */}
      {!isPending && (
        <>
          <FieldLabel>
            취소 사유 {isPrivate && <span style={{ color: theme.terra }}>*</span>}
            {!isPrivate && <span style={{ fontSize: 10, color: theme.inkMute, fontWeight: 400, marginLeft: 6 }}>(선택)</span>}
          </FieldLabel>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isPrivate 
              ? "예: 갑자기 일정이 생겨서 어렵게 됐어요" 
              : "사유를 적어주시면 강사님이 더 잘 이해하실 거예요"}
            rows={3}
            style={{
              width: '100%', padding: 12,
              border: `1px solid ${theme.line}`, background: theme.card,
              borderRadius: 10, fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', minHeight: 70,
            }}
          />
          {isPrivate && !reason.trim() && (
            <div style={{ fontSize: 11, color: theme.inkMute, marginTop: 4 }}>
              개인레슨은 사유를 꼭 적어주세요
            </div>
          )}
        </>
      )}
      
      <ModalBtn 
        variant="terra" 
        onClick={submit}
        disabled={busy || (isPrivate && !reason.trim())}
      >
        {busy ? '전송 중...' : '취소 요청 보내기'}
      </ModalBtn>
      <ModalBtn variant="ghost" onClick={onClose}>돌아가기</ModalBtn>
    </Modal>
  );
}

function PasswordChangeModal({ open, onClose, userId, onDone }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // 모달이 열리면 입력 초기화
  useEffect(() => {
    if (open) {
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
      setError('');
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    setError('');
    if (!oldPw) { setError('현재 비밀번호를 입력해주세요'); return; }
    if (!newPw || newPw.length < 4) { setError('새 비밀번호는 4자 이상이어야 해요'); return; }
    if (newPw !== confirmPw) { setError('새 비밀번호가 일치하지 않아요'); return; }
    if (oldPw === newPw) { setError('현재와 다른 비밀번호로 설정해주세요'); return; }
    
    setBusy(true);
    const result = await rpcChangePassword(userId, oldPw, newPw);
    setBusy(false);
    
    if (!result || !result.ok) {
      setError(result?.error || '변경 실패. 다시 시도해주세요');
      return;
    }
    onDone('✓ 비밀번호가 변경되었어요');
  };

  return (
    <Modal open={open} onClose={onClose} title="비밀번호 변경" sub="새로운 비밀번호로 변경할 수 있어요">
      <FieldLabel>현재 비밀번호</FieldLabel>
      <Input type="password" placeholder="••••" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
      <FieldLabel>새 비밀번호</FieldLabel>
      <Input type="password" placeholder="4자 이상" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
      <FieldLabel>새 비밀번호 확인</FieldLabel>
      <Input type="password" placeholder="다시 한 번" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
      {error && (
        <div style={{ 
          fontSize: 12, color: theme.terra, 
          padding: '8px 12px', marginTop: 8,
          background: theme.terraSoft, borderRadius: 8,
        }}>{error}</div>
      )}
      <ModalBtn onClick={submit} disabled={busy}>{busy ? '변경 중...' : '변경하기'}</ModalBtn>
      <ModalBtn variant="ghost" onClick={onClose}>취소</ModalBtn>
    </Modal>
  );
}
