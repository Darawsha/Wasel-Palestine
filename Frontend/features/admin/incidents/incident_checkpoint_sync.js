import { loadAllCheckpoints } from '/Controllers/checkpoint-management.controller.js';

const DATASET_KEYS = {
  resolvedLocation: 'incidentResolvedLocation',
  resolvedLatitude: 'incidentResolvedLatitude',
  resolvedLongitude: 'incidentResolvedLongitude',
  locationLocked: 'incidentLocationLocked',
};

const LINKABLE_INCIDENT_TYPES = new Set(['CLOSURE', 'DELAY', 'ACCIDENT']);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCoordinate(value) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function normalizeCheckpointId(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

function normalizeIncidentType(value) {
  return normalizeText(value).toUpperCase();
}

function setDatasetValue(form, key, value) {
  if (!form) {
    return;
  }

  if (value === undefined || value === null || value === '') {
    delete form.dataset[key];
    return;
  }

  form.dataset[key] = String(value);
}

function getCheckpointOptionLabel(checkpoint) {
  const name = normalizeText(checkpoint?.name);
  const location = normalizeText(checkpoint?.location);

  if (name && location) {
    return `${name} - ${location}`;
  }

  return name || location || `Checkpoint #${checkpoint?.id ?? '--'}`;
}

function setLocationLocked(form, locationInput, isLocked) {
  setDatasetValue(form, DATASET_KEYS.locationLocked, isLocked ? 'true' : '');

  if (!locationInput) {
    return;
  }

  locationInput.readOnly = isLocked;
  locationInput.setAttribute('aria-readonly', String(isLocked));
  locationInput.classList.toggle('is-locked', isLocked);
  locationInput.title = isLocked
    ? 'Location is synced from the selected checkpoint.'
    : '';
}

function setSelectState(selectElement, isDisabled, title = '') {
  if (!selectElement) {
    return;
  }

  selectElement.disabled = isDisabled;
  selectElement.classList.toggle('is-disabled', isDisabled);
  selectElement.title = title;
}

function populateCheckpointOptions(selectElement, checkpoints) {
  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = '';

  const blankOption = document.createElement('option');
  blankOption.value = '';
  blankOption.textContent = 'No checkpoint';
  selectElement.appendChild(blankOption);

  checkpoints.forEach((checkpoint) => {
    const option = document.createElement('option');
    option.value = String(checkpoint.id);
    option.textContent = getCheckpointOptionLabel(checkpoint);
    selectElement.appendChild(option);
  });
}

function getCheckpointLookup(checkpoints) {
  return new Map(
    checkpoints
      .map((checkpoint) => [normalizeCheckpointId(checkpoint?.id), checkpoint])
      .filter(([checkpointId]) => checkpointId !== null),
  );
}

function applyCheckpointLocation(form, locationInput, checkpoint) {
  if (!checkpoint) {
    return;
  }

  if (locationInput) {
    locationInput.value = normalizeText(checkpoint.location);
  }

  setIncidentResolvedLocation(form, {
    location: checkpoint.location,
    latitude: checkpoint.latitude,
    longitude: checkpoint.longitude,
  });
  setLocationLocked(form, locationInput, true);
}

function unlockLocationField(form, locationInput) {
  setLocationLocked(form, locationInput, false);
}

function clearImpactSelection(impactSelect) {
  if (impactSelect) {
    impactSelect.value = '';
  }
}

function applyImpactAvailability(checkpointSelect, impactGroup, impactSelect) {
  if (!impactGroup || !impactSelect) {
    return;
  }

  const hasCheckpoint = normalizeCheckpointId(checkpointSelect?.value) !== null;
  impactGroup.hidden = !hasCheckpoint;

  if (!hasCheckpoint) {
    clearImpactSelection(impactSelect);
    setSelectState(impactSelect, true);
    return;
  }

  setSelectState(impactSelect, false);
}

function clearCheckpointDrivenFields(form, checkpointSelect, impactSelect, locationInput) {
  if (checkpointSelect) {
    checkpointSelect.value = '';
  }

  clearImpactSelection(impactSelect);
  unlockLocationField(form, locationInput);
}

function applyCheckpointAvailability(
  form,
  checkpointSelect,
  checkpointGroup,
  impactGroup,
  impactSelect,
  locationInput,
  typeSelect,
) {
  if (!checkpointSelect) {
    return;
  }

  const checkpointsLoaded = checkpointSelect.dataset.optionsLoaded === 'true';
  const linkAllowed = !typeSelect
    ? true
    : isCheckpointLinkAllowedForType(typeSelect.value);

  if (checkpointGroup) {
    checkpointGroup.hidden = !linkAllowed;
  }

  if (!checkpointsLoaded) {
    setSelectState(checkpointSelect, true, 'Loading checkpoints...');
    applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);
    return;
  }

  if (!linkAllowed) {
    clearCheckpointDrivenFields(
      form,
      checkpointSelect,
      impactSelect,
      locationInput,
    );
    setSelectState(
      checkpointSelect,
      true,
      'Checkpoint linking is available only for closure, delay, and accident incidents.',
    );
    applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);
    return;
  }

  setSelectState(checkpointSelect, false);
  applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);
}

