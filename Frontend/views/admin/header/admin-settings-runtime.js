import { loadSystemSettingsSnapshot } from '/Services/system-settings.service.js';

const DEFAULT_PLATFORM_NAME = 'Wasel Palestine';
const DEFAULT_LANGUAGE = 'English';
const textNodeTranslations = new WeakMap();
let translationObserver = null;
let translationTimer = null;
let isApplyingTranslation = false;

const TRANSLATIONS = {
  Arabic: {
    'Dashboard': 'لوحة التحكم',
    'Analytics': 'التحليلات',
    'Citizen Management': 'إدارة المواطنين',
    'User Management': 'إدارة المستخدمين',
    'Incidents': 'الحوادث',
    'Incident Management': 'إدارة الحوادث',
    'Checkpoints': 'الحواجز',
    'Checkpoint': 'الحواجز',
    'Checkpoint Management': 'إدارة الحواجز',
    'Moderation Queue': 'قائمة المراجعة',
    'Audit Log': 'سجل التدقيق',
    'API Monitor': 'مراقبة API',
    'Performance': 'الأداء',
    'Performance Reports': 'تقارير الأداء',
    'Settings': 'الإعدادات',
    'System Settings': 'إعدادات النظام',
    'Citizen View': 'عرض المواطن',
    'Home': 'الرئيسية',
    'Notifications': 'الإشعارات',
    'No notifications yet.': 'لا توجد إشعارات بعد.',
    'Mark all read': 'تعيين الكل كمقروء',
    'View all notifications': 'عرض كل الإشعارات',
    'Profile': 'الملف الشخصي',
    'Logout': 'تسجيل الخروج',
    'Configure platform-wide settings, security policies and external integrations.':
      'اضبط إعدادات المنصة وسياسات الأمان والتكاملات الخارجية.',
    'General Settings': 'الإعدادات العامة',
    'Platform Name': 'اسم المنصة',
    'Primary Language': 'اللغة الأساسية',
    'Timezone': 'المنطقة الزمنية',
    'Security Settings': 'إعدادات الأمان',
    'Access Token Expiry': 'انتهاء رمز الوصول',
    'Refresh Token Expiry': 'انتهاء رمز التحديث',
    'Min Password Length': 'الحد الأدنى لطول كلمة المرور',
    'Password Complexity Requirements': 'متطلبات تعقيد كلمة المرور',
    'Require Mixed Case': 'يتطلب أحرفًا كبيرة وصغيرة',
    'Require Numeric': 'يتطلب أرقامًا',
    'Require Special Characters': 'يتطلب رموزًا خاصة',
    'External API Configuration': 'إعدادات API الخارجية',
    'Platform API': 'API المنصة',
    'Routing API (OSRM)': 'API التوجيه (OSRM)',
    'Weather API': 'API الطقس',
    'Base URL': 'الرابط الأساسي',
    'Environment': 'البيئة',
    'Config Source': 'مصدر الإعدادات',
    'Endpoint URL': 'رابط endpoint',
    'API Key': 'مفتاح API',
    'Timeout': 'المهلة',
    'Cache TTL': 'مدة التخزين المؤقت',
    'Alert Configuration': 'إعدادات التنبيهات',
    'Discard Changes': 'تجاهل التغييرات',
    'Save Configuration': 'حفظ الإعدادات',
    'External API Monitor': 'مراقبة API الخارجية',
    'Manage platform users, roles, and permissions': 'إدارة مستخدمي المنصة والأدوار والصلاحيات',
    'Complete record of all moderation actions': 'سجل كامل لكل إجراءات الإدارة',
    'Monitor health and performance of integrated APIs': 'مراقبة صحة وأداء واجهات API المتكاملة',
    'k6 load testing results and analysis': 'نتائج وتحليل اختبار التحمل k6',
    'Live monitoring of platform actions': 'مراقبة مباشرة لإجراءات المنصة',
    'Classification of user submissions': 'تصنيف بلاغات المستخدمين',
    'Activity trend for the last 30 days': 'اتجاه النشاط خلال آخر 30 يومًا',
    'User Registrations': 'تسجيلات المستخدمين',
    'Citizen Signups': 'تسجيلات المواطنين',
    'Reports by Category': 'البلاغات حسب التصنيف',
    'Incidents Over Time': 'الحوادث عبر الزمن',
    'Incidents Over Selected Period': 'الحوادث خلال الفترة المحددة',
    'Active Incidents': 'الحوادث النشطة',
    'Avg Response Time': 'متوسط زمن الاستجابة',
    'External API Status': 'حالة واجهات API الخارجية',
    'Recent System Events': 'أحداث النظام الأخيرة',
    'Recent API Calls': 'طلبات API الأخيرة',
    'Bottleneck Analysis': 'تحليل الاختناقات',
    'Optimization Comparison': 'مقارنة التحسينات',
    'Response Time Over Test Duration': 'زمن الاستجابة خلال مدة الاختبار',
    'Throughput Over Test Duration': 'معدل المعالجة خلال مدة الاختبار',
    'Generate System Report': 'إنشاء تقرير النظام',
    'View All Logs': 'عرض كل السجلات',
    'Search users by name, email...': 'ابحث عن المستخدمين بالاسم أو البريد...',
    'Search incidents...': 'ابحث في الحوادث...',
    'Search checkpoints...': 'ابحث في الحواجز...',
    'Search reports...': 'ابحث في البلاغات...',
    'Search actions...': 'ابحث في الإجراءات...',
    'All Roles': 'كل الأدوار',
    'All Statuses': 'كل الحالات',
    'All Types': 'كل الأنواع',
    'All Severities': 'كل درجات الخطورة',
    'All Categories': 'كل التصنيفات',
    'All Actions': 'كل الإجراءات',
    'All Moderators': 'كل المشرفين',
    'All APIs': 'كل واجهات API',
    'Clear Filters': 'مسح الفلاتر',
    'Clear all filters': 'مسح كل الفلاتر',
    'Export CSV': 'تصدير CSV',
    'Refresh': 'تحديث',
    'Add User': 'إضافة مستخدم',
    'Add New User': 'إضافة مستخدم جديد',
    'Update User': 'تحديث المستخدم',
    'Add Incident': 'إضافة حادث',
    'Create Incident': 'إنشاء حادث',
    'Create New Incident': 'إنشاء حادث جديد',
    'Update Incident': 'تحديث الحادث',
    'Add Checkpoint': 'إضافة حاجز',
    'Add New Checkpoint': 'إضافة حاجز جديد',
    'Update Checkpoint': 'تحديث الحاجز',
    'Save Checkpoint': 'حفظ الحاجز',
    'Save Changes': 'حفظ التغييرات',
    'Cancel': 'إلغاء',
    'Close': 'إغلاق',
    'Review': 'مراجعة',
    'Approve': 'قبول',
    'Reject': 'رفض',
    'Approved': 'مقبول',
    'Rejected': 'مرفوض',
    'Deleted': 'محذوف',
    'Created': 'تم الإنشاء',
    'Updated': 'تم التحديث',
    'Pending': 'قيد الانتظار',
    'Active': 'نشط',
    'Active now': 'نشط الآن',
    'Closed': 'مغلق',
    'Open': 'مفتوح',
    'Delayed': 'متأخر',
    'Restricted': 'مقيّد',
    'Verified': 'موثق',
    'Not Verified': 'غير موثق',
    'Good': 'جيد',
    'Fair': 'متوسط',
    'Healthy': 'سليم',
    'Operational': 'تشغيلي',
    'Suspended': 'معلّق',
    'Low': 'منخفض',
    'Medium': 'متوسط',
    'High': 'مرتفع',
    'Critical': 'حرج',
    'Normal': 'طبيعي',
    'Error': 'خطأ',
    'Success': 'نجاح',
    'Loading': 'تحميل',
    'ID': 'المعرّف',
    'Name': 'الاسم',
    'Title': 'العنوان',
    'Description': 'الوصف',
    'Location': 'الموقع',
    'Status': 'الحالة',
    'Role': 'الدور',
    'Email': 'البريد الإلكتروني',
    'Email Address': 'البريد الإلكتروني',
    'Password': 'كلمة المرور',
    'Phone Number': 'رقم الهاتف',
    'Address': 'العنوان',
    'First Name': 'الاسم الأول',
    'Last Name': 'اسم العائلة',
    'Full Name': 'الاسم الكامل',
    'Type': 'النوع',
    'Severity': 'الخطورة',
    'Category': 'التصنيف',
    'Action': 'الإجراء',
    'Actions': 'الإجراءات',
    'Target': 'الهدف',
    'Timestamp': 'الوقت',
    'Time': 'الوقت',
    'Last Updated': 'آخر تحديث',
    'Submitted By': 'مقدم الطلب',
    'Performed By': 'نفذ بواسطة',
    'Reporter': 'المبلّغ',
    'Decision': 'القرار',
    'Details': 'التفاصيل',
    'Audit Notes': 'ملاحظات التدقيق',
    'Latest Audit Note': 'آخر ملاحظة تدقيق',
    'Vote Summary': 'ملخص التصويت',
    'Confidence': 'الثقة',
    'Score': 'النقاط',
    'Flags': 'العلامات',
    'Duplicate Flag': 'علامة التكرار',
    'Duplicates only': 'المكررة فقط',
    'Checkpoint Issue': 'مشكلة حاجز',
    'Road Closure': 'إغلاق طريق',
    'Closure': 'إغلاق',
    'Delay': 'تأخير',
    'Accident': 'حادث',
    'Hazard': 'خطر',
    'Weather': 'الطقس',
    'Routing': 'التوجيه',
    'Map Server': 'خادم الخريطة',
    'Weather API': 'API الطقس',
    'Routing API': 'API التوجيه',
    'Endpoint': 'نقطة النهاية',
    'Response Code': 'رمز الاستجابة',
    'Response Time': 'زمن الاستجابة',
    'Request Rate': 'معدل الطلبات',
    'Error Rate': 'معدل الأخطاء',
    'Throughput': 'معدل المعالجة',
    'P95 Latency': 'زمن P95',
    'Cache Misses': 'فشل التخزين المؤقت',
    'Rate Limit Usage': 'استخدام حد المعدل',
    'Rate Limited': 'محدود المعدل',
    'Last Successful Call': 'آخر طلب ناجح',
    'API Timeouts': 'مهل API',
    'Metric': 'المؤشر',
    'Module': 'الوحدة',
    'Before': 'قبل',
    'After': 'بعد',
    'Improvement': 'التحسن',
    'Subscriptions': 'الاشتراكات',
    'Total': 'الإجمالي',
    'Citizens': 'المواطنون',
    'Citizen': 'مواطن',
    'Admin': 'مدير',
    'Moderator': 'مشرف',
    'Yes': 'نعم',
    'No': 'لا',
    'N/A': 'غير متاح',
    'Unknown time': 'وقت غير معروف',
    'Previous': 'السابق',
    'Next': 'التالي',
    'PREV': 'السابق',
    'Newest First': 'الأحدث أولًا',
    'Oldest First': 'الأقدم أولًا',
    'Sort By': 'ترتيب حسب',
    'Showing': 'عرض',
    'entries': 'إدخالات',
    'of': 'من',
    'Create a stronger password': 'أنشئ كلمة مرور أقوى',
    'Current Password': 'كلمة المرور الحالية',
    'New Password': 'كلمة المرور الجديدة',
    'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
    'Change Password': 'تغيير كلمة المرور',
    'Change photo': 'تغيير الصورة',
    'Loading profile': 'تحميل الملف الشخصي',
    'Loading your account information...': 'جار تحميل معلومات الحساب...',
    'Email cannot be changed': 'لا يمكن تغيير البريد الإلكتروني',
    'Leave blank to keep current password': 'اتركه فارغًا للإبقاء على كلمة المرور الحالية',
    'Are you sure you want to logout?': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
    'Select role...': 'اختر الدور...',
    'Select type': 'اختر النوع',
    'Select severity': 'اختر الخطورة',
    'Select status': 'اختر الحالة',
    'Select checkpoint impact': 'اختر تأثير الحاجز',
    'No checkpoint': 'لا يوجد حاجز',
    'Current Status': 'الحالة الحالية',
    'Checkpoint Name': 'اسم الحاجز',
    'Impact on Checkpoint': 'التأثير على الحاجز',
    'Verification': 'التوثيق',
    'Notes': 'ملاحظات',
    'Phone number (optional)': 'رقم الهاتف (اختياري)',
    'Home address (optional)': 'عنوان السكن (اختياري)',
    'First name...': 'الاسم الأول...',
    'Last name...': 'اسم العائلة...',
    'Email address...': 'البريد الإلكتروني...',
    'Create password...': 'أنشئ كلمة مرور...',
    'Enter current password': 'أدخل كلمة المرور الحالية',
    'Enter a new password': 'أدخل كلمة مرور جديدة',
    'Repeat the new password': 'كرر كلمة المرور الجديدة',
    'Enter incident title...': 'أدخل عنوان الحادث...',
    'Describe the incident...': 'صف الحادث...',
    'Enter location...': 'أدخل الموقع...',
    'Enter location (optional)...': 'أدخل الموقع (اختياري)...',
    'Enter location description...': 'أدخل وصف الموقع...',
    'Enter checkpoint name...': 'أدخل اسم الحاجز...',
    'Additional notes about this checkpoint...': 'ملاحظات إضافية عن هذا الحاجز...',
    'Add moderation notes for the audit trail...': 'أضف ملاحظات المراجعة لسجل التدقيق...',
    'Loading audit log...': 'جار تحميل سجل التدقيق...',
    'No moderation notes recorded yet.': 'لا توجد ملاحظات مراجعة حتى الآن.',
    'Search': 'بحث',
    'Registered': 'مسجل',
    'Total Users': 'إجمالي المستخدمين',
    'Pending Reports': 'بلاغات قيد الانتظار',
  },
};

