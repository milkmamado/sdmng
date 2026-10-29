import { describe, expect, test } from 'bun:test';
import { diffPatient, nameDiffersOnlyBySuffix, nameKey, normalizeName, sameName } from './crmSync';

describe('CRM/엑셀 환자 이름 안전 비교', () => {
  test('요청된 환자 이름 끝 숫자만 다른 경우 같은 이름이다', () => {
    for (const name of ['김미정', '이현경', '김종선', '이예원', '김미희', '김태훈', '김도희']) {
      expect(sameName(`${name}1`, name)).toBe(true);
      expect(nameDiffersOnlyBySuffix(`${name}1`, name)).toBe(true);
    }
    expect(sameName('김미정123', '김미정2')).toBe(true);
  });

  test('실제 다른 이름은 불일치로 유지한다', () => {
    expect(sameName('왕구이슈앙', '왕수아')).toBe(false);
    expect(nameDiffersOnlyBySuffix('왕구이슈앙', '왕수아')).toBe(false);
    expect(sameName('김1미정', '김미정')).toBe(false);
  });

  test('빈 이름이나 숫자만 있는 이름은 일치하지 않는다', () => {
    expect(sameName('', '')).toBe(false);
    expect(sameName(null, undefined)).toBe(false);
    expect(sameName('123', '1')).toBe(false);
  });

  test('공백은 무시하며 완전 일치는 숫자 차이 안내 대상이 아니다', () => {
    expect(nameKey(' 김 미 정12 ')).toBe('김미정');
    expect(normalizeName(' 김 미 정12 ')).toBe('김미정12');
    expect(sameName('김 미정', '김미정')).toBe(true);
    expect(nameDiffersOnlyBySuffix('김미정', '김미정')).toBe(false);
    expect(nameDiffersOnlyBySuffix('김 미정', '김미정')).toBe(false);
  });

  test('CRM 이름 차이를 허용해도 기존 사이트 이름은 갱신 대상이 아니다', () => {
    const patient = { name: '김미정' };
    const changes = diffPatient(patient, { clntNo: '001', ok: true, base: { clntNm: '김미정1', age: 50 } });
    expect(changes).toEqual({ age: 50 });
    expect(patient.name).toBe('김미정');
  });
});