export function isCheckpointLinkAllowedForType(incidentType) {
  return LINKABLE_INCIDENT_TYPES.has(normalizeIncidentType(incidentType));
}

export function getIncidentResolvedLocation(form) {
  const location = normalizeText(form?.dataset?.[DATASET_KEYS.resolvedLocation]);
  const latitude = normalizeCoordinate(
    form?.dataset?.[DATASET_KEYS.resolvedLatitude],
  );
  const longitude = normalizeCoordinate(
    form?.dataset?.[DATASET_KEYS.resolvedLongitude],
  );

  if (!location || latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    location,
    latitude,
    longitude,
  };
}

export function setIncidentResolvedLocation(form, snapshot = {}) {
  const location = normalizeText(snapshot.location);
  const latitude = normalizeCoordinate(snapshot.latitude);
  const longitude = normalizeCoordinate(snapshot.longitude);

  if (!location || latitude === undefined || longitude === undefined) {
    clearIncidentResolvedLocation(form);
    return;
  }

  setDatasetValue(form, DATASET_KEYS.resolvedLocation, location);
  setDatasetValue(form, DATASET_KEYS.resolvedLatitude, latitude);
  setDatasetValue(form, DATASET_KEYS.resolvedLongitude, longitude);
}

export function clearIncidentResolvedLocation(form) {
  setDatasetValue(form, DATASET_KEYS.resolvedLocation, undefined);
  setDatasetValue(form, DATASET_KEYS.resolvedLatitude, undefined);
  setDatasetValue(form, DATASET_KEYS.resolvedLongitude, undefined);
}

export function resetIncidentCheckpointSync(form, options = {}) {
  if (!form) {
    return;
  }

  const checkpointSelect = form.querySelector(options.checkpointSelector);
  const checkpointGroup = options.checkpointContainerSelector
    ? form.querySelector(options.checkpointContainerSelector)
    : null;
  const impactSelect = options.impactSelector
    ? form.querySelector(options.impactSelector)
    : null;
  const impactGroup = options.impactContainerSelector
    ? form.querySelector(options.impactContainerSelector)
    : null;
  const locationInput = form.querySelector(options.locationSelector);
  const typeSelect = options.typeSelector
    ? form.querySelector(options.typeSelector)
    : null;

  clearCheckpointDrivenFields(form, checkpointSelect, impactSelect, locationInput);
  clearIncidentResolvedLocation(form);
  applyCheckpointAvailability(
    form,
    checkpointSelect,
    checkpointGroup,
    impactGroup,
    impactSelect,
    locationInput,
    typeSelect,
  );
}