const ROUTE_TITLE_ELEMENTS = [
  ['admin-dashboard', 'Analytics'],
  ['admin-users', 'User Management'],
  ['admin-incidents', 'Incidents'],
  ['admin-checkpoints', 'Checkpoints'],
  ['admin-moderation', 'Moderation Queue'],
  ['admin-audit', 'Audit Log'],
  ['admin-apimonitor', 'API Monitor'],
  ['admin-performance', 'Performance'],
  ['admin-settings', 'System Settings'],
];

let currentSettings = {
  platformName: DEFAULT_PLATFORM_NAME,
  primaryLanguage: DEFAULT_LANGUAGE,
};

function translate(value, language = currentSettings.primaryLanguage) {
  const normalizedValue = String(value || '').trim();
  return TRANSLATIONS[language]?.[normalizedValue] || normalizedValue;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isArabicActive() {
  return currentSettings.primaryLanguage === 'Arabic';
}

function translatePhrase(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue || !isArabicActive()) {
    return normalizedValue;
  }

  const dictionaryValue = translate(normalizedValue);
  if (dictionaryValue !== normalizedValue) {
    return dictionaryValue;
  }

  const showingMatch = normalizedValue.match(/^Showing\s+(.+?)\s+of\s+(.+)$/i);
  if (showingMatch) {
    return `عرض ${showingMatch[1]} من ${showingMatch[2]}`;
  }

  const lastUpdatedMatch = normalizedValue.match(/^Last updated:\s*(.+)$/i);
  if (lastUpdatedMatch) {
    return `آخر تحديث: ${lastUpdatedMatch[1]}`;
  }

  return normalizedValue;
}

