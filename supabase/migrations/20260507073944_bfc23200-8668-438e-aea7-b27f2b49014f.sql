
-- ============= Phase 2-A: 원본 immng 호환 스키마 재구축 =============

-- 기존 골격 제거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============ Enums ============
CREATE TYPE public.user_role AS ENUM ('master', 'manager', 'admin');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.branch_type AS ENUM ('강서', '광명', '성동');

-- ============ Tables ============
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  branch branch_type NOT NULL DEFAULT '성동',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'manager',
  approval_status approval_status NOT NULL DEFAULT 'pending',
  branch branch_type NOT NULL DEFAULT '성동',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, branch)
);

CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_number TEXT NOT NULL,
  name TEXT NOT NULL,
  resident_number_masked TEXT,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  emergency_contact TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_phone TEXT,
  patient_or_guardian TEXT,
  assigned_manager UUID NOT NULL REFERENCES auth.users(id),
  branch branch_type NOT NULL DEFAULT '성동',
  first_visit_date DATE,
  consultation_date DATE,
  inflow_date DATE,
  referral_source TEXT,
  visit_type TEXT,
  admission_date DATE,
  discharge_date DATE,
  inflow_status TEXT DEFAULT '유입',
  failure_reason TEXT,
  visit_motivation TEXT,
  detailed_diagnosis TEXT,
  diagnosis_category TEXT,
  diagnosis_detail TEXT,
  counselor TEXT,
  counseling_content TEXT,
  previous_hospital TEXT,
  hospital_branch TEXT,
  hospital_category TEXT,
  diet_info TEXT,
  korean_doctor TEXT,
  western_doctor TEXT,
  chart_number TEXT,
  customer_number TEXT,
  insurance_type TEXT,
  hospital_treatment TEXT,
  examination_schedule TEXT,
  treatment_plan TEXT,
  treatment_memo_1 TEXT,
  treatment_memo_2 TEXT,
  special_note_1 TEXT,
  special_note_2 TEXT,
  memo1 TEXT,
  crm_memo TEXT,
  monthly_avg_days INTEGER DEFAULT 0,
  last_visit_date DATE,
  payment_amount NUMERIC DEFAULT 0,
  manager_name TEXT,
  management_status TEXT DEFAULT '관리 중',
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_number, branch)
);

CREATE TABLE public.admission_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  cycle_number INTEGER NOT NULL,
  admission_date DATE NOT NULL,
  discharge_date DATE,
  status TEXT NOT NULL DEFAULT 'admitted',
  admission_type TEXT DEFAULT '입원',
  discharge_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, cycle_number)
);

CREATE TABLE public.medical_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  cancer_type TEXT NOT NULL,
  cancer_stage TEXT,
  diagnosis_date DATE,
  primary_doctor TEXT,
  metastasis_status BOOLEAN DEFAULT false,
  metastasis_sites TEXT[],
  biopsy_result TEXT,
  admission_cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.treatment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  treatment_type TEXT NOT NULL,
  treatment_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  hospital_name TEXT,
  notes TEXT,
  admission_cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  package_type TEXT NOT NULL,
  package_amount NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  included_treatments TEXT[],
  insurance_type TEXT,
  insurance_limit NUMERIC(12,2),
  insurance_used NUMERIC(12,2) DEFAULT 0,
  has_private_insurance BOOLEAN DEFAULT false,
  total_cost NUMERIC(12,2) NOT NULL,
  insurance_coverage NUMERIC(12,2) DEFAULT 0,
  patient_payment NUMERIC(12,2) NOT NULL,
  payment_method TEXT,
  payment_date DATE,
  outstanding_balance NUMERIC(12,2) DEFAULT 0,
  admission_cycle_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  admission_cycle_id UUID REFERENCES public.admission_cycles(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  note_type TEXT NOT NULL DEFAULT 'general',
  title TEXT,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.daily_patient_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  status_date DATE NOT NULL,
  status_type TEXT NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id, status_date, status_type)
);

CREATE TABLE public.treatment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  branch branch_type NOT NULL DEFAULT '성동',
  treatment_detail TEXT NOT NULL,
  treatment_amount NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.diagnosis_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID,
  sort_order INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.hospital_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.insurance_type_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.treatment_detail_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_status_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  exclude_from_daily_tracking BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.patient_reconnect_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  is_reconnected BOOLEAN NOT NULL DEFAULT false,
  reconnect_notes TEXT,
  reconnected_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.package_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  customer_number TEXT,
  deposit_total NUMERIC DEFAULT 0,
  deposit_used NUMERIC DEFAULT 0,
  deposit_balance NUMERIC DEFAULT 0,
  reward_total NUMERIC DEFAULT 0,
  reward_used NUMERIC DEFAULT 0,
  reward_balance NUMERIC DEFAULT 0,
  count_total INTEGER DEFAULT 0,
  count_used INTEGER DEFAULT 0,
  count_balance INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(patient_id)
);

