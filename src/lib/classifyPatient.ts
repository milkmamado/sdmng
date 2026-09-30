// @ts-nocheck
// 진단명·이전병원 자동 분류 호출 유틸
// 저장 흐름을 막지 않도록 fire-and-forget으로 호출하고, 실패 시 console.error만 남김
import { supabase } from '@/integrations/supabase/client';

export async function callClassifyPatient(patientIds: string[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error('classify-patient: no session token');
      return;
    }
    const res = await fetch('/api/classify-patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ patient_ids: patientIds }),
    });
    if (!res.ok) {
      console.error('classify-patient failed:', res.status, await res.text().catch(() => ''));
    } else {
      const json = await res.json().catch(() => null);
      if (Array.isArray(json?.errors) && json.errors.length > 0) {
        console.warn('classify-patient partial errors', json.errors);
      }
    }
  } catch (e) {
    console.error('classify-patient error:', e);
  }
}