function normalizeSettings(settings = {}) {
  const platformName =
    String(settings.platformName || '').trim() || DEFAULT_PLATFORM_NAME;
  const primaryLanguage =
    String(settings.primaryLanguage || '').trim() === 'Arabic'
      ? 'Arabic'
      : DEFAULT_LANGUAGE;

  return {
    platformName,
    primaryLanguage,
  };
}

function setText(selector, value, root = document) {
  root.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function setElementText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function getTranslatableElementText(element) {
  if (element.dataset.i18nSourceText) {
    return element.dataset.i18nSourceText;
  }

  const directText = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  return directText || element.textContent.trim();
}

function setTranslatableElementText(element, value) {
  const textNodes = Array.from(element.childNodes).filter(
    (node) => node.nodeType === Node.TEXT_NODE,
  );

  if (textNodes.length > 0) {
    textNodes[textNodes.length - 1].textContent = element.children.length
      ? ` ${value}`
      : value;
    return;
  }

  element.appendChild(
    document.createTextNode(element.children.length ? ` ${value}` : value),
  );
}

function shouldSkipElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  return Boolean(
    element.closest(
      'script, style, noscript, code, pre, .material-symbols-outlined, [data-i18n-skip]',
    ),
  );
}

function translateTextNode(textNode) {
  const parent = textNode.parentElement;
  if (!parent || shouldSkipElement(parent)) {
    return;
  }

  const rawText = textNode.nodeValue || '';
  const trimmedText = normalizeText(rawText);

  if (!trimmedText || /^[\d\s.,:%/#|()\-+]+$/.test(trimmedText)) {
    return;
  }

  const state = textNodeTranslations.get(textNode);
  const currentTextIsPriorTranslation =
    state && normalizeText(rawText) === normalizeText(state.translated);
  const sourceText = currentTextIsPriorTranslation
    ? state.original
    : trimmedText;

  if (!isArabicActive()) {
    if (state) {
      textNode.nodeValue = rawText.replace(trimmedText, state.original);
      textNodeTranslations.delete(textNode);
    }
    return;
  }

  const translatedText = translatePhrase(sourceText);
  if (translatedText === sourceText) {
    return;
  }

  if (normalizeText(rawText) === normalizeText(translatedText)) {
    textNodeTranslations.set(textNode, {
      original: sourceText,
      translated: translatedText,
    });
    return;
  }

  textNode.nodeValue = rawText.replace(trimmedText, translatedText);
  textNodeTranslations.set(textNode, {
    original: sourceText,
    translated: translatedText,
  });
}

function translateElementAttributes(element) {
  if (shouldSkipElement(element)) {
    return;
  }

  ['placeholder', 'title', 'aria-label'].forEach((attributeName) => {
    if (!element.hasAttribute(attributeName)) {
      return;
    }

    const currentValue = element.getAttribute(attributeName) || '';
    const sourceKey = `i18n${attributeName.replace(/(^|-)(\w)/g, (_match, _dash, char) => char.toUpperCase())}Source`;
    const translatedKey = `i18n${attributeName.replace(/(^|-)(\w)/g, (_match, _dash, char) => char.toUpperCase())}Translated`;
    const currentSource = element.dataset[sourceKey];
    const currentTranslation = element.dataset[translatedKey];
    const sourceValue =
      currentSource && normalizeText(currentValue) === normalizeText(currentTranslation)
        ? currentSource
        : normalizeText(currentValue);

    if (!sourceValue) {
      return;
    }

    if (!isArabicActive()) {
      if (currentSource) {
        element.setAttribute(attributeName, currentSource);
        delete element.dataset[sourceKey];
        delete element.dataset[translatedKey];
      }
      return;
    }

    const translatedValue = translatePhrase(sourceValue);
    if (translatedValue === sourceValue) {
      return;
    }

    if (normalizeText(currentValue) === normalizeText(translatedValue)) {
      element.dataset[sourceKey] = sourceValue;
      element.dataset[translatedKey] = translatedValue;
      return;
    }

    element.setAttribute(attributeName, translatedValue);
    element.dataset[sourceKey] = sourceValue;
    element.dataset[translatedKey] = translatedValue;
  });
}

function translateDomTree(root = document.body) {
  if (!root || isApplyingTranslation) {
    return;
  }

  isApplyingTranslation = true;

  try {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return shouldSkipElement(node.parentElement)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(translateTextNode);

    if (root.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(root);
    }

    root.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach(
      translateElementAttributes,
    );
  } finally {
    isApplyingTranslation = false;
  }
}

function scheduleDomTranslation() {
  window.clearTimeout(translationTimer);
  translationTimer = window.setTimeout(() => {
    applyChromeLanguage();
    translateDomTree(document.body);
  }, 50);
}

function ensureTranslationObserver() {
  if (translationObserver || !document.body) {
    return;
  }

  translationObserver = new MutationObserver((mutations) => {
    if (isApplyingTranslation) {
      return;
    }

    if (
      mutations.some((mutation) =>
        mutation.type === 'childList' ||
        mutation.type === 'characterData' ||
        mutation.type === 'attributes')
    ) {
      scheduleDomTranslation();
    }
  });

  translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label'],
  });
}

