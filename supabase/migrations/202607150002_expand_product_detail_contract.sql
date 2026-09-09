BEGIN;

CREATE OR REPLACE FUNCTION app_api.product_detail(
  p_product_id text,
  p_allow_draft boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, catalog, recommendation
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'contract_version', 'product-detail-2026-07-v2',
    'product_id', p.product_id,
    'name', p.name,
    'company', c.name,
    'product_type', p.product_type,
    'category', p.category,
    'scope_text', p.scope_text,
    'critical_note', p.critical_note,
    'version_label', p.version_label,
    'effective_from', p.effective_from,
    'effective_to', p.effective_to,
    'signals', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'signal_code', ps.signal_code,
        'name', sd.name,
        'score', ps.score,
        'confidence', ps.confidence,
        'basis', ps.basis,
        'evidence', ps.evidence,
        'human_approved', ps.human_approved
      ) ORDER BY sd.name, ps.signal_code)
      FROM recommendation.product_signal ps
      JOIN recommendation.signal_definition sd USING (signal_code)
      WHERE ps.product_id = p.product_id
        AND ps.status <> 'retired'
        AND (p_allow_draft OR ps.human_approved)
    ), '[]'::jsonb),
    'coverage_facts', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'fact_id', cf.fact_id,
        'category', cf.category,
        'topic', cf.topic,
        'coverage_status', cf.coverage_status,
        'term_analysis', cf.term_analysis,
        'limit_frequency', cf.limit_frequency,
        'deductible_participation', cf.deductible_participation,
        'waiting_period_text', cf.waiting_period_text,
        'geography', cf.geography,
        'network', cf.network,
        'source_filename', cf.source_filename,
        'article_section', cf.article_section,
        'confidence', cf.confidence,
        'evidence_level', cf.evidence_level,
        'human_validated', cf.human_validated
      )) ORDER BY cf.fact_id)
      FROM catalog.coverage_fact cf
      WHERE cf.product_id = p.product_id
        AND (p_allow_draft OR cf.human_validated)
    ), '[]'::jsonb),
    'deductible_rules', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'deductible_id', dr.deductible_id,
        'coverage_case', dr.coverage_case,
        'exact_rule', dr.exact_rule,
        'practical_meaning', dr.practical_meaning,
        'period_frequency', dr.period_frequency,
        'source_filename', dr.source_filename,
        'article_section', dr.article_section,
        'confidence', dr.confidence,
        'human_validated', dr.human_validated
      )) ORDER BY dr.deductible_id)
      FROM catalog.deductible_rule dr
      WHERE dr.product_id = p.product_id
        AND (p_allow_draft OR dr.human_validated)
    ), '[]'::jsonb),
    'monetary_facts', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'monetary_id', mf.monetary_id,
        'exact_excerpt', mf.exact_excerpt,
        'source_filename', mf.source_filename,
        'pdf_page', mf.pdf_page,
        'human_validated', mf.human_validated
      )) ORDER BY mf.monetary_id)
      FROM catalog.monetary_fact mf
      WHERE (
          mf.product_id = p.product_id
          OR EXISTS (
            SELECT 1
            FROM catalog.monetary_fact_product mfp
            WHERE mfp.monetary_id = mf.monetary_id
              AND mfp.product_id = p.product_id
          )
        )
        AND (p_allow_draft OR mf.human_validated)
    ), '[]'::jsonb),
    'waiting_periods', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'waiting_id', wp.waiting_id,
        'coverage_case', wp.coverage_case,
        'duration_text', wp.duration_text,
        'application_text', wp.application_text,
        'source_filename', wp.source_filename,
        'article_section', wp.article_section,
        'confidence', wp.confidence,
        'human_validated', wp.human_validated
      )) ORDER BY wp.waiting_id)
      FROM catalog.waiting_period wp
      WHERE wp.product_id = p.product_id
        AND (p_allow_draft OR wp.human_validated)
    ), '[]'::jsonb),
    'exclusions', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'exclusion_id', ex.exclusion_id,
        'record_type', ex.record_type,
        'exclusion_text', ex.exclusion_text,
        'source_filename', ex.source_filename,
        'pdf_page', ex.pdf_page,
        'validation_note', ex.validation_note,
        'human_validated', ex.human_validated
      )) ORDER BY ex.exclusion_id)
      FROM catalog.exclusion ex
      WHERE ex.product_id = p.product_id
        AND (p_allow_draft OR ex.human_validated)
    ), '[]'::jsonb),
    'provider_networks', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'network_id', pn.network_id,
        'provider_type', pn.provider_type,
        'provider_name', pn.provider_name,
        'region', pn.region,
        'network_status', pn.network_status,
        'version_note', pn.version_note,
        'valid_from', pn.valid_from,
        'valid_to', pn.valid_to,
        'last_verified_at', pn.last_verified_at,
        'human_validated', pn.human_validated
      )) ORDER BY pn.network_id)
      FROM catalog.provider_network pn
      WHERE pn.product_id = p.product_id
        AND (p_allow_draft OR pn.human_validated)
    ), '[]'::jsonb),
    'procedure_fees', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'fee_id', pf.fee_id,
        'fee_type', pf.fee_type,
        'medical_specialty', pf.medical_specialty,
        'severity_category', pf.severity_category,
        'amount', pf.amount,
        'currency', pf.currency,
        'source_filename', pf.source_filename,
        'human_validated', pf.human_validated
      )) ORDER BY pf.fee_id)
      FROM catalog.procedure_fee pf
      WHERE pf.product_id = p.product_id
        AND (p_allow_draft OR pf.human_validated)
    ), '[]'::jsonb),
    'supplementary_benefits', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'benefit_id', sb.benefit_id,
        'benefit_name', sb.benefit_name,
        'exact_operation_conditions', sb.exact_operation_conditions,
        'waiting_text', sb.waiting_text,
        'duration_expiry', sb.duration_expiry,
        'source_filename', sb.source_filename,
        'human_validated', sb.human_validated
      )) ORDER BY sb.benefit_id)
      FROM catalog.supplementary_benefit sb
      WHERE sb.product_id = p.product_id
        AND (p_allow_draft OR sb.human_validated)
    ), '[]'::jsonb),
    'claim_rules', coalesce((
      SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'claim_rule_id', cr.claim_rule_id,
        'claim_case', cr.claim_case,
        'exact_process', cr.exact_process,
        'deadline_limit', cr.deadline_limit,
        'human_validated', cr.human_validated
      )) ORDER BY cr.claim_rule_id)
      FROM catalog.claim_rule cr
      WHERE cr.product_id = p.product_id
        AND (p_allow_draft OR cr.human_validated)
    ), '[]'::jsonb),
    'data_quality_warning', 'Οι καλύψεις και οι όροι απαιτούν επιβεβαίωση για το ακριβές πρόγραμμα και την τρέχουσα έκδοση.'
  ))
  FROM catalog.product p
  JOIN catalog.company c USING (company_id)
  WHERE p.product_id = p_product_id
    AND p.is_active
    AND p.recommendation_scope;
$$;

REVOKE ALL ON FUNCTION app_api.product_detail(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_api.product_detail(text, boolean) TO service_role;

COMMENT ON FUNCTION app_api.product_detail(text, boolean) IS
  'Server-only product detail contract. Draft records are exposed only for this POC and are not binding insurance terms.';

COMMIT;
