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
function transformMemberData(rawMember, allSessions, allTrials, today) {
  if (!rawMember) return null;
  
  const todayStr = today.toISOString().split('T')[0];
  
  // 활성 수강권 (만료 안 된 것 중 가장 최근)
  const activePass = (rawMember.passes || []).find(p => 
    !p.archived && p.expiryDate >= todayStr && p.startDate <= todayStr
  ) || (rawMember.passes || []).find(p => !p.archived) || null;
  
  // 다음 수업 (참여한 sessions 중 미래)
  let nextSession = null;
  Object.values(allSessions || {}).forEach(s => {
    if (!s?.date || !s?.participants) return;
    if (s.date < todayStr) return;
    const part = s.participants.find(p => p.memberId === rawMember.id && !p.cancelled);
    if (!part) return;
    if (!nextSession || s.date < nextSession.date) {
      nextSession = { ...s, _part: part };
    }
  });
  
  // 수업 이력 (과거 sessions)
  const history = [];
  Object.values(allSessions || {}).forEach(s => {
    if (!s?.date || !s?.participants) return;
    if (s.date > todayStr) return;
    const part = s.participants.find(p => p.memberId === rawMember.id);
    if (!part) return;
    
    let status = 'attended', label = '출석';
    if (part.cancelled === 'no_charge') { status = 'cancelled_advance'; label = '예약 취소'; }
    else if (part.cancelled === 'charged') { status = 'cancelled_sameday'; label = '당일 취소'; }
    else if (part.status === 'no_show') { status = 'no_show'; label = '노쇼'; }
    else if (part.status === 'reserved' && s.date >= todayStr) { status = 'reserved'; label = '예약 확정'; }
    
    history.push({
      date: s.date,
      time: s.time,
      status, label,
      num: part.sessionNumber,
    });
  });
  history.sort((a, b) => b.date.localeCompare(a.date));
  
  // 고정 슬롯 → 텍스트
  const dowMap = ['일', '월', '화', '수', '목', '금', '토'];
  const fixedSlotText = (rawMember.fixedSlots || []).length > 0
    ? rawMember.fixedSlots.map(fs => `${dowMap[fs.dow]} ${fs.time}`).join(' / ')
    : '';
  
  // 추천 자세 (회원의 keyPoint/notes 기반)
  const keyPoint = (rawMember.keyPoint || '').toLowerCase();
  const notes = (rawMember.notes || '').toLowerCase();
  let recommendation = {
    icon: '🌱',
    text: '허리를 펴고 <strong>숨을 크게 마셔보세요.</strong>',
  };
  if (keyPoint.includes('코어') || notes.includes('코어')) {
    recommendation = { icon: '💪', text: '코어 강화 — 오늘은 <strong>플랭크 30초씩 3번</strong> 해보세요.' };
  } else if (keyPoint.includes('어깨') || notes.includes('어깨')) {
    recommendation = { icon: '🤲', text: '어깨 풀기 — <strong>어깨 돌리기 10번씩 3세트</strong> 해보세요.' };
  } else if (keyPoint.includes('고관절') || notes.includes('고관절')) {
    recommendation = { icon: '🌱', text: '고관절 부드럽게 — <strong>나비 자세 1분씩 3번</strong> 해보세요.' };
  } else if (keyPoint.includes('허리') || notes.includes('허리')) {
    recommendation = { icon: '🌱', text: '허리 — 호흡 깊이 <strong>들이마시고 천천히 내쉬어보세요.</strong>' };
  } else if (keyPoint.includes('발') || notes.includes('발')) {
    recommendation = { icon: '🦶', text: '발 안정성 — 엄지발가락 아래를 누르며 <strong>발의 묵직함을 느껴보세요.</strong>' };
  }
  
  return {
    id: rawMember.id,
    name: rawMember.name || '회원',
    phone: maskPhone(rawMember.phone),
    initial: (rawMember.name || '회').slice(-1),
    since: rawMember.createdAt || '',
    pass: {
      type: activePass?.type || '활성 수강권 없음',
      used: activePass?.usedSessions || 0,
      total: activePass?.totalSessions || 0,
      paymentDate: activePass?.paymentDate || '',
      startDate: activePass?.startDate || '',
      expiryDate: activePass?.expiryDate || '',
      canHold: activePass?.canHold || false,
      holdUsed: activePass?.holdUsed || false,
      fixedSlot: fixedSlotText || '-',
      rhythm: {
        status: 'pending',
        bonus: 1,
        remaining: 0,
        daysRemaining: 0,
      },
    },
    recommendation,
    nextClass: nextSession ? formatNextClass(nextSession, today) : {
      date: '', month: '-', day: '-', weekday: '-',
      time: '예정된 수업 없음', type: '-', status: '-', dday: '-',
    },
    history: history.slice(0, 20),
    notifications: [
      { id: 1, tag: '환영', terra: true, msg: '소선요가에 오신 것을 환영합니다 🌿', time: '방금', unread: true },
      { id: 2, tag: '공지', msg: '5/5 어린이날 휴무 안내드려요.', time: '오늘' },
    ],
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
  const dayDiff = Math.floor((d - today) / (1000*60*60*24));
  let dday = `D-${dayDiff}`;
  if (dayDiff === 0) dday = '오늘';
  else if (dayDiff === 1) dday = '내일';
  
  const part = s._part || {};
  const isPrivate = part.classType === '개인';
  const total = (s.participants || []).filter(p => !p.cancelled).length;
  
  return {
    date: s.date,
    month: monthNames[d.getMonth()],
    day: String(d.getDate()),
    weekday: weekdays[d.getDay()],
    time: s.time ? `${s.time.startsWith('1') || s.time.startsWith('0') ? '오전' : '오후'} ${s.time}` : '',
    type: isPrivate ? '개인레슨' : '소그룹',
    status: `${total}명 참여`,
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
  recommendation: {
    icon: '💪',
    text: '코어 강화 — 오늘은 <strong>플랭크 30초씩 3번</strong> 해보세요.',
  },
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
  notifications: [
    { id: 1, tag: '환영', terra: true, msg: '소선요가에 오신 것을 환영합니다 🌿', time: '방금', unread: true },
    { id: 2, tag: '공지', msg: '5/5 어린이날 휴무 안내드려요.', time: '오늘' },
  ],
};

// 동적 스케줄 생성 - 오늘부터 7일
// 동적 스케줄 생성 - startDate부터 7일
// 데이터 출처:
//   - member: 회원의 fixedSlots, id 정보
//   - allMembers: 전체 회원 목록 (다른 회원의 fixedSlots로 가상 인원 계산)
//   - allSessions: 강사 앱 sessions 테이블 (실제 참여자, 취소 상태)
//   - reservations: 회원 앱에서 보낸 추가 예약 요청 (key: dateStr_time)
//   - pendingCancels: 회원 앱에서 보낸 취소 요청 (key: dateStr_time)
//   - groupSlots: 화·목 시간대 (예: ['11:00', '19:20', '20:50'])
//   - startDate: 시작 날짜 (기본: 오늘)
function generateSchedule(member, allMembers = [], allSessions = {}, reservations = {}, pendingCancels = {}, groupSlots = ['11:00', '19:20', '20:50'], startDate = null) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const start = startDate ? new Date(startDate) : today;
  start.setHours(0, 0, 0, 0);
  const weekdayNames = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const CAPACITY = 5;
  
  // 회원의 고정 슬롯 → "{dow}_{time}" 셋
  const fixedSet = new Set((member?.fixedSlots || []).map(fs => `${fs.dow}_${fs.time}`));
  
  // 슬롯별 고정 회원 수 계산: { "dow_time": [memberId, ...] }
  // 활성 수강권(소그룹, 만료 안 됨, 시작일 이후)이 있는 회원만 카운트
  const fixedByDOW = {};
  (allMembers || []).forEach(m => {
    if (!m.fixedSlots || m.fixedSlots.length === 0) return;
    // 활성 소그룹 수강권 있는지 확인
    const hasActivePass = (m.passes || []).some(p => 
      !p.archived && p.category === 'group' && 
      p.startDate && p.expiryDate &&
      p.expiryDate >= todayStr &&
      (p.usedSessions || 0) < (p.totalSessions || 0)
    );
    if (!hasActivePass) return;
    m.fixedSlots.forEach(fs => {
      const k = `${fs.dow}_${fs.time}`;
      if (!fixedByDOW[k]) fixedByDOW[k] = [];
      fixedByDOW[k].push({ id: m.id, name: m.name, startDate: (m.passes.find(p => !p.archived && p.category === 'group')?.startDate) });
    });
  });
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const isToday = dateStr === todayStr;
    const dayLabel = `${d.getDate()}`;
    
    const slots = [];
    
    // 화·목만 수업
    if (dow === 2 || dow === 4) {
      groupSlots.forEach(time => {
        const key = `${dateStr}_${time}`;
        const sess = allSessions[key];
        // 실제 참여자 수 (취소 안 된 것만)
        const realParticipants = (sess?.participants || []).filter(p => !p.cancelled && p.status !== 'cancelled_advance' && p.status !== 'cancelled_sameday');
        const realCount = realParticipants.length;
        const hasRealSession = realCount > 0; // 강사가 이미 일정을 만들었나?
        
        // 이 슬롯에 고정인 회원들 (수강권 시작일 이전이면 제외)
        const fixedMembersForSlot = (fixedByDOW[`${dow}_${time}`] || []).filter(m => 
          !m.startDate || m.startDate <= dateStr
        );
        
        // 가상 인원: 강사 일정이 있으면 그걸 우선, 없으면 fixedMembers 기준
        const virtualCount = hasRealSession ? realCount : fixedMembersForSlot.length;
        
        // 이 회원이 이 슬롯에 들어있나? (강사 sessions 기준)
        const myPart = realParticipants.find(p => p.memberId === member?.id);
        
        // 회원이 보낸 예약 요청
        const myRequest = reservations[key];
        
        // 회원이 보낸 취소 요청
        const myCancelPending = pendingCancels[key];
        
        // 고정 슬롯인가? (회원 본인의 fixedSlots 기준)
        const isFixed = fixedSet.has(`${dow}_${time}`);
        // 본인 수강권 시작일 이후인가? (시작 전이면 고정 효력 X)
        const myActivePass = (member?.passes || []).find(p => !p.archived && p.category === 'group');
        const fixedActive = isFixed && (!myActivePass?.startDate || myActivePass.startDate <= dateStr);
        
        // 시간 표시
        const endTime = (() => {
          const [h, m] = time.split(':').map(Number);
          const eh = h + 1;
          return `${String(eh).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
        })();
        const timeLabel = `${time} ~ ${endTime}`;
        
        // 상태 결정
        let info;
        if (myCancelPending) {
          // 내가 취소 요청 보냄 (강사 승인 대기)
          info = { cap: '취소 요청 중 · 강사 확인 대기', state: 'cancel_pending', cancelBookingId: myCancelPending.bookingId };
        } else if (myPart) {
          // 강사 sessions에 내가 등록돼 있음 → 확정 예약
          info = { cap: `예약됨 · ${virtualCount}/${CAPACITY}`, state: 'reserved', isFixed };
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
    
    days.push({
      date: dayLabel,
      dateStr,
      weekday: weekdayNames[dow],
      isToday,
      slots,
      empty: slots.length === 0,
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
function HomeView({ user, onShowModal, onGoTo, onRefresh, refreshing }) {
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
              <div style={{ fontSize: 12, fontWeight: 500, color: '#FFB892' }}>
                {user.pass.rhythm?.status === 'pending' ? '시작 예정' :
                 user.pass.rhythm?.status === 'achieved' ? '🏆 성공!' :
                 user.pass.rhythm?.status === 'challenging' ? <>🏆 도전중</> :
                 '진행 중'}
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

      {/* 공지 */}
      <div onClick={() => onShowModal('notice')} style={{
        margin: '0 24px',
        background: theme.terraSoft, border: '1px solid #E5B5A0',
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: '#5E3A20', cursor: 'pointer',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.terra }} />
        <span><strong>5월 휴무 안내</strong> · 5/5 어린이날 휴무</span>
      </div>

      {/* 오늘의 추천 */}
      {user.recommendation && (
        <>
          <div style={{
            fontFamily: theme.serif, fontSize: 16, fontWeight: 500,
            color: theme.ink, margin: '20px 24px 8px',
          }}>
            오늘의 추천
          </div>
          <div style={{
            margin: '0 24px',
            background: 'linear-gradient(135deg, #FFF8ED 0%, #F5EBC8 100%)',
            border: '1px solid #D4B574',
            borderRadius: 14,
            padding: '14px 16px',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 14 }}>{user.recommendation.icon || '🌱'}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#8A6418',
                letterSpacing: '0.08em',
              }}>{(user.name || '회원').slice(-2)}님께</span>
            </div>
            <div 
              style={{ fontSize: 13, color: '#2D2A26', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: user.recommendation.text }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   RESERVATION
   ========================================================= */
function ReservationView({ member, allMembers, allSessions, reservations, pendingCancels, onShowModal, onRefresh, refreshing }) {
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
  
  const schedule = generateSchedule(member, allMembers, allSessions, reservations, pendingCancels, ['11:00', '19:20', '20:50'], startDate);
  
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
        {schedule.map((day, di) => (
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
            {day.empty && (
              <div style={{ textAlign: 'center', padding: 14, color: theme.inkMute, fontStyle: 'italic', fontFamily: theme.serif, fontSize: 13 }}>
                — 수업 없음 —
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
    : theme.card;
  const border = slot.state === 'reserved' ? '#E5B5A0' 
    : slot.state === 'pending' ? theme.gold 
    : slot.state === 'cancel_pending' ? theme.line
    : theme.line;
  
  const slotInfo = { ...slot, dateStr: day?.dateStr, dateLabel: `${day?.date} (${day?.weekday})` };
  
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 14, padding: '10px 12px',
      marginBottom: 8, display: 'flex',
      alignItems: 'center', gap: 12,
      opacity: slot.state === 'cancel_pending' ? 0.65 : 1,
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
          color: slot.state === 'cancel_pending' ? theme.inkMute : theme.terra, 
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
function HistoryView({ history }) {
  // 월별 그룹
  const byMonth = {};
  history.forEach(h => {
    const ym = h.date.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(h);
  });
  const months = Object.keys(byMonth).sort().reverse();
  
  const fmtMonth = (ym) => {
    const [y, m] = ym.split('-');
    return `${y}년 ${parseInt(m, 10)}월`;
  };
  
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="수업 이력" />
      <div style={{ padding: '0 24px' }}>
        {months.map(ym => (
          <div key={ym}>
            <div style={{ fontFamily: theme.serif, fontStyle: 'italic', fontSize: 13, color: theme.inkMute, margin: '12px 0 6px', paddingLeft: 4 }}>
              {fmtMonth(ym)}
            </div>
            {byMonth[ym].map((h, i) => (
              <div key={i} style={{
                background: theme.card, border: `1px solid ${theme.line}`,
                borderRadius: 12, padding: '12px 14px',
                marginBottom: 6, display: 'flex',
                alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 12, color: theme.inkMute, fontWeight: 500 }}>{h.date.slice(5)}</span>
                <span style={{ fontFamily: theme.serif, fontSize: 13, fontWeight: 600, color: theme.terra }}>{h.time}</span>
                <div style={{ flex: 1 }} />
                {h.num && <span style={{ fontSize: 11, color: theme.inkSoft, fontWeight: 500 }}>{h.num}/24</span>}
                <Chip tone={
                  h.status === 'attended' ? 'green' :
                  h.status === 'reserved' ? 'terra' :
                  h.status === 'cancelled_advance' ? 'neutral' :
                  h.status === 'cancelled_sameday' ? 'warn' :
                  h.status === 'no_show' ? 'danger' : 'neutral'
                }>
                  {h.label}
                </Chip>
              </div>
            ))}
          </div>
        ))}
      </div>
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
          <MenuItem icon="🔔" label="알림 설정" />
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
  return (
    <div style={{ paddingBottom: 100 }}>
      <TopBar title="분석 결과" onBack={onBack} />
      
      <div style={{
        background: theme.card, border: `1px solid ${theme.line}`,
        borderRadius: 14, padding: 14, margin: '0 24px 12px',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: theme.terra,
          marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>체크 포인트</div>
        {a.checkPoints.map((c, i) => (
          <div key={i} style={{
            fontSize: 12, color: theme.terra,
            lineHeight: 1.6, padding: '4px 0',
            display: 'flex', gap: 6,
          }}>
            <span style={{ color: theme.terra, fontWeight: 700 }}>·</span>{c}
          </div>
        ))}
      </div>
      
      <div style={{
        background: theme.card, border: `1px solid ${theme.line}`,
        borderRadius: 14, padding: 14, margin: '0 24px 12px',
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: theme.terra,
          marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>추천 동작</div>
        {a.recommendations.map((r, i) => (
          <div key={i} style={{
            fontSize: 12, color: theme.ink,
            lineHeight: 1.6, padding: '4px 0',
            display: 'flex', gap: 6,
          }}>
            <span style={{ color: theme.terra, fontWeight: 700 }}>·</span>{r}
          </div>
        ))}
      </div>
      
      <div style={{
        margin: '0 24px',
        fontSize: 11, color: theme.inkMute,
        textAlign: 'center', padding: '14px 0',
      }}>
        업데이트: {a.updatedAt}<br />
        강사님이 직접 작성하신 내용이에요 🌿
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */
// 로그인 화면 (테스트용 - 전화번호 뒷4자리 + 비밀번호)
function LoginView({ onLogin, loading }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
  const [toast, setToast] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // 토스트 메시지 자동 사라짐
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  
  // 🔙 안드로이드 뒤로가기 처리
  // - 모달 열려있으면: 모달만 닫음
  // - assessment 화면이면: my로
  // - 홈이 아니면: 홈으로
  // - 홈이면: 기본 동작 (앱 종료)
  useEffect(() => {
    // 처음 진입 시 history에 항상 1개 dummy state 두기
    if (!window.history.state || !window.history.state.sosunMember) {
      window.history.replaceState({ sosunMember: 'home' }, '');
    }
    
    const handlePop = (e) => {
      // 우선순위: modal > assessment > 다른 탭 > 홈(종료)
      if (modal) {
        closeModal();
        // 다시 history 추가해서 또 뒤로가기 가능하게
        window.history.pushState({ sosunMember: 'home' }, '');
        return;
      }
      if (tab === 'assessment') {
        setTab('my');
        window.history.pushState({ sosunMember: 'home' }, '');
        return;
      }
      if (tab !== 'home') {
        setTab('home');
        window.history.pushState({ sosunMember: 'home' }, '');
        return;
      }
      // 홈이면 기본 동작 → 한 번 더 누르면 앱 종료
      // 여기서는 아무것도 안 하고 popstate가 자연스럽게 진행되게 둠
      // (다음 popstate를 위한 dummy state 다시 추가)
      window.history.pushState({ sosunMember: 'home' }, '');
    };
    
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [modal, tab]);
  
  // 모달이나 탭 전환 시 history에 상태 push
  useEffect(() => {
    if (modal) {
      window.history.pushState({ sosunMember: 'modal', name: modal }, '');
    }
  }, [modal]);
  
  useEffect(() => {
    if (tab !== 'home') {
      window.history.pushState({ sosunMember: 'tab', name: tab }, '');
    }
  }, [tab]);
  
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
    
    const inserted = await sbInsertBooking({
      member_id: user.id,
      member_name: user.name,
      member_phone: user.phone,
      date: modalData.dateStr,
      time: (modalData.time || '').split(' ')[0], // "11:00 ~ 12:00" → "11:00"
      class_type: modalData.type || '소그룹',
      status: 'pending',
      note: '회원 앱에서 요청',
    });
    
    if (inserted) {
      // 로컬에 반영
      const newReservations = { ...reservations, [modalData.key]: { 
        state: 'pending', 
        date: modalData.dateStr, 
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
  const cancelBooking = async () => {
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
    const inserted = await sbInsertBooking({
      member_id: user.id,
      member_name: user.name,
      member_phone: user.phone,
      date: modalData.dateStr,
      time: time24,
      class_type: modalData.type || '소그룹',
      status: 'pending_cancel', // 강사 승인 대기 (취소 요청)
      note: '회원 앱에서 취소 요청',
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
  const loadMyBookings = async () => {
    if (!user) return;
    const bookings = await sbGetBookingsForMember(user.id);
    const newReservations = {};
    const newCancels = {};
    bookings.forEach(b => {
      const key = `${b.date}_${b.time}`;
      // 추가 예약 요청 (pending/approved)
      if (b.status === 'pending') {
        newReservations[key] = {
          state: 'pending',
          date: b.date,
          time: b.time,
          bookingId: b.id,
        };
      } else if (b.status === 'approved') {
        newReservations[key] = {
          state: 'reserved',
          date: b.date,
          time: b.time,
          bookingId: b.id,
        };
      }
      // 취소 요청 (pending_cancel만)
      else if (b.status === 'pending_cancel') {
        newCancels[key] = {
          bookingId: b.id,
          date: b.date,
          time: b.time,
        };
      }
    });
    setReservations(newReservations);
    setPendingCancels(newCancels);
    localStorage.setItem('soseon_reservations', JSON.stringify(newReservations));
    localStorage.setItem('soseon_pending_cancels', JSON.stringify(newCancels));
  };
  
  // 전체 새로고침 (회원·세션·예약 다 다시 가져오기)
  const refreshAll = async () => {
    if (!user || refreshing) return;
    setRefreshing(true);
    try {
      // RPC로 본인 데이터만 갱신
      const found = await rpcGetMyData(user.id);
      const sessions = await rpcGetMySessions(user.id) || {};
      
      if (found) {
        setAllMembers([found]);
        setAllSessions(sessions);
        const transformed = transformMemberData(found, sessions, [], new Date());
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
  
  // user 변경 시 본인 예약 자동 로드
  useEffect(() => {
    if (user) loadMyBookings();
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
            // 본인의 sessions만 RPC로
            const sessions = await rpcGetMySessions(savedId) || {};
            setAllSessions(sessions);
            setAllMembers([found]); // 본인만 저장
            const transformed = transformMemberData(found, sessions, [], new Date());
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
      
      // 본인 sessions 가져오기
      const sessions = await rpcGetMySessions(found.id) || {};
      setAllSessions(sessions);
      setAllMembers([found]);
      setAllTrials([]);
      
      // 데이터 변환 후 user state에 저장
      const transformed = transformMemberData(found, sessions, [], new Date());
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
        {tab === 'home' && <HomeView user={user} onShowModal={openModal} onGoTo={setTab} onRefresh={refreshAll} refreshing={refreshing} />}
        {tab === 'reservation' && <ReservationView 
          member={allMembers.find(m => m.id === user.id)}
          allMembers={allMembers}
          allSessions={allSessions}
          reservations={reservations}
          pendingCancels={pendingCancels}
          onShowModal={openModal} 
          onRefresh={refreshAll} 
          refreshing={refreshing} 
        />}
        {tab === 'history' && <HistoryView history={user.history} />}
        {tab === 'my' && <MyView user={user} onShowModal={setModal} onGoTo={setTab} />}
        {tab === 'assessment' && <AssessmentView user={user} onBack={() => setTab('my')} />}
      </div>
      
      {/* 모달들 */}
      <Modal open={modal === 'bell'} onClose={() => setModal(null)} title="🔔 알림" sub="최근 30일">
        {user.notifications.map(n => (
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
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
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
        
        {user.pass.rhythm && (
          <InfoBox tone="gold">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 700 }}>🏆 리듬 수련 도전중</div>
              <div style={{ fontSize: 10.5, color: '#8B6F30' }}>{user.pass.rhythm.elapsedDays} / {user.pass.rhythm.limitDays}일</div>
            </div>
            <div style={{ height: 4, background: 'rgba(201,169,97,0.25)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${user.pass.rhythm.elapsedDays / user.pass.rhythm.limitDays * 100}%`, background: theme.gold, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11 }}>
              남은 {user.pass.rhythm.remaining}회를 {user.pass.rhythm.daysRemaining}일 안에 완료하면 <strong>+{user.pass.rhythm.bonus}회 보상</strong>!
            </div>
          </InfoBox>
        )}
        
        {user.pass.canHold && <InfoBox>홀딩 1회 사용 가능 · {user.pass.holdUsed ? '사용 완료' : '미사용'}</InfoBox>}
        
        <ModalBtn variant="ghost" onClick={() => setModal(null)}>닫기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'classDetail'} onClose={() => setModal(null)} title="4월 28일 (화) 11:00" sub="소그룹 수업 · 60분">
        <InfoBox tone="terra">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>예약 확정 ✓</div>
          <div>오늘 수업이에요. 5분 전까지 도착해주세요.</div>
        </InfoBox>
        <InfoBox><strong>현재 참여자 3명 / 정원 5명</strong></InfoBox>
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
      
      <Modal open={modal === 'cancel'} onClose={closeModal} title="예약 취소" sub={modalData ? `${modalData.dateLabel} ${modalData.time} ${modalData.type} 수업` : ''}>
        <InfoBox>
          {modalData?.state === 'pending' ? (
            <>
              <strong>예약 요청 취소</strong><br />
              아직 강사 승인 전이라 바로 취소돼요.
            </>
          ) : modalData?.isFixed ? (
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
        <ModalBtn variant="terra" onClick={cancelBooking}>취소 요청 보내기</ModalBtn>
        <ModalBtn variant="ghost" onClick={closeModal}>돌아가기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'undoCancel'} onClose={closeModal} title="취소 요청 되돌리기" sub={modalData ? `${modalData.dateLabel} ${modalData.time} ${modalData.type} 수업` : ''}>
        <InfoBox>
          <strong>취소 요청을 되돌릴까요?</strong><br />
          아직 강사 확인 전이라 되돌릴 수 있어요.<br />
          되돌리면 원래대로 예약 상태가 됩니다.
        </InfoBox>
        <ModalBtn onClick={undoCancelRequest}>되돌리기</ModalBtn>
        <ModalBtn variant="ghost" onClick={closeModal}>그대로 두기</ModalBtn>
      </Modal>
      
      <Modal open={modal === 'notice'} onClose={() => setModal(null)} title="5월 휴무 안내" sub="2026.04.27 · 소선요가">
        <InfoBox tone="terra"><strong>5/5 (화) 어린이날 휴무</strong></InfoBox>
        <div style={{ fontSize: 13, color: theme.ink, lineHeight: 1.7, marginTop: 8 }}>
          안녕하세요 회원님 ☺️<br />
          소선요가입니다.<br /><br />
          5월 5일 (화) 어린이날은 휴무입니다.<br />
          해당 시간 수업 예약하신 회원님께는<br />
          개별 안내 드리겠습니다.<br /><br />
          좋은 한 주 보내세요 🌿
        </div>
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
