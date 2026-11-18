const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (date) => {
  if (!date) return 'No due date';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

// High-resolution SVG Logo for SyncHub
const svgLogo = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;vertical-align:middle;">
  <tr>
    <td style="width:28px;height:28px;background-color:#181D26;border-radius:8px;text-align:center;vertical-align:middle;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
        <path d="M5 13L9 17L19 7" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </td>
  </tr>
</table>
`;

// Helper for priority badges
const getPriorityBadgeHtml = (priority = 'low') => {
  const p = priority.toLowerCase();
  if (p === 'high') {
    return `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;color:#991B1B;background-color:#FEE2E2;border:1px solid #FECACA;border-radius:6px;text-transform:capitalize;">● High</span>`;
  }
  if (p === 'medium') {
    return `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;color:#92400E;background-color:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;text-transform:capitalize;">● Medium</span>`;
  }
  return `<span style="display:inline-block;padding:2px 8px;font-size:11px;font-weight:600;color:#334155;background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;text-transform:capitalize;">● Low</span>`;
};

/**
 * 1. Task Reminder / Overdue Email Template
 */
const buildTaskEmail = ({ type, task, recipientName, assignedBy }) => {
  const isOverdue = type === 'overdue';
  const dueDate = formatDate(task.dueDate);
  const title = escapeHtml(task.title || 'Untitled Task');
  const description = task.description ? escapeHtml(task.description) : null;
  const priority = task.priority || 'medium';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const taskUrl = `${clientUrl}/tasks/${task._id || ''}`;

  const badgeText = isOverdue ? 'OVERDUE' : 'DUE TOMORROW';
  const badgeTextColor = isOverdue ? '#991B1B' : '#92400E';
  const badgeBgColor = isOverdue ? '#FEE2E2' : '#FEF3C7';
  const badgeBorderColor = isOverdue ? '#FECACA' : '#FDE68A';

  const subject = isOverdue
    ? `⚠️ Action Required: "${task.title}" is overdue`
    : `⏰ Reminder: "${task.title}" is due tomorrow`;

  const introText = isOverdue
    ? `This task has passed its due date (${dueDate}) and is currently marked as overdue. Please update its progress or mark it as completed.`
    : `This is a reminder that this task is scheduled for completion tomorrow (${dueDate}).`;

  const text = [
    recipientName ? `Hi ${recipientName},` : 'Hello,',
    '',
    introText,
    '',
    `Task:        ${task.title}`,
    description ? `Description: ${task.description}` : '',
    `Due Date:    ${dueDate}`,
    `Priority:    ${priority.toUpperCase()}`,
    assignedBy ? `Assigned by: ${assignedBy}` : '',
    `Status:      ${badgeText}`,
    '',
    `View in SyncHub: ${taskUrl}`,
    '',
    'If you have already finished this task, update its status in SyncHub to stop receiving automated reminders.',
    '',
    'Best regards,',
    'The SyncHub Team',
    '',
    '— Automated message from SyncHub. Please do not reply directly to this email.'
  ].filter(Boolean).join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#181D26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #E2E8F0;box-shadow:0 4px 16px rgba(15,23,42,0.04);overflow:hidden;">

          <!-- Header Bar -->
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid #F1F5F9;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:10px;" valign="middle">
                          ${svgLogo}
                        </td>
                        <td valign="middle">
                          <span style="font-size:15px;font-weight:700;color:#181D26;letter-spacing:-0.3px;">SyncHub</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;font-size:11px;font-weight:700;color:${badgeTextColor};background-color:${badgeBgColor};border:1px solid ${badgeBorderColor};padding:4px 9px;border-radius:6px;letter-spacing:0.5px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:28px 28px 20px 28px;">
              <h2 style="margin:0 0 10px 0;font-size:18px;font-weight:700;color:#181D26;line-height:1.35;">
                ${isOverdue ? 'Action Required: Task Overdue' : 'Upcoming Task Due Tomorrow'}
              </h2>

              <p style="margin:0 0 18px 0;font-size:13.5px;color:#475569;line-height:1.55;">
                ${recipientName ? `Hi <strong>${escapeHtml(recipientName)}</strong>, ` : 'Hello, '}
                ${introText}
              </p>

              <!-- Task Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:24px;border-collapse:separate;">
                <tr>
                  <td style="padding:18px 20px;">
                    <!-- Title & Priority -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
                      <tr>
                        <td align="left" style="font-size:15px;font-weight:600;color:#0F172A;line-height:1.4;">
                          ${title}
                        </td>
                        <td align="right" style="padding-left:12px;white-space:nowrap;" valign="top">
                          ${getPriorityBadgeHtml(priority)}
                        </td>
                      </tr>
                    </table>

                    ${description ? `
                    <!-- Description -->
                    <div style="margin:0 0 14px 0;padding:10px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:3px solid #181D26;border-radius:6px;font-size:12.5px;color:#334155;line-height:1.55;">
                      ${description}
                    </div>
                    ` : ''}

                    <!-- Details Table -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:12.5px;border-top:1px solid #E2E8F0;padding-top:10px;">
                      <tr>
                        <td style="padding:4px 0;color:#64748B;width:95px;font-weight:500;">Due date:</td>
                        <td style="padding:4px 0;color:#0F172A;font-weight:600;">
                          ${dueDate}
                        </td>
                      </tr>
                      ${assignedBy ? `
                      <tr>
                        <td style="padding:4px 0;color:#64748B;width:95px;font-weight:500;">Assigned by:</td>
                        <td style="padding:4px 0;color:#0F172A;font-weight:500;">
                          ${escapeHtml(assignedBy)}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
                <tr>
                  <td align="center">
                    <a href="${taskUrl}" target="_blank" style="display:inline-block;background-color:#181D26;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;box-shadow:0 2px 6px rgba(24,29,38,0.18);">
                      Open Task in SyncHub &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0 0;font-size:11.5px;color:#94A3B8;text-align:center;line-height:1.4;">
                Completed this task? Update its status in your dashboard to stop these notifications.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:11.5px;color:#64748B;">
                Sent with care from <strong>SyncHub</strong> &middot; Task &amp; Friend Collaboration Platform
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                This is an automated notification. Please do not reply directly to this address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, text, html };
};

/**
 * 2. Shared Task Notification Email Template
 */
const buildTaskSharedEmail = ({ sharerName, taskTitles = [], recipientName, status }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const sharedUrl = `${clientUrl}/shared-tasks`;
  const count = taskTitles.length;
  const isMultiple = count > 1;
  const initialStatus = status || 'pending';

  const subject = isMultiple
    ? `🤝 ${sharerName} shared ${count} tasks with you on SyncHub`
    : `🤝 ${sharerName} shared a task with you: "${taskTitles[0] || 'New Task'}"`;

  const text = [
    recipientName ? `Hi ${recipientName},` : 'Hello,',
    '',
    `${sharerName} has assigned/shared ${isMultiple ? `${count} tasks` : 'a task'} with you on SyncHub:`,
    '',
    ...taskTitles.map((t, idx) => `  ${idx + 1}. ${t}`),
    '',
    `Status:      ${initialStatus.toUpperCase()}`,
    '',
    `Collaborate and view these tasks: ${sharedUrl}`,
    '',
    'Best regards,',
    'The SyncHub Team'
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#181D26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #E2E8F0;box-shadow:0 4px 16px rgba(15,23,42,0.04);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid #F1F5F9;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:10px;" valign="middle">
                          ${svgLogo}
                        </td>
                        <td valign="middle">
                          <span style="font-size:15px;font-weight:700;color:#181D26;letter-spacing:-0.3px;">SyncHub</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;font-size:11px;font-weight:700;color:#1D4ED8;background-color:#EFF6FF;border:1px solid #BFDBFE;padding:4px 9px;border-radius:6px;letter-spacing:0.5px;">
                      SHARED TASK${isMultiple ? 'S' : ''}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 28px 20px 28px;">
              <h2 style="margin:0 0 10px 0;font-size:18px;font-weight:700;color:#181D26;line-height:1.35;">
                ${isMultiple ? `${count} Tasks Shared With You` : 'A New Task Was Shared With You'}
              </h2>

              <p style="margin:0 0 18px 0;font-size:13.5px;color:#475569;line-height:1.55;">
                ${recipientName ? `Hi <strong>${escapeHtml(recipientName)}</strong>, ` : 'Hello, '}
                <strong>${escapeHtml(sharerName)}</strong> has invited you to collaborate on ${isMultiple ? `<strong>${count} tasks</strong>` : 'a task'} in SyncHub.
              </p>

              <!-- List of Tasks -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:24px;border-collapse:separate;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11.5px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
                      Assigned Tasks:
                    </div>
                    ${taskTitles.map((t, idx) => `
                    <div style="padding:8px 10px;margin-bottom:${idx === taskTitles.length - 1 ? '0' : '6px'};background:#FFFFFF;border:1px solid #E2E8F0;border-radius:6px;font-size:13px;font-weight:500;color:#0F172A;">
                      <span style="color:#64748B;font-weight:600;margin-right:6px;">${idx + 1}.</span> ${escapeHtml(t)}
                    </div>
                    `).join('')}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 12px auto;">
                <tr>
                  <td align="center">
                    <a href="${sharedUrl}" target="_blank" style="display:inline-block;background-color:#181D26;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:8px;box-shadow:0 2px 6px rgba(24,29,38,0.18);">
                      View Shared Tasks in SyncHub &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;font-size:11.5px;color:#64748B;">
                Sent from <strong>SyncHub</strong> &middot; Real-time Task Collaboration
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, text, html };
};

/**
 * 3. General Purpose Clean Minimal Email Template
 */
const buildMinimalEmail = ({ subject, recipientName, message, cta }) => {
  const safeRecipient = recipientName ? escapeHtml(recipientName) : 'Hello,';
  const messageLines = Array.isArray(message) ? message : [message];

  const textBody = [
    recipientName ? `Dear ${recipientName},` : 'Hello,',
    '',
    ...messageLines,
    '',
    cta ? `👉 ${cta.text}: ${cta.url}` : '',
    '',
    'Best regards,',
    'The SyncHub Team',
    '',
    '— This is an automated message. Please do not reply to this email.'
  ].filter(Boolean).join('\n');

  const htmlBody = messageLines
    .map((line) => `<p style="margin:0 0 14px;color:#475569;font-size:13.5px;line-height:1.55;">${escapeHtml(line)}</p>`)
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#181D26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #E2E8F0;box-shadow:0 4px 16px rgba(15,23,42,0.04);overflow:hidden;">
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid #F1F5F9;background-color:#FFFFFF;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;" valign="middle">
                    ${svgLogo}
                  </td>
                  <td valign="middle">
                    <span style="font-size:15px;font-weight:700;color:#181D26;letter-spacing:-0.3px;">SyncHub</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 24px 28px;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#0F172A;">${recipientName ? `Dear ${safeRecipient}` : 'Hello,'}</p>
              ${htmlBody}
              ${cta ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 10px 0;">
                <tr>
                  <td>
                    <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block;background-color:#181D26;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:600;padding:11px 24px;border-radius:8px;box-shadow:0 2px 6px rgba(24,29,38,0.18);">${escapeHtml(cta.text)}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
              <p style="margin:24px 0 0;font-size:13px;color:#475569;">Best regards,<br><strong style="color:#181D26;">The SyncHub Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center;">
              This is an automated message. Please do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, text: textBody, html };
};

module.exports = {
  buildTaskEmail,
  buildTaskSharedEmail,
  buildMinimalEmail,
  formatDate,
  escapeHtml
};