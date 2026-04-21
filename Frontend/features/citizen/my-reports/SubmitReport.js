(function (global) {
  let dependenciesPromise = null;

  const SELECTORS = {
    form: '[data-report-form]',
    category: '[data-report-category]',
    location: '[data-report-location]',
    description: '[data-report-description]',
    charCount: '[data-report-char-count]',
    date: '[data-report-date]',
    time: '[data-report-time]',
    warning: '[data-report-warning]',
    warningText: '[data-report-warning-text]',
  };

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = Promise.all([
        import('/Controllers/reports.controller.js'),
        import('/shared/location_validator.js'),
      ]).then(([controllerModule, locationModule]) => ({
        submitCitizenReport: controllerModule.submitCitizenReport,
        updateCitizenReport: controllerModule.updateCitizenReport,
        isLocationReal: locationModule.isLocationReal,
      }));
    }

    return dependenciesPromise;
  }

  function notify(type, message) {
    if (type === 'success' && typeof global.showSuccess === 'function') {
      global.showSuccess(message);
      return;
    }

    if (type === 'error' && typeof global.showError === 'function') {
      global.showError(message);
      return;
    }

    global.alert(message);
  }

  function readErrorMessage(error) {
    const responseData = error?.response?.data;

    if (Array.isArray(responseData?.message)) {
      return responseData.message.join('\n');
    }

    if (typeof responseData?.message === 'string') {
      return responseData.message;
    }

    if (typeof responseData === 'string') {
      return responseData;
    }

    return error?.message || 'Unable to submit this report right now.';
  }

  function isPreviewMode() {
    return global.CitizenPreview?.isActive?.() === true;
  }

  function getField(root, selector) {
    return root?.querySelector(selector) || null;
  }

  function applySubmitMode(root, context = {}) {
    const submitButton = root?.querySelector('.btn-primary[type="submit"]');
    const isEditMode = context?.mode === 'edit' && Number(context?.report?.id) > 0;

    if (!submitButton) {
      return;
    }

    submitButton.textContent = isEditMode ? 'Save Changes' : 'Submit Report';
  }

  function setDefaultDateTime(root) {
    const dateInput = getField(root, SELECTORS.date);
    const timeInput = getField(root, SELECTORS.time);
    const now = new Date();

    if (dateInput) {
      dateInput.value = now.toISOString().slice(0, 10);
    }

    if (timeInput) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${hours}:${minutes}`;
    }
  }

  function updateCharCount(root) {
    const descriptionField = getField(root, SELECTORS.description);
    const counter = getField(root, SELECTORS.charCount);

    if (!descriptionField || !counter) {
      return;
    }

    counter.textContent = `${descriptionField.value.length} / 500`;
  }

  function populateForm(root, context = {}) {
    const report = context?.mode === 'edit' ? context?.report : null;

    if (!report) {
      setDefaultDateTime(root);
      updateCharCount(root);
      return;
    }

    const categoryField = getField(root, SELECTORS.category);
    const locationField = getField(root, SELECTORS.location);
    const descriptionField = getField(root, SELECTORS.description);

    if (categoryField) {
      categoryField.value = String(report.category || '').trim().toLowerCase();
    }

    if (locationField) {
      locationField.value = report.location || '';
    }

    if (descriptionField) {
      descriptionField.value = report.description || '';
    }

    updateCharCount(root);
  }

  function setWarning(root, message) {
    const warningElement = getField(root, SELECTORS.warning);
    const warningText = getField(root, SELECTORS.warningText);

    if (!warningElement || !warningText) {
      return;
    }

    if (!message) {
      warningElement.hidden = true;
      warningText.textContent =
        'Please review this report before submitting.';
      return;
    }

    warningText.textContent = message;
    warningElement.hidden = false;
  }

  function validateForm(root) {
    const category = getField(root, SELECTORS.category)?.value?.trim();
    const location = getField(root, SELECTORS.location)?.value?.trim();
    const description = getField(root, SELECTORS.description)?.value?.trim();

    if (!category) {
      return 'Please select a report category.';
    }

    if (!location || location.length < 3) {
      return 'Please provide a valid report location.';
    }

    if (!description || description.length < 10) {
      return 'Please enter at least 10 characters in the description.';
    }

    return '';
  }

  async function handleSubmit(event, root, context = {}) {
    event.preventDefault();

    const validationMessage = validateForm(root);
    if (validationMessage) {
      notify('error', validationMessage);
      return;
    }

    const submitButton = event.submitter || root.querySelector('.btn-primary[type="submit"]');
    const category = getField(root, SELECTORS.category)?.value?.trim();
    const location = getField(root, SELECTORS.location)?.value?.trim();
    const description = getField(root, SELECTORS.description)?.value?.trim();

    setWarning(root, '');

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const { submitCitizenReport, updateCitizenReport, isLocationReal } =
        await getDependencies();
      const geocodedLocation = await isLocationReal(location, {
        countryCodes: ['ps'],
      });

      if (!geocodedLocation?.isValid) {
        notify(
          'error',
          'Unable to validate this location. Please enter a more specific address.',
        );
        return;
      }

      const payload = {
        category,
        location,
        description,
        latitude: Number(geocodedLocation.lat),
        longitude: Number(geocodedLocation.lon),
      };
      const isEditMode =
        context?.mode === 'edit' && Number(context?.report?.id) > 0;

      if (isEditMode) {
        await updateCitizenReport(Number(context.report.id), payload);
        notify(
          'success',
          isPreviewMode()
            ? 'Preview report updated. Nothing was saved.'
            : 'Report updated successfully.',
        );
        global.document.dispatchEvent(
          new global.CustomEvent('citizen:report-updated'),
        );
      } else {
        await submitCitizenReport(payload);
        notify(
          'success',
          isPreviewMode()
            ? 'Preview report submitted. Nothing was saved.'
            : 'Report submitted successfully.',
        );
        global.document.dispatchEvent(
          new global.CustomEvent('citizen:report-created'),
        );
      }

      global.closeMyReportModal?.();
    } catch (error) {
      const message = readErrorMessage(error);

      if (/rate limit|spamming/i.test(message)) {
        setWarning(root, message);
      }

      notify('error', message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  }

  async function init(container, context = {}) {
    const root = container?.querySelector('.submit-report-container') || container;
    const form = getField(root, SELECTORS.form);

    if (!root || !form || form.dataset.reportFormInitialized === 'true') {
      return;
    }

    form.dataset.reportFormInitialized = 'true';
    applySubmitMode(root, context);
    populateForm(root, context);
    setWarning(root, '');

    const descriptionField = getField(root, SELECTORS.description);
    if (descriptionField) {
      descriptionField.addEventListener('input', () => {
        updateCharCount(root);
      });
    }

    form.addEventListener('submit', (event) => {
      void handleSubmit(event, root, context);
    });
  }

  global.CitizenSubmitReport = {
    init,
  };
})(window);
