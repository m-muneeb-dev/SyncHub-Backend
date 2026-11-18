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
    timeZone: 'Asia/Karachi'
  });
};

// Gmail/Outlook safe Logo (SVG aksar email clients block kar dete hain)
const brandLogo = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block;vertical-align:middle;">
  <tr>
    <td align="center" valign="middle" style="background-color:#4F46E5;border-radius:8px;padding:6px 12px;text-align:center;vertical-align:middle;color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:-0.3px;line-height:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      SyncHub
    </td>
  </tr>
</table>
`;

const getPriorityBadgeHtml = (priority = 'low') => {
  const p = String(priority).toLowerCase();
  if (p === 'high') {
    return `<span style="display:inline-block;padding:3px 9px;font-size:11px;font-weight:600;color:#991B1B;background-color:#FEE2E2;border:1px solid #FECACA;border-radius:6px;text-transform:capitalize;">&#9679; High</span>`;
  }
  if (p === 'medium') {
    return `<span style="display:inline-block;padding:3px 9px;font-size:11px;font-weight:600;color:#92400E;background-color:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;text-transform:capitalize;">&#9679; Medium</span>`;
  }
  return `<span style="display:inline-block;padding:3px 9px;font-size:11px;font-weight:600;color:#334155;background-color:#F1F5F9;border:1px solid #E2E8F0;border-radius:6px;text-transform:capitalize;">&#9679; Low</span>`;
};

const getBaseUrl = () => {
  const raw = process.env.CLIENT_ORIGINS;
  return raw.split(',')[0].trim().replace(/\/$/, '');
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
  const taskUrl = `${getBaseUrl()}/tasks/${task._id || ''}`;

  const badgeText = isOverdue ? 'OVERDUE' : 'DUE TOMORROW';
  const badgeTextColor = isOverdue ? '#991B1B' : '#92400E';
  const badgeBgColor = isOverdue ? '#FEE2E2' : '#FEF3C7';
  const badgeBorderColor = isOverdue ? '#FECACA' : '#FDE68A';
  const accentColor = isOverdue ? '#DC2626' : '#181D26';

  const subject = isOverdue
    ? `Action Required: "${task.title}" is overdue`
    : `Reminder: "${task.title}" is due tomorrow`;

  const introText = isOverdue
    ? `This task passed its due date (${dueDate}) and is currently marked as overdue. Please update its progress or mark it as completed.`
    : `This is a friendly reminder that this task is scheduled for completion tomorrow (${dueDate}).`;

  const text = [
    recipientName ? `Hi ${recipientName},` : 'Hello,',
    '',
    introText,
    '',
    `Task:        ${task.title}`,
    task.description ? `Description: ${task.description}` : '',
    `Due Date:    ${dueDate}`,
    `Priority:    ${priority.toUpperCase()}`,
    assignedBy ? `Owner:       ${assignedBy}` : '',
    `Status:      ${badgeText}`,
    '',
    `View in SyncHub: ${taskUrl}`,
    '',
    'Best regards,',
    'The SyncHub Team'
  ].filter(Boolean).join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#181D26;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F8FAFC;padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;border:1px solid #E2E8F0;overflow:hidden;">

          <!-- Top Accent Line -->
          <tr>
            <td style="height:4px;background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header Bar -->
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #F1F5F9;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right:10px;" valign="middle">${brandLogo}</td>
                        <td valign="middle">
                          <span style="font-size:16px;font-weight:700;color:#181D26;letter-spacing:-0.3px;">SyncHub</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;font-size:11px;font-weight:700;color:${badgeTextColor};background-color:${badgeBgColor};border:1px solid ${badgeBorderColor};padding:4px 10px;border-radius:6px;letter-spacing:0.5px;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:28px;">
              <h2 style="margin:0 0 10px 0;font-size:18px;font-weight:700;color:#181D26;line-height:1.35;">
                ${isOverdue ? 'Action Required: Task Overdue' : 'Upcoming Task Due Tomorrow'}
              </h2>

              <p style="margin:0 0 20px 0;font-size:14px;color:#475569;line-height:1.6;">
                ${recipientName ? `Hi <strong>${escapeHtml(recipientName)}</strong>, ` : 'Hello, '}
                ${introText}
              </p>

              <!-- Task Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td align="left" style="font-size:15px;font-weight:700;color:#0F172A;line-height:1.4;">
                          ${title}
                        </td>
                        <td align="right" style="padding-left:12px;white-space:nowrap;" valign="top">
                          ${getPriorityBadgeHtml(priority)}
                        </td>
                      </tr>
                    </table>

                    ${description ? `
                    <div style="margin:0 0 14px 0;padding:10px 12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:3px solid ${accentColor};border-radius:6px;font-size:13px;color:#334155;line-height:1.55;">
                      ${description}
                    </div>
                    ` : ''}

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;border-top:1px solid #E2E8F0;padding-top:10px;">
                      <tr>
                        <td style="padding:4px 0;color:#64748B;width:100px;font-weight:500;">Due Date:</td>
                        <td style="padding:4px 0;color:${isOverdue ? '#991B1B' : '#0F172A'};font-weight:600;">
                          ${dueDate}
                        </td>
                      </tr>
                      ${assignedBy ? `
                      <tr>
                        <td style="padding:4px 0;color:#64748B;width:100px;font-weight:500;">Task Owner:</td>
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td align="center">
                    <a href="${taskUrl}" target="_blank" style="display:inline-block;background-color:#181D26;color:#FFFFFF;text-decoration:none;font-size:13.5px;font-weight:600;padding:12px 28px;border-radius:8px;">
                      Open Task in SyncHub &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.5;">
                Already completed this task? Mark it as done in SyncHub to stop receiving reminders.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 28px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:#64748B;">
                Sent by <strong>SyncHub</strong> &middot; Task Management Platform
              </p>
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                This is an automated message. Please do not reply directly to this email.
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

module.exports = { buildTaskEmail, formatDate, escapeHtml };