export async function initializeIncidentCheckpointSync(form, options = {}) {
  if (!form) {
    return;
  }

  const checkpointSelect = form.querySelector(options.checkpointSelector);
  const checkpointGroup = options.checkpointContainerSelector
    ? form.querySelector(options.checkpointContainerSelector)
    : null;
  const impactSelect = options.impactSelector
    ? form.querySelector(options.impactSelector)
    : null;
  const impactGroup = options.impactContainerSelector
    ? form.querySelector(options.impactContainerSelector)
    : null;
  const locationInput = form.querySelector(options.locationSelector);
  const typeSelect = options.typeSelector
    ? form.querySelector(options.typeSelector)
    : null;

  if (!checkpointSelect || !locationInput) {
    return;
  }

  setIncidentResolvedLocation(form, {
    location: options.initialLocation,
    latitude: options.initialLatitude,
    longitude: options.initialLongitude,
  });

  checkpointSelect.dataset.optionsLoaded = 'false';
  setSelectState(checkpointSelect, true, 'Loading checkpoints...');
  applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);

  try {
    const checkpoints = await loadAllCheckpoints({ limit: 100 });
    const selectedCheckpointId = normalizeCheckpointId(
      options.initialCheckpointId ?? checkpointSelect.value,
    );

    if (
      options.initialCheckpoint &&
      normalizeCheckpointId(options.initialCheckpoint.id) !== null &&
      !checkpoints.some(
        (checkpoint) =>
          normalizeCheckpointId(checkpoint?.id) ===
          normalizeCheckpointId(options.initialCheckpoint.id),
      )
    ) {
      checkpoints.unshift(options.initialCheckpoint);
    }

    const checkpointLookup = getCheckpointLookup(checkpoints);
    form.__incidentCheckpointLookup = checkpointLookup;

    populateCheckpointOptions(checkpointSelect, checkpoints);
    checkpointSelect.dataset.optionsLoaded = 'true';

    if (checkpointSelect.dataset.checkpointSyncBound !== 'true') {
      checkpointSelect.dataset.checkpointSyncBound = 'true';

      checkpointSelect.addEventListener('change', () => {
        const checkpointId = normalizeCheckpointId(checkpointSelect.value);
        const selectedCheckpoint =
          form.__incidentCheckpointLookup?.get(checkpointId) || null;

        if (selectedCheckpoint) {
          applyCheckpointLocation(form, locationInput, selectedCheckpoint);
        } else {
          unlockLocationField(form, locationInput);
        }

        applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);
      });
    }

    if (typeSelect && typeSelect.dataset.checkpointTypeBound !== 'true') {
      typeSelect.dataset.checkpointTypeBound = 'true';

      typeSelect.addEventListener('change', () => {
        applyCheckpointAvailability(
          form,
          checkpointSelect,
          checkpointGroup,
          impactGroup,
          impactSelect,
          locationInput,
          typeSelect,
        );
      });
    }

    if (selectedCheckpointId !== null) {
      checkpointSelect.value = String(selectedCheckpointId);
      const selectedCheckpoint = checkpointLookup.get(selectedCheckpointId);

      if (selectedCheckpoint) {
        applyCheckpointLocation(form, locationInput, selectedCheckpoint);
      }
    } else {
      checkpointSelect.value = '';
      unlockLocationField(form, locationInput);
    }

    if (impactSelect) {
      impactSelect.value = normalizeText(options.initialImpactStatus);
    }

    applyCheckpointAvailability(
      form,
      checkpointSelect,
      checkpointGroup,
      impactGroup,
      impactSelect,
      locationInput,
      typeSelect,
    );

    if (options.initialLocation) {
      setIncidentResolvedLocation(form, {
        location: locationInput.value || options.initialLocation,
        latitude: options.initialLatitude,
        longitude: options.initialLongitude,
      });
    }
  } catch (error) {
    console.error('Failed to load checkpoints for incident form', error);
    checkpointSelect.dataset.optionsLoaded = 'false';
    checkpointSelect.innerHTML = '<option value="">No checkpoint</option>';
    unlockLocationField(form, locationInput);
    setSelectState(checkpointSelect, true, 'Failed to load checkpoints.');
    applyImpactAvailability(checkpointSelect, impactGroup, impactSelect);
  }
}
