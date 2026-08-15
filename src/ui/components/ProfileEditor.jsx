/**
 * Editor for the shared Research Profile. The same component appears in all
 * three litpipe apps, so the profile is edited and moved the same way everywhere.
 */
import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

import { LIMITS, parseProfileJson } from '../../shared/researchProfile.js';
import { downloadJson, readTextFile } from '../../services/fileIo.js';

/**
 * @param {{
 *   profile: import('../../shared/researchProfile.js').ResearchProfile,
 *   onChange: (profile: import('../../shared/researchProfile.js').ResearchProfile) => void,
 * }} props
 */
export default function ProfileEditor({ profile, onChange }) {
  const fileInput = useRef(null);
  const [errors, setErrors] = useState([]);

  const update = (patch) => onChange({ ...profile, ...patch, updatedAt: new Date().toISOString() });

  const setObjective = (index, value) => {
    const objectives = [...profile.objectives];
    objectives[index] = value;
    update({ objectives });
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = parseProfileJson(await readTextFile(file));
    setErrors(result.errors);
    if (result.ok) onChange(result.profile);
    // Reset so picking the same file twice fires change again.
    event.target.value = '';
  };

  return (
    <Paper component="section" aria-labelledby="profile-heading" className="p-4 sm:p-6">
      <Typography id="profile-heading" variant="h2" component="h2" className="mb-1">
        Research profile
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mb-5">
        Every article is compared against this text. All three litpipe stages read the same profile.
      </Typography>

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
        <Button variant="outlined" onClick={() => fileInput.current?.click()}>
          Import profile
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </Paper>
  );
}
