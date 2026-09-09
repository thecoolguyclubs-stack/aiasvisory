BEGIN;

CREATE TYPE intake.questionnaire_contract_status AS ENUM (
  'draft',
  'approved',
  'retired'
);

CREATE OR REPLACE FUNCTION intake.questionnaire_canonical_json(p_value jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog, intake
AS $$
DECLARE
  v_result text;
BEGIN
  CASE jsonb_typeof(p_value)
    WHEN 'object' THEN
      SELECT '{' || coalesce(string_agg(
        to_jsonb(entry.key)::text || ':' || intake.questionnaire_canonical_json(entry.value),
        ',' ORDER BY entry.key COLLATE "C"
      ), '') || '}'
      INTO v_result
      FROM jsonb_each(p_value) entry;
    WHEN 'array' THEN
      SELECT '[' || coalesce(string_agg(
        intake.questionnaire_canonical_json(entry.value),
        ',' ORDER BY entry.ordinality
      ), '') || ']'
      INTO v_result
      FROM jsonb_array_elements(p_value) WITH ORDINALITY entry(value, ordinality);
    ELSE
      v_result := p_value::text;
  END CASE;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION intake.questionnaire_contract_hash(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = pg_catalog, intake, public
AS $$
  SELECT encode(
    public.digest(
      convert_to(intake.questionnaire_canonical_json(p_payload), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE TABLE intake.questionnaire_contract_version (
  contract_version text PRIMARY KEY,
  answer_schema_version text NOT NULL,
  semantic_version text NOT NULL,
  content_revision integer NOT NULL CHECK (content_revision > 0),
  status intake.questionnaire_contract_status NOT NULL DEFAULT 'draft',
  max_members integer NOT NULL CHECK (max_members BETWEEN 1 AND 50),
  question_count integer NOT NULL CHECK (question_count > 0),
  contract_hash text NOT NULL UNIQUE CHECK (contract_hash ~ '^[0-9a-f]{64}$'),
  source_payload jsonb NOT NULL CHECK (jsonb_typeof(source_payload) = 'object'),
  runtime_active boolean NOT NULL DEFAULT false,
  effective_from timestamptz,
  effective_to timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  review_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(review_metadata) = 'object'),
  approved_at timestamptz,
  approved_by text,
  approval_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(approval_metadata) = 'object'),
  retired_at timestamptz,
  retired_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR (effective_from IS NOT NULL AND effective_to > effective_from)),
  CHECK (contract_hash = intake.questionnaire_contract_hash(source_payload)),
  CHECK (status <> 'draft' OR (effective_from IS NULL AND effective_to IS NULL AND NOT runtime_active)),
  CHECK (status = 'draft' OR effective_from IS NOT NULL),
  CHECK (NOT runtime_active OR status = 'approved'),
  CHECK (
    status = 'draft'
    OR (
      approved_at IS NOT NULL
      AND approved_by IS NOT NULL
      AND length(btrim(approved_by)) > 0
    )
  ),
  CHECK (
    status <> 'retired'
    OR (
      retired_at IS NOT NULL
      AND retired_by IS NOT NULL
      AND length(btrim(retired_by)) > 0
      AND effective_to IS NOT NULL
      AND NOT runtime_active
    )
  )
);

CREATE UNIQUE INDEX questionnaire_contract_single_runtime_active
  ON intake.questionnaire_contract_version (runtime_active)
  WHERE runtime_active;

CREATE TABLE intake.questionnaire_question_revision (
  contract_version text NOT NULL REFERENCES intake.questionnaire_contract_version(contract_version),
  question_id text NOT NULL,
  question_revision integer NOT NULL CHECK (question_revision > 0),
  answer_key text NOT NULL,
  question_text text NOT NULL CHECK (length(btrim(question_text)) > 0),
  answer_type text NOT NULL CHECK (
    answer_type IN ('single_select', 'multi_select', 'member_birth_dates')
  ),
  required boolean NOT NULL,
  display_order integer NOT NULL CHECK (display_order > 0),
  validation_rule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation_rule) = 'object'),
  conditional_visibility jsonb NOT NULL DEFAULT '{"operator":"always"}'::jsonb CHECK (jsonb_typeof(conditional_visibility) = 'object'),
  content_revision integer NOT NULL CHECK (content_revision > 0),
  review_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(review_metadata) = 'object'),
  PRIMARY KEY (contract_version, question_id, question_revision),
  UNIQUE (question_id, question_revision),
  UNIQUE (contract_version, question_id),
  UNIQUE (contract_version, answer_key),
  UNIQUE (contract_version, display_order)
);

