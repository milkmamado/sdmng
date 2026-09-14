CREATE TABLE public.cross_view_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  target_manager_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, target_manager_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cross_view_grants TO authenticated;
GRANT ALL ON public.cross_view_grants TO service_role;

ALTER TABLE public.cross_view_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own cross view grants" ON public.cross_view_grants
FOR SELECT USING (viewer_id = auth.uid() OR public.is_master_user(auth.uid()));

CREATE POLICY "Masters insert cross view grants" ON public.cross_view_grants
FOR INSERT WITH CHECK (public.is_master_user(auth.uid()));

CREATE POLICY "Masters update cross view grants" ON public.cross_view_grants
FOR UPDATE USING (public.is_master_user(auth.uid())) WITH CHECK (public.is_master_user(auth.uid()));

CREATE POLICY "Masters delete cross view grants" ON public.cross_view_grants
FOR DELETE USING (public.is_master_user(auth.uid()));

CREATE TRIGGER update_cross_view_grants_updated_at
BEFORE UPDATE ON public.cross_view_grants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_view_manager(_viewer uuid, _target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _viewer IS NULL OR _target IS NULL THEN false
    WHEN _viewer = _target THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.cross_view_grants g
      WHERE g.viewer_id = _viewer
        AND g.target_manager_id = _target
        AND g.is_active = true
    )
  END
$$;

CREATE POLICY "Cross view patients" ON public.patients
FOR SELECT USING (public.can_view_manager(auth.uid(), assigned_manager));

CREATE POLICY "Cross view daily_patient_status" ON public.daily_patient_status
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = daily_patient_status.patient_id
    AND public.can_view_manager(auth.uid(), p.assigned_manager)
));

CREATE POLICY "Cross view package_management" ON public.package_management
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = package_management.patient_id
    AND public.can_view_manager(auth.uid(), p.assigned_manager)
));

CREATE POLICY "Cross view package_transactions" ON public.package_transactions
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = package_transactions.patient_id
    AND public.can_view_manager(auth.uid(), p.assigned_manager)
));

INSERT INTO public.cross_view_grants (viewer_id, target_manager_id, is_active, reason) VALUES
('fd6543ae-6e97-4a06-b700-84c7a210502c', '940a0bb6-8533-4c26-a5f3-a54d8f437ce1', true, '2026-09 한시적 상호 열람'),
('940a0bb6-8533-4c26-a5f3-a54d8f437ce1', 'fd6543ae-6e97-4a06-b700-84c7a210502c', true, '2026-09 한시적 상호 열람');