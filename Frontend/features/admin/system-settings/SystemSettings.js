(function () {
  const PAGE_SELECTOR = '.system-settings-page';
  const SAVE_BUTTON_SELECTOR = '.btn-save';
  const DISCARD_BUTTON_SELECTOR = '.btn-discard';
  const ACCORDION_HEADER_SELECTOR = '.accordion-header';
  const ACCORDION_BODY_SELECTOR = '.accordion-body';
  const VISIBILITY_TOGGLE_SELECTOR = '.visibility-icon';
  const STATUS_BANNER_SELECTOR = '[data-settings-status]';
  const STATUS_BANNER_COPY_SELECTOR = '[data-settings-status-copy]';
  const STATUS_BANNER_BADGE_SELECTOR = '[data-settings-status-badge]';

  let dependenciesPromise;
  let latestSnapshot = null;
  let isSaving = false;

  function getPageRoot() {
    return document.querySelector(PAGE_SELECTOR);
  }

  function getDependencies() {
    if (!dependenciesPromise) {
      dependenciesPromise = import('/Controllers/system-settings.controller.js');
    }

    return dependenciesPromise;
  }

  function getFieldContainerByLabel(root, labelText) {
    if (!root) {
      return null;
    }

    return Array.from(root.querySelectorAll('.form-group')).find((group) => {
      const label = group.querySelector('.form-label');
      return label?.textContent?.trim() === labelText;
    }) || null;
  }

  function getFieldByLabel(root, labelText) {
    return getFieldContainerByLabel(root, labelText)?.querySelector('input, select') || null;
  }

  function getApiSection(root, titleText) {
    if (!root) {
      return null;
    }

    return Array.from(root.querySelectorAll('.api-section')).find((section) => {
      const title = section.querySelector('.api-title');
      return title?.textContent?.trim() === titleText;
    }) || null;
  }

  function getCheckboxByLabel(root, labelText) {
    if (!root) {
      return null;
    }

    return Array.from(root.querySelectorAll('.checkbox-label')).find((label) => {
      const text = label.querySelector('.checkbox-text');
      return text?.textContent?.trim() === labelText;
    })?.querySelector('input[type="checkbox"]') || null;
  }

  function setSelectValueByText(selectElement, desiredText) {
    if (!selectElement) {
      return;
    }

    const normalizedText = String(desiredText || '').trim().toLowerCase();
    const matchingOption = Array.from(selectElement.options).find((option) => {
      return option.textContent.trim().toLowerCase() === normalizedText;
    });

    if (matchingOption) {
      selectElement.value = matchingOption.value;
    }
  }

  function setReadOnlyValue(input, value) {
    if (input) {
      input.value = value || '';
    }
  }

  function collectElements(root) {
    const platformApiSection = getApiSection(root, 'Platform API');
    const routingSection = getApiSection(root, 'Routing API (OSRM)');
    const weatherSection = getApiSection(root, 'Weather API');

    return {
      platformName: getFieldByLabel(root, 'Platform Name'),
      primaryLanguage: getFieldByLabel(root, 'Primary Language'),
      timezone: getFieldByLabel(root, 'Timezone'),
      accessTokenExpiry: getFieldByLabel(root, 'Access Token Expiry'),
      refreshTokenExpiry: getFieldByLabel(root, 'Refresh Token Expiry'),
      minPasswordLength: getFieldByLabel(root, 'Min Password Length'),
      requireMixedCase: getCheckboxByLabel(root, 'Require Mixed Case'),
      requireNumeric: getCheckboxByLabel(root, 'Require Numeric'),
      requireSpecialCharacters: getCheckboxByLabel(root, 'Require Special Characters'),
      apiBaseUrl: getFieldByLabel(platformApiSection, 'Base URL'),
      environment: getFieldByLabel(platformApiSection, 'Environment'),
      configSource: getFieldByLabel(platformApiSection, 'Config Source'),
      routingEndpointUrl: getFieldByLabel(routingSection, 'Endpoint URL'),
      routingApiKey: getFieldByLabel(routingSection, 'API Key'),
      routingTimeout: getFieldByLabel(routingSection, 'Timeout'),
      routingCacheTtl: getFieldByLabel(routingSection, 'Cache TTL'),
      weatherEndpointUrl: getFieldByLabel(weatherSection, 'Endpoint URL'),
      weatherApiKey: getFieldByLabel(weatherSection, 'API Key'),
      weatherTimeout: getFieldByLabel(weatherSection, 'Timeout'),
      weatherCacheTtl: getFieldByLabel(weatherSection, 'Cache TTL'),
      saveButton: root.querySelector(SAVE_BUTTON_SELECTOR),
      discardButton: root.querySelector(DISCARD_BUTTON_SELECTOR),
      statusBanner: root.querySelector(STATUS_BANNER_SELECTOR),
      statusCopy: root.querySelector(STATUS_BANNER_COPY_SELECTOR),
      statusBadge: root.querySelector(STATUS_BANNER_BADGE_SELECTOR),
    };
  }

  function setStatus(elements, copyText, badgeText) {
    if (elements.statusCopy) {
      elements.statusCopy.textContent = copyText;
    }

    if (elements.statusBadge) {
      elements.statusBadge.textContent = badgeText;
    }
  }

  function normalizeSnapshotForComparison(snapshot) {
    if (!snapshot) {
      return null;
    }

    return {
      platformName: snapshot.platformName || '',
      primaryLanguage: snapshot.primaryLanguage || 'English',
      timezone: snapshot.timezone || '',
      accessTokenExpiry: snapshot.accessTokenExpiry || '',
      refreshTokenExpiry: snapshot.refreshTokenExpiry || '',
      minPasswordLength: String(snapshot.minPasswordLength || ''),
      requireMixedCase: Boolean(snapshot.requireMixedCase),
      requireNumeric: Boolean(snapshot.requireNumeric),
      requireSpecialCharacters: Boolean(snapshot.requireSpecialCharacters),
      apiBaseUrl: snapshot.apiBaseUrl || '',
      routingEndpointUrl: snapshot.routingEndpointUrl || '',
      routingApiKey: snapshot.routingApiKey || '',
      routingTimeout: snapshot.routingTimeout || '',
      routingCacheTtl: snapshot.routingCacheTtl || '',
      weatherEndpointUrl: snapshot.weatherEndpointUrl || '',
      weatherApiKey: snapshot.weatherApiKey || '',
      weatherTimeout: snapshot.weatherTimeout || '',
      weatherCacheTtl: snapshot.weatherCacheTtl || '',
    };
  }

  function hasUnsavedChanges(elements) {
    const currentSnapshot = normalizeSnapshotForComparison(collectSnapshot(elements));
    const baselineSnapshot = normalizeSnapshotForComparison(latestSnapshot);
    return JSON.stringify(currentSnapshot) !== JSON.stringify(baselineSnapshot);
  }

  function updateActionButtons(elements) {
    const dirty = hasUnsavedChanges(elements);

    if (elements.saveButton) {
      elements.saveButton.disabled = isSaving || !dirty;
    }

    if (elements.discardButton) {
      elements.discardButton.disabled = isSaving || !dirty;
    }
  }

  function revealApiKeyInput(input) {
    if (!input) {
      return;
    }

    input.type = 'password';
    const toggle = input.closest('.input-with-icon')?.querySelector('.visibility-icon');
    if (toggle) {
      toggle.textContent = 'visibility';
      toggle.title = 'Show API key';
    }
  }

  function applySnapshot(elements, snapshot) {
    if (!elements || !snapshot) {
      return;
    }

    if (elements.platformName) {
      elements.platformName.value = snapshot.platformName || '';
    }

    setSelectValueByText(elements.primaryLanguage, snapshot.primaryLanguage);
    setSelectValueByText(elements.timezone, snapshot.timezone);

    if (elements.accessTokenExpiry) {
      elements.accessTokenExpiry.value = snapshot.accessTokenExpiry || '';
    }

    if (elements.refreshTokenExpiry) {
      elements.refreshTokenExpiry.value = snapshot.refreshTokenExpiry || '';
    }

    if (elements.minPasswordLength) {
      elements.minPasswordLength.value = snapshot.minPasswordLength || '';
    }

    if (elements.requireMixedCase) {
      elements.requireMixedCase.checked = Boolean(snapshot.requireMixedCase);
    }

    if (elements.requireNumeric) {
      elements.requireNumeric.checked = Boolean(snapshot.requireNumeric);
    }

    if (elements.requireSpecialCharacters) {
      elements.requireSpecialCharacters.checked = Boolean(snapshot.requireSpecialCharacters);
    }

    setReadOnlyValue(elements.environment, snapshot.environment);
    setReadOnlyValue(elements.configSource, snapshot.configSource);

    if (elements.apiBaseUrl) {
      elements.apiBaseUrl.value = snapshot.apiBaseUrl || '';
      elements.apiBaseUrl.title = 'Used by frontend API clients at runtime';
    }

    if (elements.routingEndpointUrl) {
      elements.routingEndpointUrl.value = snapshot.routingEndpointUrl || '';
    }

    if (elements.routingApiKey) {
      elements.routingApiKey.value = snapshot.routingApiKey || '';
      elements.routingApiKey.placeholder = snapshot.routingApiKeyMasked || '';
      revealApiKeyInput(elements.routingApiKey);
    }

    if (elements.routingTimeout) {
      elements.routingTimeout.value = snapshot.routingTimeout || '';
    }

    if (elements.routingCacheTtl) {
      elements.routingCacheTtl.value = snapshot.routingCacheTtl || '';
    }

    if (elements.weatherEndpointUrl) {
      elements.weatherEndpointUrl.value = snapshot.weatherEndpointUrl || '';
    }

    if (elements.weatherApiKey) {
      elements.weatherApiKey.value = snapshot.weatherApiKey || '';
      elements.weatherApiKey.placeholder = snapshot.weatherApiKeyMasked || '';
      revealApiKeyInput(elements.weatherApiKey);
    }

    if (elements.weatherTimeout) {
      elements.weatherTimeout.value = snapshot.weatherTimeout || '';
    }

    if (elements.weatherCacheTtl) {
      elements.weatherCacheTtl.value = snapshot.weatherCacheTtl || '';
    }
  }

  function collectSnapshot(elements) {
    return {
      platformName: elements.platformName?.value?.trim() || '',
      primaryLanguage:
        elements.primaryLanguage?.selectedOptions?.[0]?.textContent?.trim() || 'English',
      timezone:
        elements.timezone?.selectedOptions?.[0]?.textContent?.trim() || '',
      accessTokenExpiry: elements.accessTokenExpiry?.value?.trim() || '',
      refreshTokenExpiry: elements.refreshTokenExpiry?.value?.trim() || '',
      minPasswordLength: elements.minPasswordLength?.value?.trim() || '',
      requireMixedCase: Boolean(elements.requireMixedCase?.checked),
      requireNumeric: Boolean(elements.requireNumeric?.checked),
      requireSpecialCharacters: Boolean(elements.requireSpecialCharacters?.checked),
      apiBaseUrl: elements.apiBaseUrl?.value?.trim() || '',
      routingEndpointUrl: elements.routingEndpointUrl?.value?.trim() || '',
      routingApiKey: elements.routingApiKey?.value || '',
      routingTimeout: elements.routingTimeout?.value?.trim() || '',
      routingCacheTtl: elements.routingCacheTtl?.value?.trim() || '',
      weatherEndpointUrl: elements.weatherEndpointUrl?.value?.trim() || '',
      weatherApiKey: elements.weatherApiKey?.value || '',
      weatherTimeout: elements.weatherTimeout?.value?.trim() || '',
      weatherCacheTtl: elements.weatherCacheTtl?.value?.trim() || '',
    };
  }

  function isValidUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function isValidDuration(value) {
    return /^[0-9]+(ms|s|m|h|d)$/i.test(String(value || '').trim());
  }

  function validateSnapshot(snapshot) {
    if (!snapshot.platformName) {
      return 'Platform name is required.';
    }

    if (!isValidUrl(snapshot.apiBaseUrl)) {
      return 'Platform API base URL must be a valid http/https URL.';
    }

    if (!isValidUrl(snapshot.routingEndpointUrl)) {
      return 'Routing API endpoint must be a valid http/https URL.';
    }

    if (!isValidUrl(snapshot.weatherEndpointUrl)) {
      return 'Weather API endpoint must be a valid http/https URL.';
    }

    if (!isValidDuration(snapshot.accessTokenExpiry)) {
      return 'Access token expiry must use a duration like 30m, 1h, or 7d.';
    }

    if (!isValidDuration(snapshot.refreshTokenExpiry)) {
      return 'Refresh token expiry must use a duration like 7d.';
    }

    if (!/^\d+$/.test(snapshot.minPasswordLength) || Number(snapshot.minPasswordLength) < 6) {
      return 'Minimum password length must be a number greater than or equal to 6.';
    }

    if (!isValidDuration(snapshot.routingTimeout) || !isValidDuration(snapshot.weatherTimeout)) {
      return 'API timeout values must use duration formats such as 5s or 10s.';
    }

    if (!isValidDuration(snapshot.routingCacheTtl) || !isValidDuration(snapshot.weatherCacheTtl)) {
      return 'Cache TTL values must use duration formats such as 15m or 30m.';
    }

    return '';
  }

  function flashButtonState(button, text) {
    if (!button) {
      return;
    }

    const originalContent = button.innerHTML;
    button.disabled = true;
    button.textContent = text;

    window.setTimeout(() => {
      button.innerHTML = originalContent;
      button.disabled = false;
    }, 1200);
  }

  function setBusyState(elements, isBusy) {
    isSaving = isBusy;
    updateActionButtons(elements);
  }

  function bindAccordionBehavior(root) {
    root.querySelectorAll(ACCORDION_HEADER_SELECTOR).forEach((header) => {
      if (header.dataset.bound === 'true') {
        return;
      }

      header.dataset.bound = 'true';
      header.addEventListener('click', () => {
        const card = header.closest('.settings-card');
        const body = card?.querySelector(ACCORDION_BODY_SELECTOR);
        const icon = header.querySelector('.icon-expand');

        if (!body) {
          header.classList.toggle('collapsed');
          if (icon) {
            icon.textContent = header.classList.contains('collapsed')
              ? 'expand_more'
              : 'expand_less';
          }
          return;
        }

        const isCollapsed = body.hidden;
        body.hidden = !isCollapsed;
        header.classList.toggle('collapsed', !isCollapsed);

        if (icon) {
          icon.textContent = isCollapsed ? 'expand_less' : 'expand_more';
        }
      });
    });
  }

  function bindPasswordVisibilityToggles(root) {
    root.querySelectorAll(VISIBILITY_TOGGLE_SELECTOR).forEach((toggle) => {
      if (toggle.dataset.bound === 'true') {
        return;
      }

      toggle.dataset.bound = 'true';
      toggle.addEventListener('click', () => {
        const input = toggle.closest('.input-with-icon')?.querySelector('input');
        if (!input) {
          return;
        }

        const shouldShowValue = input.type === 'password';
        input.type = shouldShowValue ? 'text' : 'password';
        toggle.textContent = shouldShowValue ? 'visibility_off' : 'visibility';
        toggle.title = shouldShowValue ? 'Hide API key' : 'Show API key';
      });
    });
  }

  function bindDraftTracking(root, elements) {
    if (root.dataset.draftTrackingBound === 'true') {
      return;
    }

    const trackableFields = Object.values(elements).filter((element) => {
      return element instanceof HTMLInputElement || element instanceof HTMLSelectElement;
    });

    trackableFields.forEach((field) => {
      field.addEventListener('input', () => {
        const isDirty = hasUnsavedChanges(elements);
        setStatus(
          elements,
          isDirty
            ? 'You have unsaved changes. Saving will apply the API base URL immediately for new frontend requests.'
            : (latestSnapshot?.runtimeStatus?.copy || 'Runtime configuration loaded.'),
          isDirty
            ? 'Draft'
            : (latestSnapshot?.runtimeStatus?.badge || latestSnapshot?.configSource || 'Ready'),
        );
        updateActionButtons(elements);
      });

      field.addEventListener('change', () => {
        const isDirty = hasUnsavedChanges(elements);
        setStatus(
          elements,
          isDirty
            ? 'You have unsaved changes. Saving will apply the API base URL immediately for new frontend requests.'
            : (latestSnapshot?.runtimeStatus?.copy || 'Runtime configuration loaded.'),
          isDirty
            ? 'Draft'
            : (latestSnapshot?.runtimeStatus?.badge || latestSnapshot?.configSource || 'Ready'),
        );
        updateActionButtons(elements);
      });
    });

    root.dataset.draftTrackingBound = 'true';
  }

  async function hydrateSystemSettings() {
    const root = getPageRoot();
    if (!root) {
      return;
    }

    const elements = collectElements(root);
    setStatus(elements, 'Loading current app and API configuration.', 'Loading');
    root.dataset.systemSettingsState = 'loading';

    try {
      const controller = await getDependencies();
      latestSnapshot = await controller.loadSystemSettings();
      applySnapshot(elements, latestSnapshot);
      setStatus(
        elements,
        latestSnapshot.runtimeStatus?.copy
          || `Linked APIs: ${latestSnapshot.linkedApis.map((api) => `${api.name} -> ${api.url}`).join(' | ')}`,
        latestSnapshot.runtimeStatus?.badge || latestSnapshot.configSource || 'Ready',
      );
      root.dataset.systemSettingsState = 'loaded';
      updateActionButtons(elements);
    } catch (error) {
      console.error('Failed to hydrate system settings page', error);
      setStatus(
        elements,
        'Could not load current runtime configuration. Existing values remain editable.',
        'Error',
      );
      root.dataset.systemSettingsState = 'error';
      updateActionButtons(elements);
    }
  }

  async function handleSave(elements) {
    const controller = await getDependencies();
    const nextSnapshot = collectSnapshot(elements);
    const validationError = validateSnapshot(nextSnapshot);

    if (validationError) {
      setStatus(elements, validationError, 'Invalid');
      flashButtonState(elements.saveButton, 'Fix Form');
      return;
    }

    try {
      setBusyState(elements, true);
      setStatus(
        elements,
        'Applying runtime configuration and updating linked frontend API clients.',
        'Applying',
      );

      controller.saveSystemSettings(nextSnapshot);
      controller.applySettings(nextSnapshot);
      latestSnapshot = await controller.loadSystemSettings();
      applySnapshot(elements, latestSnapshot);

      setStatus(
        elements,
        latestSnapshot.runtimeStatus?.copy
          || `Linked APIs updated: ${latestSnapshot.linkedApis.map((api) => `${api.name} -> ${api.url}`).join(' | ')}`,
        latestSnapshot.runtimeStatus?.badge || 'Applied',
      );
      flashButtonState(elements.saveButton, 'Applied');
    } catch (error) {
      console.error('Failed to save system settings', error);
      setStatus(
        elements,
        'Runtime configuration could not be applied. Please review the current values and try again.',
        'Error',
      );
      flashButtonState(elements.saveButton, 'Retry Save');
    } finally {
      setBusyState(elements, false);
    }
  }

  async function handleDiscard(elements) {
    try {
      setBusyState(elements, true);
      const controller = await getDependencies();
      latestSnapshot = await controller.resetSystemSettings();
      applySnapshot(elements, latestSnapshot);

      setStatus(
        elements,
        `Draft discarded. Reverted to ${latestSnapshot.configSource.toLowerCase()} values.`,
        'Reset',
      );
      flashButtonState(elements.discardButton, 'Reset');
    } catch (error) {
      console.error('Failed to discard system settings draft', error);
      setStatus(
        elements,
        'Draft could not be discarded right now. Please try again.',
        'Error',
      );
      flashButtonState(elements.discardButton, 'Retry');
    } finally {
      setBusyState(elements, false);
    }
  }

  function initializeSystemSettingsPage() {
    const root = getPageRoot();
    if (!root || root.dataset.systemSettingsInitialized === 'true') {
      return;
    }

    root.dataset.systemSettingsInitialized = 'true';
    bindAccordionBehavior(root);
    bindPasswordVisibilityToggles(root);

    const elements = collectElements(root);
    bindDraftTracking(root, elements);
    updateActionButtons(elements);

    elements.saveButton?.addEventListener('click', () => {
      void handleSave(elements);
    });

    elements.discardButton?.addEventListener('click', () => {
      void handleDiscard(elements);
    });

    void hydrateSystemSettings();
  }

  function observeSystemSettingsMount() {
    const mainContainer = document.getElementById('flexible_main') || document.body;
    const observer = new MutationObserver(() => {
      const root = getPageRoot();
      if (root && root.dataset.systemSettingsInitialized !== 'true') {
        initializeSystemSettingsPage();
      }
    });

    observer.observe(mainContainer, { childList: true, subtree: true });
    initializeSystemSettingsPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeSystemSettingsMount, {
      once: true,
    });
  } else {
    observeSystemSettingsMount();
  }
})();