CREATE TABLE intake.questionnaire_option_revision (
  contract_version text NOT NULL,
  question_id text NOT NULL,
  question_revision integer NOT NULL,
  option_id text NOT NULL,
  option_revision integer NOT NULL CHECK (option_revision > 0),
  canonical_value text NOT NULL CHECK (length(btrim(canonical_value)) > 0),
  label text NOT NULL CHECK (length(btrim(label)) > 0),
  description text CHECK (description IS NULL OR length(btrim(description)) > 0),
  category_badge text CHECK (category_badge IS NULL OR length(btrim(category_badge)) > 0),
  display_order integer NOT NULL CHECK (display_order > 0),
  content_revision integer NOT NULL CHECK (content_revision > 0),
  review_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(review_metadata) = 'object'),
  PRIMARY KEY (contract_version, question_id, question_revision, option_id, option_revision),
  FOREIGN KEY (contract_version, question_id, question_revision)
    REFERENCES intake.questionnaire_question_revision(contract_version, question_id, question_revision),
  UNIQUE (contract_version, question_id, question_revision, option_id),
  UNIQUE (contract_version, question_id, question_revision, canonical_value),
  UNIQUE (contract_version, question_id, question_revision, display_order)
);

CREATE TABLE intake.questionnaire_evidence_workflow_revision (
  contract_version text NOT NULL REFERENCES intake.questionnaire_contract_version(contract_version),
  workflow_id text NOT NULL,
  workflow_revision integer NOT NULL CHECK (workflow_revision > 0),
  workflow_type text NOT NULL CHECK (workflow_type IN ('pdf_upload')),
  required boolean NOT NULL DEFAULT false,
  included_in_question_count boolean NOT NULL DEFAULT false CHECK (NOT included_in_question_count),
  included_in_scoring_answers boolean NOT NULL DEFAULT false CHECK (NOT included_in_scoring_answers),
  validation_rule jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation_rule) = 'object'),
  conditional_visibility jsonb NOT NULL DEFAULT '{"operator":"always"}'::jsonb CHECK (jsonb_typeof(conditional_visibility) = 'object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  content_revision integer NOT NULL CHECK (content_revision > 0),
  review_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(review_metadata) = 'object'),
  PRIMARY KEY (contract_version, workflow_id, workflow_revision),
  UNIQUE (workflow_id, workflow_revision),
  UNIQUE (contract_version, workflow_id)
);

CREATE OR REPLACE FUNCTION intake.questionnaire_contract_normalized_payload(
  p_contract_version text,
  p_answer_schema_version text,
  p_semantic_version text,
  p_content_revision integer,
  p_status intake.questionnaire_contract_status,
  p_runtime_active boolean,
  p_effective_from timestamptz,
  p_effective_to timestamptz,
  p_max_members integer,
  p_review_metadata jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, intake
AS $$
  WITH questions AS (
    SELECT
      question.contract_version,
      jsonb_agg(
        jsonb_build_object(
          'questionId', question.question_id,
          'questionRevision', question.question_revision,
          'contentRevision', question.content_revision,
          'answerKey', question.answer_key,
          'questionText', question.question_text,
          'answerType', question.answer_type,
          'required', question.required,
          'displayOrder', question.display_order,
          'validation', question.validation_rule,
          'conditionalVisibility', question.conditional_visibility,
          'options', coalesce(options.option_payload, '[]'::jsonb)
        )
        ORDER BY question.display_order
      ) AS question_payload
    FROM intake.questionnaire_question_revision question
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_strip_nulls(jsonb_build_object(
          'optionId', option.option_id,
          'optionRevision', option.option_revision,
          'contentRevision', option.content_revision,
          'canonicalValue', option.canonical_value,
          'label', option.label,
          'description', option.description,
          'categoryBadge', option.category_badge,
          'displayOrder', option.display_order
        ))
        ORDER BY option.display_order
      ) AS option_payload
      FROM intake.questionnaire_option_revision option
      WHERE option.contract_version = question.contract_version
        AND option.question_id = question.question_id
        AND option.question_revision = question.question_revision
    ) options ON true
    GROUP BY question.contract_version
  ),
  evidence_workflows AS (
    SELECT
      workflow.contract_version,
      jsonb_agg(
        jsonb_build_object(
          'workflowId', workflow.workflow_id,
          'workflowRevision', workflow.workflow_revision,
          'contentRevision', workflow.content_revision,
          'workflowType', workflow.workflow_type,
          'required', workflow.required,
          'includedInQuestionCount', workflow.included_in_question_count,
          'includedInScoringAnswers', workflow.included_in_scoring_answers,
          'validation', workflow.validation_rule,
          'conditionalVisibility', workflow.conditional_visibility,
          'metadata', workflow.metadata
        )
        ORDER BY workflow.workflow_id, workflow.workflow_revision
      ) AS workflow_payload
    FROM intake.questionnaire_evidence_workflow_revision workflow
    GROUP BY workflow.contract_version
  )
  SELECT jsonb_build_object(
    'contractVersion', p_contract_version,
    'answerSchemaVersion', p_answer_schema_version,
    'semanticVersion', p_semantic_version,
    'contentRevision', p_content_revision,
    'status', p_status::text,
    'runtimeActive', p_runtime_active,
    'effectiveFrom', p_effective_from,
    'effectiveTo', p_effective_to,
    'maxMembers', p_max_members,
    'questions', coalesce(questions.question_payload, '[]'::jsonb),
    'evidenceWorkflows', coalesce(evidence_workflows.workflow_payload, '[]'::jsonb),
    'reviewMetadata', p_review_metadata
  )
  FROM (SELECT p_contract_version AS contract_version) contract
  LEFT JOIN questions ON questions.contract_version = p_contract_version
  LEFT JOIN evidence_workflows
    ON evidence_workflows.contract_version = p_contract_version;
