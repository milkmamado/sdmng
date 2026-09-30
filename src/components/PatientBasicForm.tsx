// @ts-nocheck
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerWithInput } from "@/components/ui/date-picker-with-input";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { ClassificationSection } from '@/components/ClassificationSection';
import { callClassifyPatient } from '@/lib/classifyPatient';

interface PatientBasicFormProps {
  patient?: any;
  onClose: () => void;
  initialData?: any;
}

interface Option {
  id: string;
  name: string;
}

export function PatientBasicForm({ patient, onClose, initialData }: PatientBasicFormProps) {
  const { currentBranch } = useAuth();
  const [formData, setFormData] = useState({
    // API 자동입력 필드
    name: '',                   // 고객명 (API)
    customer_number: '',        // 고객번호 (API)
    resident_number_masked: '', // 주민번호 (API)
    phone: '',                  // 휴대폰번호 (API)
    gender: '',                 // 성별 (API)
    age: '',                    // 나이(만) (API)
    visit_motivation: '',       // 내원동기 (API)
    
    diagnosis_category: '',     // 진단명 대분류 (API)
    diagnosis_detail: '',       // 진단명 중분류 (API)
    hospital_category: '',      // 이전병원 대분류 (API)
    hospital_branch: '',        // 이전병원 중분류 (API)
    address: '',                // 주소 (API)
    crm_memo: '',               // CRM메모 (API)
    counseling_content: '',     // 상담내용 (API)
    special_note_1: '',         // 특이사항1 (API)
    special_note_2: '',         // 특이사항2 (API)
    treatment_memo_1: '',       // 진료메모1 (API)
    treatment_memo_2: '',       // 진료메모2 (API)
    
    // 수동 입력 필드
    patient_or_guardian: '환자', // 환자 or 보호자
    diet_info: '',              // 식이
    inflow_status: '유입',      // 유입/실패
    failure_reason: '',         // 실패 사유
    visit_type: '',             // 입원/외래
    guardian_name: '',          // 보호자 이름
    guardian_relationship: '', // 보호자 관계
    guardian_phone: '',         // 보호자 연락처
    manager_name: '',           // 담당자(상담실장)
    korean_doctor: '',          // 한방주치의
    western_doctor: '',         // 양방주치의
    inflow_date: '',            // 유입일
    consultation_date: '',      // 상담일
    memo1: '',                  // 초진 메모 (담당자 메모)
  });

  const [loading, setLoading] = useState(false);
  const [diagnosisCategoryOptions, setDiagnosisCategoryOptions] = useState<Option[]>([]);
  const [hospitalCategoryOptions, setHospitalCategoryOptions] = useState<Option[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingPhone, setSyncingPhone] = useState(false);
  const { toast } = useToast();
  // 진단명·이전병원 분류 메타 (폼에서 수동 변경/확인 시 갱신)
  const [classMeta, setClassMeta] = useState({
    diagnosis_source: null as string | null,
    diagnosis_needs_review: false,
    diagnosis_raw: null as string | null,
    hospital_source: null as string | null,
    hospital_needs_review: false,
    hospital_raw: null as string | null,
  });
  // 사용자가 진단·병원 영역을 건드렸는지 추적 (안 건드렸으면 저장 시 기존 값 유지)
  const [classTouched, setClassTouched] = useState({ diagnosis: false, hospital: false });

  const handleClassFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClassManualChange = (kind: 'diagnosis' | 'hospital') => {
    setClassTouched(prev => ({ ...prev, [kind]: true }));
    setClassMeta(prev => kind === 'diagnosis'
      ? { ...prev, diagnosis_source: 'manual', diagnosis_needs_review: false }
      : { ...prev, hospital_source: 'manual', hospital_needs_review: false });
  };

  useEffect(() => {
    fetchOptions();

    // postMessage로 CRM 데이터 수신
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'crm-patient-data' && event.data?.data) {
        handleCRMDataReceived(event.data.data);
      }
      // 휴대폰 번호 최신화용 데이터 수신
      if (event.data?.type === 'crm-phone-data' && event.data?.data) {
        handlePhoneCRMDataReceived(event.data.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // 환자 데이터 로드 및 설정
  useEffect(() => {
    if (patient) {
      // 옵션이 비어있어도 폼은 표시 (옵션은 select 항목용일 뿐)


      setFormData({
        name: patient.name || '',
        customer_number: patient.customer_number || '',
        resident_number_masked: patient.resident_number_masked || '',
        phone: patient.phone || '',
        gender: patient.gender || '',
        age: patient.age?.toString() || '',
        visit_motivation: patient.visit_motivation || '',
        
        diagnosis_category: patient.diagnosis_category || '',
        diagnosis_detail: patient.diagnosis_detail || '',
        hospital_category: patient.hospital_category || '',
        hospital_branch: patient.hospital_branch || '',
        address: patient.address || '',
        crm_memo: patient.crm_memo || '',
        counseling_content: patient.counseling_content || '',
        special_note_1: patient.special_note_1 || '',
        special_note_2: patient.special_note_2 || '',
        treatment_memo_1: patient.treatment_memo_1 || '',
        treatment_memo_2: patient.treatment_memo_2 || '',
        patient_or_guardian: patient.patient_or_guardian || '환자',
        diet_info: patient.diet_info || '',
        inflow_status: patient.inflow_status || '유입',
        failure_reason: patient.failure_reason || '',
        visit_type: patient.visit_type || '',
        guardian_name: patient.guardian_name || '',
        guardian_relationship: patient.guardian_relationship || '',
        guardian_phone: patient.guardian_phone || '',
        manager_name: patient.manager_name || '',
        korean_doctor: patient.korean_doctor || '',
        western_doctor: patient.western_doctor || '',
        inflow_date: patient.inflow_date || '',
        consultation_date: patient.consultation_date || '',
        memo1: patient.memo1 || ''
      });

      setClassMeta({
        diagnosis_source: patient.diagnosis_source || null,
        diagnosis_needs_review: !!patient.diagnosis_needs_review,
        diagnosis_raw: patient.diagnosis_raw || null,
        hospital_source: patient.hospital_source || null,
        hospital_needs_review: !!patient.hospital_needs_review,
        hospital_raw: patient.hospital_raw || null,
      });
      setClassTouched({ diagnosis: false, hospital: false });

      
      // manager_name이 없으면 현재 사용자 이름 가져오기
      if (!patient.manager_name) {
        fetchCurrentUserName();
      }
    } else if (initialData) {
      // 조회 다이얼로그에서 넘어온 초기 데이터 설정
      fetchCurrentUserName();
      // CRM에서 넘어오는 진단명·이전병원 4개 필드는 무시 (자동 분류가 담당)
      const { diagnosis_category, diagnosis_detail, hospital_category, hospital_branch, ...restInitial } = initialData;
      setFormData(prev => ({
        ...prev,
        ...restInitial,
        // manager_name은 현재 사용자로 덮어쓰기 위해 제외
        manager_name: prev.manager_name
      }));
    } else {
      fetchCurrentUserName();
    }
  }, [patient, initialData, diagnosisCategoryOptions, hospitalCategoryOptions]);

  const fetchCurrentUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setFormData(prev => ({
            ...prev,
            manager_name: profile.name
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const fetchOptions = async () => {
    try {
      // 대분류만 가져오기 (parent_id가 null인 것)
      const [diagnosisCategories, hospitalCategories] = await Promise.all([
        supabase.from('diagnosis_options').select('*').is('parent_id', null).order('name'),
        supabase.from('hospital_options').select('*').is('parent_id', null).order('name')
      ]);

      if (diagnosisCategories.data) setDiagnosisCategoryOptions(diagnosisCategories.data);
      if (hospitalCategories.data) setHospitalCategoryOptions(hospitalCategories.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // 전화번호 포맷팅
    if (name === 'phone') {
      const numbers = value.replace(/[^0-9]/g, '');
      let formattedPhone = numbers;
      
      if (numbers.length <= 3) {
        formattedPhone = numbers;
      } else if (numbers.length <= 7) {
        formattedPhone = `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      } else if (numbers.length <= 11) {
        formattedPhone = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
      } else {
        formattedPhone = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
      }
      
      setFormData(prev => ({
        ...prev,
        phone: formattedPhone
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = async (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSyncCRM = () => {
    if (!patient?.customer_number) {
      toast({
        title: "오류",
        description: "고객번호가 없어 CRM 정보를 가져올 수 없습니다.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setSyncing(true);

    // 업데이트 모드 플래그 설정 (새 환자 등록과 구분)
    localStorage.setItem('crm_update_mode', patient.id);

    const searchData = {
      name: patient.name,
      phone: patient.phone || '',
      appUrl: window.location.origin + '/first-visit'
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(searchData)));
    const crmUrl = `http://192.168.1.101/html/MEDI20/main.html#crm_data=${encoded}`;

    window.open(crmUrl, '_blank');

    // 30초 타임아웃
    setTimeout(() => {
      if (syncing) {
        setSyncing(false);
        localStorage.removeItem('crm_update_mode');
        toast({
          title: "타임아웃",
          description: "CRM 데이터를 받지 못했습니다. 다시 시도해주세요.",
          variant: "destructive",
          duration: 2000,
        });
      }
    }, 30000);
  };

  // 휴대폰 번호 최신화 - 고객번호로 검색
  const handleSyncPhoneCRM = () => {
    if (!patient?.customer_number) {
      toast({
        title: "오류",
        description: "고객번호가 없어 CRM 정보를 가져올 수 없습니다.",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setSyncingPhone(true);

    // 휴대폰 번호 최신화 모드 플래그 설정
    localStorage.setItem('crm_phone_update_mode', patient.id);

    const searchData = {
      customer_number: patient.customer_number,
      appUrl: window.location.origin + '/first-visit'
    };

    const encoded = btoa(encodeURIComponent(JSON.stringify(searchData)));
    const crmUrl = `http://192.168.1.101/html/MEDI20/main.html#crm_phone_data=${encoded}`;

    window.open(crmUrl, '_blank');

    // 30초 타임아웃
    setTimeout(() => {
      if (syncingPhone) {
        setSyncingPhone(false);
        localStorage.removeItem('crm_phone_update_mode');
        toast({
          title: "타임아웃",
          description: "CRM 데이터를 받지 못했습니다. 다시 시도해주세요.",
          variant: "destructive",
          duration: 2000,
        });
      }
    }, 30000);
  };

  const handlePhoneCRMDataReceived = async (crmData: any) => {
    // 휴대폰 번호 최신화 모드 확인
    const updatePatientId = localStorage.getItem('crm_phone_update_mode');
    
    // 업데이트 모드가 아니거나 현재 환자가 아니면 무시
    if (!updatePatientId || !patient || updatePatientId !== patient.id) {
      return;
    }

    setSyncingPhone(false);
    localStorage.removeItem('crm_phone_update_mode');

    try {
      const newPhone = crmData.phone;
      
      if (!newPhone) {
        toast({
          title: "오류",
          description: "CRM에서 휴대폰 번호를 가져올 수 없습니다.",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      if (newPhone === patient.phone) {
        toast({
          title: "최신 상태",
          description: "휴대폰 번호가 이미 최신 상태입니다.",
          duration: 2000,
        });
        return;
      }

      // DB 업데이트 - 휴대폰 번호만
      const { error } = await supabase
        .from('patients')
        .update({ phone: newPhone })
        .eq('id', patient.id);

      if (error) throw error;

      // 폼 데이터 업데이트
      setFormData(prev => ({
        ...prev,
        phone: newPhone
      }));

      toast({
        title: "휴대폰 번호 최신화 완료",
        description: `${patient.phone || '(없음)'} → ${newPhone}`,
        duration: 2000,
      });

    } catch (error) {
      console.error('Error updating phone:', error);
      toast({
        title: "오류",
        description: "휴대폰 번호 업데이트에 실패했습니다.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleCRMDataReceived = async (crmData: any) => {
    // 업데이트 모드 확인
    const updatePatientId = localStorage.getItem('crm_update_mode');
    
    // 업데이트 모드가 아니거나 현재 환자가 아니면 무시
    if (!updatePatientId || !patient || updatePatientId !== patient.id) {
      return;
    }

    setSyncing(false);
    localStorage.removeItem('crm_update_mode');

    try {
      // 변경된 필드만 추출
      const updatedFields: any = {};
      const apiFields = [
        'name', 'customer_number', 'resident_number_masked', 'phone',
        'gender', 'age', 'visit_motivation',
        'address', 'crm_memo', 'counseling_content', 'special_note_1', 'special_note_2',
        'treatment_memo_1', 'treatment_memo_2'
      ];
      // 진단명·이전병원 4개 필드는 자동 분류가 담당하므로 최신화 대상에서 제외

      apiFields.forEach(field => {
        const crmValue = crmData[field];
        const currentValue = patient[field as keyof typeof patient];

        // CRM 값이 빈 문자열이면 기존 값 유지 (빈 값으로 덮어쓰지 않음)
        if (typeof crmValue === 'string' && crmValue.trim() === '') return;

        // 값이 다르면 업데이트 대상에 추가
        if (crmValue !== undefined && crmValue !== null && crmValue !== currentValue) {
          if (field === 'age' && crmValue) {
            updatedFields[field] = parseInt(crmValue);
          } else {
            updatedFields[field] = crmValue;
          }
        }
      });

      if (Object.keys(updatedFields).length === 0) {
        toast({
          title: "최신 상태",
          description: "변경된 정보가 없습니다.",
          duration: 2000,
        });
        return;
      }

      // DB 업데이트
      const { error } = await supabase
        .from('patients')
        .update(updatedFields)
        .eq('id', patient.id);

      if (error) throw error;

      // 폼 데이터 업데이트
      setFormData(prev => ({
        ...prev,
        ...updatedFields
      }));

      toast({
        title: "최신화 완료",
        description: `${Object.keys(updatedFields).length}개 필드가 업데이트되었습니다.`,
        duration: 2000,
      });

      // 상담내용 또는 진료메모2(상병코드)가 바뀌었으면 자동 분류 호출 (fire-and-forget, 저장 흐름 차단 안 함)
      if (updatedFields.counseling_content !== undefined || updatedFields.treatment_memo_2 !== undefined) {
        callClassifyPatient([patient.id]);
      }

    } catch (error) {
      console.error('Error updating patient data:', error);
      toast({
        title: "오류",
        description: "환자 정보 업데이트에 실패했습니다.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      // 고객번호 중복 체크 (신규 등록 또는 고객번호가 변경된 경우)
      // 같은 지점 내에서만 중복을 확인합니다
      if (formData.customer_number) {
        console.log('🔍 중복 체크 시작:', {
          customer_number: formData.customer_number,
          currentBranch,
          isEditMode: !!patient
        });

        const { data: existingPatient, error: checkError } = await supabase
          .from('patients')
          .select('id, name, branch')
          .eq('customer_number', formData.customer_number)
          .eq('branch', currentBranch) // 현재 지점에서만 중복 체크
          .maybeSingle();

        console.log('✅ 중복 체크 결과:', {
          existingPatient,
          checkError,
          willBlock: existingPatient && (!patient || existingPatient.id !== patient.id)
        });

        if (checkError) throw checkError;

        // 신규 등록이거나 다른 환자의 고객번호인 경우
        if (existingPatient && (!patient || existingPatient.id !== patient.id)) {
          toast({
            title: "중복된 고객번호",
            description: `고객번호 ${formData.customer_number}는 이미 ${currentBranch}점의 환자 "${existingPatient.name}"에게 등록되어 있습니다.`,
            variant: "destructive",
            duration: 3000,
          });
          setLoading(false);
          return;
        }
      }

      const patientData: any = {
        name: formData.name,
        patient_number: formData.customer_number || '', // patient_number는 customer_number와 동일
        customer_number: formData.customer_number || null,
        resident_number_masked: formData.resident_number_masked || null,
        phone: formData.phone || null,
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null,
        visit_motivation: formData.visit_motivation || null,

        address: formData.address || null,
        crm_memo: formData.crm_memo || null,
        counseling_content: formData.counseling_content || null,
        special_note_1: formData.special_note_1 || null,
        special_note_2: formData.special_note_2 || null,
        treatment_memo_1: formData.treatment_memo_1 || null,
        treatment_memo_2: formData.treatment_memo_2 || null,
        patient_or_guardian: formData.patient_or_guardian || null,
        diet_info: formData.diet_info || null,
        inflow_status: formData.inflow_status,
        failure_reason: formData.failure_reason || null,
        visit_type: formData.visit_type || null,
        guardian_name: formData.guardian_name || null,
        guardian_relationship: formData.guardian_relationship || null,
        guardian_phone: formData.guardian_phone || null,
        manager_name: formData.manager_name || null,
        korean_doctor: formData.korean_doctor || null,
        western_doctor: formData.western_doctor || null,
        inflow_date: formData.inflow_date || null,
        consultation_date: formData.consultation_date || null,
        memo1: formData.memo1 || null,
        assigned_manager: user.id,
        branch: currentBranch // 현재 지점 정보 추가
      };

      // 진단명·이전병원: 사용자가 해당 영역을 건드린 경우에만 payload에 포함
      // (안 건드렸으면 기존 값·source 그대로 유지)
      if (!patient || classTouched.diagnosis) {
        patientData.diagnosis_category = formData.diagnosis_category || null;
        patientData.diagnosis_detail = formData.diagnosis_detail || null;
        if (classTouched.diagnosis) {
          patientData.diagnosis_source = 'manual';
          patientData.diagnosis_needs_review = false;
        }
      }
      if (!patient || classTouched.hospital) {
        patientData.hospital_category = formData.hospital_category || null;
        patientData.hospital_branch = formData.hospital_branch || null;
        if (classTouched.hospital) {
          patientData.hospital_source = 'manual';
          patientData.hospital_needs_review = false;
        }
      }

      if (patient) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', patient.id);

        if (error) throw error;

        toast({
          title: "✅ 수정 완료",
          description: "환자 정보가 저장되었습니다.",
          duration: 1500,
        });

        // 저장 성공 직후 자동 분류 (fire-and-forget, 저장 흐름 차단 안 함)
        callClassifyPatient([patient.id]);

        // 저장 후 모달 닫기
        onClose();
      } else {
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert([patientData])
          .select()
          .single();

        if (error) {
          // 중복 키 오류 처리
          if (error.code === '23505') {
            toast({
              title: "등록 실패",
              description: `고객번호 "${formData.customer_number}"는 이미 다른 환자에게 등록되어 있습니다. 고객번호를 확인해주세요.`,
              variant: "destructive",
              duration: 5000,
            });
            setLoading(false);
            return;
          }
          throw error;
        }

        toast({
          title: "✅ 등록 완료",
          description: "새 환자가 등록되었습니다.",
          duration: 1500,
        });

        // 저장 성공 직후 자동 분류 (fire-and-forget, 저장 흐름 차단 안 함)
        if (newPatient?.id) callClassifyPatient([newPatient.id]);

        // 저장 후 모달 닫기
        onClose();
      }

      // 폼 초기화
      setFormData({
        name: '',
        customer_number: '',
        resident_number_masked: '',
        phone: '',
        gender: '',
        age: '',
        visit_motivation: '',
        
        diagnosis_category: '',
        diagnosis_detail: '',
        hospital_category: '',
        hospital_branch: '',
        address: '',
        crm_memo: '',
        counseling_content: '',
        special_note_1: '',
        special_note_2: '',
        treatment_memo_1: '',
        treatment_memo_2: '',
        patient_or_guardian: '환자',
        diet_info: '',
        inflow_status: '유입',
        failure_reason: '',
        visit_type: '',
        guardian_name: '',
        guardian_relationship: '',
        guardian_phone: '',
        manager_name: '',
        korean_doctor: '',
        western_doctor: '',
        inflow_date: '',
        consultation_date: '',
        memo1: ''
      });

      onClose();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({
        title: "오류",
        description: "환자 정보 저장에 실패했습니다.",
        variant: "destructive",
        duration: 1000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* API 자동입력 정보 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">API 자동입력 정보</h3>
            <Badge variant="secondary">자동</Badge>
          </div>
          {patient && (
            // 「기본 정보 최신화」「휴대폰 번호 최신화」 버튼 숨김 — handleSyncCRM/handleSyncPhoneCRM 로직은 유지
            <p className="text-sm text-muted-foreground">
              CRM 정보는 관리환자 리스트의 「CRM 일괄 동기화」로 최신화됩니다.
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 고객명 */}
          <div>
            <Label htmlFor="name">고객명 *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 고객번호 */}
          <div>
            <Label htmlFor="customer_number">고객번호</Label>
            <Input
              id="customer_number"
              name="customer_number"
              value={formData.customer_number}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 주민번호 */}
          <div>
            <Label htmlFor="resident_number_masked">주민번호</Label>
            <Input
              id="resident_number_masked"
              name="resident_number_masked"
              value={formData.resident_number_masked}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 휴대폰번호 */}
          <div>
            <Label htmlFor="phone">휴대폰번호</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
              maxLength={13}
            />
          </div>

          {/* 성별 */}
          <div>
            <Label htmlFor="gender">성별</Label>
            <Input
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 나이(만) */}
          <div>
            <Label htmlFor="age">나이(만)</Label>
            <Input
              id="age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 내원동기 */}
          <div>
            <Label htmlFor="visit_motivation">내원동기</Label>
            <Input
              id="visit_motivation"
              name="visit_motivation"
              value={formData.visit_motivation}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력 (블로그, 힐링미, 홈페이지 등)"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 주소 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 특이사항1 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="special_note_1">특이사항1</Label>
            <Textarea
              id="special_note_1"
              name="special_note_1"
              value={formData.special_note_1}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>

          {/* 특이사항2 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="special_note_2">특이사항2</Label>
            <Textarea
              id="special_note_2"
              name="special_note_2"
              value={formData.special_note_2}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>

          {/* 진료메모1 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="treatment_memo_1">진료메모1</Label>
            <Textarea
              id="treatment_memo_1"
              name="treatment_memo_1"
              value={formData.treatment_memo_1}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>

          {/* 진료메모2 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="treatment_memo_2">진료메모2</Label>
            <Textarea
              id="treatment_memo_2"
              name="treatment_memo_2"
              value={formData.treatment_memo_2}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>

          {/* CRM메모 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="crm_memo">CRM메모</Label>
            <Textarea
              id="crm_memo"
              name="crm_memo"
              value={formData.crm_memo}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>

          {/* 상담내용 */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="counseling_content">상담내용</Label>
            <Textarea
              id="counseling_content"
              name="counseling_content"
              value={formData.counseling_content}
              onChange={handleInputChange}
              placeholder="API에서 자동 입력"
              rows={3}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
      </div>

      {/* 진단명 · 이전병원 섹션 (자동 분류 + 수동 수정) */}
      <ClassificationSection
        patient={patient}
        diagnosisCategory={formData.diagnosis_category}
        diagnosisDetail={formData.diagnosis_detail}
        hospitalCategory={formData.hospital_category}
        hospitalBranch={formData.hospital_branch}
        onFieldChange={handleClassFieldChange}
        onManualChange={handleClassManualChange}
        dxSource={classMeta.diagnosis_source}
        dxNeedsReview={classMeta.diagnosis_needs_review}
        dxRaw={classMeta.diagnosis_raw}
        hsSource={classMeta.hospital_source}
        hsNeedsReview={classMeta.hospital_needs_review}
        hsRaw={classMeta.hospital_raw}
      />

      {/* 수동 입력 정보 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <h3 className="text-lg font-semibold">추가 입력 정보</h3>
          <Badge variant="outline">수동입력</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 환자 or 보호자 */}
          <div>
            <Label htmlFor="patient_or_guardian">환자 or 보호자</Label>
            <Select name="patient_or_guardian" value={formData.patient_or_guardian} onValueChange={(value) => handleSelectChange('patient_or_guardian', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="환자">환자</SelectItem>
                <SelectItem value="보호자">보호자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 식이 */}
          <div>
            <Label htmlFor="diet_info">식이</Label>
            <Input
              id="diet_info"
              name="diet_info"
              value={formData.diet_info}
              onChange={handleInputChange}
              placeholder="식이정보"
            />
          </div>

          {/* 유입상태 */}
          <div>
            <Label htmlFor="inflow_status">유입상태 *</Label>
            <Select name="inflow_status" value={formData.inflow_status} onValueChange={(value) => handleSelectChange('inflow_status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="유입">유입</SelectItem>
                <SelectItem value="전화상담">전화상담</SelectItem>
                <SelectItem value="방문상담">방문상담</SelectItem>
                <SelectItem value="실패">실패</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 실패 사유 (유입상태가 실패일 때만 표시) */}
          {formData.inflow_status === '실패' && (
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="failure_reason">실패 사유</Label>
              <Textarea
                id="failure_reason"
                name="failure_reason"
                value={formData.failure_reason}
                onChange={handleInputChange}
                placeholder="실패 사유를 입력하세요"
                rows={2}
              />
            </div>
          )}

          {/* 입원/외래 */}
          <div>
            <Label htmlFor="visit_type">내원형태</Label>
            <Select name="visit_type" value={formData.visit_type} onValueChange={(value) => handleSelectChange('visit_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="입원">입원</SelectItem>
                <SelectItem value="외래">외래</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 보호자 이름 */}
          <div>
            <Label htmlFor="guardian_name">보호자 이름</Label>
            <Input
              id="guardian_name"
              name="guardian_name"
              value={formData.guardian_name}
              onChange={handleInputChange}
              placeholder="보호자 이름"
            />
          </div>

          {/* 보호자 관계 */}
          <div>
            <Label htmlFor="guardian_relationship">보호자 관계</Label>
            <Input
              id="guardian_relationship"
              name="guardian_relationship"
              value={formData.guardian_relationship}
              onChange={handleInputChange}
              placeholder="보호자 관계"
            />
          </div>

          {/* 보호자 연락처 */}
          <div>
            <Label htmlFor="guardian_phone">보호자 연락처</Label>
            <Input
              id="guardian_phone"
              name="guardian_phone"
              type="tel"
              value={formData.guardian_phone}
              onChange={handleInputChange}
              placeholder="보호자 연락처"
            />
          </div>

          {/* 담당자(상담실장) */}
          <div>
            <Label htmlFor="manager_name">담당자(상담실장)</Label>
            <Input
              id="manager_name"
              name="manager_name"
              value={formData.manager_name}
              onChange={handleInputChange}
              placeholder="자동입력"
              disabled
              className="bg-muted"
            />
          </div>

          {/* 한방주치의 */}
          <div>
            <Label htmlFor="korean_doctor">한방주치의</Label>
            <Input
              id="korean_doctor"
              name="korean_doctor"
              value={formData.korean_doctor}
              onChange={handleInputChange}
              placeholder="한방주치의"
            />
          </div>

          {/* 양방주치의 */}
          <div>
            <Label htmlFor="western_doctor">양방주치의</Label>
            <Input
              id="western_doctor"
              name="western_doctor"
              value={formData.western_doctor}
              onChange={handleInputChange}
              placeholder="양방주치의"
            />
          </div>

          {/* 상담일 */}
          <div>
            <Label htmlFor="consultation_date">상담일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.consultation_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.consultation_date ? (
                    format(new Date(formData.consultation_date), "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerWithInput
                  selected={formData.consultation_date ? new Date(formData.consultation_date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = format(date, 'yyyy-MM-dd');
                      setFormData(prev => ({ ...prev, consultation_date: formatted }));
                    } else {
                      setFormData(prev => ({ ...prev, consultation_date: '' }));
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 유입일 */}
          <div>
            <Label htmlFor="inflow_date">유입일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.inflow_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.inflow_date ? (
                    format(new Date(formData.inflow_date), "PPP", { locale: ko })
                  ) : (
                    <span>날짜 선택</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <DatePickerWithInput
                  selected={formData.inflow_date ? new Date(formData.inflow_date) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = format(date, 'yyyy-MM-dd');
                      setFormData(prev => ({ ...prev, inflow_date: formatted }));
                    } else {
                      setFormData(prev => ({ ...prev, inflow_date: '' }));
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 등록일 (읽기 전용) */}
          <div>
            <Label htmlFor="created_at">등록일</Label>
            <div className="w-full h-10 px-3 py-2 border border-input bg-muted rounded-md flex items-center text-sm text-muted-foreground">
              {patient?.created_at 
                ? format(new Date(patient.created_at), "PPP", { locale: ko })
                : initialData?.created_at
                  ? format(new Date(initialData.created_at), "PPP", { locale: ko })
                  : '-'
              }
            </div>
          </div>

          {/* 초진 메모 (담당자 메모) */}
          <div className="md:col-span-2 lg:col-span-3">
            <Label htmlFor="memo1">초진 메모 (담당자 메모)</Label>
            <Textarea
              id="memo1"
              name="memo1"
              value={formData.memo1}
              onChange={handleInputChange}
              placeholder="초진 상담 내용이나 담당자 메모를 입력하세요 (일별환자관리와 연동됩니다)"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "저장 중..." : patient ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  );
}