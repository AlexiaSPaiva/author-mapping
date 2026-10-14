/**
 * Editor for the shared Research Profile. The same component appears in all
 * three litpipe apps, so the profile is edited and moved the same way everywhere.
 */
import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

import { Section } from '../../shared/layout.jsx';
import { LIMITS, parseProfileJson } from '../../shared/researchProfile.js';
import { DOCUMENT_ACCEPT, extractText, isDocument } from '../../services/documentImport.js';
import { downloadJson, readTextFile } from '../../services/fileIo.js';

/**
 * @param {{
 *   profile: import('../../shared/researchProfile.js').ResearchProfile,
 *   onChange: (profile: import('../../shared/researchProfile.js').ResearchProfile) => void,
 *   step?: number,
 *   description?: string,
 * }} props
 */
export default function ProfileEditor({
  profile,
  onChange,
  step,
  description = 'Describe what you are researching. All three litpipe stages read this same profile.',
}) {
  const fileInput = useRef(null);
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  const update = (patch) => onChange({ ...profile, ...patch, updatedAt: new Date().toISOString() });

  const setObjective = (index, value) => {
    const objectives = [...profile.objectives];
    objectives[index] = value;
    update({ objectives });
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice fires change again.
    event.target.value = '';
    if (!file) return;

    // A PDF or a .txt note is the project itself — its text becomes the topic.
    // A .json is a profile someone exported from one of the three apps.
    if (isDocument(file)) {
      setBusy(true);
      try {
        const text = await extractText(file);
        if (!text) {
          setErrors([`No text found in ${file.name}. A scanned PDF needs OCR first.`]);
          return;
        }
        setErrors([]);
        update({ topic: text.slice(0, LIMITS.topic) });
      } catch (error) {
        setErrors([error.message]);
      } finally {
        setBusy(false);
      }
      return;
    }

    const result = parseProfileJson(await readTextFile(file));
    setErrors(result.errors);
    if (result.ok) onChange(result.profile);
  };

  return (
    <Section step={step} id="profile-heading" title="Research profile" description={description}>
      <TextField
        label="Research topic"
        value={profile.topic}
        onChange={(event) => update({ topic: event.target.value.slice(0, LIMITS.topic) })}
        placeholder="e.g. Differentiating dementia etiologies in the ELSA cohort"
        multiline
        minRows={3}
        fullWidth
        required
        inputProps={{ maxLength: LIMITS.topic }}
        helperText={`${profile.topic.length}/${LIMITS.topic} characters`}
      />

      <fieldset className="mt-5 border-0 p-0">
        <Typography component="legend" variant="subtitle2" className="mb-2">
          Objectives (optional)
        </Typography>
        <div className="flex flex-col gap-2">
          {profile.objectives.map((objective, index) => (
            <div key={index} className="flex items-center gap-2">
              <TextField
                label={`Objective ${index + 1}`}
                value={objective}
                onChange={(event) => setObjective(index, event.target.value)}
                size="small"
                fullWidth
                inputProps={{ maxLength: LIMITS.objective }}
              />
              <IconButton
                aria-label={`Remove objective ${index + 1}`}
                onClick={() =>
                  update({ objectives: profile.objectives.filter((_, i) => i !== index) })
                }
                size="small"
              >
                ✕
              </IconButton>
            </div>
          ))}
        </div>
        <Button
          onClick={() => update({ objectives: [...profile.objectives, ''] })}
          disabled={profile.objectives.length >= LIMITS.objectives}
          size="small"
          className="mt-2"
        >
          + Add objective
        </Button>
      </fieldset>

      {errors.length > 0 && (
        <Alert severity="error" onClose={() => setErrors([])} className="mt-4">
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outlined" onClick={() => downloadJson('research-profile.json', profile)}>
          Export profile
        </Button>
        <Button
          variant="outlined"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
          title="A PDF or .txt becomes the topic; a .json restores a profile exported from any stage"
        >
          {busy ? 'Reading…' : 'Import PDF, text or profile'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept={`${DOCUMENT_ACCEPT},.json,application/json`}
          onChange={handleImport}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </Section>
  );
}