$$;

CREATE OR REPLACE FUNCTION intake.questionnaire_contract_normalized_payload(
  p_contract_version text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, intake
AS $$
  SELECT intake.questionnaire_contract_normalized_payload(
    contract.contract_version,
    contract.answer_schema_version,
    contract.semantic_version,
    contract.content_revision,
    contract.status,
    contract.runtime_active,
    contract.effective_from,
    contract.effective_to,
    contract.max_members,
    contract.review_metadata
  )
  FROM intake.questionnaire_contract_version contract
  WHERE contract.contract_version = p_contract_version;
$$;

CREATE OR REPLACE FUNCTION intake.questionnaire_visibility_references_are_valid(
  p_contract_version text,
  p_expression jsonb
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, intake
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM jsonb_path_query(coalesce(p_expression, '{}'::jsonb), '$.**.questionId') reference
    WHERE jsonb_typeof(reference) <> 'string'
       OR NOT EXISTS (
         SELECT 1
         FROM intake.questionnaire_question_revision question
         WHERE question.contract_version = p_contract_version
           AND question.question_id = reference #>> '{}'
       )
  );
$$;

CREATE OR REPLACE FUNCTION intake.guard_questionnaire_visibility_references()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, intake
AS $$
DECLARE
  v_contract_version text := coalesce(NEW.contract_version, OLD.contract_version);
BEGIN
  IF EXISTS (
    SELECT 1
    FROM intake.questionnaire_question_revision question
    WHERE question.contract_version = v_contract_version
      AND NOT intake.questionnaire_visibility_references_are_valid(
        v_contract_version,
        question.conditional_visibility
      )
  ) OR EXISTS (
    SELECT 1
    FROM intake.questionnaire_evidence_workflow_revision workflow
    WHERE workflow.contract_version = v_contract_version
      AND NOT intake.questionnaire_visibility_references_are_valid(
        v_contract_version,
        workflow.conditional_visibility
      )
  ) THEN
    RAISE EXCEPTION 'Questionnaire visibility expression references an unknown question ID.';
  END IF;

  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION intake.guard_questionnaire_contract_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, intake
AS $$
DECLARE
  v_contract_version text;
  v_status intake.questionnaire_contract_status;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_contract_version := OLD.contract_version;

    SELECT status INTO v_status
    FROM intake.questionnaire_contract_version
    WHERE contract_version = v_contract_version
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Questionnaire child row references an unknown contract version.';
    END IF;

    IF v_status IS DISTINCT FROM 'draft'::intake.questionnaire_contract_status THEN
      RAISE EXCEPTION 'Approved or retired questionnaire contract content is immutable.';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_contract_version := NEW.contract_version;
  ELSIF TG_OP = 'UPDATE' AND NEW.contract_version IS DISTINCT FROM OLD.contract_version THEN
    v_contract_version := NEW.contract_version;
  ELSE
    v_contract_version := NULL;
  END IF;

  IF v_contract_version IS NOT NULL THEN
    SELECT status INTO v_status
    FROM intake.questionnaire_contract_version
    WHERE contract_version = v_contract_version
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Questionnaire child row references an unknown contract version.';
    END IF;

    IF v_status IS DISTINCT FROM 'draft'::intake.questionnaire_contract_status THEN
      RAISE EXCEPTION 'Approved or retired questionnaire contract content is immutable.';
    END IF;
  END IF;

  RETURN coalesce(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION intake.guard_questionnaire_contract_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, intake
AS $$
DECLARE
  v_normalized_hash text;
  v_question_count integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.runtime_active
       OR NEW.effective_from IS NOT NULL OR NEW.effective_to IS NOT NULL THEN
      RAISE EXCEPTION 'Questionnaire contract versions must be inserted as inactive drafts.';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Questionnaire contract versions are append-only and cannot be deleted.';
  END IF;

  IF NEW.contract_version IS DISTINCT FROM OLD.contract_version THEN
    RAISE EXCEPTION 'Questionnaire contract_version is immutable.';
  END IF;

  IF OLD.status = 'retired' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Retired questionnaire contracts are immutable.';
  END IF;

  IF OLD.status = 'approved' THEN
    IF NEW.status = 'approved' THEN
      IF NEW IS DISTINCT FROM OLD THEN
        RAISE EXCEPTION 'Approved questionnaire contracts are immutable.';
      END IF;
      RETURN NEW;
    END IF;

    IF NEW.status <> 'retired' THEN
      RAISE EXCEPTION 'Invalid questionnaire contract status transition.';
    END IF;

    IF NEW.answer_schema_version IS DISTINCT FROM OLD.answer_schema_version
       OR NEW.semantic_version IS DISTINCT FROM OLD.semantic_version
       OR NEW.content_revision IS DISTINCT FROM OLD.content_revision
       OR NEW.max_members IS DISTINCT FROM OLD.max_members
       OR NEW.question_count IS DISTINCT FROM OLD.question_count
       OR NEW.contract_hash IS DISTINCT FROM OLD.contract_hash
       OR NEW.source_payload IS DISTINCT FROM OLD.source_payload
       OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approval_metadata IS DISTINCT FROM OLD.approval_metadata THEN
      RAISE EXCEPTION 'Approved questionnaire contract content is immutable.';
    END IF;

    IF NEW.effective_to IS NULL OR NEW.retired_at IS NULL
       OR NEW.retired_by IS NULL OR length(btrim(NEW.retired_by)) = 0
       OR NEW.runtime_active THEN
      RAISE EXCEPTION 'Retiring a questionnaire contract requires effective_to, retired metadata, and runtime_active=false.';
    END IF;

    RETURN NEW;
  END IF;

  IF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'approved') THEN
    RAISE EXCEPTION 'Invalid questionnaire contract status transition.';
  END IF;

  IF OLD.status = 'draft' AND NEW.status = 'approved' THEN
    SELECT count(*) INTO v_question_count
    FROM intake.questionnaire_question_revision
    WHERE contract_version = NEW.contract_version;

    IF v_question_count <> NEW.question_count THEN
      RAISE EXCEPTION 'Approved questionnaire question_count does not match its revisions.';
    END IF;

    IF NEW.effective_from IS NULL OR NEW.approved_at IS NULL
       OR NEW.approved_by IS NULL OR length(btrim(NEW.approved_by)) = 0 THEN
      RAISE EXCEPTION 'Approving a questionnaire contract requires effective_from and approval metadata.';
    END IF;

    IF NEW.contract_hash IS DISTINCT FROM intake.questionnaire_contract_hash(NEW.source_payload) THEN
      RAISE EXCEPTION 'Questionnaire contract_hash does not match source_payload.';
    END IF;

    SELECT intake.questionnaire_contract_hash(
      intake.questionnaire_contract_normalized_payload(
        NEW.contract_version,
        NEW.answer_schema_version,
        NEW.semantic_version,
        NEW.content_revision,
        NEW.status,
        NEW.runtime_active,
        NEW.effective_from,
        NEW.effective_to,
        NEW.max_members,
        NEW.review_metadata
      )
    )
    INTO v_normalized_hash;

    IF v_normalized_hash IS NULL OR NEW.contract_hash IS DISTINCT FROM v_normalized_hash THEN
      RAISE EXCEPTION 'Approved questionnaire source payload does not match normalized revisions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER questionnaire_contract_version_guard
BEFORE INSERT OR UPDATE OR DELETE ON intake.questionnaire_contract_version
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_contract_version();

CREATE TRIGGER questionnaire_question_content_guard
BEFORE INSERT OR UPDATE OR DELETE ON intake.questionnaire_question_revision
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_contract_content();

CREATE TRIGGER questionnaire_option_content_guard
BEFORE INSERT OR UPDATE OR DELETE ON intake.questionnaire_option_revision
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_contract_content();

CREATE TRIGGER questionnaire_evidence_content_guard
BEFORE INSERT OR UPDATE OR DELETE ON intake.questionnaire_evidence_workflow_revision
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_contract_content();

CREATE CONSTRAINT TRIGGER questionnaire_question_visibility_guard
AFTER INSERT OR UPDATE OR DELETE ON intake.questionnaire_question_revision
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_visibility_references();

CREATE CONSTRAINT TRIGGER questionnaire_evidence_visibility_guard
AFTER INSERT OR UPDATE OR DELETE ON intake.questionnaire_evidence_workflow_revision
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION intake.guard_questionnaire_visibility_references();

DO $seed$
DECLARE
  v_contract jsonb := $questionnaire_v2_contract$
{
  "contractVersion": "im-health-assessment-2026-07-v2",
  "answerSchemaVersion": "im-health-assessment-answers-2026-07-v2",
  "semanticVersion": "2.0.0-draft.1",
  "contentRevision": 1,
  "status": "draft",
  "runtimeActive": false,
  "effectiveFrom": null,
  "effectiveTo": null,
  "maxMembers": 8,
  "questions": [
    {
      "questionId": "Q_INSURED_PEOPLE",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "insured_people",
      "questionText": "Ποιον θέλεις να ασφαλίσεις;",
      "answerType": "single_select",
      "required": true,
      "displayOrder": 10,
      "validation": {"minimumSelections": 1, "maximumSelections": 1, "allowedValues": ["self", "self_spouse", "family", "child"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_INSURED_SELF", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "self", "label": "Εμένα", "displayOrder": 10},
        {"optionId": "OPT_INSURED_SELF_SPOUSE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "self_spouse", "label": "Εμένα και τον/τη σύντροφό μου", "displayOrder": 20},
        {"optionId": "OPT_INSURED_FAMILY", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "family", "label": "Την οικογένειά μου", "displayOrder": 30},
        {"optionId": "OPT_INSURED_CHILD", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "child", "label": "Το παιδί ή τα παιδιά μου", "displayOrder": 40}
      ]
    },
    {
      "questionId": "Q_BIRTH_DATES",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "birth_dates",
      "questionText": "Ποια είναι η ημερομηνία γέννησής σου;",
      "answerType": "member_birth_dates",
      "required": true,
      "displayOrder": 20,
      "validation": {"minimumMembers": 1, "dateFormat": "YYYY-MM-DD", "notFuture": true},
      "conditionalVisibility": {"operator": "always"},
      "options": []
    },
    {
      "questionId": "Q_EXISTING_INSURANCE",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "existing_insurance",
      "questionText": "Ποια είναι η ασφαλιστική σου κάλυψη σήμερα;",
      "answerType": "single_select",
      "required": true,
      "displayOrder": 30,
      "validation": {"minimumSelections": 1, "maximumSelections": 1, "allowedValues": ["none", "individual", "employer_group", "individual_and_group"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_EXISTING_NONE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "none", "label": "Δεν έχω ιδιωτική ασφάλιση υγείας", "displayOrder": 10},
        {"optionId": "OPT_EXISTING_INDIVIDUAL", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "individual", "label": "Έχω ατομικό ή οικογενειακό ασφαλιστήριο", "displayOrder": 20},
        {"optionId": "OPT_EXISTING_EMPLOYER", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "employer_group", "label": "Έχω ομαδική ασφάλιση μέσω της εργασίας μου", "displayOrder": 30},
        {"optionId": "OPT_EXISTING_BOTH", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "individual_and_group", "label": "Έχω και ατομικό και ομαδικό πρόγραμμα", "displayOrder": 40}
      ]
    },
    {
      "questionId": "Q_EVALUATION_GOAL",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "evaluation_goal",
      "questionText": "Τι θέλεις να πετύχεις μέσα από αυτή την αξιολόγηση;",
      "answerType": "single_select",
      "required": true,
      "displayOrder": 40,
      "validation": {"minimumSelections": 1, "maximumSelections": 1, "allowedValues": ["first_time", "independent_from_employer", "evaluate_existing", "improve_value"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_GOAL_FIRST_TIME", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "first_time", "label": "Αναζητώ ιδιωτική ασφάλιση για πρώτη φορά", "displayOrder": 10},
        {"optionId": "OPT_GOAL_EMPLOYER_INDEPENDENCE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "independent_from_employer", "label": "Θέλω προσωπική κάλυψη ανεξάρτητη από τον εργοδότη μου", "displayOrder": 20},
        {"optionId": "OPT_GOAL_COMPARE_EXISTING", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "evaluate_existing", "label": "Θέλω να αξιολογήσω ή να συγκρίνω ένα υπάρχον πρόγραμμα ή μία ασφαλιστική προσφορά", "displayOrder": 30},
        {"optionId": "OPT_GOAL_VALUE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "improve_value", "label": "Θέλω καλύτερη σχέση καλύψεων και κόστους", "displayOrder": 40}
      ]
    },
    {
      "questionId": "Q_PRIORITIES",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "priorities",
      "questionText": "Ποια χαρακτηριστικά είναι πιο σημαντικά για εσένα;",
      "answerType": "multi_select",
      "required": true,
      "displayOrder": 50,
      "validation": {"minimumSelections": 1, "maximumSelections": 3, "uniqueValues": true, "allowedValues": ["hospital-network", "surgery", "emergency", "serious-illness", "high-limit", "low-deductible"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_PRIORITY_HOSPITAL_NETWORK", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "hospital-network", "label": "Νοσηλεία σε ιδιωτικό νοσοκομείο", "displayOrder": 10},
        {"optionId": "OPT_PRIORITY_SURGERY", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "surgery", "label": "Χειρουργικές επεμβάσεις", "displayOrder": 20},
        {"optionId": "OPT_PRIORITY_EMERGENCY", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "emergency", "label": "Κάλυψη επειγόντων περιστατικών", "displayOrder": 30},
        {"optionId": "OPT_PRIORITY_SERIOUS_ILLNESS", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "serious-illness", "label": "Κάλυψη σοβαρών ασθενειών", "displayOrder": 40},
        {"optionId": "OPT_PRIORITY_HIGH_LIMIT", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "high-limit", "label": "Υψηλό όριο κάλυψης για μακροχρόνια νοσηλεία", "displayOrder": 50},
        {"optionId": "OPT_PRIORITY_LOW_DEDUCTIBLE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "low-deductible", "label": "Μηδενική ή χαμηλή συμμετοχή", "displayOrder": 60}
      ]
    },
    {
      "questionId": "Q_DEDUCTIBLE_PREFERENCE",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "deductible_preference",
      "questionText": "Πώς θέλεις να διαμορφώνεται η συμμετοχή σου σε περίπτωση νοσηλείας;",
      "answerType": "single_select",
      "required": true,
      "displayOrder": 60,
      "validation": {"minimumSelections": 1, "maximumSelections": 1, "allowedValues": ["minimum", "small", "large"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_DEDUCTIBLE_MINIMUM", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "minimum", "label": "Θέλω μηδενική ή ελάχιστη δυνατή συμμετοχή", "description": "0€ - 500€", "displayOrder": 10},
        {"optionId": "OPT_DEDUCTIBLE_SMALL", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "small", "label": "Μπορώ να δεχτώ μια μικρή συμμετοχή για καλύτερη τιμή", "description": "500€ - 1.500€", "displayOrder": 20},
        {"optionId": "OPT_DEDUCTIBLE_LARGE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "large", "label": "Μπορώ να δεχτώ μεγάλη απαλλαγή για χαμηλό ασφάλιστρο", "description": "1.500€ και άνω", "displayOrder": 30}
      ]
    },
    {
      "questionId": "Q_PROTECTION_COST",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "protection_cost",
      "questionText": "Ποια προσέγγιση σε εκφράζει περισσότερο;",
      "answerType": "single_select",
      "required": true,
      "displayOrder": 70,
      "validation": {"minimumSelections": 1, "maximumSelections": 1, "allowedValues": ["complete", "balanced", "basic"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_PROTECTION_COMPLETE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "complete", "label": "Πληρέστερη διαθέσιμη προστασία", "description": "Προτεραιότητα στις εκτεταμένες καλύψεις, στα υψηλά όρια και στην ελευθερία επιλογής.", "categoryBadge": "Premium Choice", "displayOrder": 10},
        {"optionId": "OPT_PROTECTION_BALANCED", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "balanced", "label": "Ισορροπία καλύψεων και κόστους", "description": "Ουσιαστική προστασία, με καλύψεις που ανταποκρίνονται στις ανάγκες σου.", "categoryBadge": "Best Match", "displayOrder": 20},
        {"optionId": "OPT_PROTECTION_BASIC", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "basic", "label": "Βασικές ανάγκες με χαμηλότερο κόστος", "description": "Προστασία κυρίως από σοβαρά και απρόβλεπτα περιστατικά, με έμφαση στο χαμηλότερο ασφάλιστρο.", "categoryBadge": "Smart Budget Choice", "displayOrder": 30}
      ]
    },
    {
      "questionId": "Q_ADDITIONAL_NEEDS",
      "questionRevision": 1,
      "contentRevision": 1,
      "answerKey": "additional_needs",
      "questionText": "Υπάρχει κάποια κάλυψη ή παροχή που θα ήθελες να περιλαμβάνει το πρόγραμμά σου;",
      "answerType": "multi_select",
      "required": false,
      "displayOrder": 80,
      "validation": {"minimumSelections": 0, "maximumSelections": 8, "uniqueValues": true, "allowedValues": ["outpatient_visits", "frequent_travel", "maternity", "physiotherapy", "young_children", "immediate_use", "provider_freedom", "prevention_checkup"]},
      "conditionalVisibility": {"operator": "always"},
      "options": [
        {"optionId": "OPT_NEED_OUTPATIENT_VISITS", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "outpatient_visits", "label": "Εξωνοσοκομειακές επισκέψεις", "description": "Επισκέψεις σε γιατρούς χωρίς να απαιτείται νοσηλεία.", "displayOrder": 10},
        {"optionId": "OPT_NEED_TRAVEL", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "frequent_travel", "label": "Ταξιδεύω συχνά στο εξωτερικό", "description": "Κάλυψη σε Ευρώπη ή παγκόσμια, ανάλογα με το πρόγραμμα και τους όρους του.", "displayOrder": 20},
        {"optionId": "OPT_NEED_MATERNITY", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "maternity", "label": "Κάλυψη μητρότητας", "description": "Κάλυψη τοκετού, καισαρικής, επιπλοκών κύησης ή σχετικών εξόδων, όπου προβλέπεται.", "displayOrder": 30},
        {"optionId": "OPT_NEED_PHYSIO", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "physiotherapy", "label": "Φυσικοθεραπείες / αποκατάσταση", "description": "Κάλυψη μετά από ατύχημα, χειρουργική επέμβαση ή σοβαρή πάθηση.", "displayOrder": 40},
        {"optionId": "OPT_NEED_CHILDREN", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "young_children", "label": "Πλήρης παιδιατρική κάλυψη", "description": "Κάλυψη για παιδιά, όπως παιδίατροι, νοσηλεία, εξετάσεις, επείγοντα και ειδικές παιδιατρικές παροχές.", "displayOrder": 50},
        {"optionId": "OPT_NEED_IMMEDIATE", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "immediate_use", "label": "Μικρή περίοδος αναμονής / άμεση χρήση προγράμματος", "description": "Έναρξη της κάλυψης το συντομότερο δυνατό, με περιορισμένη περίοδο αναμονής όπου αυτό προβλέπεται.", "displayOrder": 60},
        {"optionId": "OPT_NEED_FREEDOM", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "provider_freedom", "label": "Μεγάλη ελευθερία επιλογής δικτύου γιατρών / νοσοκομείων", "description": "Δυνατότητα επιλογής γιατρού ή νοσοκομείου, ώστε ο πελάτης να έχει μεγαλύτερο έλεγχο στη διαχείριση της περίθαλψής του.", "displayOrder": 70},
        {"optionId": "OPT_NEED_PREVENTION", "optionRevision": 1, "contentRevision": 1, "canonicalValue": "prevention_checkup", "label": "Διαγνωστικές εξετάσεις χωρίς νοσηλεία / check-up", "description": "Αιματολογικές εξετάσεις, ακτινογραφίες, υπέρηχοι, αξονικές, μαγνητικές και προληπτικός έλεγχος υγείας.", "displayOrder": 80}
      ]
    }
  ],
  "evidenceWorkflows": [
    {
      "workflowId": "EXISTING_POLICY_PDF_UPLOAD",
      "workflowRevision": 1,
      "contentRevision": 1,
      "workflowType": "pdf_upload",
      "required": false,
      "includedInQuestionCount": false,
      "includedInScoringAnswers": false,
      "validation": {"acceptedMimeTypes": ["application/pdf"], "maximumBytes": 15728640, "storeFileBytes": false},
      "conditionalVisibility": {
        "operator": "or",
        "conditions": [
          {"questionId": "Q_EXISTING_INSURANCE", "operator": "not_equals", "value": "none"},
          {"questionId": "Q_EVALUATION_GOAL", "operator": "equals", "value": "evaluate_existing"}
        ]
      },
      "metadata": {"canonicalFilename": "uploaded-policy.pdf", "purpose": "optional_evidence"}
    }
  ],
  "reviewMetadata": {
    "milestone": "3C",
    "approvalState": "business_review_required",
    "note": "Infrastructure baseline only; not approved for runtime use."
  }
}
$questionnaire_v2_contract$::jsonb;
  v_contract_hash text := '3e899fa79cfd77183b682299f3507b506facc80ddbc393514a1b2fecea52054a';
BEGIN
  INSERT INTO intake.questionnaire_contract_version (
    contract_version,
    answer_schema_version,
    semantic_version,
    content_revision,
    status,
    max_members,
    question_count,
    contract_hash,
    source_payload,
    runtime_active,
    effective_from,
    effective_to,
    review_metadata
  ) VALUES (
    v_contract->>'contractVersion',
    v_contract->>'answerSchemaVersion',
    v_contract->>'semanticVersion',
    (v_contract->>'contentRevision')::integer,
    (v_contract->>'status')::intake.questionnaire_contract_status,
    (v_contract->>'maxMembers')::integer,
    jsonb_array_length(v_contract->'questions'),
    v_contract_hash,
    v_contract,
    (v_contract->>'runtimeActive')::boolean,
    (v_contract->>'effectiveFrom')::timestamptz,
    (v_contract->>'effectiveTo')::timestamptz,
    v_contract->'reviewMetadata'
  );

  INSERT INTO intake.questionnaire_question_revision (
    contract_version,
    question_id,
    question_revision,
    answer_key,
    question_text,
    answer_type,
    required,
    display_order,
    validation_rule,
    conditional_visibility,
    content_revision
  )
  SELECT
    v_contract->>'contractVersion',
    question->>'questionId',
    (question->>'questionRevision')::integer,
    question->>'answerKey',
    question->>'questionText',
    question->>'answerType',
    (question->>'required')::boolean,
    (question->>'displayOrder')::integer,
    question->'validation',
    question->'conditionalVisibility',
    (question->>'contentRevision')::integer
  FROM jsonb_array_elements(v_contract->'questions') question;

  INSERT INTO intake.questionnaire_option_revision (
    contract_version,
    question_id,
    question_revision,
    option_id,
    option_revision,
    canonical_value,
    label,
    description,
    category_badge,
    display_order,
    content_revision
  )
  SELECT
    v_contract->>'contractVersion',
    question->>'questionId',
    (question->>'questionRevision')::integer,
    option->>'optionId',
    (option->>'optionRevision')::integer,
    option->>'canonicalValue',
    option->>'label',
    option->>'description',
    option->>'categoryBadge',
    (option->>'displayOrder')::integer,
    (option->>'contentRevision')::integer
  FROM jsonb_array_elements(v_contract->'questions') question
  CROSS JOIN LATERAL jsonb_array_elements(question->'options') option;

  INSERT INTO intake.questionnaire_evidence_workflow_revision (
    contract_version,
    workflow_id,
    workflow_revision,
    workflow_type,
    required,
    included_in_question_count,
    included_in_scoring_answers,
    validation_rule,
    conditional_visibility,
    metadata,
    content_revision
  )
  SELECT
    v_contract->>'contractVersion',
    workflow->>'workflowId',
    (workflow->>'workflowRevision')::integer,
    workflow->>'workflowType',
    (workflow->>'required')::boolean,
    (workflow->>'includedInQuestionCount')::boolean,
    (workflow->>'includedInScoringAnswers')::boolean,
    workflow->'validation',
    workflow->'conditionalVisibility',
    workflow->'metadata',
    (workflow->>'contentRevision')::integer
  FROM jsonb_array_elements(v_contract->'evidenceWorkflows') workflow;
END;
$seed$;

REVOKE ALL ON FUNCTION intake.questionnaire_visibility_references_are_valid(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.questionnaire_contract_normalized_payload(text, text, text, integer, intake.questionnaire_contract_status, boolean, timestamptz, timestamptz, integer, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.questionnaire_contract_normalized_payload(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.questionnaire_canonical_json(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.questionnaire_contract_hash(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.guard_questionnaire_visibility_references() FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.guard_questionnaire_contract_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION intake.guard_questionnaire_contract_version() FROM PUBLIC;

DO $questionnaire_v2_permissions$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_contract_version FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_question_revision FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_option_revision FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_evidence_workflow_revision FROM anon';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_contract_version FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_question_revision FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_option_revision FROM authenticated';
    EXECUTE 'REVOKE ALL ON TABLE intake.questionnaire_evidence_workflow_revision FROM authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT USAGE ON SCHEMA intake TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE intake.questionnaire_contract_version TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE intake.questionnaire_question_revision TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE intake.questionnaire_option_revision TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE intake.questionnaire_evidence_workflow_revision TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_visibility_references_are_valid(text, jsonb) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_contract_normalized_payload(text, text, text, integer, intake.questionnaire_contract_status, boolean, timestamptz, timestamptz, integer, jsonb) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_contract_normalized_payload(text) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_canonical_json(jsonb) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.questionnaire_contract_hash(jsonb) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.guard_questionnaire_visibility_references() TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.guard_questionnaire_contract_content() TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION intake.guard_questionnaire_contract_version() TO service_role';
  END IF;
END;
$questionnaire_v2_permissions$;

COMMIT;