CREATE TABLE public.package_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  branch branch_type NOT NULL DEFAULT '성동',
  customer_number TEXT,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  count INTEGER DEFAULT 0,
  non_covered_amount NUMERIC DEFAULT 0,
  date_from DATE,
  date_to DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.manager_supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(supervisor_id, manager_id)
);

-- ============ RLS Enable ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_patient_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_type_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_detail_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_status_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_reconnect_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_supervisors ENABLE ROW LEVEL SECURITY;

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND approval_status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role, _branch branch_type DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND approval_status = 'approved'
      AND (_branch IS NULL OR branch = _branch)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_master_user(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master' AND approval_status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('master','admin') AND approval_status = 'approved'
  )
$$;

CREATE OR REPLACE FUNCTION public.calculate_stay_days(admission_date DATE, discharge_date DATE DEFAULT NULL)
RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE WHEN discharge_date IS NOT NULL THEN discharge_date - admission_date
              ELSE CURRENT_DATE - admission_date END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_cycle_number(patient_uuid UUID)
RETURNS INTEGER LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(MAX(cycle_number),0)+1 FROM public.admission_cycles WHERE patient_id = patient_uuid;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- 첫 가입자는 master(approved)+성동, 그 외는 manager(pending)+성동
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_first BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO _is_first;
  INSERT INTO public.profiles (id, name, email, branch)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email,'@',1)), NEW.email, '성동');
  IF _is_first THEN
    INSERT INTO public.user_roles (user_id, role, approval_status, branch, approved_at)
    VALUES (NEW.id, 'master', 'approved', '성동', now());
  ELSE
    INSERT INTO public.user_roles (user_id, role, approval_status, branch)
    VALUES (NEW.id, 'manager', 'pending', '성동');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_info_updated_at BEFORE UPDATE ON public.medical_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admission_cycles_updated_at BEFORE UPDATE ON public.admission_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_notes_updated_at BEFORE UPDATE ON public.patient_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_patient_status_updated_at BEFORE UPDATE ON public.daily_patient_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatment_plans_updated_at BEFORE UPDATE ON public.treatment_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patient_reconnect_tracking_updated_at BEFORE UPDATE ON public.patient_reconnect_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_management_updated_at BEFORE UPDATE ON public.package_management FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_transactions_updated_at BEFORE UPDATE ON public.package_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Policies ============
-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Masters can view all profiles" ON public.profiles FOR SELECT USING (is_master_user(auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (is_admin_user(auth.uid()));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Masters can view all roles" ON public.user_roles FOR SELECT USING (is_master_user(auth.uid()));
CREATE POLICY "Masters can manage roles" ON public.user_roles FOR ALL USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));

-- patients
CREATE POLICY "Managers view their patients" ON public.patients FOR SELECT USING (auth.uid() = assigned_manager);
CREATE POLICY "Managers update their patients" ON public.patients FOR UPDATE USING (auth.uid() = assigned_manager);
CREATE POLICY "Managers insert patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = assigned_manager);
CREATE POLICY "Managers delete their patients" ON public.patients FOR DELETE USING (auth.uid() = assigned_manager);
CREATE POLICY "Masters view all patients" ON public.patients FOR SELECT USING (is_master_user(auth.uid()));
CREATE POLICY "Masters manage all patients" ON public.patients FOR ALL USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Admins view patients via supervisor" ON public.patients FOR SELECT USING (
  is_admin_user(auth.uid()) AND (
    NOT EXISTS (SELECT 1 FROM manager_supervisors WHERE supervisor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM manager_supervisors ms WHERE ms.supervisor_id = auth.uid() AND ms.manager_id = patients.assigned_manager)
  )
);

