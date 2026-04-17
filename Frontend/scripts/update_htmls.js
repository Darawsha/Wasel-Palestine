const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const adminDir = path.join(frontendRoot, 'features', 'admin');
const pages = [
  { folder: 'dashboard', file: 'Dashboard' },
  { folder: 'incidents', file: 'Incidents' },
  { folder: 'performance-reports', file: 'PerformanceReports' },
  { folder: 'audit-log', file: 'AuditLog' },
  { folder: 'checkpoint-management', file: 'CheckpointManagement' },
  { folder: 'moderation-queue', file: 'ModerationQueue' },
  { folder: 'user-management', file: 'UserManagement' },
  { folder: 'system-settings', file: 'SystemSettings' },
  { folder: 'api-monitor', file: 'APIMonitor' },
];

pages.forEach(({ folder, file }) => {
  const filePath = path.join(adminDir, folder, `${file}.html`);
  let content;

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.log(`Skipping ${filePath}`);
      return;
    }

    throw error;
  }

  if (content.match(/<html/i)) {
    console.log(`${file} already has html tags.`);
    return;
  }

  content = content.replace(/<link rel="stylesheet"[^>]+>/g, '');

  const boilerplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Wasel Palestine | ${file}</title>
    <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="/views/admin/shell/admin-shell.css" />
    <link rel="stylesheet" href="./${file}.css" />
</head>
<body class="admin-body">
${content.trim()}
</body>
</html>`;

  fs.writeFileSync(filePath, boilerplate, 'utf8');
  console.log(`Updated ${file}.html to be a full page!`);
});
