-- Allow pulse_type 'result_recorded' for outcome/result events on landing timeline
ALTER TABLE pulse
  DROP CONSTRAINT IF EXISTS pulse_pulse_type_check;

ALTER TABLE pulse
  ADD CONSTRAINT pulse_pulse_type_check
  CHECK (pulse_type IN ('tension', 'arc_shift', 'structural_threshold', 'result_recorded'));