-- generic patient-scoped policies via helper
CREATE POLICY "Access medical_info" ON public.medical_info FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = medical_info.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage medical_info" ON public.medical_info FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = medical_info.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access treatment_history" ON public.treatment_history FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = treatment_history.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage treatment_history" ON public.treatment_history FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = treatment_history.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access packages" ON public.packages FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = packages.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage packages" ON public.packages FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = packages.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access admission_cycles" ON public.admission_cycles FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = admission_cycles.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage admission_cycles" ON public.admission_cycles FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = admission_cycles.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access patient_notes" ON public.patient_notes FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_notes.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage patient_notes" ON public.patient_notes FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_notes.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access daily_patient_status" ON public.daily_patient_status FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = daily_patient_status.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage daily_patient_status" ON public.daily_patient_status FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = daily_patient_status.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access treatment_plans" ON public.treatment_plans FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = treatment_plans.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage treatment_plans" ON public.treatment_plans FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = treatment_plans.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access patient_reconnect_tracking" ON public.patient_reconnect_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_reconnect_tracking.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage patient_reconnect_tracking" ON public.patient_reconnect_tracking FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_reconnect_tracking.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access package_management" ON public.package_management FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = package_management.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage package_management" ON public.package_management FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = package_management.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

CREATE POLICY "Access package_transactions" ON public.package_transactions FOR SELECT USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = package_transactions.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()) OR is_admin_user(auth.uid()))));
CREATE POLICY "Manage package_transactions" ON public.package_transactions FOR ALL USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = package_transactions.patient_id AND (p.assigned_manager = auth.uid() OR is_master_user(auth.uid()))));

-- options tables
CREATE POLICY "Anyone view diagnosis_options" ON public.diagnosis_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master manages diagnosis_options" ON public.diagnosis_options FOR ALL TO authenticated USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Anyone view hospital_options" ON public.hospital_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master manages hospital_options" ON public.hospital_options FOR ALL TO authenticated USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Anyone view insurance_type_options" ON public.insurance_type_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master manages insurance_type_options" ON public.insurance_type_options FOR ALL TO authenticated USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Anyone view treatment_detail_options" ON public.treatment_detail_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master manages treatment_detail_options" ON public.treatment_detail_options FOR ALL TO authenticated USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Anyone view patient_status_options" ON public.patient_status_options FOR SELECT USING (true);
CREATE POLICY "Master manages patient_status_options" ON public.patient_status_options FOR ALL USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));

-- manager_supervisors
CREATE POLICY "Master manages manager_supervisors" ON public.manager_supervisors FOR ALL USING (is_master_user(auth.uid())) WITH CHECK (is_master_user(auth.uid()));
CREATE POLICY "Supervisors view their managers" ON public.manager_supervisors FOR SELECT USING (auth.uid() = supervisor_id);

-- ============ Views ============
CREATE OR REPLACE VIEW public.pending_approvals AS
SELECT ur.id, ur.user_id, ur.role, ur.branch, ur.approval_status,
       ur.created_at AS requested_at, p.name, p.email, p.phone,
       au.created_at AS joined_at
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.approval_status = 'pending';
ALTER VIEW public.pending_approvals SET (security_invoker = on);

CREATE OR REPLACE VIEW public.approved_users AS
SELECT ur.id, ur.user_id, ur.role, ur.branch, ur.approval_status,
       ur.created_at AS requested_at, ur.approved_at,
       p.name, p.email, p.phone,
       au.created_at AS joined_at,
       approver.name AS approved_by_name
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles approver ON approver.id = ur.approved_by
WHERE ur.approval_status = 'approved';
ALTER VIEW public.approved_users SET (security_invoker = on);

CREATE OR REPLACE VIEW public.manager_patient_stats AS
SELECT p.id AS manager_id, p.name AS manager_name, p.email AS manager_email,
       ur.branch,
       COUNT(DISTINCT pat.id) AS total_patients,
       COUNT(DISTINCT CASE WHEN pat.created_at >= date_trunc('month', CURRENT_DATE::timestamptz) THEN pat.id END) AS new_patients_this_month,
       COUNT(DISTINCT CASE WHEN pat.first_visit_date >= date_trunc('week', CURRENT_DATE::timestamptz) THEN pat.id END) AS visits_this_week,
       COALESCE(SUM(pkg.patient_payment), 0) AS total_revenue,
       COALESCE(SUM(pkg.outstanding_balance), 0) AS outstanding_balance,
       MAX(pat.created_at) AS last_patient_added
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN patients pat ON pat.assigned_manager = p.id AND pat.branch = ur.branch
LEFT JOIN packages pkg ON pkg.patient_id = pat.id
WHERE ur.role = 'manager' AND ur.approval_status = 'approved'
GROUP BY p.id, p.name, p.email, ur.branch;
ALTER VIEW public.manager_patient_stats SET (security_invoker = on);
