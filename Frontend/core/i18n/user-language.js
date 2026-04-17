(function (global) {
  const DEFAULT_LANGUAGE = 'English';
  const USER_KEY = 'user';
  const USER_LANGUAGE_KEY = 'wasel.user.language';
  const ALLOWED_LANGUAGES = new Set(['English', 'Arabic']);
  const textNodeTranslations = new WeakMap();
  let currentLanguage = DEFAULT_LANGUAGE;
  let translationObserver = null;
  let translationTimer = null;
  let isApplyingTranslation = false;

  const TRANSLATIONS = {
    Arabic: {
      'Wasel Palestine': 'واصل فلسطين',
      'Home': 'الرئيسية',
      'Incidents': 'الحوادث',
      'Route Planner': 'مخطط المسار',
      'Alerts': 'التنبيهات',
      'Profile': 'الملف الشخصي',
      'User menu': 'قائمة المستخدم',
      'Toggle navigation': 'تبديل التنقل',
      'Main navigation': 'التنقل الرئيسي',
      'Wasel Palestine Home': 'الرئيسية - واصل فلسطين',
      'Filters': 'الفلاتر',
      'Filter incidents': 'فلترة الحوادث',
      'Show filter panel': 'إظهار لوحة الفلاتر',
      'Close filter panel': 'إغلاق لوحة الفلاتر',
      'Incident Type': 'نوع الحادث',
      'INCIDENT TYPE': 'نوع الحادث',
      'Road Closure': 'إغلاق طريق',
      'Delay': 'تأخير',
      'Accident': 'حادث',
      'Weather Hazard': 'خطر جوي',
      'Severity': 'الخطورة',
      'SEVERITY': 'الخطورة',
      'All Severities': 'كل درجات الخطورة',
      'High': 'عالية',
      'Medium': 'متوسطة',
      'Low': 'منخفضة',
      'Critical': 'حرجة',
      'Date Range': 'نطاق التاريخ',
      'DATE RANGE': 'نطاق التاريخ',
      'From': 'من',
      'To': 'إلى',
      'Apply Filters': 'تطبيق الفلاتر',
      'Clear': 'مسح',
      'Current weather': 'الطقس الحالي',
      'Partly Cloudy': 'غائم جزئيا',
      'Map legend': 'مفتاح الخريطة',
      'Open': 'مفتوح',
      'Delayed': 'متأخر',
      'Closed': 'مغلق',
      'Accidents': 'الحوادث',
      'Active Incidents': 'الحوادث النشطة',
      'Real-time mobility disruptions across Palestine':
        'اضطرابات الحركة في فلسطين بالوقت الفعلي',
      'Search incidents...': 'ابحث في الحوادث...',
      'Type: All': 'النوع: الكل',
      'Severity: All': 'الخطورة: الكل',
      'Status: All': 'الحالة: الكل',
      'All Time': 'كل الأوقات',
      'Last 24 Hours': 'آخر 24 ساعة',
      'Last 7 Days': 'آخر 7 أيام',
      'Last 30 Days': 'آخر 30 يوما',
      'Sort: Newest First': 'الترتيب: الأحدث أولا',
      'View details': 'عرض التفاصيل',
      'View Details': 'عرض التفاصيل',
      'No incidents found.': 'لم يتم العثور على حوادث.',
      'Loading incidents...': 'جاري تحميل الحوادث...',
      'Error loading incidents.': 'حدث خطأ أثناء تحميل الحوادث.',
      'Active': 'نشط',
      'Verified': 'موثق',
      'Status': 'الحالة',
      'Type': 'النوع',
      'Location': 'الموقع',
      'Created At': 'تاريخ الإنشاء',
      'Created': 'تم الإنشاء',
      'Updated': 'تم التحديث',
      'Last Updated': 'آخر تحديث',
      'Description': 'الوصف',
      'Related Checkpoint': 'الحاجز المرتبط',
      'Name': 'الاسم',
      'Coordinates': 'الإحداثيات',
      'Incident Details': 'تفاصيل الحادث',
      'Incident': 'حادث',
      'Loading...': 'جاري التحميل...',
      'Loading details...': 'جاري تحميل التفاصيل...',
      'No description provided.': 'لا يوجد وصف.',
      'Plan Your Route': 'خطط مسارك',
      'Find the safest path to your destination':
        'اعثر على المسار الأكثر أمانا إلى وجهتك',
      'Current location': 'الموقع الحالي',
      'Enter destination': 'أدخل الوجهة',
      'Route Preferences': 'تفضيلات المسار',
      'Avoid checkpoints': 'تجنب الحواجز',
      'Avoid restricted areas': 'تجنب المناطق المقيدة',
      'Calculate Route': 'احسب المسار',
      'Calculating...': 'جاري الحساب...',
      'Resolving route locations...': 'جاري تحديد مواقع المسار...',
      'Calculating route...': 'جاري حساب المسار...',
      'Distance': 'المسافة',
      'Duration': 'المدة',
      'Affecting Factors': 'العوامل المؤثرة',
      'Calculate a route to see live conditions for this trip.':
        'احسب المسار لرؤية الظروف المباشرة لهذه الرحلة.',
      'Report': 'بلاغ',
      'Use Alternative Route?': 'استخدام مسار بديل؟',
      'Alternative route summary': 'ملخص المسار البديل',
      'This alternative route is available because of your selected avoidance preferences.':
        'هذا المسار البديل متاح بسبب تفضيلات التجنب المحددة.',
      'Use Alternative': 'استخدم البديل',
      'An alternative route is available, but it adds significant travel time.':
        'يوجد مسار بديل، لكنه يزيد وقت الرحلة بشكل ملحوظ.',
      'An alternative route is available, but it adds significant travel time. Do you want to use it?':
        'يوجد مسار بديل، لكنه يزيد وقت الرحلة بشكل ملحوظ. هل تريد استخدامه؟',
      'The long alternative route was not applied.':
        'لم يتم تطبيق المسار البديل الطويل.',
      'Unable to calculate the selected route.':
        'تعذر حساب المسار المحدد.',
      'No route could be calculated for the selected points.':
        'تعذر حساب مسار للنقاط المحددة.',
      'Enter a valid location.': 'أدخل موقعا صالحا.',
      'Enter a starting location.': 'أدخل موقع الانطلاق.',
      'Enter a destination.': 'أدخل الوجهة.',
      'Current location unavailable. Enter a start location manually.':
        'الموقع الحالي غير متاح. أدخل موقع البداية يدويا.',
      'Location permission denied. Enter a start location manually.':
        'تم رفض إذن الموقع. أدخل موقع البداية يدويا.',
      'Location request timed out. Enter a start location manually.':
        'انتهت مهلة طلب الموقع. أدخل موقع البداية يدويا.',
      'Geolocation is not supported in this browser.':
        'تحديد الموقع غير مدعوم في هذا المتصفح.',
      'Unable to detect the current location.':
        'تعذر اكتشاف الموقع الحالي.',
      'My Reports': 'بلاغاتي',
      'Track your submitted reports and their status':
        'تابع بلاغاتك المرسلة وحالتها',
      'Track your submitted reports, grouped by moderation outcome.':
        'تابع بلاغاتك المرسلة حسب نتيجة المراجعة.',
      'Submit New Report': 'إرسال بلاغ جديد',
      'Community Feed': 'موجز المجتمع',
      'Refresh Nearby Feed': 'تحديث الموجز القريب',
      'All': 'الكل',
      'Pending': 'قيد الانتظار',
      'Rejected': 'مرفوض',
      'No reports in this tab yet.': 'لا توجد بلاغات في هذه التبويبة بعد.',
      'Submit a report or switch tabs to see other moderation outcomes.':
        'أرسل بلاغا أو انتقل بين التبويبات لرؤية نتائج مراجعة أخرى.',
      'No public community reports found right now.':
        'لا توجد بلاغات عامة من المجتمع حاليا.',
      'Try refreshing the nearby feed or check back shortly.':
        'حاول تحديث الموجز القريب أو عد بعد قليل.',
      'Loading reports...': 'جاري تحميل البلاغات...',
      'Please wait a moment.': 'يرجى الانتظار قليلا.',
      'Unable to load reports.': 'تعذر تحميل البلاغات.',
      'Try again in a few moments.': 'حاول مرة أخرى بعد قليل.',
      'Previous': 'السابق',
      'Next': 'التالي',
      'Edit': 'تعديل',
      'Delete': 'حذف',
      'Upvote': 'تصويت مؤيد',
      'Downvote': 'تصويت معارض',
      'Category': 'الفئة',
      'Select a category': 'اختر فئة',
      'Other': 'أخرى',
      'Enter address...': 'أدخل العنوان...',
      'Describe what you observed in detail...':
        'صف ما لاحظته بالتفصيل...',
      'Date & Time': 'التاريخ والوقت',
      'Auto-filled with current date and time':
        'يتم تعبئته تلقائيا بالتاريخ والوقت الحاليين',
      'Cancel': 'إلغاء',
      'Submit Report': 'إرسال البلاغ',
      'My Alert Subscriptions': 'اشتراكات التنبيهات',
      'Stay informed about mobility changes in your areas':
        'ابق على اطلاع بتغيرات الحركة في مناطقك',
      'Add Subscription': 'إضافة اشتراك',
      'Loading': 'جاري التحميل',
      'Loading subscriptions...': 'جاري تحميل الاشتراكات...',
      'Your saved locations and categories will appear here.':
        'ستظهر مواقعك وفئاتك المحفوظة هنا.',
      'No subscriptions yet': 'لا توجد اشتراكات بعد',
      'Add a location and categories to start receiving alerts.':
        'أضف موقعا وفئات لبدء تلقي التنبيهات.',
      'Unable to load subscriptions': 'تعذر تحميل الاشتراكات',
      'Refresh the page or try again in a moment.':
        'حدث الصفحة أو حاول مرة أخرى بعد قليل.',
      'Manual location subscription': 'اشتراك موقع يدوي',
      'Subscribed Categories': 'الفئات المشتركة',
      'No categories selected.': 'لم يتم اختيار فئات.',
      'Current Matches': 'المطابقات الحالية',
      'Edit Alert Subscription': 'تعديل اشتراك التنبيه',
      'Add Alert Subscription': 'إضافة اشتراك تنبيه',
      'Save Subscription': 'حفظ الاشتراك',
      'Saving...': 'جاري الحفظ...',
      'Subscription deleted successfully.': 'تم حذف الاشتراك بنجاح.',
      'Subscription updated successfully.': 'تم تحديث الاشتراك بنجاح.',
      'Subscription created successfully.': 'تم إنشاء الاشتراك بنجاح.',
      'Unable to delete the selected subscription.':
        'تعذر حذف الاشتراك المحدد.',
      'Unable to update the subscription.': 'تعذر تحديث الاشتراك.',
      'Unable to create the subscription.': 'تعذر إنشاء الاشتراك.',
      'Enter area / city / region': 'أدخل المنطقة / المدينة / الإقليم',
      'Use a real, specific location, just like when submitting a new report.':
        'استخدم موقعا حقيقيا ومحددا، كما تفعل عند إرسال بلاغ جديد.',
      'Incident Categories': 'فئات الحوادث',
      'Loading profile': 'جاري تحميل الملف الشخصي',
      'Checking authenticated session': 'جاري التحقق من الجلسة',
      'Change photo': 'تغيير الصورة',
      'Full Name': 'الاسم الكامل',
      'Email Address': 'البريد الإلكتروني',
      'Email cannot be changed': 'لا يمكن تغيير البريد الإلكتروني',
      'Phone Number': 'رقم الهاتف',
      'Address': 'العنوان',
      'Application Language': 'لغة التطبيق',
      'English': 'الإنجليزية',
      'Arabic': 'العربية',
      'Change Password': 'تغيير كلمة المرور',
      'Current Password': 'كلمة المرور الحالية',
      'New Password': 'كلمة المرور الجديدة',
      'Confirm New Password': 'تأكيد كلمة المرور الجديدة',
      'Enter current password': 'أدخل كلمة المرور الحالية',
      'Create a stronger password': 'أنشئ كلمة مرور أقوى',
      'Repeat the new password': 'كرر كلمة المرور الجديدة',
      'Enter a new password': 'أدخل كلمة مرور جديدة',
      'Weak Password': 'كلمة مرور ضعيفة',
      'Fair Password': 'كلمة مرور متوسطة',
      'Strong Password': 'كلمة مرور قوية',
      'Save Changes': 'حفظ التغييرات',
      'Fix Required': 'يلزم التصحيح',
      'Reload Required': 'يلزم إعادة التحميل',
      'No Changes': 'لا توجد تغييرات',
      'Saved': 'تم الحفظ',
      'Save Failed': 'فشل الحفظ',
      'Full name is required.': 'الاسم الكامل مطلوب.',
      'Please enter a valid phone number.': 'يرجى إدخال رقم هاتف صالح.',
      'Language must be English or Arabic.':
        'يجب أن تكون اللغة الإنجليزية أو العربية.',
      'Current password is required to change your password.':
        'كلمة المرور الحالية مطلوبة لتغيير كلمة المرور.',
      'New password must be at least 8 characters and include uppercase, lowercase, and a number.':
        'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل وتتضمن حرفا كبيرا وحرفا صغيرا ورقما.',
      'New password and confirmation do not match.':
        'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
      'Profile details are loaded from the authenticated user record in the database.':
        'تم تحميل تفاصيل الملف الشخصي من سجل المستخدم الموثق في قاعدة البيانات.',
      'Profile details could not be loaded from the server right now.':
        'تعذر تحميل تفاصيل الملف الشخصي من الخادم حاليا.',
      'Profile details must be loaded from the database before saving changes.':
        'يجب تحميل تفاصيل الملف الشخصي من قاعدة البيانات قبل حفظ التغييرات.',
      'No profile changes to save.': 'لا توجد تغييرات في الملف الشخصي لحفظها.',
      'Saving profile changes to the database...':
        'جاري حفظ تغييرات الملف الشخصي في قاعدة البيانات...',
      'Profile changes were saved to the authenticated user record in the database.':
        'تم حفظ تغييرات الملف الشخصي في سجل المستخدم الموثق في قاعدة البيانات.',
      'Profile changes could not be saved right now. Please try again.':
        'تعذر حفظ تغييرات الملف الشخصي حاليا. يرجى المحاولة مرة أخرى.',
      'Profile images must be 700 KB or smaller so they can be saved with your account.':
        'يجب أن تكون صورة الملف الشخصي 700 كيلوبايت أو أقل حتى تحفظ مع حسابك.',
      'New profile photo selected. Save changes to persist it to your account.':
        'تم اختيار صورة جديدة. احفظ التغييرات لتثبيتها في حسابك.',
      'Logout': 'تسجيل الخروج',
      'Are you sure you want to logout?': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',
      'Close modal': 'إغلاق النافذة',
      'Close details': 'إغلاق التفاصيل',
      'Close': 'إغلاق',
    },
  };

  const ROUTE_TITLES = {
    home: 'Home',
    incidents: 'Active Incidents',
    'route-planner': 'Route Planner',
    'my-reports': 'My Reports',
    alerts: 'My Alert Subscriptions',
  };

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeLanguage(value) {
    const normalizedValue = normalizeText(value);
    return ALLOWED_LANGUAGES.has(normalizedValue)
      ? normalizedValue
      : DEFAULT_LANGUAGE;
  }

  function readCurrentUser() {
    try {
      const rawUser = global.localStorage?.getItem(USER_KEY);
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (_error) {
      return null;
    }
  }

  function readPersistedLanguage() {
    const user = readCurrentUser();
    const userLanguage = normalizeText(user?.language || user?.preferredLanguage);

    if (ALLOWED_LANGUAGES.has(userLanguage)) {
      return userLanguage;
    }

    return normalizeLanguage(global.localStorage?.getItem(USER_LANGUAGE_KEY));
  }

  function isArabicActive() {
    return currentLanguage === 'Arabic';
  }

  function getCurrentRouteKey() {
    const route = normalizeText(global.location.hash).replace(/^#/, '');
    return route || 'home';
  }

  function translateDynamicPhrase(value) {
    const normalizedValue = normalizeText(value);

    let match = normalizedValue.match(/^Showing\s+(\d+)\s+incidents$/i);
    if (match) return `عرض ${match[1]} حوادث`;

    match = normalizedValue.match(/^Showing\s+(\d+)-(\d+)\s+of\s+(\d+)\s+incidents$/i);
    if (match) return `عرض ${match[1]}-${match[2]} من ${match[3]} حوادث`;

    match = normalizedValue.match(/^Showing\s+(\d+)\s+reports$/i);
    if (match) return `عرض ${match[1]} بلاغات`;

    match = normalizedValue.match(/^Showing\s+(\d+)\s+community reports$/i);
    if (match) return `عرض ${match[1]} بلاغات مجتمعية`;

    match = normalizedValue.match(/^Showing\s+(\d+)-(\d+)\s+of\s+(\d+)\s+reports$/i);
    if (match) return `عرض ${match[1]}-${match[2]} من ${match[3]} بلاغات`;

    match = normalizedValue.match(/^Showing\s+(\d+)-(\d+)\s+of\s+(\d+)\s+community reports$/i);
    if (match) return `عرض ${match[1]}-${match[2]} من ${match[3]} بلاغات مجتمعية`;

    match = normalizedValue.match(/^(\d+)\s+active subscription(s?)$/i);
    if (match) return `${match[1]} اشتراكات نشطة`;

    match = normalizedValue.match(/^(\d+)\s+found$/i);
    if (match) return `تم العثور على ${match[1]}`;

    match = normalizedValue.match(/^Subscribed since:\s*(.+)$/i);
    if (match) return `مشترك منذ: ${match[1]}`;

    match = normalizedValue.match(/^Duplicate of #(\d+)$/i);
    if (match) return `مكرر من #${match[1]}`;

    match = normalizedValue.match(/^Upvote\s+\((\d+)\)$/i);
    if (match) return `تصويت مؤيد (${match[1]})`;

    match = normalizedValue.match(/^Downvote\s+\((\d+)\)$/i);
    if (match) return `تصويت معارض (${match[1]})`;

    match = normalizedValue.match(/^Citizen account - (.+)$/i);
    if (match) return `حساب مواطن - ${match[1]}`;

    match = normalizedValue.match(/^Admin account - (.+)$/i);
    if (match) return `حساب مدير - ${match[1]}`;

    match = normalizedValue.match(/^Unable to locate "(.+)"\.$/i);
    if (match) return `تعذر تحديد موقع "${match[1]}".`;

    return '';
  }

  function translatePhrase(value) {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue || !isArabicActive()) {
      return normalizedValue;
    }

    return (
      TRANSLATIONS.Arabic[normalizedValue] ||
      translateDynamicPhrase(normalizedValue) ||
      normalizedValue
    );
  }

  function shouldSkipElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      return false;
    }

    return Boolean(
      element.closest(
        [
          'script',
          'style',
          'noscript',
          'code',
          'pre',
          'svg',
          'canvas',
          '.material-symbols-outlined',
          '.leaflet-container',
          '.leaflet-control',
          '[data-i18n-skip]',
        ].join(', '),
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

    if (normalizeText(rawText) !== normalizeText(translatedText)) {
      textNode.nodeValue = rawText.replace(trimmedText, translatedText);
    }

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

      if (normalizeText(currentValue) !== normalizeText(translatedValue)) {
        element.setAttribute(attributeName, translatedValue);
      }

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
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return shouldSkipElement(node.parentElement)
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT;
        },
      });

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

  function updateDocumentTitle() {
    const routeTitle = ROUTE_TITLES[getCurrentRouteKey()] || ROUTE_TITLES.home;
    const platformName = translatePhrase('Wasel Palestine');
    const translatedRouteTitle = translatePhrase(routeTitle);
    document.title = `${platformName} | ${translatedRouteTitle}`;
  }

  function applyLanguageChrome() {
    document.documentElement.lang = isArabicActive() ? 'ar' : 'en';
    // Citizen pages keep their existing LTR layout; language changes text only.
    document.documentElement.dir = 'ltr';
    document.documentElement.dataset.userLanguage = currentLanguage;
    updateDocumentTitle();
  }

  function scheduleDomTranslation() {
    global.clearTimeout(translationTimer);
    translationTimer = global.setTimeout(() => {
      applyLanguageChrome();
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

  function applyLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    global.localStorage?.setItem(USER_LANGUAGE_KEY, currentLanguage);
    applyLanguageChrome();
    ensureTranslationObserver();
    translateDomTree(document.body);

    global.dispatchEvent(
      new CustomEvent('wasel:language-applied', {
        detail: {
          language: currentLanguage,
        },
      }),
    );
  }

  function refreshLanguage() {
    applyLanguage(readPersistedLanguage());
  }

  global.WaselUserLanguage = {
    applyLanguage,
    getLanguage: () => currentLanguage,
    refreshLanguage,
    translate: translatePhrase,
  };

  global.addEventListener('wasel:user-updated', (event) => {
    applyLanguage(event.detail?.language || readPersistedLanguage());
  });

  global.addEventListener('storage', (event) => {
    if (event.key === USER_KEY || event.key === USER_LANGUAGE_KEY) {
      refreshLanguage();
    }
  });

  global.addEventListener('hashchange', () => {
    scheduleDomTranslation();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshLanguage, {
      once: true,
    });
  } else {
    refreshLanguage();
  }
})(window);