function getCurrentRouteKey() {
  return window.AdminRouting?.routeUtils?.normalizeRoute?.(
    window.location.hash,
    window.AdminRouting?.config?.DEFAULT_ROUTE || 'admin-dashboard',
  ) || 'admin-dashboard';
}

function getRouteBaseTitle(routeKey = getCurrentRouteKey()) {
  const configuredTitle = window.AdminRouting?.config?.ROUTE_TITLES?.[routeKey];
  if (configuredTitle) {
    return configuredTitle;
  }

  const fallbackTitle = ROUTE_TITLE_ELEMENTS.find(([key]) => key === routeKey)?.[1];
  return fallbackTitle || 'Dashboard';
}

function updateDocumentTitle() {
  const title = translate(getRouteBaseTitle());
  document.title = `${currentSettings.platformName} | ${title}`;
}

function applyChromeLanguage() {
  document.documentElement.lang =
    currentSettings.primaryLanguage === 'Arabic' ? 'ar' : 'en';

  setText('.logo-text', currentSettings.platformName);

  const breadcrumbRoot = document.querySelector('.breadcrumb');
  if (breadcrumbRoot) {
    const breadcrumbPieces = breadcrumbRoot.querySelectorAll('span');
    if (breadcrumbPieces[0]) {
      breadcrumbPieces[0].textContent = translate('Dashboard');
    }
  }

  setElementText(
    document.getElementById('current-page-title'),
    translate(getRouteBaseTitle()),
  );

  const navTranslations = new Map([
    ['#admin-dashboard', 'Home'],
    ['#admin-incidents', 'Incidents'],
    ['#admin-checkpoints', 'Checkpoint'],
  ]);

  document.querySelectorAll('.desktop-nav .nav-link').forEach((link) => {
    const key = navTranslations.get(link.getAttribute('href') || '');
    if (key) {
      link.textContent = translate(key);
    }
  });

  const sidebarTranslations = new Map(ROUTE_TITLE_ELEMENTS);
  sidebarTranslations.set('citizen-view', 'Citizen View');

  document.querySelectorAll('.sidebar .nav-item').forEach((item) => {
    const href = item.getAttribute('href') || '';
    const routeKey = href.startsWith('#') ? href.slice(1) : 'citizen-view';
    const baseTitle = sidebarTranslations.get(routeKey);
    if (!baseTitle) return;

    item.title = translate(baseTitle);
    const label = item.querySelector('.nav-label');
    if (label) {
      label.textContent = translate(baseTitle);
    }
  });

  setElementText(
    document.querySelector('.notifications-header h4'),
    translate('Notifications'),
  );
  setElementText(
    document.getElementById('adminNotificationsMarkReadBtn'),
    translate('Mark all read'),
  );
  setElementText(
    document.querySelector('.notification-empty-state'),
    translate('No notifications yet.'),
  );
  setElementText(
    document.querySelector('.notifications-footer a'),
    translate('View all notifications'),
  );

  const profileButton = document.getElementById('openProfileModalBtn');
  if (profileButton?.lastChild) {
    profileButton.lastChild.textContent = ` ${translate('Profile')}`;
  }

  const logoutButton = document.getElementById('logoutBtn');
  if (logoutButton?.lastChild) {
    logoutButton.lastChild.textContent = ` ${translate('Logout')}`;
  }

  updateDocumentTitle();
}

function applyAdminSystemSettings(settings) {
  currentSettings = normalizeSettings(settings);
  window.AdminSystemSettings = {
    ...(window.AdminSystemSettings || {}),
    ...currentSettings,
  };

  applyChromeLanguage();
  ensureTranslationObserver();

  translateDomTree(document.body);
}

async function refreshAdminSystemSettings() {
  try {
    const snapshot = await loadSystemSettingsSnapshot();
    applyAdminSystemSettings(snapshot);
  } catch (error) {
    console.warn('Could not apply admin system settings.', error);
    applyAdminSystemSettings(currentSettings);
  }
}

window.applyAdminSystemSettings = applyAdminSystemSettings;
window.refreshAdminSystemSettings = refreshAdminSystemSettings;

window.addEventListener('admin:route-loaded', () => {
  applyChromeLanguage();
  translateDomTree(document.body);
});

window.addEventListener('admin:system-settings-updated', (event) => {
  applyAdminSystemSettings(event.detail || currentSettings);
});

document.addEventListener('DOMContentLoaded', refreshAdminSystemSettings);

if (document.readyState !== 'loading') {
  refreshAdminSystemSettings();
}
